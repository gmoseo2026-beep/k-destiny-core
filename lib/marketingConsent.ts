/**
 * 혜택·새 소식(광고성 정보) 수신 동의 — 브라우저 쪽 도우미.
 *
 * 로그인 화면에서 "(선택) 혜택·새 소식 받기"를 체크하면, 로그인이 끝난 뒤에 서버에 저장해야 한다
 * (소셜 로그인은 다른 사이트를 다녀오므로 화면 상태가 사라진다). 체크한 사실을 이 기기에 잠깐 적어 두고,
 * 로그인되면 components/MarketingConsentSync 가 꺼내 /api/user/marketing-consent 로 보낸다.
 *
 * 기본값은 "받지 않음"이다. 체크하지 않으면 아무것도 저장하지 않는다.
 */
const KEY = "kongdak_mkt_optin";
/** 체크하고 이 시간 안에 로그인해야 동의로 친다(오래된 체크가 다른 날 로그인에 붙지 않게) */
const VALID_MS = 60 * 60 * 1000;

export function rememberOptIn(checked: boolean): void {
  try {
    if (checked) window.localStorage.setItem(KEY, String(Date.now()));
    else window.localStorage.removeItem(KEY);
  } catch {}
}

/** 적어 둔 체크를 꺼내고 지운다. 유효하면 true. */
export function takeOptIn(now: number = Date.now()): boolean {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return false;
    window.localStorage.removeItem(KEY);
    const at = Number(raw);
    return Number.isFinite(at) && now - at >= 0 && now - at <= VALID_MS;
  } catch {
    return false;
  }
}
