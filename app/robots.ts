import { MetadataRoute } from 'next';
import { BASE_URL, LOCALES } from '@/lib/seo';

/**
 * Every user-facing URL carries a locale prefix (/en/dashboard, /ko/result…),
 * so bare rules like `/dashboard/` never matched anything and Googlebot was
 * free to crawl all the auth-gated pages. Those crawls burn crawl budget and
 * come back as "Crawled – currently not indexed", which is exactly what the
 * Search Console report showed. Rules are now emitted with and without the
 * locale prefix.
 */
const PRIVATE_PATHS = [
  'dashboard',
  'admin',
  'me',
];

function disallowList(extra: string[] = []): string[] {
  const rules = ['/api/', ...extra];
  for (const p of PRIVATE_PATHS) {
    rules.push(`/${p}/`);
    for (const loc of LOCALES) {
      rules.push(`/${loc}/${p}`);
    }
  }
  return rules;
}

export default function robots(): MetadataRoute.Robots {
  const full = disallowList();
  // AI crawlers: same private areas. Compatibility results (/compat/<id>) stay
  // crawlable so Kakao/Twitter/Slack unfurlers can read the share card's OG tags.
  const forAI = disallowList();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: full,
      },
      { userAgent: 'GPTBot', allow: '/', disallow: forAI },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: forAI },
      { userAgent: 'PerplexityBot', allow: '/', disallow: forAI },
      { userAgent: 'Google-Extended', allow: '/', disallow: forAI },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
