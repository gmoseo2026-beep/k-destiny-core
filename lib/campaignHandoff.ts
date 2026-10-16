/**
 * 인앱 브라우저 → 외부 브라우저로 넘어갈 때 제휴 표시를 주소에 실어 보내는 부분(P-009 A).
 * 브라우저 코드(lib/inAppBrowser)가 쓰므로 제휴 목록(lib/campaignLinks 의 CAMPAIGN_LINKS)을 가져오지 않는다 —
 * 가져오면 모든 제휴사 이름·코드·수수료율이 공개 자바스크립트에 실린다. 여기서는 형식만 보고,
 * 등록된 코드인지는 받는 쪽 서버(middleware → resolveCampaignHandoff)가 확인한다.
 */

/** "<코드>.<초>" (예: "cd1.1791248400"). 코드만 담고 개인정보는 없다. httpOnly 아님 */
export const CAMPAIGN_REF_COOKIE = "kd_ref";
export const CAMPAIGN_HANDOFF_CODE_PARAM = "ksrc";
export const CAMPAIGN_HANDOFF_TIME_PARAM = "ksrct";

const REF_RE = /^([a-z0-9-]{2,20})(?:\.([0-9]{9,11}))?$/;

export function formatCampaignRef(code: string, clickSec: number): string {
  return `${code}.${clickSec}`;
}

function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0 || part.slice(0, i).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/** kd_ref 값에서 코드와 누른 시각(초)을 꺼낸다(형식만 확인). */
export function parseCampaignRef(value: string | null | undefined): { code: string; clickSec: number | null } | null {
  if (!value) return null;
  const m = REF_RE.exec(value);
  if (!m) return null;
  return { code: m[1], clickSec: m[2] ? Number(m[2]) : null };
}

/**
 * 외부 브라우저로 여는 주소(또는 복사 주소)에 kd_ref 가 있으면 ksrc·ksrct 를 붙인다.
 * kd_ref 가 없거나 형식이 틀리면 원래 주소를 그대로 돌려준다.
 */
export function appendCampaignHandoffParams(
  targetUrl: string,
  cookieHeader?: string | null,
  nowMs: number = Date.now()
): string {
  const rawCookie = cookieHeader !== undefined ? cookieHeader : typeof document !== "undefined" ? document.cookie : null;
  const ref = parseCampaignRef(readCookie(rawCookie, CAMPAIGN_REF_COOKIE));
  if (!ref) return targetUrl;
  try {
    const u = new URL(targetUrl);
    u.searchParams.set(CAMPAIGN_HANDOFF_CODE_PARAM, ref.code);
    u.searchParams.set(CAMPAIGN_HANDOFF_TIME_PARAM, String(ref.clickSec ?? Math.floor(nowMs / 1000)));
    return u.toString();
  } catch {
    return targetUrl;
  }
}
