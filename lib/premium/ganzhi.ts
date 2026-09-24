import { BRANCH_CLASH, BRANCH_SIX_COMBO, BRANCH_THREE_COMBO, BRANCH_PUNISH, BRANCH_HARM_ENMITY } from "@/lib/compatibility";

export type Element = "wood" | "fire" | "earth" | "metal" | "water";
export type Relation = "peer" | "support" | "output" | "wealth" | "pressure";

export const STEM_ELEMENT: Record<string, Element> = {
  甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water",
};
export const BRANCH_ELEMENT: Record<string, Element> = {
  寅: "wood", 卯: "wood", 巳: "fire", 午: "fire", 辰: "earth", 戌: "earth", 丑: "earth", 未: "earth", 申: "metal", 酉: "metal", 亥: "water", 子: "water",
};
export const GENERATES: Record<Element, Element> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
export const CONTROLS: Record<Element, Element> = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };

export function elementOf(ch: string): Element | null {
  return STEM_ELEMENT[ch] ?? BRANCH_ELEMENT[ch] ?? null;
}

/** 일간(dm) 기준, 대상 기운과의 관계 */
export function relation(dm: Element, target: Element): Relation {
  if (dm === target) return "peer";
  if (GENERATES[target] === dm) return "support";
  if (GENERATES[dm] === target) return "output";
  if (CONTROLS[dm] === target) return "wealth";
  return "pressure";
}

/** 억부: 일간 + 일간을 돕는 기운 비율 합이 45% 이상이면 강한 편 */
export function isStrong(dm: Element, pct: Record<Element, number>): boolean {
  const resource = (Object.keys(GENERATES) as Element[]).find((k) => GENERATES[k] === dm) as Element;
  return (pct[dm] ?? 0) + (pct[resource] ?? 0) >= 45;
}

const POINTS: Record<"strong" | "weak", Record<Relation, number>> = {
  strong: { support: -2, peer: -1, output: 5, wealth: 6, pressure: 2 },
  weak: { support: 6, peer: 5, output: -2, wealth: -3, pressure: -5 },
};

export function charPoints(dm: Element, ch: string, strong: boolean): number {
  const e = elementOf(ch);
  return e ? POINTS[strong ? "strong" : "weak"][relation(dm, e)] : 0;
}

/** 지지 a 가 사람의 지지 b 와 맺는 관계 가중치(대운·연·월 점수용) */
export function branchAdj(a: string, b: string): number {
  const k = a + b;
  if (BRANCH_CLASH.has(k)) return -6;
  if (BRANCH_SIX_COMBO.has(k)) return 4;
  if (BRANCH_THREE_COMBO.has(k)) return 3;
  if (BRANCH_PUNISH.has(k)) return -3;
  if (BRANCH_HARM_ENMITY.has(k)) return -2;
  return 0;
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 화면 표시용 쉬운 말(한자·전문용어 노출 금지) */
export const STEM_IMAGE: Record<string, string> = {
  甲: "큰 나무", 乙: "들꽃", 丙: "한낮의 태양", 丁: "따뜻한 촛불", 戊: "넓은 산", 己: "기름진 들판", 庚: "단단한 바위", 辛: "빛나는 보석", 壬: "넓은 바다", 癸: "촉촉한 단비",
};
export const BRANCH_ANIMAL: Record<string, string> = {
  子: "쥐", 丑: "소", 寅: "호랑이", 卯: "토끼", 辰: "용", 巳: "뱀", 午: "말", 未: "양", 申: "원숭이", 酉: "닭", 戌: "개", 亥: "돼지",
};
export const ELEMENT_WORD: Record<Element, string> = { wood: "나무", fire: "불", earth: "흙", metal: "쇠", water: "물" };

/** 받침이 있으면 "과", 없으면 "와" (예: 보석과, 바위와) */
function withGwa(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${hasBatchim ? "과" : "와"}`;
}

/** 예: "庚辰" → "단단한 바위와 용의 10년", "辛未" → "빛나는 보석과 양의 10년" */
export function cycleLabel(ganZhi: string): string {
  return `${withGwa(STEM_IMAGE[ganZhi[0]] ?? "새로운 기운")} ${BRANCH_ANIMAL[ganZhi[1]] ?? "시간"}의 10년`;
}
