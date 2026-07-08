'use client';

import { useEffect } from 'react';

/**
 * KakaoTalk In-App Browser Auto-Escape
 * 
 * When a user opens a shared link inside KakaoTalk's in-app browser,
 * this component automatically redirects them to their device's native 
 * browser using Kakao's official deep-link scheme.
 * 
 * This runs once on mount and only triggers for KakaoTalk UA strings.
 */
export default function KakaoEscape() {
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const ua = navigator.userAgent || '';
    if (/KAKAOTALK/i.test(ua)) {
      const currentUrl = window.location.href;
      window.location.href =
        'kakaotalk://web/openExternal?url=' + encodeURIComponent(currentUrl);
    }
  }, []);

  return null;
}
