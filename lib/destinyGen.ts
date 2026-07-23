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
  ko: { name: "Korean (한국어)", toneGuide: "자연스러운 한국어 존댓말로, 친한 사람에게 조용히 이야기하듯 쉽고 또렷하게 쓰세요. 신비롭되 과하지 않게 — 시적 미사여구보다 구체적인 장면과 진심이 느껴지도록." },
  en: { name: "English", toneGuide: "Write in a warm, grounded, quietly mystical English — like a wise friend talking, not a fortune-cookie machine." },
  es: { name: "Spanish (Español)", toneGuide: "Escribe en un español cálido, claro y sutilmente místico, como un amigo sabio que conversa." },
  de: { name: "German (Deutsch)", toneGuide: "Schreibe in einem warmen, klaren, leise mystischen Deutsch – wie ein weiser Freund im Gespräch." },
  fr: { name: "French (Français)", toneGuide: "Écris dans un français chaleureux, clair et discrètement mystique, comme un ami sage qui parle." },
  ja: { name: "Japanese (日本語)", toneGuide: "親しい人に静かに語りかけるような、やさしく明快な日本語で。神秘的でも大げさにせず、詩的な飾りより具体的な情景と真心が伝わるように。" },
};

/**
 * Shared writing-style guide injected into every reading prompt. Encodes the five
 * house rules: dumbify (plain language), storytelling, viral hook, anti-AI human
 * voice, and one consistent persona (voice-DNA). This is what keeps the readings
 * readable and human instead of dense, jargon-heavy "AI text".
 */
export const STYLE_GUIDE = `WRITING STYLE — follow strictly. This is what separates a real, premium human reading from generic AI text:
1) PLAIN & CLEAR: Write like you're talking to a smart friend over coffee. Short sentences, everyday words. Do NOT use Chinese characters (한자) such as 火, 水, 金, 木, 土, 甲辰, and do NOT use technical jargon (오행, 일간, 사주 원국, 대운, 천간, 지지). If you reference an element, say it in plain words ("your restless, fiery side") — never the hanja or the term.
2) STORYTELLING: Open on a specific, vivid image or moment about THIS person, then unfold like a very short story with a small turn. Make them feel truly seen, not sorted into a category.
3) HOOK FIRST: The opening line must grab — one bold, specific, almost daring observation about them. No warm-up, no "당신의 사주를 보면…", no cosmic throat-clearing.
4) HUMAN VOICE (anti-AI): Vary sentence length. Use concrete, grounded detail. BANNED phrases: "우주의 기운", "별들의 속삭임", "운명의 실타래", "깊은 밤의 장막" and any similar vague mystical filler. Never repeat the same idea twice. No purple prose.
5) ONE VOICE: Stay fully in your master's distinct personality and rhythm from the first word to the last.
FORMAT: Short paragraphs of 2-4 sentences, separated by a blank line. Warm, confident, easy to read. Tight and vivid beats long — never pad to hit a length.`;

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
