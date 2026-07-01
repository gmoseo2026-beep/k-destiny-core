import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import { getClientIp, checkChatRateLimit, recordChatRequest } from "@/lib/rateLimiter";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Using the fastest models for instantaneous viral hook generation
const SYNC_MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

const LOCALE_LANGUAGES: Record<string, string> = {
  ko: "Korean (한국어)",
  en: "English",
  es: "Spanish (Español)",
  de: "German (Deutsch)",
  fr: "French (Français)",
  ja: "Japanese (日本語)",
};

const MODEL_TIMEOUT_MS = 45000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      userName, userDob, userTime, userGender, 
      guestName, guestDob, guestTime, guestGender, 
      locale = "en" 
    } = body;

    if (!userName || !userDob || !guestName || !guestDob) {
      return NextResponse.json(
        { error: "Both User and Guest details are required for an Energy Sync." },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(req);
    const rateCheck = checkChatRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Cosmic interference detected. Please try again later." },
        { status: 429 }
      );
    }

    const language = LOCALE_LANGUAGES[locale] || LOCALE_LANGUAGES.en;
    
    // The prompt is designed to be highly shareable, slightly exaggerated, and entertaining
    const prompt = `You are a mystical Eastern Saju (Cosmic Energy) matchmaker. 
Analyze the compatibility between two individuals based on their 5 Elements energy, incorporating their precise time of birth and gender for authentic Saju reading.
Write ENTIRELY in ${language}. Keep the tone extremely engaging, slightly dramatic, and witty (perfect for sharing on Instagram/TikTok).

User 1: ${userName} (DOB: ${userDob}, Time: ${userTime || "Unknown"}, Gender: ${userGender || "Unknown"})
User 2: ${guestName} (DOB: ${guestDob}, Time: ${guestTime || "Unknown"}, Gender: ${guestGender || "Unknown"})

Return a JSON object containing:
- "score": Compatibility score between 0 and 100
- "vibe": A 2-4 word punchy title for their dynamic
- "analysis": A 3-4 sentence highly entertaining analysis. **CRITICAL: Use line breaks (\\n\\n) between sentences to separate them into easy-to-read paragraphs! Do not output a single wall of text.**`;

    let lastError: any = null;

    for (const modelName of SYNC_MODEL_CHAIN) {
      try {
        console.log(`[Sync] Trying ${modelName} for locale: ${locale}`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                score: {
                  type: SchemaType.INTEGER,
                  description: "Compatibility score between 0 and 100",
                },
                vibe: {
                  type: SchemaType.STRING,
                  description: "A 2-4 word punchy title for their dynamic",
                },
                analysis: {
                  type: SchemaType.STRING,
                  description: "A 2-3 sentence highly entertaining analysis of how their energies interact",
                },
              },
              required: ["score", "vibe", "analysis"],
            },
          },
        });

        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), MODEL_TIMEOUT_MS)
          ),
        ]);

        let responseText = result.response.text();
        console.log("[Sync] Raw response text:", responseText);
        
        // Sanitize markdown code blocks if the model wrapped it
        if (responseText.startsWith("```")) {
          responseText = responseText.replace(/^```(json)?\n/, "").replace(/\n```$/, "");
        }

        const data = JSON.parse(responseText);

        if (typeof data.score === 'number' && data.vibe && data.analysis) {
          recordChatRequest(clientIp);
          console.log(`[Sync] ✅ Success with ${modelName}`);
          return NextResponse.json(data, { status: 200 });
        } else {
          throw new Error("Invalid JSON structure");
        }
      } catch (err: any) {
        console.warn(`[Sync] ${modelName} failed: ${err.message}`);
        lastError = err;
      }
    }

    throw lastError || new Error("All models failed");

  } catch (error: any) {
    console.error("[Sync] Cosmic error:", error);
    return NextResponse.json(
      { error: "Failed to sync energies. The universe is busy." },
      { status: 500 }
    );
  }
}
