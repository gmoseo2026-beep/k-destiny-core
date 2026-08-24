import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF (≈30% smaller than WebP) with WebP fallback, and cache the
    // optimized variants aggressively — the source images are now small too.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400, // 31 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  /* ─── Enterprise Security Headers ─── */
  async headers() {
    return [
      {
        // HTML 페이지: 항상 서버에 재검증 요청 (모바일 캐시 방지)
        // sitemap.xml / robots.txt / og-image / api/og 는 제외 — 크롤러가 매번 재요청하지
        // 않도록 캐시 가능해야 하고, no-store 는 색인에 도움이 되지 않는다.
        // (api/og 는 카카오 공유 스크랩마다 PNG 를 재렌더링하면 스크랩이 타임아웃되므로
        //  라우트 핸들러가 직접 설정한 Cache-Control 을 살려둔다)
        source: "/((?!_next/static|_next/image|favicon|sitemap.xml|robots.txt|og-image|api/og).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://www.googletagmanager.com https://t1.kakaocdn.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com https://*.kakaocdn.net",
              "connect-src 'self' https://accounts.google.com https://generativelanguage.googleapis.com https://*.google.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.kakao.com https://*.kakaocdn.net",
              "frame-src https://accounts.google.com https://*.kakao.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      {
        // 크롤러용 파일: 1시간 캐시 + 하루 stale 허용
        source: "/sitemap.xml",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
