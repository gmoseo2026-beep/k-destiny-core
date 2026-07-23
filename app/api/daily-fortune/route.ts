import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { STYLE_GUIDE } from "@/lib/destinyGen";
import { backupAvailable, backupJSON } from "@/lib/aiFallback";

export const maxDuration = 60;

// GEMINI_API_KEY MUST be the BILLING-ENABLED project's key (paid tier is decided
// by the key's project, not by code). A stale free-project key = free-tier 429s.
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// ─── Paid-tier chain: 2.0-flash first (fast), 2.5-flash as quality fallback.
//     Budget "flash-lite" removed. ───
const MODELS = ["gemini-2.0-flash", "gemini-2.5-flash"];
const MODEL_TIMEOUT_MS = 15000;
const MAX_RETRIES = 1;

const LOCALE_CONFIG: Record<string, string> = {
  ko: "Korean", en: "English", ja: "Japanese",
  es: "Spanish", de: "German", fr: "French",
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

// ─── Deterministic mock fortune for when all AI models fail ───
function generateMockFortune(dayMasterKey: string, locale: string) {
  const isKo = locale === "ko";
  const isJa = locale === "ja";

  const elementLabels: Record<string, Record<string, string>> = {
    WOOD_YANG: { ko: "갑목(甲木)", en: "Yang Wood", ja: "甲木" },
    WOOD_YIN: { ko: "을목(乙木)", en: "Yin Wood", ja: "乙木" },
    FIRE_YANG: { ko: "병화(丙火)", en: "Yang Fire", ja: "丙火" },
    FIRE_YIN: { ko: "정화(丁火)", en: "Yin Fire", ja: "丁火" },
    EARTH_YANG: { ko: "무토(戊土)", en: "Yang Earth", ja: "戊土" },
    EARTH_YIN: { ko: "기토(己土)", en: "Yin Earth", ja: "己土" },
    METAL_YANG: { ko: "경금(庚金)", en: "Yang Metal", ja: "庚金" },
    METAL_YIN: { ko: "신금(辛金)", en: "Yin Metal", ja: "辛金" },
    WATER_YANG: { ko: "임수(壬水)", en: "Yang Water", ja: "壬水" },
    WATER_YIN: { ko: "계수(癸水)", en: "Yin Water", ja: "癸水" },
  };

  const element = elementLabels[dayMasterKey]?.[locale] || elementLabels[dayMasterKey]?.en || dayMasterKey;

  const summaries: Record<string, string> = {
    ko: `오늘은 ${element}의 에너지가 우주와 조화를 이루는 날입니다. 내면의 직감을 믿으세요.`,
    en: `Today, ${element} energy harmonizes with the cosmos. Trust your inner intuition.`,
    ja: `今日は${element}のエネルギーが宇宙と調和する日です。内なる直感を信じてください。`,
  };

  const fullContents: Record<string, string> = {
    ko: `오늘 당신의 ${element} 에너지는 안정적인 흐름을 보이고 있습니다. 특히 오전 시간대에 창의적 에너지가 높아지므로, 중요한 업무나 결정은 오전에 집중하시는 것이 좋습니다.\n\n인간관계에서는 부드러운 소통이 열쇠입니다. 오후에는 가까운 사람과의 대화에서 뜻밖의 영감을 얻을 수 있습니다. 특히 수(水)의 에너지를 가진 사람과의 만남이 길합니다.\n\n재물운은 안정적이나, 충동적인 소비는 피하세요. 저녁 시간에 잠시 명상을 하면 내일의 에너지를 미리 충전할 수 있습니다.`,
    en: `Your ${element} energy flows steadily today. Creative energy peaks in the morning hours, so focus important work and decisions before noon.\n\nIn relationships, gentle communication is key. Afternoon conversations with close ones may bring unexpected inspiration. Encounters with Water-energy individuals are particularly auspicious.\n\nWealth fortune is stable, but avoid impulsive spending. Evening meditation will help recharge tomorrow's energy reserves.`,
    ja: `今日のあなたの${element}エネルギーは安定した流れを見せています。特に午前中にクリエイティブなエネルギーが高まりますので、重要な仕事や決定は午前中に集中するのが良いでしょう。\n\n人間関係では柔らかなコミュニケーションが鍵です。午後には親しい人との会話から思わぬインスピレーションを得られるかもしれません。\n\n財運は安定していますが、衝動的な消費は避けてください。夕方の瞑想で明日のエネルギーを事前に充電できます。`,
  };

  const colors: Record<string, string> = { ko: "남색", en: "Navy Blue", ja: "紺色" };
  const numbers: Record<string, string> = { ko: "3", en: "3", ja: "3" };
  const dirs: Record<string, string> = { ko: "북동", en: "Northeast", ja: "北東" };

  return {
    summary: summaries[locale] || summaries.en,
    fullContent: fullContents[locale] || fullContents.en,
    luckyColor: colors[locale] || colors.en,
    luckyNumber: numbers[locale] || numbers.en,
    luckyDir: dirs[locale] || dirs.en,
  };
}

export async function GET(req: NextRequest) {
  try {
    const dayMasterKey = req.nextUrl.searchParams.get("dayMasterKey") || "WOOD_YANG";
    const locale = req.nextUrl.searchParams.get("locale") || "en";
    const today = new Date().toISOString().slice(0, 10);

    // 1. DB Cache Check
    try {
      const cached = await prisma.dailyFortune.findUnique({
        where: { dayMasterKey_locale_date: { dayMasterKey, locale, date: today } },
      });

      if (cached) {
        return NextResponse.json({
          summary: cached.summary, fullContent: cached.fullContent,
          luckyColor: cached.luckyColor, luckyNumber: cached.luckyNumber,
          luckyDir: cached.luckyDir, date: today, cached: true,
        });
      }
    } catch (dbError) {
      console.error("[Daily Fortune] DB cache check failed (non-fatal):", dbError);
      // Continue to AI generation even if DB is down
    }

    if (!apiKey) {
      // No API key — return mock
      console.warn("[Daily Fortune] No API key, using mock fallback");
      const mock = generateMockFortune(dayMasterKey, locale);
      return NextResponse.json({ ...mock, date: today, cached: false, fallback: true });
    }

    const lang = LOCALE_CONFIG[locale] || "English";
    const prompt = `You are a masterful fortune-teller with a warm, vivid, specific voice. Write in ${lang}.
Today: ${today}. Day Master: ${dayMasterKey}.

${STYLE_GUIDE}

Write today's fortune so it feels personal and USEFUL, never generic. Requirements:
- summary: one punchy, human sentence that captures today's mood. No hanja, no jargon.
- fullContent: 3 SHORT paragraphs (each 2-3 sentences), blank line between them, never ending mid-sentence. Para 1 = today's overall mood + the best time-of-day window to act. Para 2 = people & communication, with one concrete tip. Para 3 = money/work + one thing to avoid today. Be specific and encouraging, in plain words — no element theory, no hanja.
Return ONLY JSON: {"summary":"...","fullContent":"...","luckyColor":"...","luckyNumber":"...","luckyDir":"..."}`;

    let lastError: any = null;

    // 2. Model Fallback Chain
    for (const modelName of MODELS) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[Daily Fortune] Try ${modelName} (attempt ${attempt})`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json", temperature: 0.7, maxOutputTokens: 3072 },
          });

          const result = await Promise.race([
            model.generateContent(prompt),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Timeout")), MODEL_TIMEOUT_MS)),
          ]);

          const rawText = result.response.text();
          let data = null;
          try {
            data = JSON.parse(rawText);
          } catch {
            data = repairJSON(rawText);
          }

          if (!data || !data.summary || !data.fullContent) {
            throw new Error("Invalid fortune data structure");
          }

          // 3. Cache to DB (non-blocking, fire-and-forget)
          try {
            await prisma.dailyFortune.create({
              data: {
                dayMasterKey, locale, date: today,
                summary: data.summary, fullContent: data.fullContent,
                luckyColor: data.luckyColor || null, luckyNumber: data.luckyNumber || null, luckyDir: data.luckyDir || null,
              },
            });
          } catch (dbWriteError) {
            // Duplicate key or DB error — not critical, we still return the result
            console.warn("[Daily Fortune] DB write failed (non-fatal):", (dbWriteError as Error).message?.substring(0, 100));
          }

          console.log(`[Daily Fortune] ✅ Success with ${modelName}`);
          return NextResponse.json({ ...data, date: today, cached: false });
        } catch (err: any) {
          lastError = err;
          console.warn(`[Daily Fortune] ${modelName} attempt ${attempt} failed: ${err.message?.substring(0, 100)}`);

          const msg = err.message || "";
          if (msg.includes("503") || msg.includes("429") || msg.includes("Timeout") || msg.includes("RESOURCE_EXHAUSTED")) {
            break;
          }
        }
      }
    }

    // ─── BACKUP PROVIDER (OpenAI): real fortune when Gemini is down, before mock ───
    if (backupAvailable()) {
      try {
        const data = await backupJSON({ system: `Write in ${lang}. Return ONLY the JSON object.`, user: prompt, maxTokens: 3072, temperature: 0.7 });
        if (data?.summary && data?.fullContent) {
          try {
            await prisma.dailyFortune.create({
              data: {
                dayMasterKey, locale, date: today,
                summary: data.summary, fullContent: data.fullContent,
                luckyColor: data.luckyColor || null, luckyNumber: data.luckyNumber || null, luckyDir: data.luckyDir || null,
              },
            });
          } catch { /* duplicate/DB write — non-fatal */ }
          console.log("[Daily Fortune] ✅ Served by OpenAI backup provider");
          return NextResponse.json({ ...data, date: today, cached: false, backup: true });
        }
      } catch (backupErr: any) {
        console.error("[Daily Fortune] OpenAI backup failed:", backupErr?.message?.slice(0, 150));
      }
    }

    // ─── GRACEFUL FALLBACK: Return mock instead of error ───
    console.error("[Daily Fortune] All providers failed. Using mock fallback. Last error:", lastError?.message);
    const mock = generateMockFortune(dayMasterKey, locale);
    return NextResponse.json({ ...mock, date: today, cached: false, fallback: true });
  } catch (error: any) {
    console.error("[Daily Fortune] Fatal error:", error);
    // Even fatal errors return a mock result instead of 500
    const dayMasterKey = "WOOD_YANG";
    const locale = "en";
    const today = new Date().toISOString().slice(0, 10);
    const mock = generateMockFortune(dayMasterKey, locale);
    return NextResponse.json({ ...mock, date: today, cached: false, fallback: true });
  }
}
