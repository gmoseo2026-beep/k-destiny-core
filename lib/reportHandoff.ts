// lib/reportHandoff.ts
// 결제 전에 입력값을 sessionStorage에 보관한다. 모바일 리다이렉트 결제 대응이고, 서버에는 저장하지 않는다(PII).

const KEY = (catalogId: string) => `kongdak_pending_input_${catalogId}`;

export function savePendingInput(catalogId: string, input: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY(catalogId), JSON.stringify(input));
  } catch {}
}

export function loadPendingInput(catalogId: string): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(KEY(catalogId));
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export function clearPendingInput(catalogId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY(catalogId));
  } catch {}
}
