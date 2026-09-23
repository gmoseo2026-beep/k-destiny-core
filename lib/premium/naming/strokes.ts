/** 강희자전 부수 번호 → 부수 원래 획수(부수는 획수 순으로 번호가 매겨져 있다) */
export function radicalFullStrokes(n: number): number {
  const bounds: Array<[number, number]> = [
    [6, 1], [29, 2], [60, 3], [94, 4], [117, 5], [146, 6], [166, 7], [175, 8],
    [186, 9], [194, 10], [200, 11], [204, 12], [208, 13], [210, 14], [211, 15], [213, 16], [214, 17],
  ];
  for (const [max, strokes] of bounds) if (n <= max) return strokes;
  throw new Error(`invalid radical ${n}`);
}

export function originalStrokes(rsUnicode: string): number {
  const [rad, rest] = rsUnicode.split(" ")[0].replace(/'/g, "").split(".").map(Number);
  return radicalFullStrokes(rad) + rest;
}

export const NUMERAL_STROKES: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};

export const RADICAL_ELEMENT: Record<number, "wood" | "fire" | "earth" | "metal" | "water"> = {
  75: "wood", 118: "wood", 140: "wood", 115: "wood",   // 木 竹 艸 禾
  86: "fire", 72: "fire", 61: "fire",                   // 火 日 心
  32: "earth", 46: "earth", 102: "earth", 170: "earth", // 土 山 田 阜
  167: "metal", 96: "metal", 112: "metal",              // 金 玉 石
  85: "water", 173: "water", 15: "water",               // 水 雨 冫
};
