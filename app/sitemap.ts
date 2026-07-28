import { MetadataRoute } from 'next';
import { BASE_URL, DEFAULT_LOCALE, LOCALES } from '@/lib/seo';

/**
 * Public routes that should be indexed by search engines.
 *
 * Deliberately excluded:
 *  - the bare root `/`   → it redirects to /{locale}; a redirecting URL in the
 *    sitemap is what GSC reports as "Page with redirect".
 *  - `/login`            → utility page, marked noindex in lib/seo.ts.
 *  - anything behind auth (/dashboard, /result, /chat, /blueprint, /daily,
 *    /onboarding, /admin) → blocked in robots.ts.
 */
const PUBLIC_ROUTES: { path: string; changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'; priority: number }[] = [
  { path: '',               changeFrequency: 'weekly',  priority: 1.0 },
  { path: '/input-destiny', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/pricing',       changeFrequency: 'monthly', priority: 0.8 },
  { path: '/sync',          changeFrequency: 'monthly', priority: 0.7 },
  { path: '/select-master', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/guide',         changeFrequency: 'monthly', priority: 0.6 },
  { path: '/terms',         changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/privacy',       changeFrequency: 'yearly',  priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of PUBLIC_ROUTES) {
    // One hreflang cluster per route, mirrored on every locale entry so the
    // sitemap agrees with the <link rel="alternate"> tags in the page head.
    const languages: Record<string, string> = Object.fromEntries(
      LOCALES.map((loc) => [loc, `${BASE_URL}/${loc}${route.path}`])
    );
    languages['x-default'] = `${BASE_URL}/${DEFAULT_LOCALE}${route.path}`;

    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}${route.path}`,
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: { languages },
      });
    }
  }

  return entries;
}
