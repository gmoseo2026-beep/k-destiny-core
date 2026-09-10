import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['ko', 'en', 'es', 'de', 'fr', 'ja'],
  defaultLocale: 'ko',
  localeDetection: false,
  alternateLinks: false,
});

export const {Link, redirect, usePathname, useRouter} = createNavigation(routing);
