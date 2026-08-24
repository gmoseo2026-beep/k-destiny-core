# 콩닥 Phase A — Opus5 최종 검수 결과

**검수일:** 2026-08-20 · **검수자:** Claude Opus 5 (터미널) · **판정: NO-GO**

REVIEW_HANDOFF.md 의 주장은 참고만 하고 전부 직접 실행·코드로 재검증했다. 아래 모든 근거는 이 저장소에서 실제로 돌린 결과다.

---

## 0. 직접 실행한 검증 (원시 결과)

| 항목 | 명령 | 결과 |
|---|---|---|
| 타입 검사 | `npx tsc --noEmit` | **PASS** (exit 0) |
| 프로덕션 빌드 | `npm run build` | **PASS** (exit 0, Next 16.2.9) |
| 기존 단위 테스트 | `npx tsx scripts/test_compatibility.ts` | **PASS** (exit 0) |
| 신규 적대적 테스트 | `npx tsx scripts/test_compatibility_adversarial.ts` | **PASS** (실패 0 / 14,400쌍) |
| 린트 (Phase A 파일) | `npx eslint <Phase A>` | **최초 FAIL 4건 → 수정 후 PASS** |
| OG 카드 실렌더 | `next start` + curl | **200, 한글 정상 렌더** (이미지 육안 확인) |
| AI 무료 리딩 3건 실생성 | Gemini 실호출 | **한자 0건 / 전문용어 0건** |
| DB 연동 | `prisma.compatibility.count()` | **검증 불가** — P1001 DatabaseNotReachable |

> ⚠️ REVIEW_HANDOFF.md §4 검증표에 **린트가 아예 빠져 있다.** 실제로 돌렸을 때 Phase A 신규 파일에서 4건 실패했다(현재는 내가 수정). AGENTS.md §4-3 의 자체 검증 순서(typecheck → lint → build)가 지켜지지 않았다.

> ⚠️ 로컬 `DATABASE_URL` 이 도달 불가라 **POST /api/compat → DB 저장 → 결과페이지 왕복은 실행 검증하지 못했다.** K-loop 은 코드 정적 추적으로만 확인했다. 배포 전 실환경 스모크가 반드시 필요하다.

---

## 1. Blocker — 승인 전 반드시 수정

### B1. Phase A 퍼널에 진입 경로가 존재하지 않는다
- **근거:** 저장소 전체에서 `/compat/new` 로 가는 링크는 **`components/MeClient.tsx:49` 단 하나**. 그리고 `/me` 페이지로 가는 링크는 **어디에도 없다.**
  ```
  grep -rn "compat" app components messages lib i18n  →  기능 자체 파일 외 유입 링크 0건
  grep -rn "궁합\|콩닥" app/[locale]/page.tsx components/HeroClient.tsx components/Navbar.tsx  →  0건
  ```
- `app/[locale]/page.tsx` 는 여전히 K-Destiny 영문 랜딩(`master_karma_surprise.webp.jpg`, `K-Destiny AI Saju Astrology`)이다. 콩닥 리브랜딩(스펙 ①) 미착수.
- 추가로 `i18n/routing.ts` 의 `defaultLocale: 'en'` → **`kongdak.kr/` 접속 시 `/en` 영문 K-Destiny 로 리다이렉트**된다. 국내 전용 서비스인데 한국어가 기본이 아니다.
- **영향:** 사용자가 URL 을 직접 타이핑하지 않는 한 Phase A 에 도달할 방법이 없다. 스펙 §"랜딩→결과 2클릭" 은커녕 0클릭 도달이 불가능하다. 배포해도 서비스가 성립하지 않는다.
- **수정안:** 랜딩 히어로에 `/ko/compat/new` 1차 CTA 추가 + `defaultLocale` 을 `ko` 로 전환(또는 kongdak.kr 도메인만 ko 로 라우팅). **제품 결정이 필요하므로 내가 임의로 고치지 않았다.**

### B2. `/me`(내 사주 요약)가 하드코딩 스텁이다 — 스펙 ② 미구현
- **근거:** `components/MeClient.tsx:26-31` — 입력 폼도, `calculateFourPillars` 호출도, props 도 없다. **모든 사용자에게 "곧고 푸른 나무의 기운 / 깊은 통찰력 / 신뢰와 책임감"이 고정 출력**된다.
- 더 나쁜 것: `MeClient.tsx:12` 이 페이지 조회만으로 `me_created` 를 발사한다. 아무것도 생성하지 않았는데 "생성됨" 이벤트가 찍힌다 → **측정 지표 자체가 거짓 신호**가 되어 게이트 판단을 오염시킨다.
- **수정안:** ⓐ 실제 사주 계산 연결, 또는 ⓑ Phase A 에서 `/me` 를 빼고 링크·이벤트도 함께 제거. 둘 중 하나. 현재 상태(껍데기 + 이벤트 발사)가 최악이다.

