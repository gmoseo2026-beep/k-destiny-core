import Script from "next/script";

/**
 * Google Analytics 4 — loads ONLY when NEXT_PUBLIC_GA_ID is set
 * (e.g. NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX in .env / Vercel env vars).
 *
 * Why this exists: revenue optimization is impossible blind. Without
 * funnel data (landing → onboarding → result → paywall click → purchase)
 * every pricing/copy decision is a guess. GA4 is free and this component
 * is a no-op until the env var is configured, so it is safe to ship.
 *
 * Suggested custom events to add later from client components:
 *   gtag('event', 'begin_checkout', { plan: 'annual' })
 *   gtag('event', 'unlock_click',   { source: 'result_paywall' })
 */
export default function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
