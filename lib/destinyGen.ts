/**
 * Shared helpers for destiny generation (free streaming phase + premium sections).
 *
 * SPEED NOTE: LLM latency is dominated by OUTPUT tokens (sequential decoding).
 * The free result only needs core_essence + a teaser + short paywall previews,
 * so we generate ONLY that on the hot path and defer the full locked sections
 * to /api/generate-destiny/sections (called after unlock, off the critical path).
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Reliability-first ordering. On Gemini's lower tiers, 2.5-flash is the model
// most often hit by 429/503/RESOURCE_EXHAUSTED, so putting it FIRST made every
// route wait out a timeout before falling back to a generic mock. 2.0-flash is
// faster, far more available, and plenty capable — so it leads everywhere. 2.5
// stays in the chain as a quality safety net, never as the blocking first hop.
export const FREE_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"];
// Premium sections run post-payment: 2.0-flash first (fast + reliable), 2.5 as
// the quality fallback, lite last.
export const PREMIUM_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.0-flash-lite"];

export const LOCALE_CONFIG: Record<string, { name: string; toneGuide: string }> = {
  ko: { name: "Korean (한국어)", toneGuide: "자연스러운 한국어 문어체 존댓말을 사용하세요. 어두운 다크 판타지 톤과 시적 표현을 곁들이세요." },
  en: { name: "English", toneGuide: "Write in a dark-fantasy, premium, mystical English tone." },
  es: { name: "Spanish (Español)", toneGuide: "Escribe en un español elegante y místico." },
  de: { name: "German (Deutsch)", toneGuide: "Schreibe in einem eleganten, mystischen Deutsch." },
  fr: { name: "French (Français)", toneGuide: "Écrivez en français élégant et mystique." },
  ja: { name: "Japanese (日本語)", toneGuide: "自然な日本語の丁寧語で書いてください。東洋占術の深みのある解釈と詩的な表現を使い、ダークファンタジーの雰囲気を出してください。" },
};

/** Marker separating streamed prose (core_essence) from the trailing JSON block. */
export const JSON_MARKER = "§§§JSON§§§";

/** Best-effort JSON recovery from a possibly-fenced / noisy model response. */
export function repairJSON(raw: string): any {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  return null;
}

/**
 * Deterministic "lucky elements" = the elements the chart lacks most (the
 * classic 용신/보완 elements). Computed from the saju, so it needs NO AI call.
 * Returns lowercase English keys the client's ELEMENT_MAP understands.
 */
export function pickLuckyElements(score: Record<string, number>): string[] {
  return Object.entries(score)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([key]) => key);
}

/** Shared saju context block for prompts. */
export function sajuContextBlock(params: {
  name: string; gender: string; dayMaster: string;
  fourPillars: { year: string; month: string; day: string; time: string | null };
  elementsScore: Record<string, number>;
  dictionaryContext: string;
}): string {
  const { name, gender, dayMaster, fourPillars, elementsScore, dictionaryContext } = params;
  return `CLIENT INFO: Name=${name}, Gender=${gender}
CLIENT's DETERMINISTIC SAJU (DO NOT CALCULATE, STRICTLY USE THIS):
- Four Pillars: Year=${fourPillars.year}, Month=${fourPillars.month}, Day=${fourPillars.day}, Time=${fourPillars.time || "Unknown"}
- Day Master (Core Self): ${dayMaster}
- 5 Elements Score: ${JSON.stringify(elementsScore)}

PROPRIETARY IP CONTEXT:
${dictionaryContext || `(Use standard Eastern Saju wisdom for ${dayMaster} as Day Master)`}`;
}
