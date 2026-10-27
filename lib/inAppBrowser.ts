import { trackEvent } from "@/lib/gtag";
import { appendCampaignHandoffParams } from "@/lib/campaignHandoff";

/**
 * In-App Browser Detection Utility
 * 
 * Detects if the user is browsing inside an in-app browser (e.g., KakaoTalk,
 * Instagram, Facebook, Threads, Line, etc.). Google OAuth blocks sign-in
 * requests from these embedded webviews with a 403 disallowed_useragent error.
 */

const IN_APP_BROWSER_PATTERNS = [
  // Korean messaging apps
  'KAKAOTALK',
  'NAVER',
  // Meta family
  'FBAN',        // Facebook App
  'FBAV',        // Facebook App Version
  'Instagram',
  'Threads',
  'Barcelona',   // Threads 앱의 실제 UA 표기("Barcelona 444.0…") — 'Threads' 라는 글자는 없다
  // Line
  'Line/',
  // Twitter / X
  'Twitter',
  // Snapchat
  'Snapchat',
  // TikTok
  'BytedanceWebview',
  'TikTok',
  'musical_ly',
  // 2026-10 틱톡 앱 UA 는 끝에 " trill"(또는 "trill_47.0.3")만 붙고 BytedanceWebview 가 없다 — 틱톡 광고 손님이
  // 일반 브라우저로 잡혀 결제 실패 안내(크롬에서 다시 결제하기)가 뜨지 않았다(10-23 실제 사례)
  ' trill',
  // Pinterest
  'Pinterest',
  // LinkedIn
  'LinkedInApp',
  // WeChat
  'MicroMessenger',
  // Telegram
  'Telegram',
  // Discord
  'Discord',
  // Generic WebView indicators
  'wv)',          // Android WebView marker
  'WebView',
];

/**
 * Checks if the current browser is an in-app browser / webview.
 * Returns the name of the detected in-app browser or null if not detected.
 */
export function detectInAppBrowser(): string | null {
  if (typeof navigator === 'undefined') return null;

  const ua = navigator.userAgent || '';

  for (const pattern of IN_APP_BROWSER_PATTERNS) {
    if (ua.toLowerCase().includes(pattern.toLowerCase())) {
      return pattern;
    }
  }

  // Additional iOS WebView check (no Safari token but has AppleWebKit)
  if (/AppleWebKit/i.test(ua) && !/Safari/i.test(ua) && /iPhone|iPad|iPod/i.test(ua)) {
    return 'iOS WebView';
  }

  return null;
}

/**
 * Returns true if the current browser is an in-app browser.
 */
export function isInAppBrowser(): boolean {
  return detectInAppBrowser() !== null;
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** 어떤 인앱인지 식별 (isInAppBrowser()가 true일 때만 의미) */
export function getInAppProvider(): 'kakao'|'line'|'instagram'|'threads'|'facebook'|'naver'|'tiktok'|'other'|null {
  if (typeof navigator === 'undefined') return null;
  if (!isInAppBrowser()) return null;
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('kakaotalk')) return 'kakao';
  if (ua.includes('bytedancewebview') || ua.includes('musical_ly') || ua.includes(' trill') || ua.includes('tiktok')) return 'tiktok';
  if (ua.includes('line')) return 'line';
  // 스레드를 먼저 본다(스레드 UA 는 "Barcelona")
  if (ua.includes('barcelona') || ua.includes('threads')) return 'threads';
  if (ua.includes('instagram')) return 'instagram';
  if (ua.includes('fban') || ua.includes('fbav') || ua.includes('fb_iab')) return 'facebook';
  if (ua.includes('naver')) return 'naver';
  return 'other';
}

/**
 * 접속 환경 라벨: "threads:m", "instagram:m", "browser:pc" 처럼 (앱):(모바일/PC).
 * 결제 퍼널 이벤트와 주문에 붙여, 어느 환경에서 결제가 끊기는지 본다(2026-10-04).
 * 개인정보가 아니다(UA 원문을 남기지 않는다).
 */
export function clientEnvLabel(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const app = getInAppProvider() ?? 'browser';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return `${app}:${mobile ? 'm' : 'pc'}`;
}

/** 외부 브라우저로 열거나 복사할 주소에 제휴 표시(kd_ref → ksrc·ksrct)를 붙인다. */
export function externalBrowserUrl(targetUrl?: string, cookieHeader?: string | null): string {
  const raw = targetUrl || (typeof window !== "undefined" ? window.location.href : "");
  if (!raw) return "";
  return appendCampaignHandoffParams(raw, cookieHeader);
}

/**
 * 외부 브라우저로 탈출 시도.
 * @returns true = 탈출 시도함(호출부는 모달 안 띄워도 됨) / false = 못 함(호출부가 복사+안내 모달 띄워야 함)
 */
