# 콩닥(kongdak) Phase A — 기본 로케일(/ko) 확정 및 자동 언어감지 비활성화 보고서 (REVIEW_HANDOFF.md)

**작성일시:** 2026-08-23  
**작업자:** Antigravity (Gemini 3.7 Flash)  
**기준 문서:** `AGENTS.md`, `콩닥_PhaseA_개발스펙.md`  

---

## 1. 개요 및 문제 해결 배경

### 문제 현상
- `kongdak.kr/` 루트 및 `Accept-Language` 헤더가 없는 요청(카카오톡 인앱 브라우저, OG 크롤러, 봇, curl 등)이 `/en`(영문 K-Destiny)으로 리다이렉트되는 문제.
- 국내 전용 사주 궁합 서비스인 콩닥은 항상 한국어(`/ko`)가 기본이어야 하며, 특히 카카오톡 및 SNS 공유 카드가 `/en`으로 떨어져 영문 메타카드가 노출되는 치명적인 바이럴 결함 발생.

### 원인 분석
- `next-intl`의 `routing.ts`에서 `localeDetection`이 기본값(`true`)으로 활성화되어 있었음.
- 헤더가 없거나 `Accept-Language: *`인 경우 `locales: ['en', 'ko', ...]`의 첫 번째 요소인 `'en'`으로 우선 매칭됨.

### 조치 내역
1. `i18n/routing.ts`:
   - `localeDetection: false` 명시 (헤더/쿠키 기반 자동 언어감지 차단).
   - `defaultLocale: 'ko'` 확정.
   - `locales: ['ko', 'en', 'es', 'de', 'fr', 'ja']`로 `'ko'`를 최우선 순위로 재배치.
   - 기존 다국어(`en`, `ja`, `es`, `de`, `fr`)는 삭제하지 않고 명시적 URL(`/en`, `/ja` 등)로만 접근 가능하도록 동면 상태 유지.
2. `middleware.ts`:
   - `matcher`를 `['/((?!api|_next|_vercel|.*\\..*).*)']`로 표준화하여 루트 및 prefix 없는 모든 페이지 요청(`/`, `/compat` 등)이 `/ko`로 확실하게 귀결되도록 보장.
3. `lib/seo.ts`:
   - `DEFAULT_LOCALE = 'ko'` 및 `LOCALES` 순서 동기화 (`x-default` 태그 및 fallback SEO 메타데이터를 한국어로 통일).
4. `i18n/request.ts`:
   - any 타입 단언을 정확한 유니온 타입으로 개선.

---

## 2. 검증 결과표

| 검증 단계 | 명령어 / 도구 | 결과 | 상세 내용 |
|---|---|---|---|
| 1. TypeScript 타입 검사 | `npx tsc --noEmit` | **PASS (0)** | strict 모드 타입 오류 0건 |
| 2. ESLint 정적 분석 | `npx eslint i18n/routing.ts i18n/request.ts middleware.ts lib/seo.ts` | **PASS (0)** | 수정 파일 에러/경고 0건 |
| 3. Next.js 프로덕션 빌드 | `npm run build` | **PASS (0)** | Next.js 16.2.9 (Turbopack) 20개 라우트 정상 컴파일 완료 |
| 4. HTTP 라우팅 및 리다이렉트 검증 | 로컬 Next.js 서버(포트 3008) + HTTP 테스트 | **PASS** | 8개 시나리오 전수 통과 (아래 상세) |

---

## 3. 라우팅 검증 상세 결과

| 시나리오 | 요청 조건 | 기대 결과 | 실제 응답 | 결과 |
|---|---|---|---|---|
| **1. 루트 (Accept-Language 없음)** | `GET /` (curl/크롤러) | `307 Location: /ko` | `307 Location: /ko` | **PASS** |
| **2. 루트 (영문 헤더 요청)** | `GET /` (`Accept-Language: en-US,en;q=0.9`) | `307 Location: /ko` | `307 Location: /ko` | **PASS** |
| **3. 루트 (카카오/페이스북 OG Scraper)** | `GET /` (`User-Agent: facebookexternalhit...`) | `307 Location: /ko` | `307 Location: /ko` | **PASS** |
| **4. 한국어 랜딩 직접 접근** | `GET /ko` | `200 OK` (콩닥 UI 및 한글 메타) | `200 OK` (콩닥 사주 키워드 포함) | **PASS** |
| **5. 영문 동면 경로 명시적 접근** | `GET /en` | `200 OK` (영문 콘텐츠) | `200 OK` | **PASS** |
| **6. 일문 동면 경로 명시적 접근** | `GET /ja` | `200 OK` (일문 콘텐츠) | `200 OK` | **PASS** |
| **7. prefix 없는 경로 접근** | `GET /compat` | `307 Location: /ko/compat` | `307 Location: /ko/compat` | **PASS** |
| **8. API 라우트 예외 통과** | `GET /api/hermes/health` | Middleware 바이패스 (API 직접 실행) | `401 Unauthorized` (정상 핸들러 도달) | **PASS** |

---

## 4. 변경 파일 목록

| 파일 경로 | 변경 구분 | 주요 목적 |
|---|---|---|
| [`i18n/routing.ts`](file:///c:/Users/gmose/OneDrive/바탕%20화면/k-destiny/i18n/routing.ts) | **수정** | `localeDetection: false`, `defaultLocale: 'ko'`, `locales` ko 최우선 배치 |
| [`middleware.ts`](file:///c:/Users/gmose/OneDrive/바탕%20화면/k-destiny/middleware.ts) | **수정** | `matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']`로 prefix 없는 모든 요청 처리 |
| [`lib/seo.ts`](file:///c:/Users/gmose/OneDrive/바탕%20화면/k-destiny/lib/seo.ts) | **수정** | `DEFAULT_LOCALE = 'ko'` 동기화 |
| [`i18n/request.ts`](file:///c:/Users/gmose/OneDrive/바탕%20화면/k-destiny/i18n/request.ts) | **수정** | any 단언 제거 및 strict 타입 가드 적용 |
| [`REVIEW_HANDOFF.md`](file:///c:/Users/gmose/OneDrive/바탕%20화면/k-destiny/REVIEW_HANDOFF.md) | **수정** | 라우팅 수정 및 검증 결과 보고서 작성 |

---

## 5. Opus5 터미널 검수 인계 사항
1. **결정론 로직 및 사주 엔진 보존:** `lib/saju.ts`, `lib/trueSolarTime.ts`, `lib/compatibility.ts`는 일체 건드리지 않았습니다.
2. **보안/PII/결제:** 변경점 없음.
3. **다국어 보존(동면):** `en`, `ja`, `es`, `de`, `fr` 메시지 파일 및 라우트는 삭제하지 않고 명시적 URL로 접속 가능하도록 보존되었습니다.
