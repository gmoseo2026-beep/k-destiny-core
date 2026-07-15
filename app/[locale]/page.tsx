import Image from "next/image";
import { useTranslations } from 'next-intl';
import HeroClient from "@/components/HeroClient";

/**
 * Landing Page — Server Component for SSR.
 * 
 * Critical for SEO: Googlebot receives fully-rendered HTML with semantic content.
 * All client-side interactivity (animations, onboarding check) is in HeroClient.
 */
export default function Home() {
  const t = useTranslations('Index');

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-background">
      {/* Background Image with Overlays */}
      <div className="absolute inset-0 z-0 bg-background">
        <Image
          src="/images/master_karma_surprise.webp.jpg"
          alt="Cosmic Destiny Background"
          fill
          priority
          sizes="100vw"
          className="object-cover md:object-contain object-top md:object-center opacity-90"
        />
        
        {/* Dark Gradient Overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/50 to-background/90 z-10 pointer-events-none" />
        
        {/* Horizontal gradients to blend sides on desktop */}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-background via-transparent to-background z-10 pointer-events-none" />
      </div>

      {/* SSR-rendered semantic content for search engines */}
      <h1 className="sr-only">
        {t('headline_1')} {t('headline_2')} — K-Destiny AI Saju Astrology
      </h1>
      <p className="sr-only">
        {t('sub_headline')}
      </p>

      {/* Client-side interactive hero with animations */}
      <HeroClient />
    </main>
  );
}
