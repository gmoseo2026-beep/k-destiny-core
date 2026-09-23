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
    
Write a brief, highly intriguing "free preview" compatibility teaser.
CRITICAL PRINCIPLE:
- FREE = Score + Atmosphere / Emotion + Curiosity Hook ONLY.
- PAID = Saju root cause (five elements), specific synergy, conflict trigger / solutions, actionable advice.

RULES:
1. Length: MUST be exactly ONE short paragraph (2~3 sentences, about 3~4 lines total). Keep it concise!
2. Focus ONLY on the overall vibe and emotional chemistry of the relationship (e.g., "두 사람이 마주했을 때 느껴지는 따뜻한 온기와 은근한 설렘").
3. DO NOT explain the why or root causes (NO mentioning metal/wood/fire/water/earth combinations, NO element names).
4. DO NOT provide relationship advice, conflict solutions, or future timing (these are strictly locked in the paid deep report).
5. The very last sentence MUST end with an irresistible cliffhanger hook that sparks intense curiosity about what is hidden (e.g., "하지만 두 사람 사이에 숨겨진 진짜 변수와 관계를 지켜낼 결정적인 열쇠는 아직 남아있답니다.").
6. Absolutely NO Chinese characters (한자) and NO saju technical terms.`;
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

export interface AnnualFortuneContent {
  yearScore: number;                   // 0~100 올해 총운 점수
  headline: string;                    // 한 줄 요약 (두근이 톤)
  summary: string;                     // 총평 2~3문장 (무료 공개용)
  sections: {
    love: { score: number; text: string };          // 연애운
    money: { score: number; text: string };         // 재물운
    career: { score: number; text: string };        // 직업/학업운
    health: { score: number; text: string };        // 건강운
    relationship: { score: number; text: string };  // 인간관계운
  };
  monthlyHighlights: Array<{ month: number; note: string }>; // 12개월 하이라이트 (1~12월)
  luckyPoints: { color: string; item: string; month: number }; // 행운 포인트
}

export function buildAnnualFortunePrompt(contextBlock: string, year: number, toneGuide: string): string {
  return `${STYLE_GUIDE}

${STRICT_NO_HANJA_RULE}

TONE: ${toneGuide}

${contextBlock}

Write a deeply insightful, warm, and engaging annual fortune reading for the entire year of ${year}.
You MUST output your response strictly as a JSON object matching the following TypeScript interface:

\`\`\`typescript
interface AnnualFortuneContent {
  yearScore: number;                   // 0~100 overall score for the year ${year}
  headline: string;                    // One-line punchy summary in warm Kongdak mascot tone (두근이 톤)
  summary: string;                     // General overview of the year (2~3 sentences, friendly and grounded)
  sections: {
    love: { score: number; text: string };          // Love / Romance luck (0~100 score, detailed paragraph)
    money: { score: number; text: string };         // Wealth / Financial luck (0~100 score, detailed paragraph)
    career: { score: number; text: string };        // Career / Study / Work luck (0~100 score, detailed paragraph)
    health: { score: number; text: string };        // Health / Vitality luck (0~100 score, detailed paragraph)
    relationship: { score: number; text: string };  // Interpersonal / Social luck (0~100 score, detailed paragraph)
  };
  monthlyHighlights: Array<{
    month: number;                     // 1 to 12
    note: string;                      // 1~2 sentence highlight or key opportunity/caution for this month
  }>;                                  // Exactly 12 items (month 1 through 12)
  luckyPoints: {
    color: string;                     // Lucky color name in Korean (e.g. 따뜻한 코랄, 싱그러운 올리브 그린 등)
    item: string;                      // Lucky item or accessory
    month: number;                     // Most fortunate month (1~12)
  };
}
\`\`\`

Requirements:
1. Make it sound deeply personal, warm, encouraging, and insightful like a wise, empathetic mentor.
2. Give practical, grounded advice rather than deterministic doom or absolute guarantees (entertaining and reflective purpose).
3. Ensure monthlyHighlights covers all 12 months (from month 1 to month 12).
4. Absolutely NO Chinese characters (한자) and NO saju technical terms (e.g. no 일간, 천간, 지지, 십신, 오행 directly mentioned).
5. Output ONLY the raw JSON object. Do NOT include markdown code fences (like \`\`\`json).`;
}