export function openInExternalBrowser(targetUrl?: string): boolean {
  if (typeof window === 'undefined') return false;
  const url = externalBrowserUrl(targetUrl);
  const provider = getInAppProvider();

  // 카카오톡: 공식 외부열기 스킴 (iOS/안드 모두 동작)
  if (provider === 'kakao') {
    window.location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
    return true;
  }
  // 라인: 쿼리 파라미터로 외부 열기
  if (provider === 'line') {
    const u = new URL(url);
    u.searchParams.set('openExternalBrowser', '1');
    window.location.href = u.toString();
    return true;
  }
  // 틱톡 앱은 intent·앱 스킴을 모두 막는다("작업을 완료할 수 없습니다", 2026-10-27 사장님 안드로이드 실기 확인)
  // → 시도하지 않고 호출부가 ⋯ 메뉴·링크 복사 안내를 띄우게 한다
  if (provider === 'tiktok') return false;
  // 안드로이드(인스타/스레드/페북 등): intent로 크롬 강제 실행
  if (isAndroid()) {
    const u = new URL(url);
    const intent =
      'intent://' + u.host + u.pathname + u.search +
      '#Intent;scheme=https;package=com.android.chrome;' +
      'S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
    window.location.href = intent;
    return true;
  }
  // iOS 기타(인스타/스레드 등): 강제 불가 → 호출부가 모달로 복사+안내
  return false;
}

/**
 * 결제 시작 전 인앱 브라우저 가드.
 *
 * 변천: (1) 인앱이면 결제를 막고 외부 브라우저로 튕김 → (2) [여기서 결제 / 외부 브라우저] 선택 창
 *       → (3) 지금: 선택 창 없이 바로 결제창을 연다.
 * (2)에서도 결제 버튼을 누른 사람이 선택 창에서 그대로 나갔다(2026-10-01: 3명 중 0명 진행).
 * 인앱 결제 자체는 정상 완료가 확인됐으므로 단계를 없애고, 외부 브라우저 안내는
 * 결제창(GuestCheckoutModal) 안의 보조 링크로 옮겼다.
 *
 * @returns 항상 false(바로 결제 진행). 인자는 호출부 호환을 위해 남겨 둔다.
 */
export function blockPaymentIfInApp(_onNeedChoice?: () => void, _retry?: () => void): boolean {
  void _onNeedChoice;
  void _retry;
  if (isInAppBrowser()) {
    // 인앱에서 결제를 시작한 횟수(예전 inapp_payment_blocked 자리)
    trackEvent("inapp_pay_direct", { provider: getInAppProvider() ?? "other", ios: isIOS() });
  }
  return false;
}

/**
 * 틱톡 앱 → 크롬 결제 이어가기(2026-10-27).
 * 처음엔 결제 버튼에서 크롬 intent 로 바로 넘겼지만, 사장님 실기에서 틱톡이 intent 를 막아 "작업을 완료할 수 없습니다"만 떴다.
 * 그래서 이동은 손님이 틱톡 ⋯ 메뉴의 [브라우저에서 열기]로 하고(결제창 안내), 우리는 그 주소에 pay·ho 를 실어 둔다.
 */
export const PAY_HANDOFF_PARAM = "pay";
const HANDED_OFF_PARAM = "ho";

/** 틱톡 앱(안드로이드) — 앱 밖으로 못 나가고(intent 차단) 카카오페이 앱도 못 여는 곳(10-27 실기) */
export function isTikTokAndroid(): boolean {
  return getInAppProvider() === "tiktok" && isAndroid();
}

/**
 * 틱톡 앱(안드로이드)에서 결제창을 열 때, 지금 주소에 pay·ho 를 실어 둔다(이동하지 않음).
 * 손님이 결제창 안내대로 ⋯ → [브라우저에서 열기]를 누르면 틱톡이 이 주소를 크롬으로 열고,
 * 크롬에서는 takePayHandoff 가 같은 상품의 결제창을 바로 연다(미리보기는 주소의 from 으로 이어진다).
 * @returns true = 주소에 실었음(틱톡 안드로이드)
 */
export function markPayHandoffUrl(productId: string, extra?: Record<string, string>): boolean {
  if (typeof window === "undefined" || !isTikTokAndroid()) return false;
  const u = new URL(window.location.href);
  for (const [k, v] of Object.entries(extra ?? {})) u.searchParams.set(k, v);
  u.searchParams.set(PAY_HANDOFF_PARAM, productId);
  u.searchParams.set(HANDED_OFF_PARAM, "1");
  // 크롬에는 쿠키가 없으니 광고 유입 표시(ksrc·ksrct)도 주소에 함께 싣는다
  const next = new URL(externalBrowserUrl(u.toString()));
  try {
    window.history.replaceState(window.history.state, "", next.pathname + next.search + next.hash);
  } catch {
    return false;
  }
  return true;
}

/** 넘겨받은 화면: 주소의 pay 값(열 결제창 상품)을 한 번만 꺼내고 주소에서 지운다 */
export function takePayHandoff(): string | null {
  if (typeof window === "undefined") return null;
  const u = new URL(window.location.href);
  const id = u.searchParams.get(PAY_HANDOFF_PARAM);
  if (!id) return null;
  u.searchParams.delete(PAY_HANDOFF_PARAM);
  try {
    window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash);
  } catch {}
  trackEvent("inapp_pay_handoff_arrived", { productId: id, inApp: isInAppBrowser() });
  return id;
}

/** (동면) 예전 선택 창의 [여기서 바로 결제하기]. 선택 창을 다시 켤 때를 위해 남겨 둔다. */
export function continueInAppPayment(): void {
  trackEvent("inapp_pay_here", { provider: getInAppProvider() ?? "other", ios: isIOS() });
}
