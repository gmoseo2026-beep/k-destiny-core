/**
 * 미리보기가 뜬 두 사람 상품 화면의 주소에 `from=<궁합 id>`를 넣은 경로(`pathname + search + hash`)를 돌려준다(P-002a).
 * 새로고침하거나 인앱에서 다른 브라우저로 열어도 같은 미리보기가 다시 뜨게 하려는 것이다.
 * 이미 같은 `from`이 있으면 그대로 두고, `productId`·`utm_*` 등 다른 값은 모두 보존한다.
 */
export function withCompatFromParam(rawUrl: string, compatId: string): string {
  const trimmed = compatId.trim();
  const url = new URL(rawUrl, "https://kongdak.kr");
  if (trimmed && url.searchParams.get("from") !== trimmed) url.searchParams.set("from", trimmed);
  return `${url.pathname}${url.search}${url.hash}`;
}
