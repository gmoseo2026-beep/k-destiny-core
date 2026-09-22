# kongdak.kr SEO 감사 보고서

- 감사일: 2026-09-10 · 대상: https://kongdak.kr (정본 `/ko`) · 도구: claude-seo 2.2.5 (런타임 미설치 → curl + 소스코드 + Playwright 대체 수행)
- 업종 판정: **소비자용 웹앱(엔터테인먼트/라이프스타일 SaaS형)** — 로컬·이커머스·퍼블리셔 아님 → local/maps/ecommerce 에이전트 생략
- 한계: PageSpeed Insights API 일일 쿼터 소진 → Lighthouse·CrUX 필드데이터 없음. 성능 수치는 Playwright 무스로틀 측정(실모바일보다 낙관적). GSC·네이버 서치어드바이저 데이터 미연동.

## SEO Health Score: **55 / 100** (추정치)

| 카테고리 | 가중치 | 점수 | 핵심 사유 |
|---|---|---|---|
| Technical SEO | 22% | 55 | 홈 SSR 본문 없음, 임의 경로 soft-404, hreflang 헤더 모순, /pricing canonical 오류 |
| Content Quality | 23% | 50 | 홈 렌더 후에도 본문 ~670자, 가이드·약관은 양호, 사업자정보·고지문(신뢰신호) 우수 |
| On-Page SEO | 20% | 55 | 홈 H1이 서버 HTML에 없음, /compat/new 약한 타이틀·og:image 누락 |
| Schema | 10% | 65 | Organization/WebApplication 유효, SearchAction 무효, 로고 비율 부적합 |
| Performance | 10% | 50 | LCP 3.0s(무스로틀), 1MB PNG no-store, 총 전송 1.56MB |
| AI Search Readiness | 10% | 55 | 검색·AI검색 봇 허용, 가이드 FAQ 본문 양호 / 홈 빈약, llms.txt가 HTML soft-404 |
| Images | 5% | 60 | alt 있음, 1MB 원본 PNG를 28px로 사용 |

---

## Critical

### C1. 홈(`/ko`) 서버 HTML에 랜딩 본문이 없음 — 스피너만 렌더
- **증거:** Googlebot UA로 받은 `/ko` HTML: `<h1>`~`<h6>` 0개, 본문 텍스트 445자(헤더·푸터·사업자정보뿐). `<main>` 안에는 `animate-spin` div 하나.
- **원인:** `components/HomeRoot.tsx:15` — `useSession()`이 서버 렌더 시 항상 `"loading"`이라 스피너를 반환. 실제 히어로(`KongdakHero`)는 하이드레이션 + `/api/auth/session` 응답 후에야 등장.
- **영향:** 사이트 최고 권위 URL이 "빈 페이지"로 1차 색인. 구글은 렌더 큐에서 보정할 수 있으나 지연·불확실, **네이버 Yeti는 JS 렌더링이 제한적** → 국내 검색 주력 채널에서 홈이 사실상 무내용. LCP도 세션 API 왕복만큼 늦어짐.
- **반증 체크:** 수정 후 `curl -s https://kongdak.kr/ko | grep -c '<h1'` ≥ 1, 서버 HTML 본문 ≥ 600자.

### C2. 점(.)이 들어간 1단 경로가 전부 홈을 200으로 렌더 (soft-404 + `<html lang="llms.txt">`)
- **증거:** `/llms.txt`, `/ads.txt`, `/humans.txt` → 200, 홈과 동일 HTML, `<html lang="ads.txt">`.
- **원인:** `middleware.ts` matcher가 점 포함 경로를 제외 → 요청이 `app/[locale]`로 바로 떨어짐. `app/[locale]/layout.tsx`에 로케일 검증(`hasLocale` → `notFound()`)이 없고, `i18n/request.ts:56`이 모르는 로케일을 조용히 `ko`로 대체.
- **영향:** 무한 중복 URL 공간(soft-404), 유효하지 않은 `lang` 속성, AI 크롤러가 `llms.txt` 대신 HTML을 받음. canonical(/ko)이 피해를 일부 막고 있을 뿐.
- **반증 체크:** `/llms.txt`, `/foo.bar` → 404.

## High

