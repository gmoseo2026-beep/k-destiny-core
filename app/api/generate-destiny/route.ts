import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateCacheKey, getCachedResult, setCachedResult } from "@/lib/destinyCache";
import { getClientIp, checkRateLimit, recordRequest } from "@/lib/rateLimiter";
import { calculateFourPillars } from "@/lib/saju";
import { prisma } from "@/lib/prisma";

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
      }
    } catch (dbError) {
      console.error("[Prisma] DB Error (non-fatal):", dbError);
      // We continue even if DB fails, to ensure the user gets their reading
    }

    // ==========================================
    // STEP 4: Final AI Generation (RAG Prompt Injection)
    // ==========================================
    const config = LOCALE_CONFIG[localeKey] || LOCALE_CONFIG.en;
    
    const injectedPrompt = `You are a Premium Eastern Saju Master named ${masterName}.
RULES: Write ENTIRELY in ${config.name}. ${config.toneGuide}

CLIENT INFO: Name=${name}, Gender=${gender}
CLIENT's DETERMINISTIC SAJU (DO NOT CALCULATE, STRICTLY USE THIS):
- Four Pillars: Year=${sajuResult.fourPillars.year}, Month=${sajuResult.fourPillars.month}, Day=${sajuResult.fourPillars.day}, Time=${sajuResult.fourPillars.time || "Unknown"}
- Day Master (Core Self): ${sajuResult.dayMaster}
- 5 Elements Score: ${JSON.stringify(sajuResult.elementsScore)}

PROPRIETARY IP CONTEXT (Use this to deeply color your analysis):
${dictionaryContext || "(Use standard Eastern Saju wisdom for " + sajuResult.dayMaster + " as Day Master)"}

TASK: Based on the injected deterministic Saju data and our proprietary interpretations, generate a highly detailed, premium "Deep Life Blueprint" report. 
Do NOT mention "Proprietary IP" or "Calculations" to the user, just deliver the mystic reading.

Return ONLY VALID JSON:
{
  "core_essence": "3-paragraph poetic analysis of their innate energy based strictly on the provided Day Master and Elements.",
  "imminent_karma_teaser": "1-sentence cliffhanger about the next 30 days.",
  "locked_secrets": "3-paragraph detailed remedies (colors, timings, directions).",
  "lucky_elements": ["Element1", "Element2"],
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
          return NextResponse.json(reportData, { status: 200 });

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
