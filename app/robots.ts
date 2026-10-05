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

/**
 * 막는 API 경로. `/api/` 를 통째로 막지 않는다 — 공유 카드 이미지가 `/api/og/…` 에 있어서,
 * 통째로 막으면 메타(스레드·인스타)·카카오 수집기가 카드 이미지를 가져가지 못한다
 * (2026-10-03~05 메타 수집기가 페이지는 22번 읽고 이미지는 0번 가져갔다).
 * 새 API 폴더를 만들면 여기에 추가한다. `og` 는 넣지 않는다.
 */
const PRIVATE_API = [
  'admin', 'auth', 'checkout', 'compat', 'fortune', 'generate-compat', 'hermes',
  'payments', 'push', 'reports', 'subscriptions', 'user', 'visit', 'webhooks',
];

function disallowList(extra: string[] = []): string[] {
  const rules = [...PRIVATE_API.map((p) => `/api/${p}`), ...extra];
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
