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
          // [SECURITY / M-10] page_location 은 기본값으로 쿼리스트링을 포함한 전체 URL 이다.
          // 결제 리다이렉트가 /pay/complete?paymentId=... 로 돌아오는데, 이 paymentId(orderId)는
          // lib/entitlement.ts 에서 게스트 열람 베어러 토큰으로 쓰이는 값이라 GA4 로 내보내면
          // 애널리틱스 접근 권한자·데이터 내보내기 전부가 리포트 열람 경로가 된다.
          gtag('config', '${gaId}', {
            anonymize_ip: true,
            page_location: (function () {
              try {
                var u = new URL(window.location.href);
                ['paymentId', 'orderId', 'claimToken', 'token'].forEach(function (k) {
                  u.searchParams.delete(k);
                });
                return u.toString();
              } catch (e) {
                return window.location.href;
              }
            })(),
          });
        `}
      </Script>
    </>
  );
}
