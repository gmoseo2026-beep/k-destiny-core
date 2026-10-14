import Script from "next/script";
import { GA_SENSITIVE_QUERY_KEYS } from "@/lib/gtag";

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
  const stripKeys = JSON.stringify(GA_SENSITIVE_QUERY_KEYS);

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
          // [SECURITY / M-10] page_location 은 기본값으로 쿼리스트링을 포함한 전체 URL 이다.
          // 결제 리다이렉트가 /pay/complete?paymentId=... 로 돌아오는데, 이 paymentId(orderId)는
          // lib/entitlement.ts 에서 게스트 열람 베어러 토큰으로 쓰이는 값이라 GA4 로 내보내면
          // 애널리틱스 접근 권한자·데이터 내보내기 전부가 리포트 열람 경로가 된다.
          // 지우는 값 목록은 lib/gtag.ts(GA_SENSITIVE_QUERY_KEYS) 하나에서 온다. 주소창 자체는 건드리지 않는다
          // (결제 완료 화면이 paymentId 를 읽어야 결제를 확정한다).
          var GA_STRIP = ${stripKeys};
          function gaCleanLocation() {
            try {
              var u = new URL(window.location.href);
              GA_STRIP.forEach(function (k) { u.searchParams.delete(k); });
              return u.toString();
            } catch (e) {
              return window.location.origin + window.location.pathname;
            }
          }
          // 측정에서 빼는 것(2026-10-04): 개발자 PC(localhost)와 관리자 화면(/admin).
          // 로컬 개발 서버가 운영 GA4 ID 를 그대로 써서 테스트가 운영 수치에 섞였고,
          // 관리자 화면 조회가 전체 페이지뷰의 20% 를 차지했다. ga-disable 플래그는 전송 직전에 확인된다.
          // 화면 이동 때 page_location 도 지금 화면으로 바꾼다(2026-10-14, P-001a): config 에 한 번 넣은 값이
          // 그대로 남아 이후 이벤트·체류 시간이 첫 화면 주소로 잡혔다.
          (function () {
            var KEY = 'ga-disable-${gaId}';
            var h = location.hostname;
            var isLocal = h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
            var apply = function (moved) {
              try { window[KEY] = isLocal || location.pathname.split('/').indexOf('admin') !== -1; } catch (e) {}
              if (moved) gtag('set', { page_location: gaCleanLocation() });
            };
            apply(false);
            ['pushState', 'replaceState'].forEach(function (fn) {
              var orig = history[fn];
              history[fn] = function () {
                var r = orig.apply(this, arguments);
                apply(true);
                return r;
              };
            });
            window.addEventListener('popstate', function () { apply(true); });
          })();
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            anonymize_ip: true,
            page_location: gaCleanLocation(),
          });
        `}
      </Script>
    </>
  );
}