export interface AnnualTeaser {
  yearScore: number;
  headline: string;
  summary: string;
  freeSection: {
    type: "love" | "money" | "career" | "health" | "relationship";
    score: number;
    text: string;
  };
  hooks: {
    love?: string;
    money?: string;
    career?: string;
    health?: string;
    relationship?: string;
  };
  teasers: {
    bestMonth: string;
    cautionMonth: string;
  };
}

export function buildAnnualTeaserPrompt(contextBlock: string, year: number, toneGuide: string): string {
  return `${STYLE_GUIDE}

${STRICT_NO_HANJA_RULE}

TONE: ${toneGuide}

${contextBlock}

Write an irresistible, curiosity-inducing teaser preview for the annual fortune reading for the year ${year}.
CRITICAL GOAL: Spark intense curiosity and a desire to read the full report. 
Do NOT give away the complete answers or conclusions. Instead, write punchy cliffhanger "hooks" that stop right before the revelation.

CRITICAL PRINCIPLE:
- FREE = Score + Atmosphere / Emotion + Cliffhanger Hooks ONLY.
- PAID = Saju root cause (five elements), specific timing, conflict solutions, actionable advice, 12 months full breakdown, lucky points.

You MUST output your response strictly as a JSON object matching the following TypeScript interface:

\`\`\`typescript
interface AnnualTeaser {
  yearScore: number;                   // 0~100 overall score for the year ${year}
  headline: string;                    // One-line punchy mascot headline (두근이 톤)
  summary: string;                     // 2~3 sentences overview of the year's vibe and emotion only. NO concrete conclusions (NO specific timing or solutions). Leave deep curiosity.
  hooks: {                             // Exactly 1 sentence per area. Must cut off right before the conclusion (cliffhanger).
    love?: string;                      // e.g. "2026년, 당신에게 운명 같은 인연이 찾아오는 결정적 시기가 정해져 있어요 —"
    money?: string;                     // e.g. "큰 재물이 움직일 뜻밖의 타이밍이 올해 숨어 있어요 —"
    career?: string;                    // e.g. "올해 당신의 능력과 노력이 단숨에 인정받을 결정적 기회가 찾아옵니다 —"
    health?: string;                    // e.g. "올해 특별히 에너지를 충전하고 지켜야 할 중요한 순간이 있어요 —"
    relationship?: string;              // e.g. "당신의 곁에서 든든한 귀인이 되어줄 사람이 올해 등장하는데 —"
  };
  freeSection: {                       // Write ONE FULL detailed section for free preview (e.g., love or money)
    type: "love" | "money" | "career" | "health" | "relationship";
    score: number;                     // 0~100 score for this specific area
    text: string;                      // Detailed 1-2 paragraphs of actual fortune reading for this specific area
  };
  teasers: {
    bestMonth: string;                 // e.g. "올해 가장 눈부시게 빛나는 달은 ●월" (Cover specific month number with '●')
    cautionMonth: string;              // e.g. "딱 한 달, 감정이나 선택을 조심하면 좋은 시기가 있어요"
  };
}
\`\`\`

Requirements:
1. Generate ONE full section in \`freeSection\` with full details (no cliffhangers).
2. For the OTHER 4 sections, write an intriguing 1-sentence cliffhanger in \`hooks\` that stops right before the answer. Do not write a hook for the section you chose for \`freeSection\`.
3. NEVER give full conclusions, definitive dates, or detailed action solutions in summary or hooks (except the \`freeSection\`).
3. In teasers.bestMonth, always hide the actual number with '●' (e.g. "●월" or "올해 가장 운이 트이는 달은 ●월").
4. Absolutely NO Chinese characters (한자) and NO saju technical terms (e.g. no 일간, 천간, 지지, 십신, 오행 directly mentioned).
5. Output ONLY the raw JSON object. Do NOT include markdown code fences.`;
}

export interface AnnualScoreParams {
  dayMaster?: string | null;
  fourPillars?: { year?: string; month?: string; day?: string; time?: string | null } | null;
  elementsScore?: { wood?: number; fire?: number; earth?: number; metal?: number; water?: number } | null;
  year?: number;
}

/**
 * 2026 병오년(붉은 말의 해 - 丙午) 대상 결정론적 총운 점수 산출
 * 동일 사주 입력에 대해 항상 100% 동일한 점수(68~95점)를 보장하여,
 * 맛보기(미리보기) 때의 점수와 결제 후 전체 리포트 점수의 일관성을 유지합니다.
 */
