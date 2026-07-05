import { MetadataRoute } from 'next';

const BASE_URL = 'https://thekdestiny.com';
const LOCALES = ['en', 'ko', 'ja', 'es', 'de', 'fr'];

/* Public routes that should be indexed by search engines */
const PUBLIC_ROUTES: { path: string; changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'; priority: number }[] = [
  { path: '',              changeFrequency: 'weekly',  priority: 1.0 },
  { path: '/input-destiny', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/pricing',       changeFrequency: 'monthly', priority: 0.8 },
  { path: '/sync',          changeFrequency: 'monthly', priority: 0.7 },
  { path: '/guide',         changeFrequency: 'monthly', priority: 0.6 },
  { path: '/select-master', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/terms',         changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/privacy',       changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/login',         changeFrequency: 'yearly',  priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // Root URL
  entries.push({
    url: BASE_URL,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  });

  // Localized routes
  for (const locale of LOCALES) {
    for (const route of PUBLIC_ROUTES) {
      entries.push({
        url: `${BASE_URL}/${locale}${route.path}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      });
    }
  }

  return entries;
}
