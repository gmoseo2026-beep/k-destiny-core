import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateCacheKey, getCachedResult, setCachedResult } from "@/lib/destinyCache";
import { getClientIp, checkRateLimit, recordRequest } from "@/lib/rateLimiter";
import { calculateFourPillars } from "@/lib/saju";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Vercel Serverless: allow up to 60s for AI generation
export const maxDuration = 60;

// Initialize the Gemini API client
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

const LOCALE_CONFIG: Record<string, { name: string; toneGuide: string }> = {
  ko: { name: "Korean (한국어)", toneGuide: "자연스러운 한국어 문어체 존댓말을 사용하세요. 어두운 다크 판타지 톤과 시적 표현을 곁들이세요." },
  en: { name: "English", toneGuide: "Write in a dark-fantasy, premium, mystical English tone." },
  es: { name: "Spanish (Español)", toneGuide: "Escribe en un español elegante y místico." },
  de: { name: "German (Deutsch)", toneGuide: "Schreibe in einem eleganten, mystischen Deutsch." },
  fr: { name: "French (Français)", toneGuide: "Écrivez en français élégant et mystique." },
  ja: { name: "Japanese (日本語)", toneGuide: "自然な日本語の丁寧語で書いてください。東洋占術の深みのある解釈と詩的な表現を使い、ダークファンタジーの雰囲気を出してください。" },
};

const MODEL_TIMEOUT_MS = 45000;
const MAX_RETRIES = 2;

// ─── Helper: Validate Final AI Output ───
function isValidResult(data: any): boolean {
  return (
    data &&
    typeof data.core_essence === "string" &&
    data.core_essence.length > 10 &&
    typeof data.imminent_karma_teaser === "string" &&
    typeof data.locked_secrets === "string" &&
    Array.isArray(data.lucky_elements) &&
    typeof data.element_analysis === "object"
  );
}

// ─── Helper: Repair broken JSON from AI ───
function repairJSON(raw: string): any {
  // Strip markdown code fences if present
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  // Try parsing directly first
  try { return JSON.parse(cleaned); } catch {}
  // Try extracting first JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }
  return null;
}

