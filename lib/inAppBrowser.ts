import { trackEvent } from "@/lib/gtag";

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
  // Line
  'Line/',
  // Twitter / X
  'Twitter',
  // Snapchat
  'Snapchat',
  // TikTok
  'BytedanceWebview',
  'TikTok',
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
export function getInAppProvider(): 'kakao'|'line'|'instagram'|'threads'|'facebook'|'naver'|'other'|null {
  if (typeof navigator === 'undefined') return null;
  if (!isInAppBrowser()) return null;
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('kakaotalk')) return 'kakao';
  if (ua.includes('line')) return 'line';
  if (ua.includes('instagram')) return 'instagram';
  if (ua.includes('threads')) return 'threads';
  if (ua.includes('fban') || ua.includes('fbav') || ua.includes('fb_iab')) return 'facebook';
  if (ua.includes('naver')) return 'naver';
  return 'other';
}

/**
 * 외부 브라우저로 탈출 시도.
 * @returns true = 탈출 시도함(호출부는 모달 안 띄워도 됨) / false = 못 함(호출부가 복사+안내 모달 띄워야 함)
 */
export function openInExternalBrowser(targetUrl?: string): boolean {
  if (typeof window === 'undefined') return false;
  const url = targetUrl || window.location.href;
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
 * 예전에는 인앱이면 결제를 막고 외부 브라우저로 튕겼다(방문자의 약 1/4 이 결제 버튼에서 멈춤).
 * 이제는 선택 창만 띄운다: [여기서 바로 결제하기] 또는 [외부 브라우저로 열기].
 * 사용자가 "여기서 결제"를 고르면 이 탭에서는 다시 묻지 않고, 막혔던 동작(retry)을 이어서 실행한다.
 *
 * @returns true = 선택 창을 띄웠음(호출부는 여기서 return). false = 바로 결제 진행.
 * @param onNeedChoice 호출부가 결제 선택 창(InAppPaymentChoice)을 여는 함수
 * @param retry 사용자가 "여기서 결제"를 고르면 이어서 실행할 동작(보통 결제창 열기)
 */
const INAPP_PAY_OK_KEY = "kd_inapp_pay_ok";
let inAppPayAllowed = false;
let pendingRetry: (() => void) | null = null;

function inAppPayAlreadyChosen(): boolean {
  if (inAppPayAllowed) return true;
  try {
    return window.sessionStorage.getItem(INAPP_PAY_OK_KEY) === "1";
  } catch {
    return false;
  }
}

export function blockPaymentIfInApp(onNeedChoice: () => void, retry?: () => void): boolean {
  if (!isInAppBrowser()) return false;        // 정상 브라우저 → 결제 진행
  if (inAppPayAlreadyChosen()) return false;  // 이미 "여기서 결제"를 고름
  pendingRetry = retry ?? null;
  // 인앱이라 선택 창이 뜬 횟수(호출부의 클릭 이벤트는 이 가드 뒤에 있을 수 있다)
  trackEvent("inapp_payment_blocked", { provider: getInAppProvider() ?? "other", ios: isIOS() });
  onNeedChoice();
  return true;
}

/** 선택 창의 [여기서 바로 결제하기]: 이 탭에서는 다시 묻지 않고, 막혔던 결제 동작을 이어서 실행한다. */
export function continueInAppPayment(): void {
  inAppPayAllowed = true;
  try {
    window.sessionStorage.setItem(INAPP_PAY_OK_KEY, "1");
  } catch {
    // 저장소가 막혀도 이 페이지에서는 inAppPayAllowed 로 충분하다
  }
  trackEvent("inapp_pay_here", { provider: getInAppProvider() ?? "other", ios: isIOS() });
  const run = pendingRetry;
  pendingRetry = null;
  run?.();
}

