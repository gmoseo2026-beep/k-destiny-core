# kongdak.kr SEO 액션 플랜

> 근거·증거는 `FULL-AUDIT-REPORT.md`. 코드 수정 전 AGENTS.md 규칙(Next 16 문서 확인, tsc → lint → build, safe_deploy)을 따른다.
> `lib/saju.ts`·`lib/trueSolarTime.ts`·`lib/compatibility.ts`는 이 플랜에서 건드리지 않는다.

## Phase 1 — Critical (이번 주) · 순서 중요

| # | 할 일 | 파일 | 검증(실패를 어떻게 알까) | 선행지표 |
|---|---|---|---|---|
| 1 | **로케일 검증 추가:** `if (!hasLocale(routing.locales, locale)) notFound();` (`import {hasLocale} from 'next-intl'`) | `app/[locale]/layout.tsx` (generateMetadata·RootLayout 둘 다) | `/llms.txt`, `/ads.txt`, `/foo.bar` → 404. `/ko` `/en` 정상 200 | GSC "Soft 404" 0 유지 |
| 2 | **홈을 서버에서 분기:** `page.tsx`에서 `getServerSession(authOptions)`(이미 `compat/new/page.tsx`가 쓰는 패턴) → 세션 있으면 `<DashboardView/>`, 없으면 `<KongdakHero/>`. `HomeRoot`의 loading 스피너 분기 제거 | `app/[locale]/page.tsx`, `components/HomeRoot.tsx` | `curl -s https://kongdak.kr/ko \| grep -c '<h1'` ≥ 1, 서버 HTML 본문 ≥ 600자. 로그인 상태에서 대시보드 정상 | 네이버 서치어드바이저 "수집 현황"·GSC URL 검사의 렌더 HTML에 히어로 문구 |
| 3 | **히어로 LCP 요소 즉시 표시:** H1·마스코트의 `initial={{opacity:0}}` 제거(또는 CSS 애니메이션으로 대체). 마스코트는 이미 `priority` | `components/KongdakHero.tsx:23,36,85` | 서버 HTML의 H1에 `opacity:0` 인라인 스타일 없음 | LCP(아래 Phase 2 측정) |

## Phase 2 — High (1주 내)

| # | 할 일 | 파일 | 검증 |
|---|---|---|---|
| 4 | **결과 페이지 noindex:** 결과가 있는 분기 반환값에 `robots: { index: false, follow: true }` 추가 | `app/[locale]/compat/[id]/page.tsx` generateMetadata | 결과 페이지 HTML에 `noindex, follow`. 카톡 공유 미리보기 정상(OG 태그 그대로) |
| 5 | **/pricing 메타 정상화:** `PAGE_META['/pricing']` 추가 → `generateMetadata`를 `buildPageMetadata('/pricing', locale)`로 교체(params는 `Promise`로). 사이트맵 `PUBLIC_ROUTES`에 `/pricing` 추가 | `lib/seo.ts`, `app/[locale]/pricing/page.tsx`, `app/sitemap.ts` | canonical = `https://kongdak.kr/ko/pricing`, 사이트맵 6개 URL |
| 6 | **hreflang 헤더 끄기:** `defineRouting({ …, alternateLinks: false })` | `i18n/routing.ts` | `curl -sI https://kongdak.kr/ko \| grep -i hreflang` 결과 없음 |
| 7 | **정적 자산 캐시:** no-store 규칙 뒤에 `/mascot/:path*`, `/icons/:path*` 전용 규칙 추가 → `Cache-Control: public, max-age=31536000, immutable`(같은 키는 뒤 규칙이 이김). 또는 41행 부정 lookahead에 `mascot\|icons` 추가 | `next.config.ts` | `curl -sI …/mascot/transparent/doogeun_cat_canon.png`에 `max-age` |
| 8 | **1MB PNG 제거:** 설치 배너의 `<img src="/mascot/…png">` 2곳을 `next/image`(width 40) 또는 `/icons/icon-192.png`로. 마스코트 원본 PNG도 ≤100KB로 재압축 | `components/InstallPWAButton.tsx:186,225`, `public/mascot/transparent/*.png` | 홈 총 전송량 1.56MB → 600KB 이하 |

