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

export const metadata: Metadata = {
  metadataBase: new URL('https://thekdestiny.com'),
  title: "K-Destiny | Unlock Your Cosmic Blueprint",
  description: "Ancient Eastern Saju meets Modern Energy Wellness. A premium global platform for discovering your destiny and cosmic energy.",
  openGraph: {
    title: "K-Destiny | Unlock Your Cosmic Blueprint",
    description: "Ancient Eastern Saju meets Modern Energy Wellness. A premium global platform for discovering your destiny and cosmic energy.",
    url: "https://thekdestiny.com",
    siteName: "K-Destiny",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "K-Destiny Cosmic Blueprint",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "K-Destiny | Unlock Your Cosmic Blueprint",
    description: "Ancient Eastern Saju meets Modern Energy Wellness. A premium global platform for discovering your destiny and cosmic energy.",
    images: ["/og-image.jpg"],
  },
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
      <body
        className={`${inter.variable} ${cinzel.variable} ${notoSansKR.variable} ${notoSansJP.variable} antialiased bg-background text-foreground`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <CacheBuster />
            <Navbar />
            {children}
            <Footer />
            <ExpiryWarningModal />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
