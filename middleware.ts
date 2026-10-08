import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import {routing} from './i18n/routing';

const intl = createMiddleware(routing);

/** 대표 도메인(www 없음). canonical · sitemap 이 모두 이 주소를 쓴다. */
const APEX_HOST = 'kongdak.kr';

/**
 * 검색엔진이 같은 화면을 여러 주소로 보지 않게 하는 두 가지 영구 이동(308).
 * - www.kongdak.kr 로 들어오면 kongdak.kr 로 (2026-10-08 까지 www 가 그대로 200 을 돌려줘 주소가 둘로 갈렸다)
 * - 루트(/)는 /ko 로 (next-intl 기본은 임시 이동 307 — 검색엔진이 루트와 /ko 를 따로 붙잡는다)
 * 나머지는 next-intl 에 맡긴다.
 */
export default function middleware(req: NextRequest) {
  // host 만 본다. nginx 가 실제 접속 호스트를 Host 로 넘겨 주고(proxy_set_header Host $host),
  // x-forwarded-host 는 nginx 가 덮어쓰지 않아 방문자가 마음대로 꾸며 보낼 수 있다(2026-10-08 운영에서 확인).
  const host = (req.headers.get('host') ?? '').toLowerCase();
  const { pathname, search } = req.nextUrl;

  if (host === `www.${APEX_HOST}`) {
    const target = pathname === '/' ? `/${routing.defaultLocale}` : pathname;
    // 호스트 헤더로 갈리는 응답이라 Cloudflare 가 페이지 주소로 보관하면 안 된다.
    // next.config 가 검색용 페이지에 붙이는 보관 헤더(lib/seo/edgeCache.ts)까지 둘 다 덮어쓴다 —
    // 하나라도 남으면 x-forwarded-host 를 꾸민 요청 한 번으로 그 페이지가 자기 자신으로 무한 이동한다.
    return new NextResponse(null, {
      status: 308,
      headers: {
        Location: `https://${APEX_HOST}${target}${search}`,
        'Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store',
      },
    });
  }
  if (pathname === '/') {
    // next-intl 이 하던 것과 같은 방식(요청 주소 기준)으로 만들되 영구 이동으로 보낸다
    const url = req.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}`;
    return NextResponse.redirect(url, 308);
  }
  return intl(req);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