### B3. `BIRTH_HASH_PEPPER` 미설정 fail-open — 생년월일 역산 가능
- **근거:** `app/api/compat/route.ts:10`
  ```ts
  const pepper = process.env.BIRTH_HASH_PEPPER || "";
  ```
  저장소 전체에서 이 변수의 참조는 이 1줄뿐이고, **`.env` / `.env.local` / `.env.example` 어디에도 정의되어 있지 않다**(직접 확인). 즉 현재 상태로 배포하면 pepper 는 확정적으로 빈 문자열이다.
- 그 결과 `birthHash = SHA256("1990-05-15_12:00_M_")` 즉 **무염(unsalted) 해시**다. 탐색공간은 (날짜 약 4만) × (분 1440 + 시간모름) × (성별 2) ≈ 1.2억 조합 — 노트북에서 초 단위 전수 대입으로 전원의 생년월일시가 복원된다. AGENTS.md 절대 규칙 6(PII) 위반.
- REVIEW_HANDOFF.md:83 은 "`BIRTH_HASH_PEPPER` 등은 `.env` 참조"라고 적었지만 **사실이 아니다.** 참조만 하고 정의가 없다.
- **부분 수정 완료:** `.env.example` 에 항목·생성법·경고를 추가했다.
- **남은 수정안(권장):** 값이 없으면 조용히 넘어가지 말고 부팅/요청 시 거부하도록 fail-closed 로 전환.
  ```ts
  const pepper = process.env.BIRTH_HASH_PEPPER;
  if (!pepper) throw new Error("BIRTH_HASH_PEPPER 미설정 — PII 해시를 생성할 수 없습니다.");
  ```
  운영 중단 위험이 있어 **정책 판단이 필요하므로 제안만 한다.**

---

## 2. High — 승인 전 수정 대상

### H1. `'오행 찰떡'` 키워드가 절대 규칙 4(전문용어 노출 금지)를 정면 위반
- **근거:** `lib/compatibility.ts:201`. 실측 분포(생일 96개 전조합 4,560쌍)에서 **출현율 84.4%**.
- 이 문자열은 ⓐ 결과 화면 키워드 칩, ⓑ **공유 OG 카드에 그대로 인쇄**(내가 렌더한 카드 이미지에서 육안 확인), ⓒ AI 프롬프트에 `Core Keywords` 로 주입되어 해석의 주제어가 된다. 즉 **가장 바이럴한 표면에 금지어가 박혀 나간다.**
- **수정안:** 점수 로직은 그대로 두고 문자열만 교체(예: `'기운 찰떡'`, `'에너지 찰떡궁합'`). 결정론에 영향 없음. **카피 결정이라 제안만 한다.**

### H2. 페이지 메타 설명에 전문용어·한자 유출
- **근거:** 실제 렌더된 `/ko/compat/new` HTML 에서 `오행` 11회, `지지` 3회 검출.
  - `app/[locale]/compat/new/page.tsx:6` — `"...진짜 사주 궁합과 **오행** 케미"` (자체 작성)
  - 레거시 레이아웃 메타 상속 — `og:description`/`twitter:description` 에 `"...사주 명식과 **오행** 분석..."`
  - next-intl 메시지 번들이 페이지 페이로드로 직렬화되며 `"(火)의 기운"` 등 **한자까지 HTML 에 포함**
- **영향:** 메타 설명은 구글 검색·카카오톡 미리보기에 그대로 노출되는 사용자 대면 텍스트다.
- **수정안:** 자체 메타에서 `오행` 제거 + 콩닥 라우트에 전용 메타 오버라이드.

### H3. `gemini-2.0-flash` 는 은퇴한 모델 — 매 무료 리딩마다 실패 1회
- **근거:** 실제 키로 직접 호출한 결과
  ```
  gemini-2.0-flash : 404 "This model models/gemini-2.0-flash is no longer available"
  gemini-2.5-flash : 사용가능
  ```
  `lib/destinyGen.ts:22` — `FREE_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash"]`
