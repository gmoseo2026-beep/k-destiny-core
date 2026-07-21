import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { getClientIp, checkChatRateLimit, recordChatRequest } from "@/lib/rateLimiter";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// ─── Model Fallback Chain (valid model names) ───
const SYNC_MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const MODEL_TIMEOUT_MS = 45000;
const MAX_RETRIES = 1;

const LOCALE_LANGUAGES: Record<string, string> = {
  ko: "Korean (한국어)",
  en: "English",
  es: "Spanish (Español)",
  de: "German (Deutsch)",
  fr: "French (Français)",
  ja: "Japanese (日本語)",
};

// ─── Helper: Repair broken JSON ───
function repairJSON(raw: string): any {
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }
  return null;
}

// ─── Deterministic mock fallback for sync results ───
function generateMockSync(userName: string, guestName: string, locale: string) {
  const isKo = locale === "ko";
  const isJa = locale === "ja";
  
  // Deterministic score based on names
  let hash = 0;
  const combined = userName + guestName;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash + combined.charCodeAt(i)) >>> 0;
  }
  const score = 55 + (hash % 40); // Range: 55-94

  const vibes: Record<string, string[]> = {
    ko: ["불꽃 케미", "운명적 조화", "따뜻한 시너지", "깊은 공명"],
    en: ["Electric Chemistry", "Destined Harmony", "Warm Synergy", "Deep Resonance"],
    ja: ["電撃ケミストリー", "運命的調和", "温かいシナジー", "深い共鳴"],
  };
  const vibeList = vibes[locale] || vibes.en;
  const vibe = vibeList[hash % vibeList.length];

  const analyses: Record<string, string> = {
    ko: `${userName}님과 ${guestName}님의 에너지는 오행의 관점에서 매우 흥미로운 조합을 이루고 있습니다. 두 분의 기운이 만나면 마치 봄바람이 꽃을 피우듯, 서로의 부족한 부분을 자연스럽게 채워주는 보완적 관계가 형성됩니다.\n\n특히 감정적 교류에서 강한 공명이 감지됩니다. ${userName}님의 에너지가 안정감을 제공하고, ${guestName}님의 활력이 관계에 새로운 바람을 불어넣습니다. 이 조합은 시간이 지날수록 더 깊어지는 특성을 가지고 있습니다.\n\n다만, 가끔 의견 충돌이 발생할 수 있는데, 이는 서로 다른 원소의 에너지가 부딪히는 자연스러운 현상입니다. 이때 양보와 이해가 관계를 한 단계 더 성장시키는 열쇠가 될 것입니다.`,
    en: `${userName} and ${guestName}'s energies form a fascinating combination from the Five Elements perspective. When your energies meet, they naturally complement each other's deficiencies, like spring wind coaxing flowers to bloom.\n\nA strong resonance is detected particularly in emotional exchanges. ${userName}'s energy provides stability, while ${guestName}'s vitality brings fresh winds to the relationship. This combination characteristically deepens over time.\n\nOccasional clashes of opinion may arise — a natural phenomenon when different elemental energies collide. Mutual compromise and understanding will be the key to elevating the relationship to new heights.`,
    ja: `${userName}さんと${guestName}さんのエネルギーは、五行の観点から非常に興味深い組み合わせを形成しています。お二人の気が出会うと、春風が花を咲かせるように、互いの不足を自然に補い合う関係が生まれます。\n\n特に感情的な交流において強い共鳴が感知されます。${userName}さんのエネルギーが安定感を提供し、${guestName}さんの活力が関係に新しい風を吹き込みます。\n\nただし、時折意見の衝突が起こる可能性がありますが、これは異なる元素のエネルギーがぶつかる自然な現象です。`,
  };

  return {
    score,
    vibe,
    analysis: analyses[locale] || analyses.en,
  };
}

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
    const rateCheck = await checkChatRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Cosmic interference detected. Please try again later." },
        { status: 429 }
      );
    }

    if (!apiKey) {
      // No API key — return mock
      console.warn("[Sync] No API key, using mock fallback");
      const mock = generateMockSync(userName, guestName, locale);
      recordChatRequest(clientIp);
      return NextResponse.json({ ...mock, fallback: true }, { status: 200 });
    }

    const language = LOCALE_LANGUAGES[locale] || LOCALE_LANGUAGES.en;
    
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
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[Sync] Try ${modelName} (attempt ${attempt}) for locale: ${locale}`);
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
          let data = null;
          
          try {
            data = JSON.parse(responseText);
          } catch {
            data = repairJSON(responseText);
          }

          if (data && typeof data.score === 'number' && data.vibe && data.analysis) {
            recordChatRequest(clientIp);
            console.log(`[Sync] ✅ Success with ${modelName}`);
            return NextResponse.json(data, { status: 200 });
          } else {
            throw new Error("Invalid JSON structure from AI");
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[Sync] ${modelName} attempt ${attempt} failed: ${err.message?.substring(0, 100)}`);

          const msg = err.message || "";
          if (msg.includes("503") || msg.includes("429") || msg.includes("Timeout") || msg.includes("RESOURCE_EXHAUSTED")) {
            break;
          }
        }
      }
    }

    // ─── GRACEFUL FALLBACK: Return mock instead of error ───
    console.error("[Sync] All models failed. Using mock fallback. Last error:", lastError?.message);
    const mock = generateMockSync(userName, guestName, locale);
    recordChatRequest(clientIp);
    return NextResponse.json({ ...mock, fallback: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Sync] Fatal error:", error);
    // Even fatal errors return a mock result
    return NextResponse.json(
      { score: 72, vibe: "Cosmic Harmony", analysis: "Your energies create a beautiful dance of complementary forces. The universe sees potential in this connection.", fallback: true },
      { status: 200 }
    );
  }
}