export function calculateAnnualYearScore(params: AnnualScoreParams): number {
  const el = params.elementsScore || { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };
  const wood = Number(el.wood || 0);
  const fire = Number(el.fire || 0);
  const earth = Number(el.earth || 0);
  const metal = Number(el.metal || 0);
  const water = Number(el.water || 0);

  // 기본 기준 점수 (72점)
  let score = 72;

  // 1) 2026 병오년(화) 기운과의 조화
  if (fire <= 10) score += 9; // 화 부족 시 2026년 화 기운이 길조
  else if (fire <= 25) score += 6;
  else if (fire >= 45) score -= 4; // 화 과다 시 조급함 주의

  // 목생화 (목 기운이 화를 지원): 활력과 성장
  if (wood >= 25) score += 6;
  else if (wood >= 15) score += 3;

  // 화생토 (토 기운이 화를 수렴): 결실과 안정
  if (earth >= 25) score += 6;
  else if (earth >= 15) score += 3;

  // 수화기제 (수와 화의 조화): 지혜와 감정 균형
  if (water >= 20 && fire <= 30) score += 5;

  // 화련진금 (금 기운이 화에 단련됨): 결단과 돌파력
  if (metal >= 20) score += 4;

  // 2) 일간 에너지 유형 가산
  const dm = (params.dayMaster || "").toUpperCase();
  if (dm.includes("WOOD")) score += 4;
  else if (dm.includes("FIRE")) score += 3;
  else if (dm.includes("EARTH")) score += 6;
  else if (dm.includes("METAL")) score += 5;
  else if (dm.includes("WATER")) score += 4;

  // 3) 일주(Day pillar) 기반 결정론적 해시 미세 조정 (-4 ~ +4)
  const dayPillar = params.fourPillars?.day || "";
  let hash = 0;
  for (let i = 0; i < dayPillar.length; i++) {
    hash = (hash * 31 + dayPillar.charCodeAt(i)) & 0xffff;
  }
  const variance = (hash % 9) - 4; // -4 ~ +4
  score += variance;

  // 68 ~ 95점 사이로 클램프 (희망적이며 현실적인 점수 대역)
  return Math.min(95, Math.max(68, score));
}

export interface DailyFortuneContent {
  dayScore: number;
  oneLine: string;   // 오늘의 한 줄 총평
  action: string;    // "오늘 뭘 하면 좋은지" 행동 조언 1~2문장 (그날의 연애/돈/일/관계 중 포인트)
  focus: "love" | "money" | "career" | "relationship"; // 오늘의 포커스 영역
  goodTiming: string; // "오늘 오후, 연락하기 좋은 시간" 등
}

export function buildDailyFortunePrompt(contextBlock: string, dateStr: string, toneGuide: string): string {
  return `${STYLE_GUIDE}

${STRICT_NO_HANJA_RULE}

TONE: ${toneGuide}

${contextBlock}

TARGET DATE: ${dateStr}

You are Kongdak's warm and caring daily fortune coach (두근이).
Write a practical, encouraging, and actionable daily fortune reading for today (${dateStr}).

You MUST output your response strictly as a JSON object matching the following TypeScript interface:

\`\`\`typescript
interface DailyFortuneContent {
  dayScore: number;                                    // 0~100 overall score for today
  oneLine: string;                                     // A heartwarming, punchy 1-line mascot summary for today
  action: string;                                      // 1~2 sentences practical advice on "what to do today" (clear daily action item)
  focus: "love" | "money" | "career" | "relationship"; // The single most prominent focus area for today
  goodTiming: string;                                  // e.g. "오늘 오후 3시~5시, 연락하기 좋은 시간" or "점심 직후, 중요한 대화 나누기 좋은 타이밍"
}
\`\`\`

Requirements:
1. Keep it grounded, warm, and highly actionable. Give realistic, daily behavioral guidance.
2. Focus on making the user smile and feel empowered for their day.
3. Absolutely NO Chinese characters (한자) and NO saju technical terms (e.g. no 일간, 천간, 지지, 십신, 오행 directly mentioned).
4. Output ONLY the raw JSON object. Do NOT include markdown code fences.`;
}

/**
 * 특정 날짜(YYYY-MM-DD)와 사주 정보를 기반으로 한 결정론적 데일리 점수 산출
 * 동일 유저가 동일 날짜에 조회하면 100% 동일한 점수(65~96점) 반환
 */