- 무료 리딩은 항상 `models[0]` 로 먼저 시도 → **100% 404** → catch → `models[1]` 폴백으로 성공한다. 동작은 하지만 요청마다 실패 왕복 + 에러 로그가 쌓이고, **실질 모델 이중화가 0**이다. 2.5-flash 가 흔들리면 곧바로 전원이 하드코딩 폴백 문단(`CompatResultClient.tsx:64`) 하나를 보게 된다.
- 레거시 K-Destiny 생성 경로도 같은 `FREE_MODELS` 를 쓴다(Phase A 범위 밖이지만 동일 결함).
- **수정안:** `FREE_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"]` 등 생존 모델 2개로 교체.

### H4. OG 카드에 한글 폰트가 임베드되어 있지 않다
- **근거:** `app/api/og/compat/route.tsx` 에 `fonts:` 옵션이 없고 `fontFamily: "sans-serif"` 만 쓴다. next/og 가 번들하는 폰트는 **`Geist-Regular.ttf`(라틴 전용) 하나뿐**이다.
  ```
  find node_modules/next/dist/compiled/@vercel/og -name "*.ttf"  →  Geist-Regular.ttf
  grep -ao "fonts.googleapis.com" .../index.node.js  →  loadGoogleFont 폴백 존재
  ```
- 내 로컬 렌더에서 한글이 정상으로 보인 것은 **런타임에 `fonts.googleapis.com` 으로 폰트를 내려받았기** 때문이다. 즉 공유 카드 1장마다 외부 네트워크 왕복에 의존한다.
- **영향:** 서버 이그레스 차단·구글 지연·콜드스타트 시 **카드가 두부(□□□)로 렌더되거나 크롤러 타임아웃으로 카톡 미리보기가 안 뜬다.** K-loop 의 핵심 자산이 외부 의존에 걸려 있다.
- **수정안:** Pretendard/Noto Sans KR 서브셋 `.ttf` 를 `public/fonts/` 에 두고 `ImageResponse` 의 `fonts` 옵션으로 명시 주입.

### H5. GA4 이벤트가 실제로는 단 1건도 발사되지 않는다 + `share_click` 이중 용도
- **실발사 여부:** `NEXT_PUBLIC_GA_ID` 가 `.env`/`.env.local` 에 **없다**(직접 확인). `components/Analytics.tsx:17-18` 은 이 값이 없으면 gtag 스크립트를 아예 로드하지 않고, `lib/gtag.ts:22` 는 `window.gtag` 부재 시 조용히 no-op 한다. → **코드에는 6종이 연결돼 있으나 현재 발사되는 것은 0종.**
- **이벤트 이중 용도(코드 결함):** `CompatResultClient.tsx`
  - `:32` 유입 시 `share_click` (K 분자 성격)
  - `:81` 공유 버튼 클릭 시 **같은 이름** `share_click` (유출 성격)
  → 스펙 §6 의 `share_click`(유입) 정의가 오염된다. 파라미터로 구분은 가능하나 이벤트 카운트 자체가 틀린다.
- **K 분모 누락:** `share_card_created` 는 `:97` **다운로드 버튼에서만** 발사된다. 주 공유 경로인 **링크 복사 공유는 카운트되지 않는다** → 스펙의 `K = 신규 compat_created(ref) ÷ share_card_created` 에서 분모가 과소집계되어 **K 가 과대평가**된다.
- `purchase_confirmed` 는 콩닥 경로에 연결점이 없다(레거시 pricing/result 에만 존재).
- **수정안:** 유입 이벤트를 `share_visit` 등으로 분리, 링크 공유에도 `share_card_created`(또는 별도 `share_link_created`)를 발사하고 K 정의를 그에 맞춰 확정.

---

## 3. Medium

