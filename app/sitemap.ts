import { MetadataRoute } from 'next';
import { canonicalUrlFor } from '@/lib/seo';
import { isViewableFor } from '@/lib/catalog';
import { getEffectiveCatalog } from '@/lib/catalogVisibility';
import { FORTUNE_TARGET_YEAR } from '@/lib/seo/zodiac';
import { pairSlugsWithContent, birthYearsWithContent } from '@/lib/seo/data';

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
 *  - `/pricing`          → 홈의 상품 목록으로 리다이렉트된다(2026-10-08 까지 실려 있어 "리다이렉트 포함 페이지"로 잡혔다).
 *  - `/compat/[id]`      → personal readings reached by share token, not by search.
 *  - anything behind auth (/dashboard, /admin) → blocked in robots.ts.
 */
const PUBLIC_ROUTES: { path: string; changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'; priority: number }[] = [
  { path: '',            changeFrequency: 'weekly',  priority: 1.0 },
  { path: '/compat/new', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/fortune/new', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/fortune/annual', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/guide',      changeFrequency: 'monthly', priority: 0.6 },
  { path: '/terms',      changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/privacy',    changeFrequency: 'yearly',  priority: 0.3 },
];

/**
 * 마지막으로 내용을 고친 날. 요청할 때마다 "지금"을 찍으면 검색엔진이 이 값을 믿지 않게 된다.
 * 화면 내용을 크게 바꾸면 해당 날짜를 올린다.
 */
const SITE_UPDATED = new Date('2026-10-08T00:00:00+09:00'); // 홈·입력·상품 상세(제목·설명·구조화 데이터 정비)
const SEO_PAGES_UPDATED = new Date('2026-10-05T00:00:00+09:00'); // 띠 궁합·출생연도 운세 본문 생성일

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = SITE_UPDATED;

  const base = PUBLIC_ROUTES.map((route) => ({
    url: canonicalUrlFor(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // 상품 상세 페이지(공개 상품만). 2026-10-05 까지는 위 6개 주소뿐이라 검색엔진이 상품 페이지
  // 20여 개를 알 길이 없었다. 각 페이지는 질문형 제목·소개·공유 카드를 갖고 있다.
  let products: MetadataRoute.Sitemap = [];
  try {
    const catalog = await getEffectiveCatalog();
    products = catalog
      .filter((p) => isViewableFor(p, false))
      .map((p) => ({
        url: canonicalUrlFor(`/products/${p.id}`),
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: p.type === 'SET' ? 0.5 : 0.8,
      }));
  } catch {
    // DB 를 못 읽으면 기본 주소만 낸다
  }

  // 검색용 페이지: 띠 궁합(78쌍)과 출생연도별 운세(48개). 본문이 있는 것만 싣는다.
  const seoPages: MetadataRoute.Sitemap = [
    { url: canonicalUrlFor('/zodiac'), lastModified: SEO_PAGES_UPDATED, changeFrequency: 'monthly', priority: 0.7 },
    { url: canonicalUrlFor(`/fortune/${FORTUNE_TARGET_YEAR}`), lastModified: SEO_PAGES_UPDATED, changeFrequency: 'monthly', priority: 0.7 },
    ...pairSlugsWithContent().map((slug) => ({
      url: canonicalUrlFor(`/zodiac/${slug}`),
      lastModified: SEO_PAGES_UPDATED,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...birthYearsWithContent().map((y) => ({
      url: canonicalUrlFor(`/fortune/${FORTUNE_TARGET_YEAR}/${y}`),
      lastModified: SEO_PAGES_UPDATED,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];

  return [...base, ...products, ...seoPages];
}
