import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// ───────── [STEP 1: Function Calling 스키마 정의] ─────────
const extractBirthDataTool = {
  functionDeclarations: [
    {
      name: "extract_birth_data",
      description: "Extracts the user's birth information from the conversation to accurately calculate their Four Pillars (Saju) in the backend.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          birth_date: { type: SchemaType.STRING, description: "Format: YYYY-MM-DD" },
          birth_time: { type: SchemaType.STRING, description: "Format: HH:MM in 24-hour format, or null if unknown" },
          birth_location: { type: SchemaType.STRING, description: "City and Country (e.g., 'New York, USA')" },
          gender: { type: SchemaType.STRING, description: "Gender: 'M' or 'F'" },
          is_lunar: { type: SchemaType.BOOLEAN, description: "True if the user specifies lunar calendar" }
        },
        required: ["birth_date", "gender", "birth_location"]
      }
    }
  ]
};
import { getClientIp, checkChatRateLimit, checkGuestChatLimit, recordChatRequest } from "@/lib/rateLimiter";
import { calculateFourPillars } from "@/lib/saju";
import { prisma } from "@/lib/prisma";
import { loadKarmaState, consumeKarma } from "@/lib/karma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { STYLE_GUIDE } from "@/lib/destinyGen";

// Vercel Serverless: allow up to 60s for chat (Function Calling can trigger 2 AI calls)
export const maxDuration = 60;

// ─── Initialize Gemini AI client ───
// GEMINI_API_KEY MUST be the BILLING-ENABLED project's key (paid tier is decided
// by the key's project, not by code). A stale free-project key = free-tier 429s.
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// ─── Paid-tier chain: 2.0-flash first (chat responsiveness), 2.5-flash as quality
//     fallback. Budget "flash-lite" removed. ───
const CHAT_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash"];

const LOCALE_LANGUAGES: Record<string, string> = {
  ko: "Korean (한국어)",
  en: "English",
  es: "Spanish (Español)",
  de: "German (Deutsch)",
  fr: "French (Français)",
  ja: "Japanese (日本語)",
};