| # | 파일:라인 | 문제 | 근거 |
|---|---|---|---|
| M1 | `prisma/` | **마이그레이션 파일이 하나도 없다**(`prisma/migrations` 디렉터리 부재). 프로덕션에 `Compatibility` 테이블이 생성될 경로가 저장소에 없다. 로컬 DB 도달 불가로 실존 여부도 확인 못함 | `ls prisma/migrations` → No such directory / `count()` → P1001 |
| M2 | `lib/compatibility.ts` | **점수·키워드 편중.** 4,560쌍 실측: 중앙값 87, p10=78, 65점 이하 0.3%. 상위 2개 키워드(`서로의 부족함을 채워주는`, `오행 찰떡`)가 **각각 84.4%** 로 동일 출현 → 6명 중 5명이 같은 카드를 공유하게 되어 바이럴 동기가 죽는다 | 축별 분포: complement 30점=84%, balance 10점=84% |
| M3 | `app/api/compat/route.ts:28` | **생년월일 검증 부재.** 미래 날짜 `2999-12-31` → 69점 정상 발급. `2023-02-30`(없는 날) → 무언 보정 후 91점. 잘못된 형식은 throw → catch → **500** (400 이어야 함) | 직접 실행 확인 |
| M4 | `app/api/og/compat/route.tsx` | OG 라우트에 **레이트리밋이 없다.** 크기 제한은 수정했으나 여전히 미인증·무제한 호출 가능 | — |
| M5 | `components/CompatResultClient.tsx:78` | 공유 링크 버튼은 `?ref=` 를 붙이지만, 사용자가 **주소창 URL 을 그대로 복사**해 보내면 ref 가 없다 → `sourceCompatId` 미기록 → K 과소집계 | 결과페이지 URL 은 생성 직후 `?ref` 없음 |
| M6 | `app/api/generate-compat/route.ts:37-41` | 캐시 미스 시 동시 요청이 들어오면 **중복 AI 호출**(락·in-flight 병합 없음). 비용/레이트 리스크 | — |
| M7 | OG 스토리 카드 | 1080×1350 렌더 시 `justify-content: space-between` + 자식 3개라 **상단에 거대한 빈 여백**이 생긴다. 인스타 스토리 1차 자산의 완성도 미달 | 렌더 이미지 육안 확인 |
| M8 | 스펙 §7 | **단건 결제(9,900원) 미구현** — 심층 버튼이 `disabled "서비스 준비 중"`. 스펙은 결제를 Phase A 범위(⑥)에 두고 게이트에 "심층 결제 발생 ≥ 1"을 요구한다. 의도적 이연이라면 스펙·게이트 문서를 함께 갱신해야 한다 | `CompatResultClient.tsx:208` |

---

## 4. Low

- **L1** `巳申` 이 `BRANCH_SIX_COMBO`(20점)와 `BRANCH_PUNISH`(5점)에 **동시 존재**한다. `getBranchScore` 가 합을 먼저 검사해 20점으로 결정론적으로 확정되므로 현재 버그는 아니나, 조건문 순서를 바꾸면 점수가 뒤집힌다. 기존 테스트의 "중복 제거" 검증(검증 2)은 CLASH↔PUNISH 만 본다. → 의도(합 우선)를 주석·테스트로 고정할 것. (명리학적으로 巳申 은 합이자 형이 맞아 표 자체는 정확하다)
- **L2** `app/api/og/compat/route.tsx:24` — `shareToken` 이 없거나 조회 실패 시 **가짜 "91점 / 천생연분" 카드**를 200 으로 반환한다. 404 나 브랜드 기본 카드가 옳다.
- **L3** OG 카드 문구 띄어쓰기: `"이설렘 의 궁합"`(조사 앞 공백), `"확인 →kongdak.kr"`(화살표 뒤 공백 없음).
- **L4** `app/api/compat/route.ts:26` — `relation` 이 검증 없이 그대로 저장된다(임의 문자열 허용).
- **L5** `/en/compat/new`, `/ja/compat/new` 가 200 으로 한국어 페이지를 렌더한다. 동면 로케일에서 콩닥 라우트는 차단하는 편이 낫다.
- **L6** `extractKeywords` 의 `'서로의 부족함을 채워주는'` 은 수식어로 끝나 명사가 없다(문장으로 어색).

---

## 5. PASS 로 확인된 항목

