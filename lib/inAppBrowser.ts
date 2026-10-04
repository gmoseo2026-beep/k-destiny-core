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

/** (동면) 예전 선택 창의 [여기서 바로 결제하기]. 선택 창을 다시 켤 때를 위해 남겨 둔다. */
export function continueInAppPayment(): void {
  trackEvent("inapp_pay_here", { provider: getInAppProvider() ?? "other", ios: isIOS() });
}
