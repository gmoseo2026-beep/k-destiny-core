/**
 * 검색용 페이지(띠 궁합 · 출생연도별 2027 운세)의 결정론 계산.
 *
 * 2026-10-05: 검색엔진이 콩닥을 거의 모른다(구글 수집 13회·네이버 5회/이틀). "쥐띠 소띠 궁합",
 * "95년생 2027년 운세" 같은 긴 검색어를 받을 페이지를 만든다.
 *
 * - 띠 사이의 관계는 검증된 궁합 엔진(lib/compatibility.ts)의 표를 그대로 쓴다(엔진은 수정하지 않는다).
 * - 같은 입력이면 항상 같은 결과다. AI 는 이 결과를 받아 문장만 쓴다(data/seo/*.json 에 저장).
 * - 화면에는 한자·전문용어를 내보내지 않는다. 한자(branch)는 엔진 표를 조회하는 열쇠로만 쓴다.
 */
import {
  BRANCH_SIX_COMBO,
  BRANCH_THREE_COMBO,
  BRANCH_CLASH,
  BRANCH_PUNISH,
  BRANCH_HARM_ENMITY,
} from "@/lib/compatibility";

export interface ZodiacAnimal {
  slug: string;
  /** "쥐" — 화면에는 "쥐띠" */
  name: string;
  emoji: string;
  /** 엔진 표 조회용(화면에 내보내지 않는다) */
  branch: string;
}

// 순서 = (연도 - 4) % 12
export const ZODIAC: readonly ZodiacAnimal[] = [
  { slug: "rat", name: "쥐", emoji: "🐭", branch: "子" },
  { slug: "ox", name: "소", emoji: "🐮", branch: "丑" },
  { slug: "tiger", name: "호랑이", emoji: "🐯", branch: "寅" },
  { slug: "rabbit", name: "토끼", emoji: "🐰", branch: "卯" },
  { slug: "dragon", name: "용", emoji: "🐲", branch: "辰" },
  { slug: "snake", name: "뱀", emoji: "🐍", branch: "巳" },
  { slug: "horse", name: "말", emoji: "🐴", branch: "午" },
  { slug: "sheep", name: "양", emoji: "🐑", branch: "未" },
  { slug: "monkey", name: "원숭이", emoji: "🐵", branch: "申" },
  { slug: "rooster", name: "닭", emoji: "🐔", branch: "酉" },
  { slug: "dog", name: "개", emoji: "🐶", branch: "戌" },
  { slug: "pig", name: "돼지", emoji: "🐷", branch: "亥" },
] as const;

export const zodiacBySlug = (slug: string): ZodiacAnimal | undefined => ZODIAC.find((z) => z.slug === slug);
export const zodiacIndex = (slug: string): number => ZODIAC.findIndex((z) => z.slug === slug);

/** 두 띠의 관계 유형(엔진 표 기준, 우선순위: 단짝 > 한 팀 > 정반대 > 날 선 > 서운 > 닮은꼴 > 무난) */
export type PairRelation = "six" | "three" | "clash" | "punish" | "harm" | "same" | "neutral";

export interface PairRelationInfo {
  relation: PairRelation;
  /** 띠 기준 궁합 온도(0~100). 유형마다 고정값 — 태어난 해만 본 큰 틀이다. */
  score: number;
  /** 화면에 쓰는 쉬운 말 */
  label: string;
  grade: "아주 잘 맞는 편" | "잘 맞는 편" | "무난한 편" | "맞춰 가야 하는 편" | "부딪히기 쉬운 편";
}

const RELATION_TABLE: Record<PairRelation, Omit<PairRelationInfo, "relation">> = {
  six: { score: 92, label: "서로를 끌어당기는 단짝 조합", grade: "아주 잘 맞는 편" },
  three: { score: 88, label: "같은 방향을 보는 한 팀 조합", grade: "잘 맞는 편" },
  same: { score: 78, label: "서로가 거울 같은 닮은꼴 조합", grade: "무난한 편" },
  neutral: { score: 74, label: "크게 부딪히지 않는 무난한 조합", grade: "무난한 편" },
  harm: { score: 62, label: "사소한 데서 서운해지기 쉬운 조합", grade: "맞춰 가야 하는 편" },
  punish: { score: 56, label: "가까울수록 날이 서기 쉬운 조합", grade: "맞춰 가야 하는 편" },
  clash: { score: 50, label: "정반대라 부딪히기 쉬운 조합", grade: "부딪히기 쉬운 편" },
};

export function pairRelation(a: ZodiacAnimal, b: ZodiacAnimal): PairRelationInfo {
  const key = a.branch + b.branch;
  let relation: PairRelation;
  if (BRANCH_SIX_COMBO.has(key)) relation = "six";
  else if (BRANCH_THREE_COMBO.has(key)) relation = "three";
  else if (BRANCH_CLASH.has(key)) relation = "clash";
  else if (BRANCH_PUNISH.has(key)) relation = "punish";
  else if (BRANCH_HARM_ENMITY.has(key)) relation = "harm";
  else if (a.slug === b.slug) relation = "same";
  else relation = "neutral";
  return { relation, ...RELATION_TABLE[relation] };
}

/** 주소에 쓰는 쌍 표기. 순서를 고정한다(표의 앞 순서가 먼저) → 한 쌍에 주소 하나. */
export function pairSlug(a: ZodiacAnimal, b: ZodiacAnimal): string {
  const [x, y] = zodiacIndex(a.slug) <= zodiacIndex(b.slug) ? [a, b] : [b, a];
  return `${x.slug}-${y.slug}`;
}

