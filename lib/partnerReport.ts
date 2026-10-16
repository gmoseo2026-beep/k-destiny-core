/**
 * 제휴사별 성과 리포트 열쇠(HMAC-SHA256 앞 32자 hex) 계산·검증 — 서버 전용.
 *
 * 지키는 것:
 * - 환경변수 PARTNER_REPORT_SECRET 이 없거나 비어 있으면 null / false 를 돌려준다(fail-closed, 대체값 없음).
 * - 열쇠 비교는 crypto.timingSafeEqual 로 한다.
 * - 열쇠를 콘솔·로그에 찍지 않는다.
 * - "use client" 컴포넌트에서는 이 파일을 절대 import 하지 않는다.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { linksForPartner } from "@/lib/campaignLinks";

const PARTNER_NAME_RE = /^[a-z0-9_-]{2,32}$/;
const PARTNER_KEY_HEX_RE = /^[0-9a-f]{32}$/;

/**
 * 제휴사 공유 주소용 열쇠 = HMAC-SHA256(PARTNER_REPORT_SECRET, partner) 앞 32자(hex).
 * 비밀값이 없거나 등록되지 않은 partner 면 null.
 */
export function computePartnerReportKey(
  partner: string,
  secret: string | undefined = process.env.PARTNER_REPORT_SECRET
): string | null {
  if (!secret || !secret.trim()) return null;
  if (!PARTNER_NAME_RE.test(partner)) return null;
  if (linksForPartner(partner).length === 0) return null;
  return createHmac("sha256", secret).update(partner, "utf8").digest("hex").slice(0, 32);
}

/**
 * 요청 주소로 들어온 열쇠가 맞는지 상수 시간(timingSafeEqual)으로 비교한다.
 * 비밀값이 없거나, 등록되지 않은 partner 거나, 열쇠가 다르면 모두 false(404 처리용 — 존재 여부를 드러내지 않음).
 */
export function verifyPartnerReportKey(
  partner: string,
  candidateKey: string,
  secret: string | undefined = process.env.PARTNER_REPORT_SECRET
): boolean {
  const expected = computePartnerReportKey(partner, secret);
  if (!expected) return false;
  if (typeof candidateKey !== "string" || !PARTNER_KEY_HEX_RE.test(candidateKey)) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(candidateKey, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** 관리자 화면에서 복사할 제휴사 전용 성과 주소. 비밀값이 없으면 null. */
export function partnerShareUrl(
  partner: string,
  baseUrl: string,
  locale: string = "ko",
  secret: string | undefined = process.env.PARTNER_REPORT_SECRET
): string | null {
  const key = computePartnerReportKey(partner, secret);
  if (!key) return null;
  return `${baseUrl.replace(/\/$/, "")}/${locale}/partner/${partner}/${key}`;
}
