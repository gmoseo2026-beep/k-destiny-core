import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // 1. RBAC Check for Admin routes
  const isAdminRoute = pathname === '/admin' || /^\/[a-zA-Z]{2}\/admin(\/.*)?$/.test(pathname);
  
  if (isAdminRoute) {
    const hasAuthToken = req.cookies.has('sb-auth-token') || req.cookies.has('supabase-auth-token');
    
    // If not authenticated, redirect to localized home
    if (!hasAuthToken) {
      const locale = pathname.split('/')[1];
      const targetLocale = routing.locales.includes(locale as any) ? locale : routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${targetLocale}`, req.url));
    }
  }

  // 2. Next-Intl middleware for all other localized routing
  return intlMiddleware(req);
}

export const config = {
  // Match only internationalized pathnames and root
  matcher: [
    '/',
    '/(ko|en|es|de|fr|ja)/:path*',
    '/admin',
    '/(ko|en|es|de|fr|ja)/admin/:path*'
  ]
};