export function calculateDailyScore(params: {
  date: string;
  dayMaster?: string | null;
  elementsScore?: Record<string, number> | null;
}): number {
  const { date, dayMaster = "", elementsScore } = params;
  const el = elementsScore || { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };

  // 기준 베이스 점수 (74점)
  let score = 74;

  // 1) 날짜 기반 해시 (년월일 숫자 합산)
  const cleanDate = date.replace(/\D/g, "");
  let dateHash = 0;
  for (let i = 0; i < cleanDate.length; i++) {
    dateHash = (dateHash * 13 + parseInt(cleanDate[i], 10)) % 10007;
  }

  // 2) 요일 오행 연동
  const dayOfWeek = new Date(date).getDay(); // 0(일) ~ 6(토)
  const dayEnergyMap: Record<number, keyof typeof el> = {
    0: "fire",  // 일요일 (태양/화)
    1: "water", // 월요일 (달/수)
    2: "fire",  // 화요일 (화)
    3: "water", // 수요일 (수)
    4: "wood",  // 목요일 (목)
    5: "metal", // 금요일 (금)
    6: "earth", // 토요일 (토)
  };
  const todayElement = dayEnergyMap[dayOfWeek] || "earth";
  const elValue = Number(el[todayElement] || 20);

  if (elValue >= 25) score += 6;
  else if (elValue >= 15) score += 3;
  else score += 1;

  // 3) 일간과 날짜 해시의 조합 분산 (-7 ~ +8)
  const dm = (dayMaster || "").toUpperCase();
  let dmOffset = 0;
  if (dm.includes("FIRE")) dmOffset = 2;
  else if (dm.includes("WOOD")) dmOffset = 3;
  else if (dm.includes("EARTH")) dmOffset = 4;
  else if (dm.includes("METAL")) dmOffset = 1;
  else if (dm.includes("WATER")) dmOffset = 2;

  const variance = ((dateHash + dmOffset * 17) % 16) - 7; // -7 ~ +8
  score += variance;

  // 65~96점 사이 클램프
  return Math.min(96, Math.max(65, score));
}

// -----------------------------------------------------------------------------
// D2: 범용 상품 (재물, 취업, 매력 등 단품) 및 범용 관계 상품 (속마음, 바람기 등)
// -----------------------------------------------------------------------------

export interface SingleReportContent {
  score: number;       // 0~100 점수
  headline: string;    // 한 줄 핵심 요약 (두근이 톤)
  summary: string;     // 전체 2~3문장 무료 요약 (구체적 결론 제외)
  freeSection: {       // 무료 공개할 구체적 리포트 1문단
    type: string;
    text: string;
  };
  details: string;     // 상세 분석 (유료)
  advice: string;      // 구체적 행동 조언 (유료)
}

export interface SingleTeaserContent {
  score: number;
  headline: string;
  summary: string;
  freeSection: {
    type: string;
    text: string;
  };
  hooks: string[];     // 결제 유도용 흥미로운 훅 (2~3개)
}

export function buildGenericFortunePrompt(contextBlock: string, promptKey: string, isTeaser: boolean, toneGuide: string): string {
  const contentFormat = isTeaser ? `interface SingleTeaserContent {
  score: number;       // 0~100
  headline: string;    // One-line punchy mascot headline
  summary: string;     // 2~3 sentences overview. NO concrete conclusions. Leave deep curiosity.
  freeSection: {       // One paragraph of actual fortune reading for free preview
    type: string;
    text: string;
  };
  hooks: string[];     // 2~3 cliffhanger sentences that stop right before the revelation.
}` : `interface SingleReportContent {
  score: number;       // 0~100
  headline: string;    // One-line punchy mascot headline
  summary: string;     // 2~3 sentences general overview
  freeSection: {       // One paragraph of actual fortune reading
    type: string;
    text: string;
  };
  details: string;     // Deep, specific analysis (2-3 paragraphs)
  advice: string;      // Actionable, practical advice
}`;

  return `${STYLE_GUIDE}

${STRICT_NO_HANJA_RULE}

TONE: ${toneGuide}

${contextBlock}

TOPIC: ${promptKey}

Write a deeply insightful fortune reading about the TOPIC above. 
${isTeaser ? 'CRITICAL GOAL: Spark intense curiosity. Do NOT give away complete answers or conclusions in summary/hooks. Write punchy cliffhanger hooks.' : ''}

You MUST output your response strictly as a JSON object matching the following TypeScript interface:

\`\`\`typescript
${contentFormat}
\`\`\`

Requirements:
1. Make it sound deeply personal, warm, encouraging, and insightful like a wise, empathetic mentor.
2. Absolutely NO Chinese characters (한자) and NO saju technical terms.
3. Output ONLY the raw JSON object. Do NOT include markdown code fences.`;
}