export function parsePairSlug(slug: string): { a: ZodiacAnimal; b: ZodiacAnimal; canonical: string } | null {
  const parts = slug.split("-");
  if (parts.length !== 2) return null;
  const a = zodiacBySlug(parts[0]);
  const b = zodiacBySlug(parts[1]);
  if (!a || !b) return null;
  const canonical = pairSlug(a, b);
  const [x, y] = canonical === slug ? [a, b] : [b, a];
  return { a: x, b: y, canonical };
}

/** 78쌍(같은 띠 12 + 서로 다른 띠 66) */
export function allPairs(): Array<{ a: ZodiacAnimal; b: ZodiacAnimal; slug: string }> {
  const out: Array<{ a: ZodiacAnimal; b: ZodiacAnimal; slug: string }> = [];
  for (let i = 0; i < ZODIAC.length; i++) {
    for (let j = i; j < ZODIAC.length; j++) {
      out.push({ a: ZODIAC[i], b: ZODIAC[j], slug: `${ZODIAC[i].slug}-${ZODIAC[j].slug}` });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 출생연도
// ─────────────────────────────────────────────────────────────

/** 양력 연도 기준의 띠. 실제 띠는 입춘(2월 4일 무렵)에 바뀌므로 1월~2월 초 출생은 앞 해의 띠일 수 있다. */
export function zodiacOfYear(year: number): ZodiacAnimal {
  return ZODIAC[(((year - 4) % 12) + 12) % 12];
}

// 해의 색(흔히 "붉은 말의 해"처럼 부르는 그 색). 연도 끝자리로 정해진다.
const YEAR_COLORS = ["푸른", "푸른", "붉은", "붉은", "황금", "황금", "흰", "흰", "검은", "검은"] as const;
export function colorOfYear(year: number): string {
  return YEAR_COLORS[(((year - 4) % 10) + 10) % 10];
}

export const FORTUNE_TARGET_YEAR = 2027;
/** 페이지를 만드는 출생연도 범위(2027년에 만 19~67세) */
export const BIRTH_YEAR_MIN = 1960;
export const BIRTH_YEAR_MAX = 2007;
export const birthYears = (): number[] =>
  Array.from({ length: BIRTH_YEAR_MAX - BIRTH_YEAR_MIN + 1 }, (_, i) => BIRTH_YEAR_MAX - i);

/**
 * 흔히 말하는 "삼재" 띠인지(3년 중 몇 번째 해인지). 해당 없으면 null.
 * 돼지·토끼·양띠는 뱀·말·양의 해(2025~2027), 호랑이·말·개띠는 원숭이·닭·개의 해… 식으로 돈다.
 */
export function samjaeStage(birthAnimal: ZodiacAnimal, targetYear: number): 1 | 2 | 3 | null {
  const groups: Array<{ members: string[]; years: string[] }> = [
    { members: ["monkey", "rat", "dragon"], years: ["tiger", "rabbit", "dragon"] },
    { members: ["pig", "rabbit", "sheep"], years: ["snake", "horse", "sheep"] },
    { members: ["tiger", "horse", "dog"], years: ["monkey", "rooster", "dog"] },
    { members: ["snake", "rooster", "ox"], years: ["pig", "rat", "ox"] },
  ];
  const yearAnimal = zodiacOfYear(targetYear).slug;
  for (const g of groups) {
    if (g.members.includes(birthAnimal.slug)) {
      const i = g.years.indexOf(yearAnimal);
      return i >= 0 ? ((i + 1) as 1 | 2 | 3) : null;
    }
  }
  return null;
}

/** 그 해와 내 띠의 관계를 "어떤 해인지"로 풀어 쓴 말(출생연도 운세 화면용) */
export const YEAR_FLOW_LABEL: Record<PairRelation, string> = {
  six: "올해와 손발이 잘 맞는 해",
  three: "같은 방향으로 밀어 주는 해",
  same: "내 띠의 해, 나를 돌아보는 해",
  neutral: "큰 굴곡 없이 흘러가는 해",
  harm: "사소한 일에 마음 쓰이기 쉬운 해",
  punish: "서두르면 날이 서기 쉬운 해",
  clash: "변화가 많아 움직이게 되는 해",
};

export interface BirthYearFacts {
  birthYear: number;
  animal: ZodiacAnimal;
  /** "푸른 돼지띠" */
  nickname: string;
  /** 2027년의 만 나이(생일 전 ~ 생일 후) */
  ageFrom: number;
  ageTo: number;
  /** 2027년(붉은 양의 해)과 이 띠의 관계 */
  yearRelation: PairRelationInfo;
  samjae: 1 | 2 | 3 | null;
  targetYear: number;
  /** "붉은 양" */
  targetNickname: string;
}

export function birthYearFacts(birthYear: number, targetYear: number = FORTUNE_TARGET_YEAR): BirthYearFacts {
  const animal = zodiacOfYear(birthYear);
  const targetAnimal = zodiacOfYear(targetYear);
  return {
    birthYear,
    animal,
    nickname: `${colorOfYear(birthYear)} ${animal.name}띠`,
    ageFrom: targetYear - birthYear - 1,
    ageTo: targetYear - birthYear,
    yearRelation: pairRelation(animal, targetAnimal),
    samjae: samjaeStage(animal, targetYear),
    targetYear,
    targetNickname: `${colorOfYear(targetYear)} ${targetAnimal.name}`,
  };
}

export const isBirthYearInRange = (y: number): boolean =>
  Number.isInteger(y) && y >= BIRTH_YEAR_MIN && y <= BIRTH_YEAR_MAX;
