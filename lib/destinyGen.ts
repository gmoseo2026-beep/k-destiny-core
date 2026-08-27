/**
 * Shared helpers for destiny generation (free streaming phase + premium sections).
 *
 * SPEED NOTE: LLM latency is dominated by OUTPUT tokens (sequential decoding).
 * The free result only needs core_essence + a teaser + short paywall previews,
 * so we generate ONLY that on the hot path and defer the full locked sections
 * to /api/generate-destiny/sections (called after unlock, off the critical path).
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

// IMPORTANT: GEMINI_API_KEY MUST be the key of the BILLING-ENABLED project
// (Google AI Studio → the project under your paid Billing Account). The free vs
// paid tier is decided by this key's project, NOT by any code flag. A stale
// free-project key here will hit free-tier limits (429) even though billing is on.
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// PAID-TIER ordering. On the paid tier 2.5-flash is reliable, so we can lead with
// quality where it matters. The budget "flash-lite" model is dropped everywhere —
// on a paid plan there's no reason to degrade a customer's reading to it.
export const FREE_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"];
// Premium sections run post-payment → quality-first: 2.5-flash, then gemini-flash-latest.
export const PREMIUM_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"];

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
export function repairJSON(raw: string): Record<string, unknown> | null {
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

/** 천간 한자 -> 평문 한국어 자연/오행 서술 매핑 (프롬프트 내 한자 노출 차단) */
export const DAY_MASTER_KOREAN_DESC: Record<string, string> = {
  '甲': '곧고 푸른 나무 기운',
  '乙': '유연하고 다정한 풀꽃 나무 기운',
  '丙': '밝고 열정적인 큰 불 기운',
  '丁': '따뜻하고 섬세한 등불 기운',
  '戊': '든든하고 넓은 큰 산 흙 기운',
  '己': '포근하고 비옥한 들판 흙 기운',
  '庚': '단단하고 강직한 바위 쇠 기운',
  '辛': '반짝이고 섬세한 보석 쇠 기운',
  '壬': '깊고 자유로운 바다 물 기운',
  '癸': '맑고 촉촉한 단비 물 기운',
};

const STRICT_NO_HANJA_RULE = `⚠️ 절대 규칙: 한자(漢字 기호 일체)와 사주 전문용어(오행, 일간, 천간, 지지, 상생, 상극, 원국 등)를 출력에 절대 쓰지 마세요. 오직 친근하고 다정한 순수 한국어 일상 언어로만 서술하세요.`;

/** Shared context block for Compatibility (Kongdak Phase A) */
export function compatContextBlock(params: {
  personA: { name?: string; gender: string; dayMaster: string; elementsScore: Record<string, number> };
  personB: { name?: string; gender: string; dayMaster: string; elementsScore: Record<string, number> };
  relation: string;
  compatResult: { score: number; keywords: string[]; breakdown: Record<string, number> };
}): string {
  const { personA, personB, relation, compatResult } = params;
  const energyA = DAY_MASTER_KOREAN_DESC[personA.dayMaster] || '자연의 기운';
  const energyB = DAY_MASTER_KOREAN_DESC[personB.dayMaster] || '자연의 기운';

  return `RELATIONSHIP TYPE: ${relation}
PERSON A (User): Name=${personA.name || "User"}, Gender=${personA.gender}, Natural Energy=${energyA}, Elements Distribution=${JSON.stringify(personA.elementsScore)}
PERSON B (Partner): Name=${personB.name || "Partner"}, Gender=${personB.gender}, Natural Energy=${energyB}, Elements Distribution=${JSON.stringify(personB.elementsScore)}

DETERMINISTIC COMPATIBILITY RESULT (DO NOT CALCULATE, USE THIS AS FACT):
- Overall Score: ${compatResult.score} / 100
- Core Keywords: ${compatResult.keywords.join(", ")}
- Breakdown: ${JSON.stringify(compatResult.breakdown)}

YOUR TASK:
Do not mention the raw scores or numbers. Interpret the dynamic between these two based on their natural energies and elemental balance. Use the Core Keywords as your guiding theme.`;
}

export interface DeepReportContent {
  coreDynamic: string;          // 우리 관계의 핵심 에너지 (2~3문장)
  strengths: string[];          // 우리가 가진 시너지 강점 3가지
  cautions: string[];           // 서로 주의해야 할 점 3가지
  conflictsAndSolutions: {
    trigger: string;            // 갈등 유발 포인트 (말투, 연락, 고집 등)
    solution: string;           // 현명하게 푸는 구체적 대처법
  }[];                          // 3개
  actionableAdvice: string;     // 오래가기 위한 현실적인 연애 조언
  monthlyFortune: string;       // 이번 달 두 사람의 애정운 흐름
  idealMatchEnergy: {           // [매칭 빌드업] 나와 가장 잘 맞는 이상형 기운
    energyName: string;         // e.g. "포근하고 든든한 흙 기운"
    traits: string;             // 이런 성향의 사람이 나의 부족한 점을 채워줍니다
  };
}

