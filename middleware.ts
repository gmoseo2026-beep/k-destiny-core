import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  // Skip API routes, Next.js internals, and static assets
  matcher: ['/', '/(en|ko|es|de|fr|ja)/:path*']
};
