import type { Metadata } from 'next';

/**
 * Central SEO metadata for every public route.
 *
 * Why this file exists: `app/[locale]/layout.tsx` used to be the *only* place
 * that produced metadata, and it hard-coded `canonical: {BASE_URL}/{locale}`.
 * App Router metadata is inherited, so every child page (/en/pricing,
 * /ko/guide, …) told Google "my canonical is the locale homepage" — Google
 * duly dropped them as "Alternate page with proper canonical tag".
 * Each route now declares its own canonical, hreflang set, title and
 * description via `buildPageMetadata()`.
 */

/**
 * 사이트 정본 도메인. canonical · hreflang · og:url · metadataBase · sitemap ·
 * robots 가 모두 여기서 파생되므로 도메인은 이 한 곳에서만 정의한다.
 *
 * NEXT_PUBLIC_* 는 빌드타임에 인라인되므로, 서버에서 빌드하는 safe_deploy 가
 * 읽는 .env 에 NEXT_PUBLIC_SITE_URL 이 반드시 있어야 한다(없으면 폴백값 사용).
 */
export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kongdak.kr';
export const LOCALES = ['ko', 'en', 'ja', 'es', 'de', 'fr'] as const;
export const DEFAULT_LOCALE = 'ko';

export type Locale = (typeof LOCALES)[number];

type Meta = { title: string; description: string };

/** OG locale codes keyed by our locale segment. */
const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  ko: 'ko_KR',
  ja: 'ja_JP',
  es: 'es_ES',
  de: 'de_DE',
  fr: 'fr_FR',
};

/**
 * path '' is the locale homepage. Keys must match the route segment exactly
 * (leading slash, no trailing slash).
 */
