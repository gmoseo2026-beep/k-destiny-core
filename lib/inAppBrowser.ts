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
