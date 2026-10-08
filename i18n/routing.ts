import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['ko', 'en', 'es', 'de', 'fr', 'ja'],
  defaultLocale: 'ko',
  localeDetection: false,
  // 언어 자동 감지를 쓰지 않으니 NEXT_LOCALE 쿠키도 읽는 곳이 없다. 응답마다 Set-Cookie 가 붙으면
  // Cloudflare 가 그 페이지를 보관하지 않으므로 끈다.
  localeCookie: false,
  alternateLinks: false,
});

export const {Link, redirect, usePathname, useRouter} = createNavigation(routing);
