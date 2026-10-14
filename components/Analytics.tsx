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

  const stripKeysJson = JSON.stringify(GA_SENSITIVE_QUERY_KEYS);

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
          // 측정에서 빼는 것(2026-10-04): 개발자 PC(localhost)와 관리자 화면(/admin).
          // 로컬 개발 서버가 운영 GA4 ID 를 그대로 써서 테스트가 운영 수치에 섞였고,
          // 관리자 화면 조회가 전체 페이지뷰의 20% 를 차지했다. ga-disable 플래그는 전송 직전에 확인된다.
          // [SECURITY / M-10] page_location 은 기본값으로 쿼리스트링을 포함한 전체 URL 이다.
          // 결제 리다이렉트가 /pay/complete?paymentId=... 로 돌아오는데, 이 paymentId(orderId)는
          // lib/entitlement.ts 에서 게스트 열람 베어러 토큰으로 쓰이는 값이라 GA4 로 내보내면
          // 애널리틱스 접근 권한자·데이터 내보내기 전부가 리포트 열람 경로가 된다.
          (function () {
            var KEY = 'ga-disable-${gaId}';
            var STRIP = ${stripKeysJson};
            var rawReplace = History.prototype.replaceState;
            var h = location.hostname;
            var isLocal = h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
            var hasSensitive = function (raw) {
              if (!raw) return false;
              try {
                var u = new URL(raw, location.href);
                for (var i = 0; i < STRIP.length; i++) {
                  if (u.searchParams.has(STRIP[i])) return true;
                }
                return false;
              } catch (e) {
                return false;
              }
            };
            var cleanUrl = function (raw) {
              if (!raw) return raw;
              try {
                var u = new URL(raw, location.href);
                STRIP.forEach(function (k) {
                  u.searchParams.delete(k);
                });
                return u.toString();
              } catch (e) {
                return raw;
              }
            };
            var apply = function (nextHref, refOverride) {
              try {
                var target = nextHref ? new URL(String(nextHref), location.href) : location;
                window[KEY] = isLocal || target.pathname.split('/').indexOf('admin') !== -1;
                var payload = { page_location: cleanUrl(target.href) };
                if (refOverride !== undefined) payload.page_referrer = refOverride;
                gtag('set', payload);
              } catch (e) {}
            };
            var initialCleanHref = cleanUrl(location.href);
            var initialCleanRef = cleanUrl(document.referrer);
            var configBooted = false;
            var bootConfig = function (locOverride) {
              if (configBooted) return;
              configBooted = true;
              try {
                if (hasSensitive(location.href)) {
                  var c = new URL(cleanUrl(location.href));
                  rawReplace.call(history, history.state, '', c.pathname + c.search + c.hash);
                }
                gtag('set', {
                  page_location: locOverride || cleanUrl(location.href),
                  page_referrer: initialCleanRef,
                });
              } catch (e) {}
              gtag('js', new Date());
              gtag('config', '${gaId}', {
                anonymize_ip: true,
              });
            };
            apply(undefined, initialCleanRef);
            ['pushState', 'replaceState'].forEach(function (fn) {
              var inner = history[fn];
              var wrap = function (origFn) {
                return function () {
                  var prevClean = cleanUrl(location.href);
                  try {
                    if (hasSensitive(location.href)) {
                      var c = new URL( prevClean );
                      rawReplace.call(history, history.state, '', c.pathname + c.search + c.hash);
                    }
                  } catch (e) {}
                  if (!configBooted) {
                    var res = rawReplace === origFn || fn === 'replaceState'
                      ? rawReplace.apply(this, arguments)
                      : origFn.apply(this, arguments);
                    window[KEY] = isLocal || location.pathname.split('/').indexOf('admin') !== -1;
                    bootConfig(initialCleanHref);
                    return res;
                  }
                  if (arguments.length >= 3 && arguments[2] != null) {
                    apply(arguments[2], prevClean);
                  }
                  var r = origFn.apply(this, arguments);
                  apply(undefined, prevClean);
                  return r;
                };
              };
              var wrapped = wrap(inner);
              try {
                Object.defineProperty(history, fn, {
                  configurable: true,
                  enumerable: true,
                  get: function () { return wrapped; },
                  set: function (newFn) {
                    if (typeof newFn === 'function') {
                      wrapped = wrap(newFn);
                    }
                  },
                });
              } catch (e) {
                history[fn] = wrapped;
              }
            });
            window.addEventListener('popstate', function () { apply(); });
            if (hasSensitive(location.href)) {
              setTimeout(function () { bootConfig(initialCleanHref); }, 120);
            } else {
              bootConfig(initialCleanHref);
            }
          })();
        `}
      </Script>
    </>
  );
}