// ─── Helper: Generate deterministic mock result for fallback ───
function generateMockResult(name: string, gender: string, locale: string, elementsScore: Record<string, number>) {
  const isKo = locale === 'ko';
  const isJa = locale === 'ja';
  const genderStr = gender === 'Male' ? (isKo ? '남성' : isJa ? '男性' : 'male') : (isKo ? '여성' : isJa ? '女性' : 'female');
  
  const coreEssences: Record<string, string> = {
    ko: `${name}님의 사주를 분석한 결과, 당신은 겉으로는 차분하고 안정적으로 보이지만, 내면에는 끊임없이 변화를 갈구하는 에너지가 숨어 있습니다. 당신의 사주 명식은 고대의 지혜가 현대적 감각과 만나는 독특한 조합을 보여주고 있습니다.\n\n당신은 25세에서 28세 사이에 인생의 큰 전환점을 경험했을 가능성이 높습니다. 그 시기에 당신은 자신의 정체성에 대해 깊이 고민했고, 그 결과 지금의 당신이 형성되었습니다. 이 시기의 경험은 당신의 직관력을 크게 강화시켰습니다.\n\n${genderStr}으로서 당신의 에너지는 오행 중에서도 특별한 조합을 이루고 있습니다. 목(木)의 성장력과 수(水)의 지혜가 조화를 이루어, 어떤 상황에서도 올바른 판단을 내릴 수 있는 능력을 부여받았습니다. 특히 감정적으로 어려운 시기에도 냉정함을 유지할 수 있는 것이 당신의 큰 강점입니다.\n\n하지만 당신이 모르는 것이 있습니다. 2026년은 당신에게 10년에 한 번 찾아오는 대운(大運)의 전환점이 될 것입니다...`,
    en: `${name}, upon analyzing your Four Pillars, you appear confident and composed on the outside, but inside you carry a restless energy that yearns for transformation. Your destiny chart reveals a rare convergence of ancient wisdom and modern sensibility.\n\nAround age 25-27, you likely experienced a profound turning point that reshaped your identity. During that period, you questioned everything you believed about yourself, and the person you are today was forged in that crucible of self-discovery. That experience dramatically sharpened your intuition.\n\nAs a ${genderStr}, your energy forms an extraordinary blend among the Five Elements. The growth force of Wood harmonizes with the wisdom of Water, granting you the ability to make sound judgments even in chaos. Your greatest strength lies in maintaining clarity during emotional turbulence.\n\nBut what you don't know is that 2026 holds a once-in-a-decade Grand Fortune shift for you...`,
  };
  
  const teasers: Record<string, string> = {
    ko: `다가오는 8~9월, 당신의 재물운에 극적인 변화의 파동이 감지됩니다. 이 기간을 놓치면, 다음 기회는 3년 후에야 찾아올 것입니다.`,
    en: `In the coming August-September period, a dramatic wave of transformation is detected in your wealth fortune. Missing this window means waiting three more years for the next opportunity.`,
  };

  return {
    core_essence: coreEssences[locale] || coreEssences.en,
    imminent_karma_teaser: teasers[locale] || teasers.en,
    love_fortune: isKo ? `당신의 연애운은 2026년 하반기에 크게 상승합니다. 특히 9월과 11월 사이에 중요한 만남이 예정되어 있습니다. 기존 관계에 있다면, 10월에 관계의 깊이가 더해지는 전환점이 찾아올 것입니다.` : `Your love fortune rises significantly in the second half of 2026. A significant encounter is destined between September and November. If in an existing relationship, October brings a turning point that deepens your bond.`,
    wealth_warning: isKo ? `올해 4분기에 예상치 못한 재정적 기회가 찾아옵니다. 하지만 8월 중순의 충동적 투자는 피해야 합니다. 당신의 토(土) 에너지가 안정될 때까지 큰 재정적 결정을 미루세요.` : `An unexpected financial opportunity arrives in Q4 this year. However, avoid impulsive investments in mid-August. Delay major financial decisions until your Earth energy stabilizes.`,
    health_alert: isKo ? `당신의 오행 밸런스에서 수(水) 에너지 부족이 감지됩니다. 신장과 허리 건강에 주의하시고, 충분한 수분 섭취와 하체 운동을 권장합니다.` : `A Water element deficiency is detected in your Five Elements balance. Pay attention to kidney and lower back health. Adequate hydration and lower body exercises are recommended.`,
    master_prescription: isKo ? `행운의 색상: 검정, 남색 | 행운의 숫자: 1, 6 | 행운의 방향: 북쪽 | 최적 시간: 오후 9-11시 | 일일 리추얼: 잠들기 전 3분간 호흡 명상` : `Lucky Colors: Black, Navy | Lucky Numbers: 1, 6 | Lucky Direction: North | Best Hours: 9-11 PM | Daily Ritual: 3-minute breathing meditation before sleep`,
    locked_secrets: isKo ? `연애, 재물, 건강 운세의 상세한 분석이 준비되어 있습니다.` : `Detailed analysis of love, wealth, and health fortunes is prepared.`,
    lucky_elements: isKo ? ["수(水)", "목(木)", "토(土)"] : ["Water", "Wood", "Earth"],
    element_analysis: elementsScore,
  };
}

