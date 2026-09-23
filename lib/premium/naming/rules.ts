import type { Element } from "@/lib/premium/ganzhi";
import { GENERATES, CONTROLS } from "@/lib/premium/ganzhi";

export const LUCKY_81 = new Set([
  1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 38, 39, 41, 45, 47, 48, 52, 57,
  61, 63, 65, 67, 68, 81,
]);

export function reduce81(n: number): number {
  return n > 81 ? ((n - 1) % 80) + 1 : n;
}

/** 수리 4격(성 획수 합 s, 이름 두 글자 g1·g2) */
export function fourGrids(s: number, g1: number, g2: number) {
  return {
    won: reduce81(g1 + g2),
    hyeong: reduce81(s + g1),
    i: reduce81(s + g2),
    jeong: reduce81(s + g1 + g2),
  };
}

export function allLucky(g: ReturnType<typeof fourGrids>): boolean {
  return [g.won, g.hyeong, g.i, g.jeong].every((n) => LUCKY_81.has(n));
}

/** 획수 홀짝이 전부 같으면 불균형 */
export function parityBalanced(strokes: number[]): boolean {
  return new Set(strokes.map((n) => n % 2)).size > 1;
}

const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const CHO_ELEMENT: Record<string, Element> = {
  ㄱ: "wood", ㄲ: "wood", ㅋ: "wood",
  ㄴ: "fire", ㄷ: "fire", ㄸ: "fire", ㄹ: "fire", ㅌ: "fire",
  ㅇ: "earth", ㅎ: "earth",
  ㅅ: "metal", ㅆ: "metal", ㅈ: "metal", ㅉ: "metal", ㅊ: "metal",
  ㅁ: "water", ㅂ: "water", ㅃ: "water", ㅍ: "water",
};

export function soundElement(syllable: string): Element {
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) throw new Error(`not hangul: ${syllable}`);
  return CHO_ELEMENT[CHO[Math.floor(code / 588)]];
}

/** 인접 음절 발음오행 흐름: 상생 +10, 같음 +4, 상극 -10 */
export function soundFlowScore(seq: Element[]): number {
  let s = 0;
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1];
    const b = seq[i];
    if (GENERATES[a] === b || GENERATES[b] === a) s += 10;
    else if (a === b) s += 4;
    else if (CONTROLS[a] === b || CONTROLS[b] === a) s -= 10;
  }
  return s;
}
