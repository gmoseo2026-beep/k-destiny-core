import { MetadataRoute } from 'next';
import { canonicalUrlFor } from '@/lib/seo';

/**
 * Public routes that should be indexed by search engines.
 *
 * ko 로케일만 내보낸다. 콩닥 Phase A 는 국내 전용이고 en/ja/es/de/fr 은 동면 상태라
 * 비-ko URL 은 ko 와 완전히 동일한 한국어 페이지를 렌더한다. 6개 로케일을 모두 실으면
 * 같은 페이지가 6개 URL 로 중복돼 구글이 대표 URL 을 임의로 고르게 된다.
 * 비-ko 페이지는 lib/seo.ts 에서 canonical 을 대응 ko URL 로 통합해 두었으므로,
 * 그쪽으로 유입되더라도 색인은 /ko/... 하나로 합쳐진다.
 *
 * Deliberately excluded:
 *  - the bare root `/`   → it redirects to /{locale}; a redirecting URL in the
 *    sitemap is what GSC reports as "Page with redirect".
 *  - `/login`, `/me`     → utility / placeholder pages, marked noindex in lib/seo.ts.
 *  - `/compat/[id]`      → personal readings reached by share token, not by search.
 *  - anything behind auth (/dashboard, /admin) → blocked in robots.ts.
 */
const PUBLIC_ROUTES: { path: string; changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'; priority: number }[] = [
  { path: '',            changeFrequency: 'weekly',  priority: 1.0 },
  { path: '/compat/new', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/guide',      changeFrequency: 'monthly', priority: 0.6 },
  { path: '/terms',      changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/privacy',    changeFrequency: 'yearly',  priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: canonicalUrlFor(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
