import crypto from "crypto";

/**
 * [PII] 입력(생년월일 등)의 원문 대신 저장하는 키. HMAC 이라 비밀키 없이 역산할 수 없다.
 * (sha256 앞 16자리는 생년월일 공간이 작아 전수조사로 역산 가능했다 — 감사 M1)
 */
export function subjectHash(parts: string[]): string {
  const secret = process.env.SUBJECT_HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error("SUBJECT_HASH_SECRET is not configured");
  return crypto.createHmac("sha256", secret).update(parts.join("||")).digest("hex");
}