**측정:** 배포 후 PageSpeed Insights(모바일)로 `/ko` 재측정 — 목표 LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1. (오늘은 공용 API 쿼터 소진으로 미측정 — `/seo google` 용 API 키를 넣으면 CrUX 필드데이터까지 가능)

## Phase 3 — Medium (2~4주)

| # | 할 일 | 파일 |
|---|---|---|
| 9 | 루트 영구 리다이렉트: `redirects: [{ source: '/', destination: '/ko', permanent: true }]` (www도 CF에서 `https://kongdak.kr/ko`로 301) | `next.config.ts`, Cloudflare |
| 10 | `/compat/new` 메타를 `buildPageMetadata('/compat/new', locale)`로 교체(이미 정의된 "무료 궁합 보기 — 생년월일 입력 \| 콩닥" 사용, og:image 복구). 부득이 직접 쓰면 `openGraph.images` 포함 | `app/[locale]/compat/new/page.tsx` |
| 11 | `app/[locale]/page.tsx`의 `metadata` 삭제 → 레이아웃의 `PAGE_META['']` 하나로 통일 | `app/[locale]/page.tsx` |
| 12 | 홈 하단에 **서버 렌더 텍스트 섹션** 추가: 3단계 이용법, 무료로 받는 것(점수·케미 키워드·해석·공유카드), 샘플 결과 이미지, 가이드/FAQ 링크. H1 또는 바로 아래 H2에 '사주 궁합' 포함. STYLE_GUIDE 톤 유지·전문용어 금지 | `components/KongdakHero.tsx` 또는 서버 컴포넌트 신설 |
| 13 | 헤더 "이번 주 운세": 로그인 벽 대신 공개 소개 페이지(미리보기 + 로그인 CTA)로 연결하거나, 로그인 전에는 링크를 `/ko/guide#weekly` 등 공개 페이지로 | `components/Navbar.tsx`, `app/[locale]/fortune/weekly/` |

## Phase 4 — Low · 정리

- SearchAction 제거(무효 + 기능 종료) — Gemini 지시문 §3과 충돌하므로 **결정 후** 진행. `app/[locale]/layout.tsx:78-85`
- FAQPage는 유지(구글 FAQ 리치결과는 2026-05-07 종료 — SERP 효과 기대 X). 가이드 Q7 "명리" → 쉬운 말로.
- Organization.logo → 정사각 아이콘. `app/[locale]/layout.tsx:93-98`
- robots.txt 단일화: Cloudflare "Managed robots.txt"를 끄고 `app/robots.ts`만 쓰거나, 앱의 GPTBot/Google-Extended 그룹 삭제. `Host:` 제거.
- CSP에 Cloudflare Insights 추가 또는 CF Web Analytics 끄기. `next.config.ts`
- 한국어 브랜드 404: `app/[locale]/not-found.tsx` (1번 수정과 함께 체감 효과 큼)
- 중첩 `<main>` 정리(홈 page.tsx의 `<main>` → `<div>`)
- (선택) `public/llms.txt` 작성 — 1번 수정 후 404가 되므로, 원하면 서비스 요약·주요 URL을 담아 제공. 구글 순위와는 무관.

## 모니터링 (지속)
- GSC·네이버 서치어드바이저: 색인 URL 수(목표: 사이트맵 6개 모두 색인, `/ko/compat/*` 0개), "대체 페이지(적절한 canonical)"에서 `/ko/pricing` 사라지는지.
- 배포 전후 스냅샷 비교: `/seo drift baseline https://kongdak.kr/ko` → 배포 후 `/seo drift compare` (런타임 설치 필요: `/seo setup`).
