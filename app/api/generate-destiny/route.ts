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

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

const LOCALE_CONFIG: Record<string, { name: string; toneGuide: string }> = {
  ko: { name: "Korean (한국어)", toneGuide: "자연스러운 한국어 문어체 존댓말을 사용하세요. 어두운 다크 판타지 톤과 시적 표현을 곁들이세요." },
  en: { name: "English", toneGuide: "Write in a dark-fantasy, premium, mystical English tone." },
  es: { name: "Spanish (Español)", toneGuide: "Escribe en un español elegante y místico." },
  de: { name: "German (Deutsch)", toneGuide: "Schreibe in einem eleganten, mystischen Deutsch." },
  fr: { name: "French (Français)", toneGuide: "Écrivez en français élégant et mystique." },
  ja: { name: "Japanese (日本語)", toneGuide: "自然な日本語の丁寧語で書いてください。東洋占術の深みのある解釈と詩的な表現を使い、ダークファンタジーの雰囲気を出してください。" },
};

const MODEL_TIMEOUT_MS = 55000;
const MAX_RETRIES = 1;

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

          const reportData = JSON.parse(result.response.text());

          if (!isValidResult(reportData)) {
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

    console.error("[AI Gen] All models failed. Last error:", lastError);
    return NextResponse.json({ error: "마스터 카르마가 현재 깊은 명상 중입니다. 잠시 후 다시 말을 걸어주세요." }, { status: 503 });

  } catch (error: any) {
    console.error("[Generate API] Fatal Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate cosmic blueprint" }, { status: 500 });
  }
}