// Fail fast to the next model instead of stalling users for 45s.
const MODEL_TIMEOUT_MS = 15000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { message, history, masterName, locale, profile } = body;

    // SECURITY: identity and premium status come from the server-side session,
    // never from the request body. The client used to send `userId` (spoofable →
    // drain another user's karma tokens, or send null → bypass the token gate
    // entirely) and `isPremium` (spoofable → free premium persona).
    const session = await getServerSession(authOptions);
    const sessionUserId: string | null = session?.user?.id || null;
    // Premium/admin status is resolved authoritatively from the DB in
    // loadKarmaState below (tier can be stale/expired in the session token).

    // ─── 0. Input Sanitization (prompt injection mitigation) ───
    if (typeof message === "string") {
      message = message.slice(0, 2000).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ""); // 2000 char limit + strip control chars
    }

    // ─── 1. Input Validation FIRST (before any DB queries) ───
    if (!message || !masterName) {
      return NextResponse.json(
        { error: "Missing message or masterName" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    // ─── 2. Rate Limit Check ───
    // FAIL-OPEN: a rate-limiter backend hiccup must never blank the chat.
    const clientIp = getClientIp(req);
    let rateCheck: { allowed: boolean; retryAfterMs?: number } = { allowed: true };
    try {
      rateCheck = await checkChatRateLimit(clientIp);
    } catch (e) {
      console.error("[Chat] rate limit check failed (fail-open):", (e as Error)?.message?.slice(0, 120));
    }
    if (!rateCheck.allowed) {
      const retryAfterSec = Math.ceil((rateCheck.retryAfterMs || 10000) / 1000);
      return NextResponse.json(
        { error: `Too many whispers to the stars. Try again in ${retryAfterSec}s.` },
        { status: 429 }
      );
    }

    // ─── 2.5 Guest backstop: 3 chats/day per IP without an account ───
    // Logged-in users are governed by karma tokens below; guests previously
    // had NO server-side cap beyond the general 100/day IP limit, i.e. free
    // unlimited Gemini usage for anyone who cleared localStorage.
    if (!sessionUserId) {
      try {
        const guestCheck = await checkGuestChatLimit(clientIp);
        if (!guestCheck.allowed) {
          return NextResponse.json(
            { error: "Free consultations exhausted. Create a free account to continue your reading." },
            { status: 403 }
          );
        }
      } catch (e) {
        console.error("[Chat] guest limit check failed (fail-open):", (e as Error)?.message?.slice(0, 120));
      }
    }

    // ─── 3. Karma Token Check (lib/karma = single source of truth) ───
    //   ADMIN → unlimited; PREMIUM → 20/day (refilled lazily here); FREE → static.
    const effectiveUserId = sessionUserId;
    let karmaTokens = 0;
    let isAdmin = false;
    let isPremiumActive = false;
    let shouldDecrementToken = false;

    if (effectiveUserId) {
      try {
        const state = await loadKarmaState(effectiveUserId);
        isAdmin = state.isAdmin;
        isPremiumActive = state.isPremiumActive;
        karmaTokens = state.karma;

        // Only ADMIN is unlimited. Premium consumes its 20/day; free consumes its
        // static tokens. Both are gated at 0 (premium refills tomorrow).
        if (!isAdmin && karmaTokens <= 0) {
          return NextResponse.json(
            {
              error: isPremiumActive
                ? "Daily Karma spent. Your 20 questions refresh tomorrow."
                : "Karma Energy depleted. Master is meditating.",
              remainingTokens: 0,
              dailyLimit: isPremiumActive,
            },
            { status: 403 }
          );
        }
        shouldDecrementToken = !isAdmin;
      } catch (e) {
        // FAIL-OPEN: a DB hiccup while loading karma must not blank the chat.
        // Let this turn proceed without decrementing rather than returning a 500.
        console.error("[Chat] karma load failed (fail-open):", (e as Error)?.message?.slice(0, 120));
        karmaTokens = 1;
        shouldDecrementToken = false;
      }
    }

    // Full, deep reading for anyone with real access: admin, active premium, OR a
    // signed-in user who still holds karma. Only guests / depleted accounts get
    // the short teaser + paywall.
    const hasFullAccess = isAdmin || isPremiumActive || (!!effectiveUserId && karmaTokens > 0);

    // ─── 4. Language Setup ───
    const language = LOCALE_LANGUAGES[locale || "en"] || "English";

    // ─── 5. Freemium vs Premium persona logic ───
    // Driven by real access (see hasFullAccess), NOT tier alone.
    const isPremiumUser = hasFullAccess;

    // Master personality mapping based on specialty
    const MASTER_PERSONALITIES: Record<string, string> = {
      "Master Ian": "Traditional, noble, deeply philosophical scholar. Your tone is formal and profound.",
      "Master Jin": "Sharp, logical, confident, dandy CEO. Your tone is decisive and practical.",
      "Master Ryu": "Cynical, dark, seductive bad boy. Your tone is dangerously charming and direct.",
      "Master Jay": "Trendy, Gen-Z slang, upbeat hipster. Your tone is energetic, informal, and fun.",
      "Master Muwi": "Minimalist, Zen, speaks softly. Your tone is sparse, calm, and void of excess.",
      "Master Rin": "Ethereal, elegant shaman. Your tone is poetic, lunar, and highly intuitive.",
      "Master Karma": "Dark, gothic, intense. Your tone is heavy with destiny, karma, and authority.",
      "Master Seoa": "Modern, objective analyst. Your tone is clinical, precise, and structural.",
      "Master Yura": "Luxurious, old-money elegance. Your tone is refined, graceful, and deeply motherly.",
      "Master Hana": "Vibrant pop-idol, highly energetic. Your tone is bubbly, encouraging, and bright.",
    };

    const masterPersonality = MASTER_PERSONALITIES[masterName] || "You speak with wise, mystical authority.";

    let systemPart = `You are ${masterName}. Personality: ${masterPersonality} NEVER break character.

CRITICAL JSON FORMAT RULE:
You MUST output your ENTIRE response as a valid JSON object. Do not include markdown code blocks like \`\`\`json. Just the raw JSON object.
Format:
{
  "emotion": "choose exactly one from: calm, joy, warn, surprise, sullen",
  "message": "your response here"
}

TWO-PART STRUCTURE RULE:
Step 1 (Human Connection): Start by chatting normally and empathetically based ONLY on your personality. DO NOT mention Saju, stars, or destiny yet.
Step 2 (Reading): Smoothly transition (e.g. 'But looking at how you carry yourself...') into a reading of their energy — in plain, human language. No hanja, no jargon.

${STYLE_GUIDE}

EMOTION RULE:
Analyze the vibe of your response and choose exactly one emotion that matches it: 'calm', 'joy', 'warn', 'surprise', or 'sullen'.`;

    if (isPremiumUser) {
      systemPart += `

PREMIUM RULE:
- For Step 2, give a real, substantial reading — but keep it to a few SHORT paragraphs (2-4 sentences each), not a wall of text.
- Do NOT use "##" headers or hanja. Plain, warm, readable prose only.
- Give one or two concrete, actionable remedies (a color, a timing) woven naturally into the sentences — not as a bullet list.
- Write your message in ${language}. Do NOT mix languages.`;
    } else {
      systemPart += `

FREEMIUM RULE:
- Keep both Step 1 and Step 2 extremely short (1-2 sentences total).
- Be vague yet captivating. Make them DESPERATE to know more.
- Do NOT provide detailed advice or specific remedies.
- You MUST end your message EXACTLY with this string:
[SYSTEM_PAYWALL]
- Write your message in ${language}, except for the [SYSTEM_PAYWALL] tag which must be exact.`;
    }

    // Convert history array into a readable conversation context
    let conversationContext = "";
    
    // Inject user profile if available
    if (profile) {
      conversationContext += `--- User Profile (Saju Context) ---\n`;
      conversationContext += `Name: ${profile.name || "Unknown"}\n`;
      conversationContext += `DOB: ${profile.year}-${profile.month}-${profile.day}\n`;
      conversationContext += `Time: ${profile.unknownTime ? "Unknown" : profile.time}\n`;
      conversationContext += `Gender: ${profile.gender || "Unknown"}\n`;
      conversationContext += `Location: ${profile.city || "Unknown"}, ${profile.country || "Unknown"}\n`;
      conversationContext += `--- End of User Profile ---\n\n`;
    }

    if (history && Array.isArray(history) && history.length > 0) {
      conversationContext += "--- Previous conversation ---\n";
      for (const entry of history) {
        const role = entry.role === "user" ? "User" : masterName;
        const text = entry.parts?.[0]?.text || "";
        if (text) {
          conversationContext += `${role}: ${text}\n`;
        }
      }
      conversationContext += "--- End of previous conversation ---\n\n";
    }

    const fullPrompt = `${conversationContext}User: ${message}\n${masterName}:`;

    let lastError: any = null;

    // ─── 6. Model Fallback Logic ───
    const MAX_RETRIES = 1; // 1 retry per model

    for (const modelName of CHAT_MODELS) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const suffix = attempt > 0 ? ` (retry ${attempt})` : "";
          console.log(`[Chat] Trying model: ${modelName}${suffix}`);

          const model = genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: systemPart,
            tools: [extractBirthDataTool as any],
            generationConfig: { maxOutputTokens: 2048 }
          });

        const generateResult = await Promise.race([
          model.generateContent(fullPrompt),
          new Promise<any>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Timed out after ${MODEL_TIMEOUT_MS}ms`)),
              MODEL_TIMEOUT_MS
            )
          ),
        ]);

        const response = generateResult.response;
        const functionCalls = response.functionCalls();
        
        let parsed;
        
        // ───────── [STEP 2 & 3: 정보 추출 및 백엔드 사주 계산 후 2차 호출] ─────────
        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls.find((c: any) => c.name === "extract_birth_data");
          if (call) {
            const args = call.args;
            console.log("[Chat] 🎯 사주 정보 추출 성공:", args);
            
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!args.birth_date || !dateRegex.test(args.birth_date)) {
              throw new Error("Invalid birth_date format extracted by AI");
            }
            if (!args.gender || !["M", "F"].includes(args.gender)) {
              throw new Error("Invalid gender extracted by AI");
            }

            const sajuResult = calculateFourPillars(
              args.birth_date,
              args.birth_time || null,
              args.gender,
              args.birth_location || "Unknown"
            );

            let dictionaryContext = "";
            try {
              const queryConditions: any[] = [
                { category: "DAY_MASTER", signKey: sajuResult.dayMasterSignKey },
              ];
              for (const lackKey of sajuResult.elementLacks) {
                queryConditions.push({ category: "ELEMENT_LACK", signKey: lackKey });
              }

              // Run dictionary fetch + profile upsert in parallel (saves ~300ms)
              const [sajuDocs] = await Promise.all([
                prisma.sajuContentDictionary.findMany({
                  where: { OR: queryConditions },
                }),
                effectiveUserId
                  ? prisma.userSajuProfile.upsert({
                      where: { userId: effectiveUserId },
                      update: {
                        gender: args.gender,
                        fourPillars: sajuResult.fourPillars,
                        dayMaster: sajuResult.dayMaster,
                        elementsScore: sajuResult.elementsScore,
                      },
                      create: {
                        userId: effectiveUserId,
                        gender: args.gender,
                        fourPillars: sajuResult.fourPillars,
                        dayMaster: sajuResult.dayMaster,
                        elementsScore: sajuResult.elementsScore,
                      }
                    }).then(() => {
                      revalidatePath('/', 'layout');
                      revalidatePath('/[locale]/dashboard', 'page');
                    })
                  : Promise.resolve(),
              ]);

              if (sajuDocs.length > 0) {
                dictionaryContext = sajuDocs.map(doc => `[${doc.category}] ${doc.signKey}: ${doc.englishContent}`).join("\n");
              }
            } catch (dbError) {
              console.error("[Chat] DB Error (non-fatal):", dbError);
            }

            const injectedSystemInstruction = `
${systemPart}

[SYSTEM INJECTION: 사주 직접 계산 절대 금지!]
당신은 백엔드에서 계산된 아래의 완벽한 데이터를 기반으로만 사주를 해석해야 합니다. 
절대 자체적으로 사주를 계산하거나 추론하지 마십시오.

<백엔드 제공 사주 원국 (Four Pillars)>
- 성별: ${args.gender === "M" ? "남자" : "여자"}
- 년주(Year): ${sajuResult.fourPillars.year}
- 월주(Month): ${sajuResult.fourPillars.month}
- 일주(Day): ${sajuResult.fourPillars.day}
- 시주(Time): ${sajuResult.fourPillars.time || "Unknown"}
- 일간(Core Self): ${sajuResult.dayMaster}
- 오행 점수: ${JSON.stringify(sajuResult.elementsScore)}
</백엔드 제공 사주 원국>

<K-Destiny 독점 해석 가이드 (Proprietary IP)>
${dictionaryContext || "표준 명리학적 해석을 사용하십시오."}
</K-Destiny 독점 해석 가이드>
`;

            const secondModel = genAI.getGenerativeModel({
              model: modelName,
              systemInstruction: injectedSystemInstruction,
              generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2048 }
            });

            console.log("[Chat] 🔄 완벽한 사주 데이터를 주입하여 2차 추론을 시작합니다...");
            // TIMEOUT: the 2nd call previously had NO timeout — if Gemini stalled,
            // the whole request hung until the platform killed it (blank chat).
            const finalResult: any = await Promise.race([
              secondModel.generateContent(fullPrompt),
              new Promise<never>((_, rej) =>
                setTimeout(() => rej(new Error(`Timed out after ${MODEL_TIMEOUT_MS}ms (2nd call)`)), MODEL_TIMEOUT_MS)
              ),
            ]);
            const finalResponseText = finalResult.response.text();
            
            try {
              const cleaned = finalResponseText.replace(/^```json\n?/, '').replace(/```$/, '').trim();
              parsed = JSON.parse(cleaned);
            } catch (e) {
              console.error("JSON parse error (2nd call):", finalResponseText);
              throw new Error("Failed to parse response");
            }
          } else {
            throw new Error("Unknown function call");
          }
        } else {
          const responseText = response.text();
          try {
            const cleaned = responseText.replace(/^```json\n?/, '').replace(/```$/, '').trim();
            parsed = JSON.parse(cleaned);
          } catch (e) {
            console.error("JSON parse error (1st call):", responseText);
            throw new Error("Failed to parse response");
          }
        }

        // ─── 7. Validation ───
        if (!parsed.message || !parsed.emotion) throw new Error("Missing fields");

        // ─── 8. SUCCESS — consume one karma token (ADMIN exempt) ───
        // remainingTokens is authoritative: the client mirrors it instead of its
        // own optimistic localStorage guess. null = unlimited (admin/guest).
        let remainingTokens: number | null =
          isAdmin || !effectiveUserId ? null : karmaTokens;
        if (shouldDecrementToken && effectiveUserId) {
          try {
            remainingTokens = await consumeKarma(effectiveUserId);
          } catch (decrementError) {
            console.error("[Chat] Error decrementing usage token:", decrementError);
            remainingTokens = Math.max(0, karmaTokens - 1);
          }
        }

        recordChatRequest(clientIp);

        console.log(`[Chat] Success with model: ${modelName}${suffix}`);
        return NextResponse.json({ reply: parsed.message, emotion: parsed.emotion, remainingTokens }, { status: 200 });

      } catch (err: any) {
        lastError = err;
        const msg = err.message?.substring(0, 150) || "Unknown error";
        console.warn(`[Chat] ${modelName} attempt ${attempt} failed: ${msg}`);
        
        // If high demand/rate limit/timeout, skip retry and immediately fallback to backup model
        if (msg.includes("503") || msg.includes("429") || msg.includes("Timeout")) {
          break; 
        }
      }
    }
    }

    // All models failed — token was NOT consumed. `fallback: true` tells the
    // client this is a non-answer so it refunds the karma it optimistically
    // deducted (previously it kept the charge for the "meditating" message).
    console.error("[Chat] All models failed in chat route. Last error:", lastError);
    return NextResponse.json(
      {
        reply: "마스터 카르마가 현재 깊은 명상 중입니다. 잠시 후 다시 말을 걸어주세요.",
        emotion: "calm",
        fallback: true,
        remainingTokens: isAdmin || !effectiveUserId ? null : karmaTokens,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error in chat API route:", error);
    // NEVER blank the chat UI: even on a fatal/unexpected error (DB down, bad
    // input, etc.) return a graceful in-character 200 so the user always sees a reply.
    return NextResponse.json(
      {
        reply: "지금 별들의 기운이 잠시 흐트러졌습니다. 잠시 후 다시 말을 걸어주세요.",
        emotion: "calm",
        fallback: true,
        remainingTokens: null,
      },
      { status: 200 }
    );
  }
}
