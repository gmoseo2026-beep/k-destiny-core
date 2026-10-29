export const GIFT_EXPIRY_DAYS = 90;
export const GIFT_EXPIRY_MS = GIFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * 한국어 받침 여부에 따라 목적격 조사 '을' / '를'을 반환한다.
 */
export function objectParticleFor(word: string): "을" | "를" {
  const trimmed = word.trim();
  if (!trimmed) return "를";
  const lastCode = trimmed.charCodeAt(trimmed.length - 1);
  // 한글 음절 (가 ~ 힣)
  if (lastCode >= 0xac00 && lastCode <= 0xd7a3) {
    return (lastCode - 0xac00) % 28 === 0 ? "를" : "을";
  }
  // 숫자 받침: 0, 1, 3, 6, 7, 8은 받침 있음(영, 일, 삼, 육, 칠, 팔)
  const lastChar = trimmed[trimmed.length - 1];
  if ("013678".includes(lastChar)) return "을";
  return "를";
}

/**
 * 선물 수령 화면 대표 문구 생성.
 * 예: "민지님이 2027 신년운세를 선물했어요"
 */
export function formatGiftHeadline(
  senderNickname: string | null | undefined,
  catalogId: string,
  productName: string
): string {
  const sender = senderNickname?.trim() || "소중한 분";
  const displayProduct =
    catalogId === "annual_2027" ? "2027 신년운세" : productName.trim() || "운세 리포트";
  const particle = objectParticleFor(displayProduct);
  return `${sender}님이 ${displayProduct}${particle} 선물했어요`;
}