export function buildCompatPrompt(isPremium: boolean, contextBlock: string, toneGuide: string): string {
  if (isPremium) {
    return `${STYLE_GUIDE}\n\n${STRICT_NO_HANJA_RULE}\n\nTONE: ${toneGuide}\n\n${contextBlock}
    
Write a deeply insightful, premium compatibility report. You MUST output your response strictly as a JSON object matching the following TypeScript interface:

\`\`\`typescript
interface DeepReportContent {
  coreDynamic: string;          // 우리 관계의 핵심 에너지 (2~3문장)
  strengths: string[];          // 우리가 가진 시너지 강점 3가지
  cautions: string[];           // 서로 주의해야 할 점 3가지
  conflictsAndSolutions: {
    trigger: string;            // 갈등 유발 포인트 (말투, 연락, 고집 등)
    solution: string;           // 현명하게 푸는 구체적 대처법
  }[];                          // exactly 3 items
  actionableAdvice: string;     // 오래가기 위한 현실적인 연애 조언
  monthlyFortune: string;       // 이번 달 두 사람의 애정운 흐름
  idealMatchEnergy: {           // [매칭 빌드업] 나와 가장 잘 맞는 이상형 기운 (Based on Person A's elemental needs)
    energyName: string;         // e.g. "포근하고 든든한 흙 기운"
    traits: string;             // 이런 성향의 사람이 나의 부족한 점을 채워줍니다
  };
}
\`\`\`

Make it sound like a very expensive, deeply personal reading by a wise mentor. No generic filler. Remember: absolutely NO Chinese characters (한자) and NO saju technical terms. Output ONLY the JSON block. Do NOT include markdown code fences (like \`\`\`json). Return raw valid JSON.`;
  } else {
    return `${STYLE_GUIDE}\n\n${STRICT_NO_HANJA_RULE}\n\nTONE: ${toneGuide}\n\n${contextBlock}
    
Write a captivating, highly shareable "free preview" compatibility reading.
Must be exactly 3 short paragraphs.
- Paragraph 1: The Hook. Start with a bold statement about their dynamic based on the Core Keywords.
- Paragraph 2: The Why. Briefly explain how their energies mix in plain words (e.g., warmth meets steady ground).
- Paragraph 3: The Teaser. End on a slightly suspenseful or deeply resonant note that makes them curious about their deeper dynamic.

Do NOT give away the full relationship advice. Keep it punchy and viral. Remember: absolutely NO Chinese characters (한자) and NO saju technical terms.`;
  }
}

export interface WeeklyFortuneContent {
  summary: string;           // 이번 주 총평 (2~3문장)
  loveLuck: string;          // 연애/애정운 흐름
  wealthLuck: string;        // 금전/재물운 흐름
  bestDay: {                 // 이번 주 가장 기운이 좋은 요일
    day: string;             // 예: "수요일", "금요일"
    reason: string;          // 그 날이 좋은 이유
  };
  caution: string;           // 이번 주 특별히 주의할 점
  // 커플 운세일 경우 아래 필드 추가 (개인 운세일 땐 생략 가능)
  partnerStatus?: string;    // 상대방의 현재 기운/심리 상태
  communicationTip?: string; // 서로 오해 없이 대화하기 좋은 팁
}

export function buildWeeklyFortunePrompt(contextBlock: string, isCouple: boolean, toneGuide: string): string {
  const coupleJsonFields = isCouple ? `
  partnerStatus: string;     // 상대방의 현재 기운과 심리 (이번 주 상대방이 어떤 상태인지)
  communicationTip: string;  // 서로 오해 없이 다가가거나 대화하기 좋은 팁` : '';

  return `${STYLE_GUIDE}\n\n${STRICT_NO_HANJA_RULE}\n\nTONE: ${toneGuide}\n\n${contextBlock}
    
Write a deeply insightful weekly fortune reading for this week. You MUST output your response strictly as a JSON object matching the following TypeScript interface:

\`\`\`typescript
interface WeeklyFortuneContent {
  summary: string;           // 이번 주 총평 (2~3문장)
  loveLuck: string;          // 연애/애정운 흐름
  wealthLuck: string;        // 금전/재물운 흐름
  bestDay: {
    day: string;             // 예: "수요일", "금요일" 등 구체적인 요일
    reason: string;          // 왜 그 날이 가장 좋은지 설명
  };
  caution: string;           // 주의해야 할 점 1가지${coupleJsonFields}
}
\`\`\`

Make it sound like a very expensive, deeply personal reading by a wise mentor. 
Give practical, realistic advice rather than vague mystical statements. 
Remember: absolutely NO Chinese characters (한자) and NO saju technical terms.
Output ONLY the JSON block. Do NOT include markdown code fences (like \`\`\`json). Return raw valid JSON.`;
}
