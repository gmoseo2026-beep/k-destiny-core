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

export const BASE_URL = 'https://thekdestiny.com';
export const LOCALES = ['en', 'ko', 'ja', 'es', 'de', 'fr'] as const;
export const DEFAULT_LOCALE = 'en';

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
    en: {
      title: 'K-Destiny | AI-Powered Saju Astrology — Unlock Your Cosmic Blueprint',
      description:
        "The world's first AI-powered Korean Saju (四柱推命) astrology platform. Discover your destiny through ancient Eastern wisdom meets modern AI. Premium cosmic readings, compatibility analysis, and personalized fortune predictions.",
    },
    ko: {
      title: 'K-Destiny | AI 사주 운세 — 당신의 우주적 설계도를 열다',
      description:
        '정통 만세력 기반 AI 사주 플랫폼. 생년월일로 나의 사주 명식과 오행 분석, 연애·재물·건강 운세와 궁합까지. 6개 언어로 전 세계에 한국 사주를 전합니다.',
    },
    ja: {
      title: 'K-Destiny | AIで読む韓国四柱推命 — あなたの運命の設計図',
      description:
        '正統な万年暦に基づくAI四柱推命プラットフォーム。生年月日からあなたの命式と五行を解析し、恋愛・金運・健康運と相性まで。韓国発の本格四柱推命を日本語で。',
    },
    es: {
      title: 'K-Destiny | Astrología Saju con IA — Descubre tu plano cósmico',
      description:
        'La primera plataforma de astrología coreana Saju (四柱推命) impulsada por IA. Descubre tu destino: lecturas premium, análisis de compatibilidad y predicciones personalizadas.',
    },
    de: {
      title: 'K-Destiny | KI-Saju-Astrologie — Ihr kosmischer Bauplan',
      description:
        'Die erste KI-gestützte Plattform für koreanische Saju-Astrologie (四柱推命). Entdecken Sie Ihr Schicksal: Premium-Deutungen, Kompatibilitätsanalysen und persönliche Prognosen.',
    },
    fr: {
      title: 'K-Destiny | Astrologie Saju par IA — Votre plan cosmique',
      description:
        "La première plateforme d'astrologie coréenne Saju (四柱推命) propulsée par l'IA. Découvrez votre destin : lectures premium, analyses de compatibilité et prédictions personnalisées.",
    },
  },

  '/input-destiny': {
    en: {
      title: 'Free Saju Reading — Enter Your Birth Date | K-Destiny',
      description:
        'Enter your birth date and time to generate a free AI Saju (Four Pillars) birth chart. See your day master, five-element balance and what your cosmic blueprint says about you.',
    },
    ko: {
      title: '무료 사주 보기 — 생년월일 입력 | K-Destiny',
      description:
        '생년월일과 태어난 시간을 입력하면 AI가 만세력 기준으로 사주 명식을 뽑아 드립니다. 일간, 오행 균형, 십신 구조까지 무료로 확인하세요.',
    },
    ja: {
      title: '無料の四柱推命鑑定 — 生年月日を入力 | K-Destiny',
      description:
        '生年月日と出生時刻を入力するだけで、AIが万年暦に基づく命式を作成。日主・五行バランス・十神の構成を無料でご覧いただけます。',
    },
    es: {
      title: 'Lectura Saju gratis — Introduce tu fecha de nacimiento | K-Destiny',
      description:
        'Introduce tu fecha y hora de nacimiento para generar gratis tu carta Saju (Cuatro Pilares) con IA: maestro del día, equilibrio de los cinco elementos y tu plano cósmico.',
    },
    de: {
      title: 'Kostenlose Saju-Deutung — Geburtsdatum eingeben | K-Destiny',
      description:
        'Geben Sie Geburtsdatum und -zeit ein und erhalten Sie kostenlos Ihr KI-Saju-Chart (Vier Säulen): Tagesmeister, Fünf-Elemente-Balance und Ihren kosmischen Bauplan.',
    },
    fr: {
      title: 'Lecture Saju gratuite — Entrez votre date de naissance | K-Destiny',
      description:
        'Saisissez votre date et heure de naissance pour générer gratuitement votre thème Saju (Quatre Piliers) par IA : maître du jour, équilibre des cinq éléments et plan cosmique.',
    },
  },

  '/pricing': {
    en: {
      title: 'Pricing — Free and Premium Saju Readings | K-Destiny',
      description:
        'Compare K-Destiny plans. Start with a free cosmic blueprint, or upgrade for the monthly karma report, compatibility sync, 2027 fortune forecast and unlimited AI master chat.',
    },
    ko: {
      title: '요금제 — 무료·프리미엄 사주 리포트 | K-Destiny',
      description:
        'K-Destiny 요금제 비교. 무료 사주 명식부터 월간 카르마 리포트, 궁합 분석, 2027 운세 예측, 무제한 AI 마스터 상담까지 한눈에 확인하세요.',
    },
    ja: {
      title: '料金プラン — 無料・プレミアム四柱推命 | K-Destiny',
      description:
        'K-Destinyの料金プラン比較。無料の命式鑑定から、月間カルマレポート・相性診断・2027年運勢予測・AIマスター無制限チャットまで。',
    },
    es: {
      title: 'Precios — Lecturas Saju gratuitas y premium | K-Destiny',
      description:
        'Compara los planes de K-Destiny. Empieza con el plano cósmico gratuito o mejora para el informe kármico mensual, la compatibilidad y el pronóstico 2027.',
    },
    de: {
      title: 'Preise — Kostenlose und Premium-Saju-Deutungen | K-Destiny',
      description:
        'Vergleichen Sie die K-Destiny-Tarife. Starten Sie mit dem kostenlosen kosmischen Bauplan oder upgraden Sie für Karma-Report, Kompatibilität und 2027-Prognose.',
    },
    fr: {
      title: 'Tarifs — Lectures Saju gratuites et premium | K-Destiny',
      description:
        'Comparez les formules K-Destiny. Commencez avec le plan cosmique gratuit ou passez au rapport karmique mensuel, à la compatibilité et aux prévisions 2027.',
    },
  },

  '/sync': {
    en: {
      title: 'Compatibility Sync — Saju Love and Relationship Match | K-Destiny',
      description:
        'Check Saju compatibility (궁합) between two birth charts. Our AI reads element clashes, harmonies and relationship dynamics to score how your energies sync.',
    },
    ko: {
      title: '궁합 보기 — 사주 연애·관계 궁합 분석 | K-Destiny',
      description:
        '두 사람의 사주 명식으로 궁합을 분석합니다. 오행의 상생·상극과 합충 관계를 AI가 읽어 연애·결혼·인간관계 에너지 싱크를 점수로 보여드립니다.',
    },
    ja: {
      title: '相性診断 — 四柱推命の恋愛・相性分析 | K-Destiny',
      description:
        '二人の命式から相性を分析。五行の相生・相剋や合冲をAIが読み解き、恋愛・結婚・人間関係のエネルギー相性をスコアで表示します。',
    },
    es: {
      title: 'Sincronía de compatibilidad — Amor y relaciones en el Saju | K-Destiny',
      description:
        'Comprueba la compatibilidad Saju entre dos cartas natales. La IA analiza choques y armonías de elementos para puntuar cómo se sincronizan vuestras energías.',
    },
    de: {
      title: 'Kompatibilitäts-Sync — Liebe und Beziehung nach Saju | K-Destiny',
      description:
        'Prüfen Sie die Saju-Kompatibilität zweier Geburtsbilder. Die KI liest Element-Konflikte und -Harmonien und bewertet, wie gut Ihre Energien zusammenpassen.',
    },
    fr: {
      title: 'Synchronisation de compatibilité — Amour et relations Saju | K-Destiny',
      description:
        'Testez la compatibilité Saju entre deux thèmes. L\'IA analyse les conflits et harmonies d\'éléments pour noter la synchronisation de vos énergies.',
    },
  },

  '/guide': {
    en: {
      title: 'Saju Guide — How Korean Four Pillars Astrology Works | K-Destiny',
      description:
        'A beginner-friendly guide to Korean Saju: the four pillars, heavenly stems and earthly branches, the five elements, and how to read your own birth chart.',
    },
    ko: {
      title: '사주 가이드 — 사주팔자와 오행 쉽게 읽는 법 | K-Destiny',
      description:
        '사주 입문 가이드. 년월일시 사주팔자의 구조, 천간과 지지, 오행과 십신의 의미, 내 명식을 스스로 해석하는 방법을 쉽게 정리했습니다.',
    },
    ja: {
      title: '四柱推命ガイド — 命式と五行の読み方 | K-Destiny',
      description:
        '四柱推命の入門ガイド。年月日時の四つの柱、天干と地支、五行と十神の意味、そして自分の命式を読み解く方法をやさしく解説します。',
    },
    es: {
      title: 'Guía Saju — Cómo funciona la astrología coreana | K-Destiny',
      description:
        'Guía para principiantes sobre el Saju coreano: los cuatro pilares, troncos celestes y ramas terrestres, los cinco elementos y cómo leer tu carta natal.',
    },
    de: {
      title: 'Saju-Leitfaden — Die koreanische Vier-Säulen-Astrologie | K-Destiny',
      description:
        'Einsteiger-Leitfaden zum koreanischen Saju: die vier Säulen, Himmelsstämme und Erdzweige, die fünf Elemente und wie Sie Ihr Geburtsbild selbst lesen.',
    },
    fr: {
      title: 'Guide Saju — L\'astrologie coréenne des Quatre Piliers | K-Destiny',
      description:
        'Guide pour débutants sur le Saju coréen : les quatre piliers, troncs célestes et branches terrestres, les cinq éléments et la lecture de votre thème.',
    },
  },

  '/select-master': {
    en: {
      title: 'Choose Your AI Saju Master | K-Destiny',
      description:
        'Pick the AI master whose voice fits you — from the classical scholar to the modern coach — and get your Saju reading in their style.',
    },
    ko: {
      title: 'AI 사주 마스터 선택 | K-Destiny',
      description:
        '고전 명리 학자부터 현대적인 코치까지, 나에게 맞는 AI 마스터를 선택하고 그 스타일로 사주 풀이를 받아보세요.',
    },
    ja: {
      title: 'AI四柱推命マスターを選ぶ | K-Destiny',
      description:
        '古典的な命理学者から現代的なコーチまで、自分に合うAIマスターを選び、そのスタイルで鑑定を受けられます。',
    },
    es: {
      title: 'Elige tu maestro Saju con IA | K-Destiny',
      description:
        'Elige el maestro de IA que mejor encaje contigo, del erudito clásico al coach moderno, y recibe tu lectura Saju con su estilo.',
    },
    de: {
      title: 'Wählen Sie Ihren KI-Saju-Meister | K-Destiny',
      description:
        'Wählen Sie den KI-Meister, dessen Stimme zu Ihnen passt — vom klassischen Gelehrten bis zum modernen Coach — und erhalten Sie Ihre Deutung in seinem Stil.',
    },
    fr: {
      title: 'Choisissez votre maître Saju IA | K-Destiny',
      description:
        'Choisissez le maître IA qui vous correspond, de l\'érudit classique au coach moderne, et recevez votre lecture Saju dans son style.',
    },
  },

  '/terms': {
    en: {
      title: 'Terms of Service | K-Destiny',
      description: 'The terms that govern your use of K-Destiny, including subscriptions, refunds and acceptable use.',
    },
    ko: {
      title: '이용약관 | K-Destiny',
      description: 'K-Destiny 서비스 이용약관입니다. 구독, 환불, 이용 제한 사항을 확인하세요.',
    },
    ja: {
      title: '利用規約 | K-Destiny',
      description: 'K-Destinyの利用規約です。サブスクリプション、返金、禁止事項についてご確認ください。',
    },
    es: {
      title: 'Términos del servicio | K-Destiny',
      description: 'Términos que rigen el uso de K-Destiny, incluidas suscripciones, reembolsos y uso aceptable.',
    },
    de: {
      title: 'Nutzungsbedingungen | K-Destiny',
      description: 'Die Bedingungen für die Nutzung von K-Destiny, einschließlich Abonnements, Erstattungen und zulässiger Nutzung.',
    },
    fr: {
      title: 'Conditions d\'utilisation | K-Destiny',
      description: 'Les conditions régissant l\'utilisation de K-Destiny : abonnements, remboursements et usage acceptable.',
    },
  },

  '/privacy': {
    en: {
      title: 'Privacy Policy | K-Destiny',
      description: 'How K-Destiny collects, uses and protects your birth data and account information.',
    },
    ko: {
      title: '개인정보처리방침 | K-Destiny',
      description: 'K-Destiny가 생년월일 등 개인정보를 수집·이용·보호하는 방식을 안내합니다.',
    },
    ja: {
      title: 'プライバシーポリシー | K-Destiny',
      description: 'K-Destinyが生年月日などの個人情報をどのように収集・利用・保護するかをご案内します。',
    },
    es: {
      title: 'Política de privacidad | K-Destiny',
      description: 'Cómo K-Destiny recopila, usa y protege tus datos de nacimiento y de cuenta.',
    },
    de: {
      title: 'Datenschutzerklärung | K-Destiny',
      description: 'Wie K-Destiny Ihre Geburtsdaten und Kontoinformationen erhebt, nutzt und schützt.',
    },
    fr: {
      title: 'Politique de confidentialité | K-Destiny',
      description: 'Comment K-Destiny collecte, utilise et protège vos données de naissance et de compte.',
    },
  },

  '/login': {
    en: { title: 'Sign in | K-Destiny', description: 'Sign in to your K-Destiny account.' },
    ko: { title: '로그인 | K-Destiny', description: 'K-Destiny 계정으로 로그인하세요.' },
    ja: { title: 'ログイン | K-Destiny', description: 'K-Destinyアカウントにログインします。' },
    es: { title: 'Iniciar sesión | K-Destiny', description: 'Inicia sesión en tu cuenta de K-Destiny.' },
    de: { title: 'Anmelden | K-Destiny', description: 'Melden Sie sich bei Ihrem K-Destiny-Konto an.' },
    fr: { title: 'Connexion | K-Destiny', description: 'Connectez-vous à votre compte K-Destiny.' },
  },
};

/** Routes we never want in the index (utility pages with no search value). */
const NOINDEX_PATHS = new Set(['/login']);

export function getPageMeta(path: string, locale: string): Meta {
  const byLocale = PAGE_META[path] ?? PAGE_META[''];
  return byLocale[locale] ?? byLocale[DEFAULT_LOCALE];
}

/**
 * Builds a full Metadata object for one route in one locale, with the
 * self-referencing canonical and the complete hreflang cluster for that route.
 */
export function buildPageMetadata(path: string, locale: string): Metadata {
  const meta = getPageMeta(path, locale);
  const canonicalUrl = `${BASE_URL}/${locale}${path}`;
  const noindex = NOINDEX_PATHS.has(path);

  const languages: Record<string, string> = Object.fromEntries(
    LOCALES.map((loc) => [loc, `${BASE_URL}/${loc}${path}`])
  );
  languages['x-default'] = `${BASE_URL}/${DEFAULT_LOCALE}${path}`;

  return {
    metadataBase: new URL(BASE_URL),
    title: { absolute: meta.title },
    description: meta.description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: canonicalUrl,
      siteName: 'K-Destiny',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'K-Destiny — AI-Powered Saju Astrology Platform',
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
      creator: '@thekdestiny',
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