### H1. 개인 궁합 결과 페이지(`/ko/compat/[id]`)가 색인 허용 상태
- **증거:** `app/[locale]/compat/[id]/page.tsx` generateMetadata에 `robots` 없음 → 레이아웃의 `index, follow` 상속. 타이틀에 이름/애칭 포함(`{A} ❤️ {B} 궁합 점수: 87점`).
- **영향:** 카톡·SNS로 퍼진 공유 링크가 크롤링되면 **개인 결과(이름 포함)가 검색에 노출** — PII 규칙(AGENTS §1-6) 위반 소지 + 수천 개의 얇은 템플릿 페이지로 사이트 품질 신호 희석. 사이트맵 제외만으로는 색인을 막지 못함.
- **반증 체크:** 결과 페이지 HTML에 `<meta name="robots" content="noindex, follow">`. 카카오 OG 스크랩은 noindex와 무관하므로 공유 카드 영향 없음.

### H2. `/ko/pricing` canonical이 홈(`/ko`)을 가리킴
- **증거:** 라이브 `/ko/pricing` → `<link rel="canonical" href="https://kongdak.kr/ko">`.
- **원인:** `app/[locale]/pricing/page.tsx`가 `buildPageMetadata`를 쓰지 않고 title/description만 반환 → 레이아웃 canonical 상속. `lib/seo.ts` 상단 주석이 경고한 바로 그 버그가 이 페이지에만 남아 있음. 사이트맵에도 없음.
- **영향:** 요금 페이지가 "홈의 대체 페이지"로 색인 제외. (PG 심사·소비자 신뢰 측면에서도 요금 페이지는 검색 가능해야 유리)

### H3. HTTP `Link` 헤더가 hreflang 클러스터(ko/en/es/de/fr/ja + x-default)를 계속 광고
- **증거:** `/ko` 응답 헤더 `link: <https://kongdak.kr/en>; rel="alternate"; hreflang="en", … hreflang="x-default"(=https://kongdak.kr/ → 307)`.
- **원인:** next-intl 미들웨어의 기본 `alternateLinks: true`. `lib/seo.ts:139` 주석은 "hreflang 클러스터 제거"라고 하지만 HTML 태그만 제거됐고 헤더는 살아 있음.
- **영향:** hreflang 대상(/en 등)은 canonical이 /ko → 신호 모순, x-default는 리다이렉트 URL. 구글이 클러스터 전체를 무시하거나 엉뚱한 URL을 대표로 고를 수 있음.

### H4. 정적 이미지·아이콘이 `no-store` + 1MB PNG를 매 방문 재다운로드
- **증거:** `/mascot/transparent/doogeun_cat_canon.png` = 1,003,939 bytes, `Cache-Control: no-cache, no-store`. `components/InstallPWAButton.tsx:186,225`가 이 원본을 `<img>`로 28~40px에 표시(모바일 설치 배너에서 즉시 로드). 홈 총 전송 1.56MB 중 대부분.
- **원인:** `next.config.ts:41`의 no-store 규칙이 `_next/static|_next/image|favicon|og-image…`만 제외 → `/mascot`, `/icons`, `/manifest.json` 등 public 자산 전부 no-store.
- **영향:** 모바일 LCP·데이터 사용량 악화, 재방문 캐시 불가. HTML `no-store`는 bfcache(뒤로가기 즉시복원)도 막음.

## Medium

- **M1. 루트 `/` → `/ko`가 307(임시).** 외부 링크·공유가 `kongdak.kr`로 들어오면 링크 신호가 임시 리다이렉트를 거침. www도 307. → 308/301 영구로.
- **M2. `/ko/compat/new` 메타 약함 + og:image 누락.** 라이브 타이틀 "상대방 정보 입력 — 콩닥 궁합"(검색 키워드 '무료 궁합' 없음). `lib/seo.ts`의 `PAGE_META['/compat/new']`("무료 궁합 보기 — 생년월일 입력 | 콩닥")가 정의돼 있는데 안 쓰임. `openGraph`를 통째로 덮어써서(Next 메타데이터는 얕은 병합) og:image가 빠짐 → 이 URL을 공유하면 이미지 없는 카드. **사이트맵 우선순위 0.9 페이지.**
- **M3. 홈 본문 빈약 + H1 키워드 부재.** 하이드레이션 후에도 본문 ~670자. H1 "우리, 얼마나 잘 맞을까?"에 '궁합' 없음(서브카피에만 있음). '궁합', '사주 궁합', '무료 궁합' 같은 헤드 키워드로 경쟁할 서버 렌더 텍스트가 부족. `app/[locale]/page.tsx`의 `metadata`가 레이아웃의 더 풍부한 description을 짧은 문구로 덮어씀.
- **M4. 헤더 1순위 링크 "이번 주 운세"(`/ko/fortune/weekly`)가 로그인 벽으로 리다이렉트.** 모든 페이지의 가장 눈에 띄는 내부링크가 noindex 로그인 페이지로 감 → 크롤 예산·내부링크 가치 낭비.
- **M5. 히어로 요소가 framer-motion `initial={{opacity:0}}`로 시작.** C1 수정 후에도 H1·마스코트가 JS 실행 전까지 투명 → LCP가 하이드레이션에 묶임(`components/KongdakHero.tsx:23,36,50,62,85`). LCP 요소(마스코트)는 애니메이션 없이 즉시 보이게.

