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
  const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').toLowerCase();
  const { pathname, search } = req.nextUrl;

  if (host === `www.${APEX_HOST}`) {
    const target = pathname === '/' ? `/${routing.defaultLocale}` : pathname;
    return new NextResponse(null, { status: 308, headers: { Location: `https://${APEX_HOST}${target}${search}` } });
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