export function buildGenericCompatPrompt(contextBlock: string, promptKey: string, isTeaser: boolean, toneGuide: string): string {
  const contentFormat = isTeaser ? `interface SingleTeaserContent {
  score: number;       // 0~100 compatibility/relationship score for this topic
  headline: string;    // One-line punchy headline
  summary: string;     // 2~3 sentences overview of the dynamic. NO concrete conclusions.
  freeSection: {       // One paragraph of actual relationship reading for free preview
    type: string;
    text: string;
  };
  hooks: string[];     // 2~3 cliffhanger sentences that stop right before the revelation.
}` : `interface SingleReportContent {
  score: number;       // 0~100 compatibility/relationship score for this topic
  headline: string;    // One-line punchy headline
  summary: string;     // 2~3 sentences general overview
  freeSection: {       // One paragraph of actual relationship reading
    type: string;
    text: string;
  };
  details: string;     // Deep, specific analysis of the two people (2-3 paragraphs)
  advice: string;      // Actionable, practical advice for the relationship
}`;

  return `${STYLE_GUIDE}

${STRICT_NO_HANJA_RULE}

TONE: ${toneGuide}

${contextBlock}

TOPIC: ${promptKey}

Write a deeply insightful relationship/compatibility reading about the TOPIC above for these two people. 
${isTeaser ? 'CRITICAL GOAL: Spark intense curiosity. Do NOT give away complete answers or conclusions in summary/hooks. Write punchy cliffhanger hooks.' : ''}

You MUST output your response strictly as a JSON object matching the following TypeScript interface:

\`\`\`typescript
${contentFormat}
\`\`\`

Requirements:
1. Make it sound deeply personal, warm, and insightful like a wise mentor.
2. Absolutely NO Chinese characters (한자) and NO saju technical terms.
3. Output ONLY the raw JSON object. Do NOT include markdown code fences.`;
}

/** 
 * 범용 개인 리포트 결정론적 점수 산출 
 * (입력 해시와 상품키(promptKey)를 활용하여 항상 동일한 점수(65~95) 도출)
 */
export function calculateGenericScore(params: {
  productKey: string;
  dayMaster?: string | null;
  fourPillars?: { year?: string; month?: string; day?: string; time?: string | null } | null;
  elementsScore?: Record<string, number> | null;
}): number {
  let score = 75; // 베이스
  
  // 1. 사주 해시
  const dayPillar = params.fourPillars?.day || "";
  let hash = 0;
  for (let i = 0; i < dayPillar.length; i++) {
    hash = (hash * 31 + dayPillar.charCodeAt(i)) & 0xffff;
  }
  
  // 2. 상품키 해시
  let keyHash = 0;
  for (let i = 0; i < params.productKey.length; i++) {
    keyHash = (keyHash * 17 + params.productKey.charCodeAt(i)) & 0xffff;
  }
  
  const variance = ((hash + keyHash) % 31) - 15; // -15 ~ +15
  score += variance;
  
  return Math.min(95, Math.max(65, score));
}

/** 
 * 범용 궁합 리포트 결정론적 점수 산출 
 */
export function calculateGenericCompatScore(params: {
  productKey: string;
  personADayMaster: string;
  personBDayMaster: string;
}): number {
  let score = 75;
  
  let hash = 0;
  const combo = params.personADayMaster + params.personBDayMaster;
  for (let i = 0; i < combo.length; i++) {
    hash = (hash * 31 + combo.charCodeAt(i)) & 0xffff;
  }
  
  let keyHash = 0;
  for (let i = 0; i < params.productKey.length; i++) {
    keyHash = (keyHash * 17 + params.productKey.charCodeAt(i)) & 0xffff;
  }
  
  const variance = ((hash + keyHash) % 31) - 15;
  score += variance;
  
  return Math.min(98, Math.max(60, score));
}
