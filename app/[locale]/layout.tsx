import type { Metadata } from "next";
import { Inter, Cinzel, Noto_Sans_KR, Noto_Sans_JP } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import "../globals.css";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import ExpiryWarningModal from "../../components/ExpiryWarningModal";
import CacheBuster from "../../components/CacheBuster";
import Providers from "../../components/Providers";
import KakaoEscape from "../../components/KakaoEscape";
import MaintenanceOverlay from "../../components/MaintenanceOverlay";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-ko",
  preload: false,
  weight: ["400", "500", "700"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-ja",
  preload: false,
  weight: ["400", "500", "700"],
});

const BASE_URL = 'https://thekdestiny.com';
const LOCALES = ['en', 'ko', 'ja', 'es', 'de', 'fr'];

export async function generateMetadata({ params }: { params: Promise<{locale: string}> }): Promise<Metadata> {
  const { locale } = await params;
  const canonicalUrl = `${BASE_URL}/${locale}`;

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: "K-Destiny | AI-Powered Saju Astrology — Unlock Your Cosmic Blueprint",
      template: "%s | K-Destiny",
    },
    description: "The world's first AI-powered Korean Saju (四柱推命) astrology platform. Discover your destiny through ancient Eastern wisdom meets modern AI. Premium cosmic readings, compatibility analysis, and personalized fortune predictions.",
    keywords: [
      "saju", "사주", "四柱推命", "Korean astrology", "AI astrology",
      "destiny reading", "cosmic blueprint", "energy sync", "compatibility",
      "fortune prediction", "K-Destiny", "Eastern astrology", "운세", "궁합",
    ],
    authors: [{ name: "K-Destiny Inc.", url: BASE_URL }],
    creator: "K-Destiny Inc.",
    publisher: "K-Destiny Inc.",
    openGraph: {
      title: "K-Destiny | AI-Powered Saju Astrology — Unlock Your Cosmic Blueprint",
      description: "The world's first AI-powered Korean Saju astrology platform. Ancient Eastern wisdom meets modern AI for premium cosmic readings and fortune predictions.",
      url: canonicalUrl,
      siteName: "K-Destiny",
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: "K-Destiny — AI-Powered Saju Astrology Platform",
        },
      ],
      locale: locale === 'ko' ? 'ko_KR' : locale === 'ja' ? 'ja_JP' : locale === 'es' ? 'es_ES' : locale === 'de' ? 'de_DE' : locale === 'fr' ? 'fr_FR' : 'en_US',
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "K-Destiny | AI-Powered Saju Astrology",
      description: "Discover your destiny through the world's first AI-powered Korean Saju astrology platform. Premium cosmic readings & fortune predictions.",
      images: ["/og-image.jpg"],
      creator: "@thekdestiny",
    },
    alternates: {
      canonical: canonicalUrl,
      languages: Object.fromEntries(LOCALES.map(loc => [loc, `${BASE_URL}/${loc}`])),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

/* ─── JSON-LD Structured Data for AI Search Engines (AEO/GEO) ─── */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://thekdestiny.com/#website",
      "url": "https://thekdestiny.com",
      "name": "K-Destiny",
      "description": "The world's first AI-powered Korean Saju (四柱推命) astrology platform",
      "publisher": { "@id": "https://thekdestiny.com/#organization" },
      "inLanguage": ["en", "ko", "ja", "es", "de", "fr"],
    },
    {
      "@type": "Organization",
      "@id": "https://thekdestiny.com/#organization",
      "name": "K-Destiny Inc.",
      "url": "https://thekdestiny.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://thekdestiny.com/og-image.jpg",
        "width": 1200,
        "height": 630,
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@thekdestiny.com",
        "contactType": "customer service",
        "availableLanguage": ["English", "Korean", "Japanese"],
      },
      "sameAs": [
        "https://twitter.com/thekdestiny",
        "https://www.instagram.com/thekdestiny",
      ],
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://thekdestiny.com/#app",
      "name": "K-Destiny",
      "applicationCategory": "LifestyleApplication",
      "operatingSystem": "Web",
      "url": "https://thekdestiny.com",
      "description": "AI-powered Korean Saju astrology platform providing personalized destiny readings, energy compatibility analysis, and premium fortune predictions using ancient Eastern Four Pillars wisdom enhanced by Google Gemini AI.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free cosmic blueprint with premium tier available",
      },
      "featureList": [
        "AI-Powered Saju Birth Chart Analysis",
        "Energy Compatibility Sync (궁합)",
        "Monthly Karma Report",
        "Daily Remedy Coaching",
        "2027 Fortune Prediction",
        "AI Master Chat Consultation",
        "Multi-language support (EN, KO, JA, ES, DE, FR)",
      ],
    },
    {
      "@type": "Service",
      "name": "K-Destiny Saju Astrology Reading",
      "serviceType": "Astrology Service",
      "provider": { "@id": "https://thekdestiny.com/#organization" },
      "description": "Professional AI-powered Korean Saju (Four Pillars of Destiny) astrology reading service. Analyzes birth date and time using the traditional Eastern cosmological framework enhanced by Google Gemini AI to deliver personalized cosmic blueprints.",
      "areaServed": "Worldwide",
      "availableChannel": {
        "@type": "ServiceChannel",
        "serviceUrl": "https://thekdestiny.com",
        "serviceType": "Web Application",
      },
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
        {/* hreflang tags for multi-language SEO */}
        {LOCALES.map((loc) => (
          <link
            key={loc}
            rel="alternate"
            hrefLang={loc}
            href={`${BASE_URL}/${loc}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/en`} />
      </head>
      <body
        className={`${inter.variable} ${cinzel.variable} ${notoSansKR.variable} ${notoSansJP.variable} antialiased bg-background text-foreground`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <MaintenanceOverlay />
            <CacheBuster />
            <KakaoEscape />
            <Navbar />
            <main className="flex-grow pt-24 md:pt-28">
              {children}
            </main>
            <Footer />
            <ExpiryWarningModal />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
