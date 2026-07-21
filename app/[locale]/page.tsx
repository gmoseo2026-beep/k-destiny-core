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
          fetchPriority="high"
          sizes="100vw"
          // LCP element: it sits behind dark gradient overlays at opacity-90,
          // so q60 is visually identical but meaningfully smaller on mobile.
          quality={60}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABIMDRANCxIQDhAUExIVGywdGxgYGzYnKSAsQDlEQz85Pj1HUGZXR0thTT0+WXlaYWltcnNyRVV9hnxvhWZwcm7/2wBDARMUFBsXGzQdHTRuST5Jbm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm7/wAARCAAWAAwDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDnYYI1G5sABSTnvj+tO1BIrm4DxxhAFC/LxkjvR5rRANHIgUrtKnneKTIVEBKk7RzmquTYpPJvYg5x0qSKRdgDLnHAoopDP//Z"
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