export async function POST(req: Request) {
  try {
    // ==========================================
    // STEP 1: Parse Request Data (Extraction)
    // ==========================================
    const body = await req.json();
    const { name, dob, time, country, city, gender, masterName, locale, userId } = body;

    if (!name || !dob || !gender || !masterName) {
      return NextResponse.json(
        { error: "Missing required fields (name, dob, gender, masterName)" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json({ error: "AI configuration error" }, { status: 500 });
    }

    // Rate Limiting
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      const retryAfterSec = Math.ceil((rateCheck.retryAfterMs || 60000) / 1000);
      return NextResponse.json(
        { error: "Rate limit exceeded.", retryAfterSeconds: retryAfterSec },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    // Cache Check
    const localeKey = locale || "en";
    const cacheKey = generateCacheKey({ name, dob, time, country, city, gender, locale: localeKey });
    const cachedData = getCachedResult(cacheKey);
    if (cachedData && isValidResult(cachedData)) {
      console.log(`[Cache] HIT for key ${cacheKey}`);
      return NextResponse.json({ ...cachedData, cached: true }, { status: 200 });
    }

    // ==========================================
    // STEP 2: Exact Math Calculation (Engine)
    // ==========================================
    const location = `${city || "Unknown"}, ${country || "Unknown"}`;
    const sajuResult = calculateFourPillars(dob, time, gender, location);

    // ==========================================
    // STEP 3: DB Query & Save (IP Data)
    // ==========================================
    let dictionaryContext = "";
    
    try {
      // 3.1 Fetch our proprietary interpretations based on Day Master + Element Lacks
      const queryConditions: any[] = [
        { category: "DAY_MASTER", signKey: sajuResult.dayMasterSignKey },
      ];
      // Also fetch interpretations for any elements the user completely lacks
      for (const lackKey of sajuResult.elementLacks) {
        queryConditions.push({ category: "ELEMENT_LACK", signKey: lackKey });
      }

      const sajuDocs = await prisma.sajuContentDictionary.findMany({
        where: { OR: queryConditions },
      });

      if (sajuDocs.length > 0) {
        dictionaryContext = sajuDocs.map(doc => `[${doc.category}] ${doc.signKey}: ${doc.englishContent} (Remedy: ${doc.remedyAction || 'None'})`).join("\n");
      }

      // 3.2 Save/Cache the user's Saju profile for future fast access & UI rendering
      if (userId) {
        await prisma.userSajuProfile.upsert({
          where: { userId },
          update: {
            gender,
            fourPillars: sajuResult.fourPillars,
            dayMaster: sajuResult.dayMaster,
            elementsScore: sajuResult.elementsScore,
            // 원본 입력 데이터도 DB에 동기화 (기기 간 공유)
            name: name || undefined,
            birthYear: dob?.split('-')[0] || undefined,
            birthMonth: dob?.split('-')[1] || undefined,
            birthDay: dob?.split('-')[2] || undefined,
            birthTime: time || undefined,
            country: country || undefined,
            city: city || undefined,
          },
          create: {
            userId,
            gender,
            fourPillars: sajuResult.fourPillars,
            dayMaster: sajuResult.dayMaster,
            elementsScore: sajuResult.elementsScore,
            name: name || null,
            birthYear: dob?.split('-')[0] || null,
            birthMonth: dob?.split('-')[1] || null,
            birthDay: dob?.split('-')[2] || null,
            birthTime: time || null,
            country: country || null,
            city: city || null,
          }
        });
        // ── 라우터 캐시 강제 무효화 (PC/모바일 실시간 동기화) ──
        revalidatePath('/', 'layout');
        revalidatePath('/[locale]/dashboard', 'page');
      }
    } catch (dbError) {
      console.error("[Prisma] DB Error (non-fatal):", dbError);
      // We continue even if DB fails, to ensure the user gets their reading
    }

    // ==========================================
    // STEP 4: Final AI Generation (RAG Prompt Injection)
    // ==========================================
    const config = LOCALE_CONFIG[localeKey] || LOCALE_CONFIG.en;
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const injectedPrompt = `You are a legendary Eastern Saju Master named ${masterName}, known for readings so precise they leave clients breathless.
RULES: Write ENTIRELY in ${config.name}. ${config.toneGuide}

CLIENT INFO: Name=${name}, Gender=${gender}
CLIENT's DETERMINISTIC SAJU (DO NOT CALCULATE, STRICTLY USE THIS):
- Four Pillars: Year=${sajuResult.fourPillars.year}, Month=${sajuResult.fourPillars.month}, Day=${sajuResult.fourPillars.day}, Time=${sajuResult.fourPillars.time || "Unknown"}
- Day Master (Core Self): ${sajuResult.dayMaster}
- 5 Elements Score: ${JSON.stringify(sajuResult.elementsScore)}

PROPRIETARY IP CONTEXT:
${dictionaryContext || "(Use standard Eastern Saju wisdom for " + sajuResult.dayMaster + " as Day Master)"}

═══ CRITICAL WRITING INSTRUCTIONS ═══

FREE SECTION (core_essence) — BARNUM EFFECT MAXIMIZED:
- First sentence MUST follow this pattern: "You appear [positive trait] on the outside, but inside you carry [hidden struggle]."
- Reference specific age ranges where life-changing events likely occurred (e.g., "Around age 25-27, you experienced...")
- Mention a past emotional wound that sounds highly specific but is universally relatable
- Use language that makes the reader think "This is EXACTLY me"
- End with a haunting, incomplete revelation: "But what you don't know is that [current year] holds..."
- Write 4 detailed paragraphs, each building emotional investment

TEASER (imminent_karma_teaser) — MAXIMUM FOMO:
- Mention a specific upcoming month (${currentMonth + 1 > 12 ? 1 : currentMonth + 1}~${currentMonth + 2 > 12 ? currentMonth + 2 - 12 : currentMonth + 2} month range)
- Reference a life-altering event (love encounter, financial shift, or career turning point)
- Make it feel urgent: missing this window = missing the opportunity
- 2 sentences maximum, dramatic and specific

LOCKED SECTIONS — PREMIUM CONTENT (write as if the reader will see it):
- love_fortune: Detailed month-by-month love predictions for the next 6 months with specific timing
- wealth_warning: Financial risks and opportunities with exact periods to watch
- health_alert: Hidden health vulnerabilities based on elemental imbalance, with remedies
- master_prescription: Personalized lucky colors, directions, numbers, and daily rituals

Do NOT mention "Proprietary IP" or "Calculations". Deliver as a mystic reading.

Return ONLY VALID JSON:
{
  "core_essence": "4-paragraph deeply personal analysis (Barnum effect). End with incomplete revelation about ${currentYear}.",
  "imminent_karma_teaser": "2-sentence FOMO cliffhanger about specific upcoming months.",
  "love_fortune": "Detailed 3-paragraph love/relationship forecast with specific months mentioned.",
  "wealth_warning": "Detailed 3-paragraph financial forecast with specific timing and risks.",
  "health_alert": "2-paragraph health insights based on elemental balance with remedies.",
  "master_prescription": "Personalized lucky elements: colors, numbers, directions, best hours, daily ritual.",
  "locked_secrets": "Combine love_fortune + wealth_warning + health_alert into a comprehensive reading.",
  "lucky_elements": ["Element1", "Element2", "Element3"],
  "element_analysis": ${JSON.stringify(sajuResult.elementsScore)}
}
`;

    let lastError = null;
    const startTime = Date.now();

    for (const modelName of MODELS) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[AI Gen] Try ${modelName} (attempt ${attempt})`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
              maxOutputTokens: 8192,
            },
          });

          const result = await Promise.race([
            model.generateContent(injectedPrompt),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Timeout")), MODEL_TIMEOUT_MS))
          ]);

          const rawText = result.response.text();
          let reportData = null;
          
          // Try standard JSON parse first, then repair
          try {
            reportData = JSON.parse(rawText);
          } catch {
            console.warn(`[AI Gen] JSON parse failed, attempting repair...`);
            reportData = repairJSON(rawText);
          }

          if (!reportData || !isValidResult(reportData)) {
            throw new Error("Invalid or incomplete JSON schema returned by AI");
          }

          setCachedResult(cacheKey, reportData);
          recordRequest(clientIp);
          
          console.log(`[AI Gen] Success in ${Date.now() - startTime}ms`);
          // Inject deterministic saju data from server so client can render SajuChart
          return NextResponse.json({
            ...reportData,
            fourPillars: sajuResult.fourPillars,
            dayMaster: sajuResult.dayMaster,
            dayMasterSignKey: sajuResult.dayMasterSignKey,
          }, { status: 200 });

        } catch (err: any) {
          lastError = err;
          console.warn(`[AI Gen] Failed on ${modelName}, attempt ${attempt}:`, err.message);
          
          // If high demand/rate limit/timeout, skip retry and immediately fallback to backup model
          const msg = err.message || "";
          if (msg.includes("503") || msg.includes("429") || msg.includes("Timeout")) {
            break;
          }
        }
      }
    }

    // ─── GRACEFUL FALLBACK: Return mock result instead of error ───
    console.error("[AI Gen] All models failed. Using mock fallback. Last error:", lastError);
    const mockResult = generateMockResult(name, gender, localeKey, sajuResult.elementsScore);
    setCachedResult(cacheKey, mockResult);
    recordRequest(clientIp);
    return NextResponse.json({
      ...mockResult,
      fourPillars: sajuResult.fourPillars,
      dayMaster: sajuResult.dayMaster,
      dayMasterSignKey: sajuResult.dayMasterSignKey,
      fallback: true,
    }, { status: 200 });

  } catch (error: any) {
    console.error("[Generate API] Fatal Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate cosmic blueprint" }, { status: 500 });
  }
}
