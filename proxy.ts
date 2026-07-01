import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // 1. RBAC Check for Admin routes
  const isAdminRoute = pathname === '/admin' || /^\/[a-zA-Z]{2}\/admin(\/.*)?$/.test(pathname);
  
  if (isAdminRoute) {
    // Decode the JWT token using NextAuth's official utility
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    // If no token at all → not logged in → redirect to home
    if (!token) {
      const locale = pathname.split('/')[1];
      const targetLocale = routing.locales.includes(locale as any) ? locale : routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${targetLocale}`, req.url));
    }

    // If logged in but not ADMIN → redirect to home
    if (token.role !== 'ADMIN') {
      const locale = pathname.split('/')[1];
      const targetLocale = routing.locales.includes(locale as any) ? locale : routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${targetLocale}`, req.url));
    }
  }

  // 2. Next-Intl middleware for all other localized routing
  return intlMiddleware(req);
}

export const config = {
  // Match internationalized pathnames and admin
  matcher: [
    '/',
    '/(ko|en|es|de|fr|ja)/:path*',
    '/admin',
    '/(ko|en|es|de|fr|ja)/admin/:path*'
  ]
};
