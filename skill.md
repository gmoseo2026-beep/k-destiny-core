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

## 5. Security — Secrets & Deployment (보안: 비밀·배포) 🔐
**이 규칙은 어떤 AI 모델(Claude, Gemini, Antigravity 등)에도 예외 없이 적용됩니다. 위반 시 즉시 중단하고 수정할 것.**
These rules apply to EVERY model (Claude, Gemini, Antigravity, etc.). No exceptions.

### 5.1 절대 금지 (Never)
- **비밀을 코드/파일에 하드코딩하지 마십시오.** 비밀번호, API 키, 토큰, SSH 자격증명을 커밋될 수 있는 어떤 파일(스크립트, 설정, 문서, 주석)에도 절대 직접 쓰지 않습니다.
  Never hardcode secrets (passwords, API keys, tokens, SSH creds) in ANY committable file.
- **다음 파일은 절대 커밋 금지** (이미 `.gitignore`됨 — 그대로 유지): `.env`, `.env.local`, `scripts/deploy.env`, 실제 비밀이 든 모든 파일.
- 비밀 값을 로그/콘솔에 **출력(print/echo/log)하지 않습니다.**

### 5.2 자격증명 취급 (How to use credentials)
- 모든 SSH/배포 스크립트는 자격증명을 **`scripts/_creds.py`의 `get_creds()`** 로만 가져옵니다. host/user/password를 인라인으로 쓰지 않습니다.
  All SSH/deploy scripts MUST obtain credentials via `get_creds()` in `scripts/_creds.py` — never inline literals.
- 실제 비밀 값은 오직 두 곳에만 존재합니다: **로컬 `scripts/deploy.env`**(gitignore됨) 와 **서버 `/root/k-destiny-core/.env`**(gitignore됨). 새 스크립트도 반드시 여기서 읽습니다.
- OpenAI 등 런타임 키를 서버에 반영할 때는 `scripts/set_env.py`를 사용합니다(키는 env에서 읽음, 하드코딩 금지).

### 5.3 커밋/푸시 전 필수 점검 (Pre-commit / pre-push gate)
- 커밋·푸시 전 **스테이징 diff를 스캔**하여 다음 패턴이 있으면 중단하고 env 방식으로 고칩니다:
  `sk-`, `password=`, `DEPLOY_PASS=`, `chltnrud`, `-----BEGIN ... PRIVATE KEY-----`, 서버 IP와 함께 있는 자격증명.
  Before any commit/push, scan the staged diff for those secret patterns; if found, STOP and switch to env vars.
- 빠른 점검 예: `git diff --cached | grep -nEi "sk-[a-z0-9-]{10}|password=|DEPLOY_PASS=|BEGIN .*PRIVATE KEY"`

### 5.4 노출 시 대응 (If a secret leaks)
- 비밀이 한 번이라도 노출(커밋·출력·공유)되면 **손상된 것으로 간주하고 즉시 교체(rotate)** 합니다. 파일에서 지우는 것만으로는 부족합니다 — git 히스토리에 남기 때문입니다.
  A leaked secret is compromised: ROTATE it immediately. Deleting the file is NOT enough (git history retains it).

### 5.5 배포 규칙 (Deployment) — 무중단·거짓성공 방지
- 배포는 **`python scripts/safe_deploy.py`** 로만 수행합니다. 이 스크립트는: origin/main pull → `git clean -fd`(untracked 잔여 파일 제거, `.env`/node_modules는 보존) → `npm ci/install` → 빌드(**실제 종료코드 확인**) → 빌드 성공 시에만 PM2 재시작 → 배포 후 `/api/chat`가 NDJSON을 내는지 검증.
- **빌드 출력을 `| tail` 등 파이프로 넘겨 종료코드를 가리지 마십시오.** 파이프는 마지막 명령의 코드를 반환해 빌드 실패를 성공으로 오판시키고, 깨진 빌드 위에 재시작해 사이트를 죽일 수 있습니다.
- 빌드가 실패하면 **재시작하지 않습니다.** "배포됨"이라고 보고하기 전에 배포 검증(`Deploy VERIFIED`)을 반드시 확인합니다.
