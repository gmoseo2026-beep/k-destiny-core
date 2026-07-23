import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateCacheKey, getCachedResult, setCachedResult } from "@/lib/destinyCache";
import { calculateFourPillars } from "@/lib/saju";
import { prisma } from "@/lib/prisma";
import {
  genAI, PREMIUM_MODELS, LOCALE_CONFIG, STYLE_GUIDE, repairJSON, sajuContextBlock,
} from "@/lib/destinyGen";

// Full locked sections (love / wealth / health / prescription). Generated AFTER
// unlock, off the free critical path — so latency here is not user-blocking.
export const runtime = "nodejs";
export const maxDuration = 60;

const apiKey = process.env.GEMINI_API_KEY || "";
const MODEL_TIMEOUT_MS = 40000; // full premium sections are long; give them room instead of stalling to mock

function isValidSections(d: any): boolean {
  return d && typeof d.love_fortune === "string" && d.love_fortune.length > 20 &&
    typeof d.wealth_warning === "string" && typeof d.health_alert === "string" &&
    typeof d.master_prescription === "string";
}

function mockSections(locale: string) {
  const isKo = locale === "ko";
  return {
    love_fortune: isKo
      ? "당신의 연애운은 올해 하반기에 크게 상승합니다. 특히 두 달 안에 중요한 만남 또는 관계의 전환점이 예정되어 있으며, 기존 관계라면 신뢰가 깊어지는 시기가 찾아옵니다."
      : "Your love fortune rises sharply in the second half of the year. A meaningful encounter or turning point is due within two months; existing bonds deepen in trust.",
    wealth_warning: isKo
      ? "예상치 못한 재정적 기회가 다가오지만, 충동적 투자는 피해야 합니다. 당신의 토(土) 에너지가 안정될 때까지 큰 결정을 미루세요."
      : "An unexpected financial opportunity approaches, but avoid impulsive investments. Delay major decisions until your Earth energy stabilizes.",
    health_alert: isKo
      ? "오행 균형에서 수(水) 에너지 부족이 감지됩니다. 신장과 허리 건강에 주의하고 충분한 수분과 하체 운동을 권합니다."
      : "A Water-element deficiency is detected. Watch kidney and lower-back health; prioritize hydration and lower-body exercise.",
    master_prescription: isKo
      ? "행운의 색상: 검정·남색 | 행운의 숫자: 1, 6 | 방향: 북쪽 | 최적 시간: 오후 9-11시 | 리추얼: 잠들기 전 3분 호흡 명상"
      : "Lucky colors: Black, Navy | Numbers: 1, 6 | Direction: North | Best hours: 9-11 PM | Ritual: 3-min breathing meditation before sleep",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, dob, time, country, city, gender, masterName, locale } = body;

    // Must be logged in AND entitled (premium subscription or a purchased report).
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const [user, reportCount] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { tier: true, role: true, premiumEndDate: true } }),
      prisma.purchasedReport.count({ where: { userId: session.user.id } }),
    ]);
    const premiumActive = user?.tier === "PREMIUM" && (!user.premiumEndDate || user.premiumEndDate > new Date());
    const entitled = premiumActive || user?.role === "ADMIN" || reportCount > 0;
    if (!entitled) {
      return NextResponse.json({ error: "Payment required" }, { status: 403 });
    }

    if (!name || !dob || !gender) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: "AI configuration error" }, { status: 500 });
    }

    const localeKey = locale || "en";
    const config = LOCALE_CONFIG[localeKey] || LOCALE_CONFIG.en;
    const cacheKey = generateCacheKey({ name, dob, time, country, city, gender, locale: localeKey }) + ":full";

    const cached = getCachedResult(cacheKey);
    if (cached && isValidSections(cached)) {
      return NextResponse.json({ ...cached, cached: true }, { status: 200 });
    }

    const location = `${city || "Unknown"}, ${country || "Unknown"}`;
    const sajuResult = calculateFourPillars(dob, time, gender, location);

    let dictionaryContext = "";
    try {
      const conditions: any[] = [{ category: "DAY_MASTER", signKey: sajuResult.dayMasterSignKey }];
      for (const lackKey of sajuResult.elementLacks) conditions.push({ category: "ELEMENT_LACK", signKey: lackKey });
      const docs = await prisma.sajuContentDictionary.findMany({ where: { OR: conditions } });
      if (docs.length > 0) {
        dictionaryContext = docs.map((d) => `[${d.category}] ${d.signKey}: ${d.englishContent} (Remedy: ${d.remedyAction || "None"})`).join("\n");
      }
    } catch (e) {
      console.error("[Sections] DB error (non-fatal):", e);
    }

    const prompt = `You are a legendary Eastern Saju Master named ${masterName || "Master Karma"}.
RULES: Write ENTIRELY in ${config.name}. ${config.toneGuide}

${STYLE_GUIDE}

${sajuContextBlock({ name, gender, dayMaster: sajuResult.dayMaster, fourPillars: sajuResult.fourPillars, elementsScore: sajuResult.elementsScore, dictionaryContext })}

Return ONLY valid JSON with these four premium sections (no markdown, no hanja, no extra keys).
Each value must be readable and specific — this is a PAID reading, so make it feel worth it, but tight. Short paragraphs, blank line between them. Never end a sentence mid-way:
{
  "love_fortune": "2-3 short paragraphs of love/relationship forecast, with at least one specific month and one concrete, human detail.",
  "wealth_warning": "2-3 short paragraphs of money forecast, with specific timing, one real opportunity and one risk to avoid.",
  "health_alert": "2 short paragraphs of health insight in plain language, with a concrete, doable remedy.",
  "master_prescription": "A short, specific prescription: lucky colors, numbers, direction, best hours, and one simple daily ritual — written warmly, not as a list."
}
Never mention calculations or jargon. Deliver it like a wise friend, not a textbook.`;

    let lastError: any = null;
    for (const modelName of PREMIUM_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json", temperature: 0.8, maxOutputTokens: 8192 },
        });
        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Timeout")), MODEL_TIMEOUT_MS)),
        ]);
        const raw = result.response.text();
        let data: any = null;
        try { data = JSON.parse(raw); } catch { data = repairJSON(raw); }
        if (!isValidSections(data)) throw new Error("Invalid sections JSON");
        const sections = {
          love_fortune: data.love_fortune, wealth_warning: data.wealth_warning,
          health_alert: data.health_alert, master_prescription: data.master_prescription,
        };
        setCachedResult(cacheKey, sections);
        return NextResponse.json(sections, { status: 200 });
      } catch (err: any) {
        lastError = err;
        const msg = err.message || "";
        if (msg.includes("503") || msg.includes("429") || msg.includes("Timeout") || msg.includes("RESOURCE_EXHAUSTED")) continue;
      }
    }

    console.error("[Sections] All models failed, using mock:", lastError?.message);
    return NextResponse.json({ ...mockSections(localeKey), fallback: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Sections API] Fatal:", error);
    // Graceful 200 with mock sections instead of a hard error for a paid user.
    return NextResponse.json({ ...mockSections("ko"), fallback: true }, { status: 200 });
  }
}