export const PAGE_META: Record<string, Record<string, Meta>> = {
  '': {
    ko: {
      title: '콩닥 — 그 사람 속마음까지 보는 사주 궁합',
      description:
        '그 사람은 지금 나를 어떻게 생각할까? 생년월일만 넣으면 30초 — 궁합, 속마음, 둘만의 속궁합까지 무료로 먼저 봐요.',
    },
    en: {
      title: 'Kongdak — How Well Do We Match? Saju Compatibility',
      description:
        'Enter two birth dates and get a real Saju-based compatibility reading in 30 seconds — a match score, chemistry keywords and a warm, jargon-free explanation you can share.',
    },
  },

  '/compat/new': {
    ko: {
      title: '무료 사주 궁합 보기 — 생년월일로 30초 | 콩닥',
      description:
        '나와 상대방의 생년월일을 넣으면 끝. 회원가입 없이 30초 만에 사주 궁합 점수와 우리 사이 케미 키워드를 확인하고 친구에게 바로 공유해보세요.',
    },
    en: {
      title: 'Free Compatibility Check — Enter Birth Dates | Kongdak',
      description:
        'Just two birth dates, no sign-up. Get a Saju compatibility score and chemistry keywords in 30 seconds, then share the result card with your friend.',
    },
  },

  '/fortune/annual': {
    ko: {
      title: '2026년 신년 총운 무료 맛보기 — 붉은 말의 해 내 운세 | 콩닥',
      description:
        '2026년 붉은 말의 해, 나의 한 해 흐름과 월별 운세, 연애·돈·일의 흐름을 생년월일로 다정하게 풀어 드려요. 무료로 먼저 볼 수 있어요.',
    },
    en: {
      title: '2026 Annual Fortune Reading | Kongdak',
      description:
        'Discover your 2026 comprehensive annual fortune and monthly outlook powered by Saju.',
    },
  },

  '/guide': {
    ko: {
      title: '콩닥 이용 방법 — 사주 궁합 보는 법 | 콩닥',
      description:
        '콩닥으로 궁합 보는 방법을 3단계로 안내합니다. 생년월일 입력부터 궁합 점수 확인, 결과 공유까지 어떻게 이어지는지 한눈에 확인하세요.',
    },
    en: {
      title: 'How Kongdak Works — Reading Your Saju Match | Kongdak',
      description:
        'A three-step walkthrough of Kongdak: enter two birth dates, read the compatibility score and keywords, then share the result card.',
    },
  },

  '/pricing': {
    ko: {
      title: '콩닥 플러스 — 요금 안내 | 콩닥',
      description:
        '심층 궁합 리포트와 2026 총운까지, 더 깊게 보고 싶을 때. 콩닥 플러스 단건 결제와 기간 이용권 안내.',
    },
    en: {
      title: 'Pricing — Kongdak Plus Pass & Single Report | Kongdak',
      description:
        'Pricing for Kongdak deep compatibility reports and 2026 annual fortune. Single purchases and period pass options.',
    },
  },

  '/terms': {
    ko: {
      title: '이용약관 | 콩닥',
      description: '콩닥(kongdak) 서비스 이용약관입니다. 서비스의 성격, 이용자의 의무, 유료 서비스와 청약철회 기준을 확인하세요.',
    },
    en: {
      title: 'Terms of Service | Kongdak',
      description: 'The terms that govern your use of Kongdak, including the nature of the service, user obligations, paid content and withdrawal.',
    },
  },

  '/privacy': {
    ko: {
      title: '개인정보처리방침 | 콩닥',
      description: '콩닥(kongdak)이 생년월일 등 개인정보를 어떻게 수집·이용·보호하는지 안내합니다. 생년월일·시간은 단방향 해시로만 저장합니다.',
    },
    en: {
      title: 'Privacy Policy | Kongdak',
      description: 'How Kongdak collects, uses and protects your data. Birth dates and times are stored only as one-way hashes.',
    },
  },

  '/login': {
    ko: { title: '로그인 | 콩닥', description: '콩닥 계정으로 로그인하면 궁합 기록을 저장하고 더 편하게 이용할 수 있어요.' },
    en: { title: 'Sign in | Kongdak', description: 'Sign in to save your compatibility readings on Kongdak.' },
  },

  '/me': {
    ko: { title: '내 사주 요약 | 콩닥', description: '사주로 보는 나의 타고난 본질 에너지와 매력을 다정한 말로 풀어드립니다.' },
    en: { title: 'My Saju Summary | Kongdak', description: 'A warm, plain-language summary of your own Saju.' },
  },

  '/dashboard': {
    ko: { title: '내 콩닥 | 콩닥', description: '내가 본 궁합 기록을 모아보고 새 궁합을 시작하세요.' },
    en: { title: 'My Kongdak | Kongdak', description: 'Your saved compatibility readings.' },
  },

  '/fortune/new': {
    ko: {
      title: '무료 사주 풀이 — 생년월일로 보는 내 운세 | 콩닥',
      description:
        '생년월일만 넣으면 30초. 재물운·연애운·취업운·신년운까지 내 사주를 쉬운 말로 풀어 드려요. 회원가입 없이 무료로 먼저 볼 수 있어요.',
    },
    en: { title: 'Free Saju Reading | Kongdak', description: 'Enter your birth date and read your fortune in 30 seconds.' },
  },

  '/pay/complete': {
    ko: { title: '결제 안내 | 콩닥', description: '결제 결과를 확인하고 리포트로 이동합니다.' },
    en: { title: 'Payment | Kongdak', description: 'Payment result.' },
  },

  '/onboarding': {
    ko: { title: '내 사주 정보 저장 | 콩닥', description: '내 생년월일을 한 번 저장하면 매번 입력하지 않아도 돼요.' },
    en: { title: 'Save my birth info | Kongdak', description: 'Save your birth info once.' },
  },

  '/fortune/weekly': {
    ko: { title: '이번 주 종합 운세 | 콩닥', description: '한 주의 흐름을 미리 읽고 대비하는 주간 운세.' },
    en: { title: 'Weekly Fortune | Kongdak', description: 'Your week ahead.' },
  },
};

/**
 * Routes we never want in the index (utility pages with no search value).
 * 결제 완료·내 정보 저장·주간 운세(로그인 필요)는 검색으로 들어올 화면이 아니다.
 */
const NOINDEX_PATHS = new Set(['/login', '/me', '/dashboard', '/pay/complete', '/onboarding', '/fortune/weekly']);

export function getPageMeta(path: string, locale: string): Meta {
  const byLocale = PAGE_META[path] ?? PAGE_META[''];
  return byLocale[locale] ?? byLocale[DEFAULT_LOCALE];
}

/**
 * 한 라우트의 정본 URL. 콩닥 Phase A 는 국내 전용이고 en/ja/es/de/fr 은 동면 상태라
 * 비-ko 로케일도 ko 문안을 그대로 렌더한다(i18n/request.ts 의 ko 정본 규칙).
 * 즉 /en/terms 와 /ko/terms 는 완전히 동일한 한국어 페이지다.
 *
 * 그래서 로케일과 무관하게 canonical 을 항상 ko URL 로 통합한다. 누가 /en/terms 로
 * 들어와도 구글은 /ko/terms 하나로 합치고, 6개 URL 이 중복으로 갈리거나 엉뚱한
 * 로케일이 대표 URL 로 뽑히는 일이 없다.
 *
 * hreflang 클러스터는 제거했다. hreflang 은 각 페이지가 자기참조 canonical 을 가질 때만
 * 유효한데, 여기서는 비-ko 가 ko 를 가리키므로 두 신호가 서로 모순된다.
 * 로케일을 다시 깨울 때 canonicalLocale 을 locale 로 되돌리고 클러스터를 복원하면 된다.
 */
