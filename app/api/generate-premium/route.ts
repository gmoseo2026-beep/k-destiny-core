import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// ─── Model Fallback Chain (2.0-flash leads for reliability/speed; 2.5 is the
//     quality fallback rather than the blocking first hop that stalls on 503) ───
const MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.0-flash-lite"];
const MODEL_TIMEOUT_MS = 45000;
const MAX_RETRIES = 1;

const REPORT_PROMPTS: Record<string, { systemContext: string; task: string }> = {
  karma: {
    systemContext: "You are a premium Eastern Saju master specializing in monthly karmic energy analysis.",
    task: "Generate a deeply personalized Monthly Karma Report. Analyze the user's elemental energy flow for the current month, identify lucky days aligned with their personal resonance, and provide specific cosmic warnings. Include actionable remedies based on their Day Master and element balance.",
  },
  remedy: {
    systemContext: "You are a premium Eastern Saju master specializing in daily cosmic alignment and practical life coaching through elemental energy.",
    task: "Generate a personalized Daily Remedy Coaching guide. Provide a cosmic weather analysis for today based on the user's birth chart, a daily priority matrix (career, creative windows, relationships), manifestation rituals aligned with their dominant elements, and specific energies to avoid.",
  },
  "fortune-2027": {
    systemContext: "You are a premium Eastern Saju master specializing in long-term fortune prediction and yearly cosmic cycle analysis.",
    task: "Generate a deeply personalized 2027 Fortune Prediction. Analyze each quarter (Q1-Q4) of 2027 based on the user's birth chart and Day Master. Include the year's overarching theme, turning points, breakthrough opportunities, financial windows, relationship shifts, and health warnings specific to their elemental constitution.",
  },
};

const LOCALE_CONFIG: Record<string, { name: string; toneGuide: string }> = {
  ko: { name: "Korean (한국어)", toneGuide: "자연스러운 한국어 문어체 존댓말을 사용하세요. 어두운 다크 판타지 톤과 시적 표현을 곁들이세요." },
  en: { name: "English", toneGuide: "Write in a dark-fantasy, premium, mystical English tone." },
  es: { name: "Spanish (Español)", toneGuide: "Escribe en un español elegante y místico." },
  de: { name: "German (Deutsch)", toneGuide: "Schreibe in einem eleganten, mystischen Deutsch." },
  fr: { name: "French (Français)", toneGuide: "Écrivez en français élégant et mystique." },
  ja: { name: "Japanese (日本語)", toneGuide: "自然な日本語の丁寧語で書いてください。ダークファンタジーの雰囲気を出してください。" },
};

