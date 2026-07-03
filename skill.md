# K-Destiny Technical Skills & Architecture Guide

이 문서는 K-Destiny 프로젝트의 기술 스택, 아키텍처 원칙, 그리고 핵심 비즈니스 로직을 정의합니다. 향후 AI(에이전트)와의 페어 프로그래밍 시 혼선을 방지하고 일관된 코드 품질을 유지하기 위한 기준(Ground Truth)으로 사용됩니다.

## 1. Core Stack (핵심 기술)
- **Framework**: Next.js (App Router 기반, React 18+)
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL, GoTrue Auth)
- **ORM**: Prisma (`prisma/schema.prisma` 기준 데이터 모델링)
- **AI Model**: Google Gemini (gemini-2.5-pro, gemini-2.5-flash 등 용도별 분리)
- **Payments**: Lemon Squeezy API 및 Webhook 연동
- **i18n (다국어)**: `next-intl`

## 2. Architecture Patterns (아키텍처 원칙)

### 2.1 Hybrid RAG (할루시네이션 원천 차단)
- AI에게 사주 명리학 계산을 전적으로 맡기지 않습니다. (할루시네이션 방지)
- **Local Calc**: `lunar-javascript` 라이브러리를 사용하여 사용자의 생년월일시 기반 정확한 만세력(천간/지지, 8글자, 오행 점수)을 클라이언트/서버에서 확정적으로 계산합니다 (`lib/saju.ts`).
- **RAG & Prompting**: 계산된 명확한 데이터(Day Master, 부족한 오행 등)를 바탕으로 DB(`SajuContentDictionary`)에서 프리미엄 해석본을 조회한 뒤, 최종 텍스트 번역 및 윤문 역할만을 AI(Gemini)에 위임합니다.

### 2.2 i18n Routing (다국어 처리 무결성)
- 클라이언트에서 현재 언어를 파악할 때 `window.location.pathname.split('/')` 방식은 **절대 사용을 금지**합니다. (Next.js Soft Navigation 시 오류 발생)
- **반드시 `next-intl`이 제공하는 `useLocale()` 훅을 사용하여 현재 언어를 상태로 가져와야 합니다.**
- 인증(Supabase Auth) Redirect 처리 시, 반드시 `/${locale}/...` 형태의 접두사를 명시하여 언어 초기화 현상을 방지합니다.

### 2.3 State Management (사용자 상태 관리)
- 비회원(Guest)의 초기 접근성을 위해 `lib/userStateManager.ts`를 통한 `localStorage` 캐싱을 최우선으로 활용합니다.
- 로그인 전 입력한 사주 폼 데이터, 선택한 마스터 정보, 임시 카르마 토큰 등은 브라우저에 임시 저장되며, 프리미엄 전환(로그인/결제) 시 DB와 동기화되는 구조를 가집니다.

### 2.4 Race Condition Prevention (동시성 제어)
- 카르마(Karma) 토큰 차감 등 민감한 비즈니스 로직은 클라이언트에서 계산하지 않습니다.
- Supabase RPC(`decrement_karma` 함수 등)를 활용하여 데이터베이스 단에서 원자적(Atomic)으로 처리하여 동시 요청으로 인한 토큰 오남용을 방지합니다.

## 3. Serverless API Guidelines
- AI 요약/채팅 등 수행 시간이 긴 API Route(`app/api/generate-destiny`, `app/api/chat` 등)의 경우 Vercel 타임아웃(기본 15초)을 방지하기 위해 파일 상단에 `export const maxDuration = 60;` 을 명시합니다.
- 캐싱 로직 적용 시 유저의 입력 정보와 함께 `locale` 값을 Key에 포함시켜, 언어 변경 시 정확히 해당 언어로 재조회/재생성 되도록 캐시를 분리합니다.

## 4. AI Agent Response Language (응답 언어 규칙)
- 모든 결과물과 응답은 **반드시 한글(Korean)**로 제공해야 합니다.
- All responses and results MUST be provided in **Korean (한글)**.
