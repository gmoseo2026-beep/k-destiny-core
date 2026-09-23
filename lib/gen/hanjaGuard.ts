const HANJA = /[㐀-䶿一-鿿豈-﫿]/;

export function containsHanja(s: string): boolean {
  return HANJA.test(s);
}

/** AI 출력 객체의 모든 문자열 필드를 재귀 검사. 한자가 하나라도 있으면 true. */
export function containsHanjaDeep(v: unknown): boolean {
  if (typeof v === "string") return containsHanja(v);
  if (Array.isArray(v)) return v.some(containsHanjaDeep);
  if (v && typeof v === "object") return Object.values(v).some(containsHanjaDeep);
  return false;
}