// ─── Deterministic mock fallback for each report type ───
function generateMockReport(reportType: string, locale: string, name: string): string {
  const isKo = locale === "ko";
  const isJa = locale === "ja";

  const mocks: Record<string, Record<string, string>> = {
    karma: {
      ko: `${name}님, 이번 달의 카르마 에너지는 대전환의 흐름 위에 놓여 있습니다. 특히 오행 중 목(木)의 기운이 강하게 작용하여, 새로운 시작과 성장의 기회가 열리고 있습니다. 하지만 토(土)의 부족으로 인해 감정적 안정이 흔들릴 수 있으니, 의식적으로 내면의 평화를 유지하는 것이 중요합니다.\n\n행운의 날: 7일, 15일, 23일이 특히 강한 양의 에너지와 맞닿아 있습니다. 이 날짜에 중요한 결정을 내리거나, 새로운 프로젝트를 시작하면 우주의 순풍을 받을 수 있습니다. 반면 12일과 20일은 충(衝)의 기운이 감지되므로, 큰 재정적 결정은 미루시는 것이 좋습니다.\n\n개운 처방: 검정색과 남색 계열의 옷을 자주 착용하시고, 아침에 3분간 호흡 명상을 하면 수(水) 에너지를 보충할 수 있습니다. 북쪽 방향으로의 산책이 이번 달의 막힌 기운을 풀어줄 것입니다.`,
      en: `${name}, this month's karmic energy sits upon a wave of profound transformation. The Wood element surges strongly, opening doors to new beginnings and growth. However, a deficiency in Earth energy may cause emotional instability, so consciously maintaining inner peace is essential.\n\nLucky days: The 7th, 15th, and 23rd align powerfully with positive yang energy. Make important decisions or launch new projects on these dates to catch the cosmic tailwind. Conversely, the 12th and 20th carry conflicting energies — postpone major financial decisions.\n\nRemedy: Wear black and navy tones frequently, and practice 3-minute breathing meditation each morning to replenish Water energy. Walking northward will help unblock this month's stagnant chi.`,
      ja: `${name}様、今月のカルマエネルギーは大きな転換の波の上にあります。五行の中でも木の気が強く作用し、新たな始まりと成長の機会が開かれています。しかし土の不足により感情的な安定が揺らぐ可能性がありますので、意識的に内面の平和を保つことが重要です。\n\n幸運の日: 7日、15日、23日が特に強い陽のエネルギーと結びついています。この日に重要な決定を下すか、新しいプロジェクトを始めると宇宙の追い風を受けることができます。\n\n開運処方: 黒と紺系の服を頻繁に着用し、朝の3分間呼吸瞑想で水のエネルギーを補充してください。`,
    },
    remedy: {
      ko: `${name}님, 오늘의 우주적 날씨는 '내면의 고요 속 폭풍'입니다. 겉으로는 평온해 보이지만, 내면에서는 강력한 에너지 전환이 일어나고 있습니다. 이 에너지를 올바르게 활용하면 큰 돌파구를 만들 수 있습니다.\n\n오늘의 우선순위: 커리어 면에서는 오전 9시~11시가 황금 시간대입니다. 창의적 아이디어가 필요한 작업은 이 시간에 집중하세요. 인간관계에서는 오후 3시 이후에 중요한 대화를 나누는 것이 좋습니다. 감정의 파도가 가라앉는 시간이기 때문입니다.\n\n오늘 피해야 할 에너지: 충동적인 지출과 감정적 대응은 오늘의 금(金) 기운과 충돌합니다. 특히 저녁 7시~9시 사이에는 큰 결정을 내리지 마세요.`,
      en: `${name}, today's cosmic weather reads as 'Storm Within Stillness.' The surface appears calm, but a powerful energy shift is occurring within. Channel this correctly and you'll create a significant breakthrough.\n\nToday's priorities: Career-wise, 9-11 AM is your golden window. Focus creative work here. For relationships, save important conversations for after 3 PM when emotional tides settle.\n\nEnergies to avoid: Impulsive spending and emotional reactions clash with today's Metal energy. Especially avoid major decisions between 7-9 PM.`,
      ja: `${name}様、今日の宇宙的天気は「静寂の中の嵐」です。表面上は穏やかに見えますが、内面では強力なエネルギー転換が起きています。このエネルギーを正しく活用すれば、大きな突破口を作ることができます。\n\n今日の優先順位: キャリア面では午前9時〜11時がゴールデンタイムです。創造的なアイディアが必要な作業はこの時間に集中してください。\n\n避けるべきエネルギー: 衝動的な出費と感情的な対応は今日の金の気と衝突します。`,
    },
    "fortune-2027": {
      ko: `${name}님의 2027년은 '대운의 문이 열리는 해'입니다. 10년에 한 번 찾아오는 대운의 전환점 위에 서 있으며, 지난 몇 해 동안 쌓아온 인내가 마침내 형태를 갖추기 시작합니다. 특히 하반기로 갈수록 인생의 궤도를 바꿀 결정적 기회가 밀려옵니다.\n\n1분기(1~3월)는 겨울의 끝자락, 내면을 정비하는 시간입니다. 무리하게 새 일을 벌이기보다 방향을 정하고 에너지를 비축하세요. 이 시기에 세운 계획이 한 해 전체의 뼈대가 됩니다. 2월 말에는 오래 미뤄둔 관계나 결정을 정리하기 좋습니다.\n\n2분기(4~6월)는 목(木)의 기운이 폭발하는 성장의 계절입니다. 새로운 도전과 인간관계의 확장이 동시에 찾아오며, 특히 5월은 한 해의 분기점입니다. 이때 내민 손이 하반기의 큰 인연으로 이어지니, 망설이지 말고 먼저 다가서세요.\n\n3분기(7~9월)는 재물운이 가파르게 상승하는 결실의 구간입니다. 8월에는 예상치 못한 기회가 문을 두드리니 미리 준비된 자만이 잡을 수 있습니다. 다만 충동적 확장은 금물 — 들어온 것을 지키는 지혜가 더 큰 부를 부릅니다.\n\n4분기(10~12월)는 한 해의 성과를 수확하고 다음 10년의 씨앗을 심는 시기입니다. 11월에는 운명처럼 다가오는 중요한 인연이 있으며, 이 만남이 이후 여러 해의 흐름을 좌우합니다. 12월에는 스스로에게 보상을 허락하고, 이룬 것을 조용히 축하하세요.`,
      en: `${name}, 2027 is your 'Year of the Opening Grand Gate.' You stand upon a once-in-a-decade turning point, and the patience you have quietly stored over recent years finally begins to take shape. The closer you move to the second half of the year, the more decisive the opportunities that arrive to reroute your entire path.\n\nThe first quarter (Jan-Mar) is winter's end — a time to recalibrate within. Rather than forcing new ventures, set your direction and conserve energy; the plans you make now become the skeleton of the whole year. Late February is ideal for resolving a long-delayed relationship or decision.\n\nThe second quarter (Apr-Jun) is a season of explosive growth as Wood energy surges. New challenges and expanding circles arrive together, and May in particular is the year's hinge. A hand you extend now becomes a major bond in the second half — don't hesitate; reach out first.\n\nThe third quarter (Jul-Sep) is a steep climb in wealth and harvest. In August an unexpected opportunity knocks, and only the prepared will seize it. Yet resist impulsive expansion — the wisdom to protect what has come will summon far greater abundance.\n\nThe fourth quarter (Oct-Dec) is for harvesting the year and planting seeds for the next decade. November brings a fateful, important encounter that will shape the flow of several years to come. In December, allow yourself a reward and quietly celebrate what you have built.`,
      ja: `${name}様の2027年は「大運の門が開く年」です。10年に一度の転換点に立ち、これまで静かに積み重ねてきた忍耐がついに形を成し始めます。下半期に近づくほど、人生の軌道を変える決定的な機会が押し寄せます。\n\n第1四半期(1〜3月)は冬の終わり、内面を整える時間です。無理に新しいことを始めるより、方向を定めエネルギーを蓄えてください。ここで立てた計画が一年の骨格となります。\n\n第2四半期(4〜6月)は木の気が爆発する成長の季節です。新たな挑戦と人間関係の拡張が同時に訪れ、特に5月は一年の分岐点です。差し出した手が下半期の大きな縁につながります。\n\n第3四半期(7〜9月)は財運が急上昇する実りの時期です。8月には予想外の機会が扉を叩きますが、準備された者だけがつかめます。衝動的な拡大は禁物です。\n\n第4四半期(10〜12月)は一年を収穫し、次の10年の種を蒔く時期です。11月には運命的な出会いがあり、その後数年の流れを左右します。12月には自分に報酬を許し、築いたものを静かに祝ってください。`,
    },
  };

  return mocks[reportType]?.[locale] || mocks[reportType]?.en || mocks.karma.en;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reportType, locale } = body;

    if (!reportType || !REPORT_PROMPTS[reportType]) {
      return NextResponse.json(
        { error: "Invalid reportType. Must be 'karma', 'remedy', or 'fortune-2027'." },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json({ error: "AI configuration error" }, { status: 500 });
    }

    // Fetch user's Saju data from DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { profiles: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify premium access (expired subscriptions no longer qualify)
    const premiumActive =
      user.tier === "PREMIUM" &&
      (!user.premiumEndDate || user.premiumEndDate > new Date());
    if (!premiumActive && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Premium access required" }, { status: 403 });
    }

    const sajuProfile = user.profiles[0];
    if (!sajuProfile) {
      return NextResponse.json({ error: "Saju profile not found. Please enter your birth data first." }, { status: 404 });
    }
    // Reading greeting must use the SAJU PROFILE name (what the user entered for their
    // reading), not the account name from sign-in. Fall back to account name only if absent.
    const displayName = sajuProfile.name || user.name || "Seeker";

    const fourPillars = sajuProfile.fourPillars as Record<string, string>;
    const elementsScore = sajuProfile.elementsScore as Record<string, number>;
    const localeKey = locale || "ko";
    const config = LOCALE_CONFIG[localeKey] || LOCALE_CONFIG.en;
    const prompt = REPORT_PROMPTS[reportType];

    const fullPrompt = `${prompt.systemContext}

RULES:
- Write ENTIRELY in ${config.name}. ${config.toneGuide}
- Write 6 to 8 RICH paragraphs, each 5-7 sentences. This is a paid premium report — it must feel deep, specific, and complete, never thin or cut off.
- MANDATORY LENGTH: at least 1200 Korean characters (or 1800 English characters). Fully complete every paragraph; the final paragraph must reach a clear, satisfying conclusion. NEVER end mid-sentence.
- Cover every dimension the task asks for; if it names quarters or periods, give each its own developed paragraph with concrete timing, opportunities, and cautions.
- Make the analysis deeply personal based on the provided Saju data.
- Do NOT mention any technical terms like "Four Pillars" or "Day Master" — just deliver the mystic reading naturally.
- Use vivid, poetic dark-fantasy imagery throughout.

CLIENT SAJU DATA (DO NOT EXPOSE RAW DATA, ONLY USE FOR ANALYSIS):
- Name: ${displayName}
- Day Master (Core Self): ${sajuProfile.dayMaster}
- Four Pillars: Year=${fourPillars.year || "Unknown"}, Month=${fourPillars.month || "Unknown"}, Day=${fourPillars.day || "Unknown"}, Time=${fourPillars.time || "Unknown"}
- Five Elements Score: ${JSON.stringify(elementsScore)}
- Gender: ${sajuProfile.gender}

TASK: ${prompt.task}

Return ONLY the report text as a plain string. No JSON, no markdown headers, no bullet points — just 5-6 beautiful paragraphs separated by double newlines.`;

    let lastError: any = null;
    const startTime = Date.now();

    // ─── Model Fallback Chain with Retry ───
    for (const modelName of MODELS) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[Premium AI] Try ${modelName} (attempt ${attempt}) for ${reportType}`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.85,
              maxOutputTokens: 8192,
            },
          });

          const result = await Promise.race([
            model.generateContent(fullPrompt),
            new Promise<never>((_, rej) =>
              setTimeout(() => rej(new Error("Timeout")), MODEL_TIMEOUT_MS)
            ),
          ]);

          const response = result.response;
          const finishReason = response.candidates?.[0]?.finishReason;
          const reportText = response.text().trim();

          if (!reportText || reportText.length < 100) {
            throw new Error("AI returned insufficient content");
          }
          // Reject truncated output (hit the token ceiling) — retry/fallback instead of
          // returning a report that ends mid-sentence.
          if (finishReason === "MAX_TOKENS") {
            throw new Error("Response truncated (MAX_TOKENS)");
          }

          console.log(`[Premium AI] ✅ Success with ${modelName} in ${Date.now() - startTime}ms (${reportText.length} chars)`);
          return NextResponse.json({ report: reportText }, { status: 200 });
        } catch (err: any) {
          lastError = err;
          console.warn(`[Premium AI] ${modelName} attempt ${attempt} failed: ${err.message?.substring(0, 100)}`);

          // If overloaded/rate-limited/timeout, skip retry and immediately try next model
          const msg = err.message || "";
          if (msg.includes("503") || msg.includes("429") || msg.includes("Timeout") || msg.includes("RESOURCE_EXHAUSTED")) {
            break;
          }
        }
      }
    }

    // ─── GRACEFUL FALLBACK: Return deterministic mock instead of error ───
    console.error(`[Premium AI] All models failed for ${reportType}. Using mock fallback. Last error:`, lastError?.message);
    const mockReport = generateMockReport(reportType, localeKey, displayName);
    return NextResponse.json({ report: mockReport, fallback: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Premium AI] Fatal Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate premium report" },
      { status: 500 }
    );
  }
}
