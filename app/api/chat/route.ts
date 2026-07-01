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
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { getClientIp, checkChatRateLimit, recordChatRequest } from "@/lib/rateLimiter";
import { supabase } from "@/lib/supabaseClient";
import { calculateFourPillars } from "@/lib/saju";
import { prisma } from "@/lib/prisma";

// Vercel Serverless: allow up to 60s for chat (Function Calling can trigger 2 AI calls)
export const maxDuration = 60;

// ─── Initialize Gemini AI client ───
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// ─── Stable single model for VPS (no aggressive fallback loop) ───
const CHAT_MODEL = "gemini-2.5-flash";

const LOCALE_LANGUAGES: Record<string, string> = {
  ko: "Korean (한국어)",
  en: "English",
  es: "Spanish (Español)",
  de: "German (Deutsch)",
  fr: "French (Français)",
  ja: "Japanese (日本語)",
};

// VPS-safe timeout — 55s to avoid premature kills on Contabo
const MODEL_TIMEOUT_MS = 55000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { message, history, masterName, locale, isPremium, userId, profile } = body;

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
    const clientIp = getClientIp(req);
    const rateCheck = checkChatRateLimit(clientIp);
    if (!rateCheck.allowed) {
      const retryAfterSec = Math.ceil((rateCheck.retryAfterMs || 10000) / 1000);
      return NextResponse.json(
        { error: `Too many whispers to the stars. Try again in ${retryAfterSec}s.` },
        { status: 429 }
      );
    }

    // ─── 3. Karma Token Check (Supabase) ───
    // Only enforce token logic if Supabase is configured and userId is provided
    const effectiveUserId = userId || null;
    let shouldDecrementToken = false;

    if (supabase && effectiveUserId) {
      // Fetch current balance to check if user has tokens
      const { data: userRecord, error: fetchError } = await supabase
        .from("users")
        .select("karma_tokens")
        .eq("id", effectiveUserId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("[Chat] Error fetching karma_tokens:", fetchError);
      }

      const karmaTokens = userRecord?.karma_tokens ?? 0;

      // If tokens are depleted, block the request
      if (karmaTokens <= 0) {
        return NextResponse.json(
          { error: "Karma Energy depleted. Master is meditating." },
          { status: 403 }
        );
      }

      // Mark that we need to decrement AFTER successful AI response
      shouldDecrementToken = true;
    }

    // ─── 4. Language Setup ───
    const language = LOCALE_LANGUAGES[locale || "en"] || "English";

    // ─── 5. Freemium vs Premium persona logic ───
    const isPremiumUser = !!isPremium;

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
Step 2 (Astrology): Smoothly transition (e.g. 'But looking at your energy flow...') into a professional 5-Elements Saju analysis.

EMOTION RULE:
Analyze the vibe of your response and choose exactly one emotion that matches it: 'calm', 'joy', 'warn', 'surprise', or 'sullen'.`;

    if (isPremiumUser) {
      systemPart += `

PREMIUM RULE:
- Give deep, multi-paragraph advice for Step 2.
- Structure your response with clear sections using "##" headers.
- Provide actionable remedies (colors, timings).
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

    // ─── 6. Single stable model call with simple retry ───
    const MAX_RETRIES = 1; // 1 retry = 2 total attempts

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const suffix = attempt > 0 ? ` (retry ${attempt})` : "";
        console.log(`[Chat] Trying model: ${CHAT_MODEL}${suffix}`);

        const model = genAI.getGenerativeModel({ 
          model: CHAT_MODEL,
          systemInstruction: systemPart,
          tools: [extractBirthDataTool as any],
          generationConfig: {}
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

              const sajuDocs = await prisma.sajuContentDictionary.findMany({
                where: { OR: queryConditions },
              });

              if (sajuDocs.length > 0) {
                dictionaryContext = sajuDocs.map(doc => `[${doc.category}] ${doc.signKey}: ${doc.englishContent}`).join("\n");
              }

              if (effectiveUserId) {
                await prisma.userSajuProfile.upsert({
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
                });
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
              model: CHAT_MODEL,
              systemInstruction: injectedSystemInstruction,
              generationConfig: { responseMimeType: "application/json" }
            });

            console.log("[Chat] 🔄 완벽한 사주 데이터를 주입하여 2차 추론을 시작합니다...");
            const finalResult = await secondModel.generateContent(fullPrompt);
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

        // ─── 8. SUCCESS — Atomically decrement karma token ───
        if (supabase && shouldDecrementToken && effectiveUserId) {
          const { error: decrementError } = await supabase.rpc('decrement_karma', {
            user_id_input: effectiveUserId,
          });

          if (decrementError) {
            console.warn("[Chat] RPC fallback — using direct update:", decrementError.message);
            await supabase
              .from("users")
              .update({ karma_tokens: supabase.raw?.('karma_tokens - 1') || 0 })
              .eq("id", effectiveUserId)
              .gt("karma_tokens", 0);
          }
        }

        // ─── 8.5. Save Chat History to Supabase ───
        if (supabase && effectiveUserId) {
          const { error: insertError } = await supabase.from("saju_reports").insert({
            user_id: effectiveUserId,
            type: "Chat",
            content: {
              masterName: masterName,
              userMessage: message,
              aiResponse: parsed.message,
              emotion: parsed.emotion
            },
          });
          
          if (insertError) {
            console.error("[Chat] Error saving chat history:", insertError);
          }
        }

        recordChatRequest(clientIp);

        console.log(`[Chat] Success with model: ${CHAT_MODEL}${suffix}`);
        return NextResponse.json({ reply: parsed.message, emotion: parsed.emotion }, { status: 200 });

      } catch (err: any) {
        lastError = err;
        const msg = err.message?.substring(0, 150) || "Unknown error";
        console.warn(`[Chat] ${CHAT_MODEL} attempt ${attempt} failed: ${msg}`);
      }
    }

    // All models failed — token was NOT consumed (correct behavior)
    console.error("[Chat] All models failed in chat route. Last error:", lastError);
    return NextResponse.json(
      { error: `The mystical connection failed. (Detail: ${lastError?.message || lastError})` },
      { status: 503 }
    );

  } catch (error: any) {
    console.error("Error in chat API route:", error);
    return NextResponse.json(
      { error: error.message || "Failed to communicate with master" },
      { status: 500 }
    );
  }
}