## Low / Info

- **L1. SearchAction 무효.** `urlTemplate`에 `{search_term_string}` 자리표시자가 없어 스키마상 무효이고, 구글 사이트링크 검색창 자체가 2024-11 종료. 효과 0 → 제거 권장. ⚠️ `콩닥_FAQ+SearchAction_지시문_Gemini.md` §3과 충돌 — 결정 필요.
- **L2. FAQPage 스키마(가이드):** 유지해도 무방하나 **구글은 2026-05-07부로 모든 사이트의 FAQ 리치결과를 종료** → SERP 확장 없음. 지시문의 "리치결과 테스트로 FAQ 확인" 단계는 기대효과가 없음. 화면에 보이는 FAQ 본문 자체는 AI 답변엔진 인용에 유효. 참고로 Q7 답변의 "명리"는 STYLE_GUIDE의 전문용어 노출 금지에 걸림.
- **L3. Organization.logo가 1200×630 OG 이미지.** 로고는 정사각(≥112px) 권장 → `/icons/icon-512.png` 등.
- **L4. robots.txt 이중 관리.** Cloudflare 관리형 블록(GPTBot·Google-Extended·ClaudeBot 등 `Disallow: /`)과 앱의 `app/robots.ts`(GPTBot·Google-Extended `Allow: /`)가 서로 모순. 같은 UA 그룹은 병합되어 해석이 봇마다 달라짐. 의도(학습 차단·검색 허용?)를 정해 한 곳에서만 관리. `Host:`는 비표준 → 제거. (현재도 OAI-SearchBot·PerplexityBot·Googlebot은 허용 → AI 검색 노출 자체는 막혀 있지 않음)
- **L5. CSP가 Cloudflare Web Analytics 비콘 차단**(콘솔 에러). CF 대시보드에서 끄거나 CSP에 `static.cloudflareinsights.com`(script) / `cloudflareinsights.com`(connect) 추가.
- **L6. 404 페이지가 영문 기본 Next 페이지**("This page could not be found."), 사이트 내비·CTA 없음 → `app/[locale]/not-found.tsx` 한국어 브랜드 404.
- **L7. 동면 로케일 `/en` `/ja` 등이 한국어 본문을 `lang="en"`, `og:locale=en_US`로 200 서빙.** canonical이 /ko라 중복은 통제됨. H3 해결 후엔 영향 작음. 원하면 동면 기간 동안 `/ko`로 리다이렉트(코드 삭제 아님 → AGENTS §1-7 준수).
- **L8. 중첩 `<main>`**(레이아웃 + 홈 페이지) — 접근성 경미.

## 잘 되어 있는 것
- HTTPS·HSTS preload·보안헤더(CSP, XFO, nosniff, Referrer-Policy) 완비, http→https 301.
- 페이지별 canonical 체계(`lib/seo.ts`)와 ko 통합 전략, 사이트맵에서 리다이렉트/비공개 URL 제외.
- 로그인·대시보드 noindex, robots에서 /api·/admin·/me 차단.
- 타이틀·디스크립션 대부분 적정 길이·한국어 자연어, OG/Twitter 카드 완비, 네이버 사이트 소유확인 메타.
- 푸터 사업자정보·통신판매업·고지문 → E-E-A-T 신뢰 신호로 우수. 가이드·약관·개인정보처리방침 서버 렌더 정상.
- CLS 0, 모바일 폴드 위에 H1·CTA 명확(스크린샷 확인).

## 범위 밖 관찰 (SEO 아님, 참고)
- 요금 페이지 상품(단건 2,900원·첫 결제 1,900원, 플러스 1개월 9,900원·3개월 24,900원)이 AGENTS.md §1-5의 "심층 궁합 단건 9,900원"과 다름. 기간제 이용권은 1회성 결제로 안내되어 있으나 Phase A 범위(구독 금지) 해석을 확인할 필요.