/** 공유 카드 이미지. 문구를 바꾸면 v 를 올려 메신저·SNS 캐시를 새로 받게 한다. */
export const OG_CARD_VERSION = 2;
export const OG_CARD_URL = `/api/og/card?v=${OG_CARD_VERSION}`;
export const productOgCardUrl = (productId: string) =>
  `/api/og/card?p=${encodeURIComponent(productId)}&v=${OG_CARD_VERSION}`;

/**
 * 상품 링크를 공유했을 때의 미리보기(제목·설명·이미지). 홈 카드가 아니라 상품의 질문(hook)을 보여 준다.
 * url 은 이 페이지의 정본 주소 — og:url 이 홈을 가리키면 SNS 가 홈 링크로 합쳐 버린다.
 */
/**
 * 상품 상세의 검색 결과용 제목·설명. 이름만 있던 제목(14자)·한 줄 설명(19자)으로는 검색 결과에서
 * 무엇을 해 주는지 알 수 없었다(2026-10-08 점검). 상품의 질문(hook)과 가격·무료 미리보기를 넣는다.
 */
export function productSearchMeta(product: {
  name: string;
  description: string;
  hook: string;
  subtitle?: string;
  price: number;
  isFree?: boolean;
}): { title: string; description: string } {
  const title = `${product.name} — ${product.description} | 콩닥`;
  const price = product.isFree ? '무료로 볼 수 있어요.' : `무료 미리보기 후 ${product.price.toLocaleString('ko-KR')}원.`;
  const description = `${product.hook} ${product.subtitle ?? ''} 생년월일만 넣으면 30초, ${price}`.replace(/\s+/g, ' ').trim();
  return { title, description: description.slice(0, 158) };
}

export function productShareMeta(
  product: { id: string; name: string; hook: string; subtitle?: string; description: string },
  url: string
): Pick<Metadata, 'openGraph' | 'twitter'> {
  const title = `${product.hook} | 콩닥 ${product.name}`;
  const description = `${product.subtitle ?? product.description} 생년월일만 넣으면 30초, 무료로 먼저 봐요.`;
  const image = { url: `${BASE_URL}${productOgCardUrl(product.id)}`, width: 1200, height: 630, alt: product.hook };
  return {
    openGraph: { title, description, url, siteName: '콩닥 (kongdak)', type: 'website', locale: 'ko_KR', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  };
}

export function canonicalUrlFor(path: string): string {
  return `${BASE_URL}/${DEFAULT_LOCALE}${path}`;
}

/**
 * Builds a full Metadata object for one route in one locale.
 */
/**
 * @param opts.inherited 레이아웃이 모든 하위 화면에 내려 주는 기본값으로 쓸 때 true.
 *   이때는 canonical 을 넣지 않는다 — 넣으면 자기 canonical 을 선언하지 않은 화면이 전부
 *   "홈의 중복"이라고 말하게 된다(2026-10-08: /fortune/annual·/pay/complete 가 홈을 canonical 로 가리키고 있었다).
 *   홈의 canonical 은 app/[locale]/page.tsx 가 직접 선언한다.
 */
export function buildPageMetadata(path: string, locale: string, opts: { inherited?: boolean } = {}): Metadata {
  const meta = getPageMeta(path, locale);
  const canonicalUrl = canonicalUrlFor(path);
  const noindex = NOINDEX_PATHS.has(path);

  return {
    metadataBase: new URL(BASE_URL),
    title: { absolute: meta.title },
    description: meta.description,
    ...(opts.inherited ? {} : { alternates: { canonical: canonicalUrl } }),
    // 네이버 서치어드바이저 사이트 소유확인용 메타. 공개 검증 토큰이라 하드코딩 안전.
    verification: {
      other: { 'naver-site-verification': 'adb48681bd4421372c1c3d7306629630e6281a6f' },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: canonicalUrl,
      siteName: '콩닥 (kongdak)',
      images: [
        {
          url: OG_CARD_URL,
          width: 1200,
          height: 630,
          alt: '콩닥 (kongdak) — 그 사람, 지금 나를 어떻게 생각할까?',
        },
      ],
      locale: OG_LOCALE[locale] ?? OG_LOCALE.en,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: [OG_CARD_URL],
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/icon.svg', type: 'image/svg+xml' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: [
        { url: '/icons/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    robots: noindex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
  };
}

/**
 * Convenience factory for the thin server-side `layout.tsx` files that sit
 * next to each `"use client"` page (client components cannot export metadata).
 */
export function createPageMetadata(path: string) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const { locale } = await params;
    return buildPageMetadata(path, locale);
  };
}
