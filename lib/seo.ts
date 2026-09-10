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
      title: '콩닥 — 우리, 얼마나 잘 맞을까? 사주 궁합',
      description:
        '두 사람의 생년월일만 넣으면 30초 만에 나오는 진짜 사주 궁합. 어려운 한자 없이 다정한 말로 풀어주는 궁합 점수와 케미 키워드, 카카오톡 공유 카드까지 무료로 받아보세요.',
    },
    en: {
      title: 'Kongdak — How Well Do We Match? Saju Compatibility',
      description:
        'Enter two birth dates and get a real Saju-based compatibility reading in 30 seconds — a match score, chemistry keywords and a warm, jargon-free explanation you can share.',
    },
  },

  '/compat/new': {
    ko: {
      title: '무료 궁합 보기 — 생년월일 입력 | 콩닥',
      description:
        '나와 상대방의 생년월일을 넣으면 끝. 회원가입 없이 30초 만에 사주 궁합 점수와 우리 사이 케미 키워드를 확인하고 친구에게 바로 공유해보세요.',
    },
    en: {
      title: 'Free Compatibility Check — Enter Birth Dates | Kongdak',
      description:
        'Just two birth dates, no sign-up. Get a Saju compatibility score and chemistry keywords in 30 seconds, then share the result card with your friend.',
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
};

/** Routes we never want in the index (utility pages with no search value). */
const NOINDEX_PATHS = new Set(['/login', '/me', '/dashboard']);

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
export function canonicalUrlFor(path: string): string {
  return `${BASE_URL}/${DEFAULT_LOCALE}${path}`;
}

/**
 * Builds a full Metadata object for one route in one locale.
 */
export function buildPageMetadata(path: string, locale: string): Metadata {
  const meta = getPageMeta(path, locale);
  const canonicalUrl = canonicalUrlFor(path);
  const noindex = NOINDEX_PATHS.has(path);

  return {
    metadataBase: new URL(BASE_URL),
    title: { absolute: meta.title },
    description: meta.description,
    alternates: {
      canonical: canonicalUrl,
    },
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
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: '콩닥 (kongdak) — 사주 기반 궁합 서비스',
        },
      ],
      locale: OG_LOCALE[locale] ?? OG_LOCALE.en,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: ['/og-image.jpg'],
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
