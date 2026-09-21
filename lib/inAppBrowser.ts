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
 * @returns true = 인앱이라 결제를 막았음(호출부는 여기서 return). false = 정상 브라우저(결제 진행).
 * @param onNeedManual 안드/카카오/라인처럼 자동 탈출이 안 되는 iOS 인앱일 때 호출(호출부가 InAppBrowserModal 오픈).
 */
export function blockPaymentIfInApp(onNeedManual: () => void): boolean {
  if (!isInAppBrowser()) return false;      // 정상 브라우저 → 결제 진행
  const escaped = openInExternalBrowser(window.location.href); // 카카오/라인/안드 → 크롬/사파리로 튕김
  if (!escaped) onNeedManual();             // iOS 인스타/스레드 등 → 복사 안내 모달
  return true;                              // 인앱 → 결제 중단
}