1. **결정론·순서 무관성 — PASS.** 신규 `scripts/test_compatibility_adversarial.ts` 로 **10천간 × 12지지 × 결핍패턴 = 14,400쌍 전수**에서 `calculateCompatibility(A,B) === (B,A)`(score·breakdown·keywords 전부) 확인, 실패 0. `Math.random`/`Date` 등 비결정 요소 없음. 실제 만세력 커플 4쌍 반복·교환 호출도 동일.
2. **점수 산식·매핑 — PASS.** 5축 가중(30/30/20/10/10) 코드 반영 확인. 매핑식 `60 + round((raw-33)×39/67)` 이 전 구간에서 참조식과 일치, `raw 33→60`, `raw 100→99` 경계 정확, 60~99 범위 이탈 0건, 키워드 항상 정확히 3개·중복 없음.
3. **지지 5개 표 — PASS.** 12지지 외 문자 0건, **모든 항목의 역순 쌍이 존재**(비대칭 0건)를 전수 확인. 과거 `'自由'` 오타는 `子酉` 로 교정되어 있고, 丑未·寅申 의 충/형 중복도 제거되어 있다. 육합·삼합·육충·삼형·자형·원진·육해·육파 모두 명리학 정의와 일치.
4. **AI 출력 한자·전문용어 — PASS.** 실제 Gemini 로 무료 리딩 3건을 생성해 스캔: **한자 0건, 전문용어(오행/일간/천간/지지/상생/상극/원국/십신/사주) 0건.** 톤도 STYLE_GUIDE 에 부합. ※ 다만 **프로그램적 후처리 필터가 저장소 어디에도 없다**(프롬프트 지시에만 의존) — 모델 교체 시 재검증 필요.
5. **K-loop 코드 경로 — PASS(정적 추적).** `공유버튼 → ?ref=<shareToken>` → `[id]/page.tsx:72` searchParams await → `CompatResultClient(refToken)` / 헤더·CTA 링크가 ref 보존 → `compat/new?ref=` → `CompatNewClient:59` payload.ref → `POST /api/compat:74-82` `where{shareToken:ref}` → `sourceCompatId` 저장 → `compat_created{has_ref}`. **ref 를 떨어뜨리는 구간 없음.** (단 M5, 그리고 DB 미도달로 실행 검증은 못함)
6. **프라이버시 — 대체로 PASS.** `GET /api/compat` 와 결과페이지 모두 `birthHash`/`fourPillars`/`elementsScore`/`dayMaster` 를 클라이언트로 내보내지 않고 이름·성별만 반환한다(`route.ts:155-173`, `page.tsx:97-112`). 원본 생년월일은 DB 에 저장하지 않고 로그에도 남기지 않는다(catch 에서 `error.message` 만 기록). `shareToken` 은 `crypto.randomBytes(18).toString("base64url")` = **144비트, 24자** — 열거 불가.
7. **시크릿 — PASS.** Phase A 신규 파일에 하드코딩 시크릿 없음. 추적되는 env 파일은 `.env.example` 뿐(실제 `.env`·`.env.local`·`scripts/deploy.env` 는 gitignore 유지).
8. **스코프 준수 — PASS.** 매칭·소개팅·본인인증·구독·결제 로직 미생성. `lib/gumroad.ts`, `app/api/webhooks/gumroad`, `messages/en.json`, `messages/ja.json` 전부 **삭제 없이 보존**(`git diff --diff-filter=D` 결과 삭제 0건). prisma 변경은 `Compatibility` 모델 **추가만**(기존 테이블 파괴 없음).
9. **Next 16 정합성 — PASS.** `params`/`searchParams` 모두 `Promise` 타입 + `await` 처리. server/client 경계 정상. OG 라우트 `runtime = "nodejs"`(prisma 사용에 적절). `metadataBase` 설정 + OG 이미지 절대 URL. 신규 컴포넌트에 `localStorage`/`sessionStorage`/`document.cookie` 사용 없음. 레이트리미터는 POST 두 라우트에 연결됨.

---

## 6. 내가 직접 수정한 것 (전부 재검증 완료)

| 파일 | 변경 | 검증 |
|---|---|---|
| `app/api/og/compat/route.tsx` | `w`/`h` 를 NaN 방어 + `200~1200`/`200~1350` 로 클램프 | 수정 전 `w=abc` → **HTTP 000(응답 끊김)**, `w=6000&h=6000` → **21.6초 / 1.9MB**. 수정 후 각각 **200 / 0.20초**, **200 / 0.36초**. 1080×1350 정상 |
| `app/[locale]/compat/[id]/page.tsx` (2곳) | `id.length > 20 ? {shareToken} : {id}` → `findFirst({OR:[{shareToken:id},{id}]})` | cuid=**25자**, shareToken=**24자**로 **둘 다 20자 초과** → 기존 분기는 id 조회가 영원히 불가능(항상 shareToken 으로 조회→404). 스펙 §3 의 `/compat/[id]/premium` 도입 시 터질 잠복 결함 |
| `app/api/generate-compat/route.ts` | `any` 3건 → 명시 타입 | 린트 에러 3건 해소 |
| `components/CompatResultClient.tsx` | effect 내 중복 `setIsGenerating(true)` 제거 | 린트 에러 1건 해소. `isGenerating` 은 `!initialData.summaryKo` 로 이미 true 초기화되므로 동작 동일 |
| `.env.example` | `BIRTH_HASH_PEPPER`, `NEXT_PUBLIC_SITE_URL` 항목 + 경고 추가 | 문서화만(동작 변경 없음) |
| `scripts/test_compatibility_adversarial.ts` | **신규** 적대적 테스트 추가 | 순서 무관성 전수, 매핑 경계·단조성, 표 대칭성·표간 중복, 실만세력 4커플 |

