# Opus5 검수 인계서: 콩닥 2026 나의 총운 (AnnualFortune) 리포트

## 1. 변경 파일 및 목적
- **`prisma/schema.prisma`**:
  - `AnnualFortune` 모델 추가 (additive). 사용자 ID와 연도(2026)를 복합 유니크 키로 하여 생성된 운세 JSON을 캐싱.
- **`lib/destinyGen.ts`**:
  - `AnnualFortuneContent` 인터페이스 및 `buildAnnualFortunePrompt` 추가. 콩닥 브랜드 보이스(두근이 톤) 준수, 한자/사주 전문용어 배제, 오락/참고용 문구 반영.
- **`app/api/fortune/annual/route.ts`**:
  - `POST` 라우트 신설. 세션 가드, 온보딩 가드, 2026년 고정, DB 캐시 조회, Gemini 생성 및 저장.
  - **서버 단 유료 컨텐츠 마스킹**: 비구독 시 `yearScore`, `headline`, `summary`만 남기고 유료 영역(5대 영역, 12개월, 행운포인트)을 서버에서 제거하여 전송.
- **`app/[locale]/fortune/annual/page.tsx`**:
  - 2026 총운 서버 페이지. 로그인/온보딩 리다이렉트 가드 및 헤더 구성.
- **`app/[locale]/fortune/annual/AnnualFortuneClient.tsx`**:
  - 2026 총운 클라이언트 뷰. 대형 스코어, 두근이 한 줄 요약, 총평, 5대 영역 블러/상세, 12개월 타임라인, 행운 포인트, 콩닥 플러스 패스 결제 모달 연동.
- **`components/Navbar.tsx`**: 상단 네비게이션에 "🔮 2026 총운" 뱃지 버튼 추가.
- **`components/DashboardView.tsx`**: 대시보드 메인에 "🔮 2026 나의 총운" 바로가기 카드 추가.
- **`components/KongdakHero.tsx`**: 비로그인 홈 히어로에 "🔮 2026 나의 총운 미리보기" 보조 CTA 추가.

## 2. 결정론 로직 요약
- 사주 기본 만세력(`saju.ts`, `trueSolarTime.ts`)은 전혀 수정하지 않았습니다.
- 사용자 사주 원국(`fourPillars`, `dayMaster`, `elementsScore`)과 2026년(병오년) 컨텍스트를 결합하여 Gemini AI가 리포트를 생성하며, 생성된 리포트는 `AnnualFortune` 테이블에 영구 캐싱되어 동일 유저-동일 연도 요청 시 재생성 없이 항상 동일한 결과를 반환합니다.

## 3. 테스트 결과
- `npx prisma db push` & `npx prisma generate`: Supabase DB에 `AnnualFortune` 테이블 생성 및 클라이언트 동기화 완료 (Exit Code 0).
- `npx tsc --noEmit`: TypeScript strict 타입체크 통과 (오류 0건).
- `npm run build`: Next.js 16 App Router 프로덕션 빌드 통과 (`/[locale]/fortune/annual`, `/api/fortune/annual` 모두 정상 번들링).
- `python scripts/safe_deploy.py`: 원격 서버 배포 및 PM2 재시작, 헬스체크 `HTTP/1.1 200 OK` 확인 (`Deploy VERIFIED ✅`).

## 4. 보안/PII/결제 변경점
- **기존 결제 배관 무변경**: 기존 결제·인증·`isEntitled`·Unlock/Order 스키마는 일절 건드리지 않고, 기존 `isEntitled`의 `SUBSCRIPTION`/`ADMIN` 판정을 그대로 재사용.
- **유료 컨텐츠 유출 방지 (Redaction)**: 클라이언트 CSS 블러에만 의존하지 않고, 서버 API(`app/api/fortune/annual/route.ts`)에서 비구독 사용자의 경우 5대 영역, 12개월 타임라인, 행운 포인트 필드를 제거한 후 응답.
- **자격증명 및 시크릿**: 하드코딩된 시크릿 0건.

## 5. 의심 지점 및 자체 검토
- 사용자가 사주 프로필 온보딩을 완료하지 않은 상태에서 `/fortune/annual`에 접근할 경우 `/onboarding?callbackUrl=...`으로 유도하도록 안전 장치를 마련했습니다.
- 향후 단건 결제(총운 1회권) 도입 시에는 `Unlock`/`Order` 상품 유형 확장이 필요하며, 현재는 스펙 지시문에 따라 기존 "콩닥 플러스 패스"로 안전하게 잠금 처리되었습니다.
