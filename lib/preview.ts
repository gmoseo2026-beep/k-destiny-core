// lib/preview.ts — 서버 전용. 클라이언트 컴포넌트에서 import 금지.
export function canPreview(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.PREVIEW_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