수정 후 재검증: `tsc --noEmit` **PASS** · `npm run build` **PASS** · Phase A `eslint` **PASS(0)** · 단위 테스트 **PASS** · 적대적 테스트 **PASS(실패 0)**.

---

## 7. 스스로 의심하는 지점 (한계 명시)

- **DB 미검증.** 로컬 `DATABASE_URL` 이 P1001 로 도달 불가라 `Compatibility` 테이블 실존, POST 저장, `sourceCompatId` 실제 기록, GET 왕복을 **실행으로 확인하지 못했다.** K-loop 은 정적 추적 결과다. 마이그레이션도 없으므로 배포 전 `prisma db push` + 실환경 스모크가 필수다.
- **폰트 결론의 근거.** 한글이 로컬에서 렌더된 것은 사실이나, 번들 폰트가 라틴 전용이고 og 번들에 `fonts.googleapis.com` 폴백 코드가 있다는 정황으로 "외부 폰트 fetch"라 판단했다. 프로덕션 서버에서 이그레스를 막고 1회 렌더해보면 확정된다.
- **점수 분포 표본.** 4,560쌍은 생일 96개(1975~2005, 격년·6일)의 전조합이며 출생시각을 12:00 로 고정했다. 시간까지 흩뿌리면 yinYang 축이 움직여 분포가 다소 넓어질 수 있다. 다만 84% 를 만드는 것은 complement·balance 축이라 편중 결론 자체는 바뀌지 않는다.
- **AI 검증 표본이 3건.** 한자 유출은 확률적 사건이라 3건 통과가 안전을 보장하지 않는다. 후처리 필터가 없다는 점이 실질 리스크다.

---

## 8. 배포 가능 여부 — **NO-GO**

엔진 자체는 합격이다. 궁합 산식은 14,400쌍 전수에서 순서 무관·완전 결정론이고, 매핑 경계값과 지지 5개 표는 명리학 정의와 일치하며 과거 오타·중복 이력도 정리되어 있다. 타입·빌드·테스트가 통과하고, PII 최소 반환·144비트 shareToken·스코프 준수(동면 코드 무삭제)·Next 16 정합성도 실제로 확인했다. 그러나 **지금 배포하면 아무도 이 기능에 도달할 수 없다** — 랜딩부터 네비게이션까지 `/compat/new` 로 가는 링크가 존재하지 않고(B1), 루트 도메인은 여전히 영문 K-Destiny 로 리다이렉트된다. 퍼널의 첫 화면인 `/me` 는 모든 사용자에게 같은 문구를 보여주는 껍데기이면서 `me_created` 를 발사해 측정을 오염시키고(B2), 생년월일 해시는 pepper 가 정의된 적이 없어 무염 SHA-256 으로 동작하며 전수 대입에 열려 있다(B3). 여기에 GA4 측정 ID 자체가 없어 6종 이벤트 중 **실제 발사는 0건**이므로, 스펙이 정한 완료 게이트(K ≥ 0.5)를 관측할 수단조차 없다(H5). 즉 결함은 계산 로직이 아니라 **서비스 도달·측정·PII 보호라는 출시 전제**에 몰려 있다.

**해제 조건:** B1~B3 수정 + H1·H2(금지어 노출)·H3(은퇴 모델)·H5(측정 ID·이벤트 정의) 처리 + `prisma db push` 후 실DB 에서 "공유링크 유입 → 궁합 생성 → `sourceCompatId` 기록" 1회 실측. H4(폰트 임베드)는 K-loop 핵심 자산이므로 같은 회차에 함께 처리할 것을 강력히 권한다. 이 조건이 충족되면 Medium 이하는 배포 후 순차 개선으로 충분하다.
