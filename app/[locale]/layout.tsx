import type { Metadata } from "next";
import { Inter, Cinzel, Noto_Sans_KR, Noto_Sans_JP } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import "../globals.css";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import CacheBuster from "../../components/CacheBuster";
import Providers from "../../components/Providers";
import MaintenanceOverlay from "../../components/MaintenanceOverlay";
import Analytics from "../../components/Analytics";
import Script from "next/script";
import { BASE_URL, buildPageMetadata } from "@/lib/seo";
import InstallPWAButton from "../../components/InstallPWAButton";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  display: "swap",
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-ko",
  preload: false,
  display: "swap",
  weight: ["400", "500", "700"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-ja",
  preload: false,
  display: "swap",
  weight: ["400", "500", "700"],
});

// SEO note: canonical / hreflang / title / description now live in lib/seo.ts
// and are declared per route. This layout supplies metadata for the locale
// homepage only ('') — every child route overrides it via its own layout.tsx.
// Previously this file was the single source of metadata for the whole app, so
// /en/pricing, /ko/guide, … all inherited `canonical: /{locale}` and Google
// filed them as "Alternate page with proper canonical tag" instead of indexing
// them.
export async function generateMetadata({ params }: { params: Promise<{locale: string}> }): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || BASE_URL;

  return {
    metadataBase: new URL(siteUrl),
    ...buildPageMetadata('', locale),
    keywords: [
      "궁합", "사주궁합", "사주", "무료궁합", "커플궁합", "썸", "연애운",
      "생년월일 궁합", "콩닥", "kongdak", "saju", "compatibility",
    ],
    authors: [{ name: "콩닥 (kongdak)", url: BASE_URL }],
    creator: "콩닥 (kongdak)",
    publisher: "디아이컴퍼니",
  };
}

/* ─── JSON-LD Structured Data for AI Search Engines (AEO/GEO) ─── */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      "url": BASE_URL,
      "name": "콩닥 (kongdak)",
      "description": "두 사람의 생년월일로 보는 사주 궁합 서비스",
      "publisher": { "@id": `${BASE_URL}/#organization` },
      "inLanguage": ["ko"],
    },
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      "name": "디아이컴퍼니",
      "alternateName": "콩닥 (kongdak)",
      "url": BASE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/og-image.jpg`,
        "width": 1200,
        "height": 630,
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "help@kongdak.kr",
        "contactType": "customer service",
        "availableLanguage": ["Korean"],
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${BASE_URL}/#app`,
      "name": "콩닥 (kongdak)",
      "applicationCategory": "LifestyleApplication",
      "operatingSystem": "Web",
      "url": BASE_URL,
      "description": "두 사람의 생년월일을 입력하면 사주를 바탕으로 궁합 점수와 케미 키워드, AI 해석을 무료로 제공합니다. 오락 및 자기이해를 위한 참고용 서비스입니다.",
      "inLanguage": "ko",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "KRW",
      },
      "featureList": [
        "사주 기반 궁합 점수",
        "우리 사이 케미 키워드",
        "AI 궁합 해석",
        "카카오톡 공유 카드",
      ],
    },
  ],
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        {/* JSON-LD Structured Data for SEO/AEO/GEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/*
          hreflang tags are emitted by Next from `alternates.languages` in
          lib/seo.ts, per route. They used to be hard-coded here pointing at the
          locale homepages, which meant /en/pricing advertised /ko as its Korean
          equivalent instead of /ko/pricing — a broken (non-reciprocal) cluster
          that Google ignores.
        */}
        {/* PWA & Favicon Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF5C77" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
      </head>
      <body
        className={`${inter.variable} ${cinzel.variable} ${notoSansKR.variable} ${notoSansJP.variable} antialiased bg-background text-foreground`}
      >
        <Analytics />
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <MaintenanceOverlay />
            <CacheBuster />
            <Navbar />
            <InstallPWAButton />
            <main className="flex-grow pt-20 md:pt-24">
              {children}
            </main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>

        {/* Kakao SDK */}
        <Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js" strategy="lazyOnload" />

        {/* Service Worker Registration */}
        <Script id="sw-registration" strategy="lazyOnload">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function(err) {
                  console.log('Service Worker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
