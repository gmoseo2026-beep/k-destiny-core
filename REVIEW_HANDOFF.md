# REVIEW_HANDOFF — 체크포인트 4 (최종)

> 콩닥(kongdak) Phase 4 (Task 4.1~4.4, 홈 프리미엄 밴드, V3 운영 테스트 체크리스트) 및 N1~N3 데이터 보완 완료 보고서입니다.  
> 원 지시문의 제약(프리미엄 3종 `isHidden: true` 유지, AI 본문 임의 작성 금지, 운영 DB prisma 명령 금지, 개발 DB 없는 next dev 및 실제 Gemini 호출 금지, push/배포 금지)을 100% 준수하였습니다.

---

## 1. N1 변경 글자 목록, N2 테스트 결과, N3 기준·차이 설명

### 1-1. N1 성별 태그 변경 한자 전수 목록 (총 88자)

`data/naming/name-hanja.source.json`의 전수 3,127자 중 부수 女(강희 38) 및 여성적 훈("예쁠·아름다울·아리따울·계집·여자·아가씨·왕비·부인") 글자 82자를 `["F"]`로 분리하고, 남성 전용 글자(`雄 彪 郞 郎 丈 夫` 및 "수컷·사내·사나이") 6자를 `["M"]`으로 분리하였습니다. 중립 예외 목록(`始 委 威 姿 好 如 妙 姜`)은 `["M", "F"]`로 보존되었습니다.

#### ① 여성 전용 한자 `["F"]` (82자)
| 한자 | 훈 | 음 | 새 태그 |
|:---:|:---|:---:|:---:|
| 贇 | 예쁠 | 빈 | `["F"]` |
| 嬪 | 아내 | 빈 | `["F"]` |
| 嫕 | 유순할 | 예 | `["F"]` |
| 嫛 | 갓난아이·유순할 | 예 | `["F"]` |
| 妖 | 요사할 | 요 | `["F"]` |
| 姚 | 예쁠 | 요 | `["F"]` |
| 孀 | 홀어머니 | 상 | `["F"]` |
| 娑 | 춤출·사바 세상 | 사 | `["F"]` |
| 姒 | 동서 | 사 | `["F"]` |
| 姝 | 예쁠 | 주 | `["F"]` |
| 妵 | 사람 이름 | 주 | `["F"]` |
| 婋 | 재치 있을 | 호 | `["F"]` |
| 嫁 | 시집갈 | 가 | `["F"]` |
| 嬰 | 어린아이 | 영 | `["F"]` |
| 嬴 | 찰 | 영 | `["F"]` |
| 姟 | 백 조 | 해 | `["F"]` |
| 媚 | 아첨할·예쁠 | 미 | `["F"]` |
| 娓 | 장황할 | 미 | `["F"]` |
| 娙 | 여관 | 형 | `["F"]` |
| 嫂 | 형 | 수 | `["F"]` |
| 姨 | 이모 | 이 | `["F"]` |
| 媐 | 기쁠 | 이 | `["F"]` |
| 㛅 | 여자의 자 | 이 | `["F"]` |
| 娼 | 창녀 | 창 | `["F"]` |
| 媪 | 할머니 | 온 | `["F"]` |
| 媼 | 할머니 | 온 | `["F"]` |
| 姷 | 짝 | 유 | `["F"]` |
| 嫺 | 우아할 | 한 | `["F"]` |
| 嫻 | 우아할 | 한 | `["F"]` |
| 娥 | 예쁠 | 아 | `["F"]` |
| 婭 | 동서 | 아 | `["F"]` |
| 妿 | 여자 스승 | 아 | `["F"]` |
| 𡜧 | 조용할 | 세 | `["F"]` |
| 媛 | 여자 | 원 | `["F"]` |
| 嫄 | 사람 이름 | 원 | `["F"]` |
| 姫 | 여자 | 희 | `["F"]` |
| 㜯 | 기쁠 | 희 | `["F"]` |
| 姻 | 혼·시집갈 | 인 | `["F"]` |
| 婣 | 혼·시집갈 | 인 | `["F"]` |
| 㜺 | 희고 환할 | 찬 | `["F"]` |
| 婿 | 사위 | 서 | `["F"]` |
| 嫬 | 여자의 자 | 서 | `["F"]` |
| 娠 | 아이 밸 | 신 | `["F"]` |
| 姺 | 나라 이름 | 신 | `["F"]` |
| 姓 | 성씨 | 성 | `["F"]` |
| 娟 | 예쁠 | 연 | `["F"]` |
| 娫 | 빛날 | 연 | `["F"]` |
| 姢 | 예쁠 | 연 | `["F"]` |
| 㜣 | 여자의 자태 | 연 | `["F"]` |
| 媞 | 안존할 | 제 | `["F"]` |
| 娣 | 손아래 누이 | 제 | `["F"]` |
| 姼 | 예쁠 | 제 | `["F"]` |
| 媟 | 버릇없이 굴 | 설 | `["F"]` |
| 姑 | 시어머니·빨아먹을 | 고 | `["F"]` |
| 妊 | 임신할 | 임 | `["F"]` |
| 姙 | 임신할 | 임 | `["F"]` |
| 妤 | 궁녀 | 여 | `["F"]` |
| 嬛 | 산뜻할 | 현 | `["F"]` |
| 妶 | 절개 있을 | 현 | `["F"]` |
| 娊 | 허리 가늘 | 현 | `["F"]` |
| 婉 | 순할 | 완 | `["F"]` |
| 妧 | 좋을 | 완 | `["F"]` |
| 婠 | 품성 좋을 | 완 | `["F"]` |
| 婇 | 여자의 자 | 채 | `["F"]` |
| 娛 | 즐길 | 오 | `["F"]` |
| 嫯 | 교만할 | 오 | `["F"]` |
| 妃 | 왕 비 | 비 | `["F"]` |
| 妣 | 죽은 어머니 | 비 | `["F"]` |
| 嫙 | 예쁠 | 선 | `["F"]` |
| 嫢 | 가는 허리 | 규 | `["F"]` |
| 嬀 | 물 이름 | 규 | `["F"]` |
| 媤 | 시집 | 시 | `["F"]` |
| 㛃 | 맑을 | 결 | `["F"]` |
| 妘 | 여자의 자 | 운 | `["F"]` |
| 嫝 | 편안할 | 강 | `["F"]` |
| 妟 | 편안할 | 안 | `["F"]` |
| 姲 | 여자의 자 | 안 | `["F"]` |
| 妓 | 기생 | 기 | `["F"]` |
| 姃 | 단정할 | 정 | `["F"]` |
| 婷 | 예쁠 | 정 | `["F"]` |
| 婧 | 날씬할 | 정 | `["F"]` |
| 妌 | 엄전할 | 정 | `["F"]` |

#### ② 남성 전용 한자 `["M"]` (6자)
| 한자 | 훈 | 음 | 새 태그 |
|:---:|:---|:---:|:---:|
| 雄 | 수컷 | 웅 | `["M"]` |
| 彪 | 호랑이무늬 | 표 | `["M"]` |
| 郞 | 사내·밝을 | 랑 | `["M"]` |
| 郎 | 사내·밝을 | 랑 | `["M"]` |
| 丈 | 어른·길 | 장 | `["M"]` |
| 夫 | 지아비·사내 | 부 | `["M"]` |

### 1-2. N2 훈 표기 정리 테스트 결과
- `data/naming/name-hanja.json` 전체 3,127개 항목 전수 검증:
  - 훈 내 슬래시(`/`) 포함 항목: **0건**
  - 훈 끝이 음(`eum`)으로 끝나는 항목: **0건**
  - 화면 표기 규격(`${char} ${hun} ${eum}`) 통일 완료
  - `tests/naming.test.ts` 단위 테스트 통과 (16/16 passed)

### 1-3. N3 인명용 한자 기준 명시 및 9,389자 차이 설명
- **적용 기준:** 대한민국 대법원규칙 제3220호 (가족관계의 등록 등에 관한 규칙, 2025-07-19 시행)
- **차이 설명:**
  - 대법원 공식 인명용 한자 본표의 기본 한자 총수는 **9,389자**입니다.
  - `data/naming/inmyong-hanja.txt`에 수록된 총수는 **9,460자**로, 이는 기본 한자 9,389자에 대법원 규칙상 허용되는 동자·속자·이체자(variant forms) 71자가 포함되어 등록되었기 때문입니다.
  - 해당 내용과 개정 규칙 기준을 `data/naming/inmyong-hanja.txt` 상단 주석에 명시하였으며, 작명 리포트 UI 및 안내문에는 출생신고 전 대법원 전자가족관계등록시스템 확인 필수 안내 문구를 포함하였습니다.

---

## 2. `git log --oneline main..HEAD`

```
b5dedce feat(premium): 홈 프리미엄 섹션 및 운영 테스트 체크리스트
cb2d4b3 feat(premium-ui): 프리미엄 리포트 뷰어 3종
3332df5 feat(premium-ui): 프리미엄 상세·입력·티저
23c738b feat(premium-ui): 프리미엄 디자인 토큰과 공용 컴포넌트
0aa6a39 feat(premium): 프리미엄 병렬 생성
1fb5479 docs(naming): 인명용 한자 기준 명시 (N3)
ad683ad fix(naming): 성별 태그·훈 표기 정리 (N1, N2)
f35e586 fix(naming): build-name-hanja 미사용 변수 정리
9175993 feat(premium): 프리미엄 엔진 티저
3f28145 feat(naming): 작명 결정론 엔진
e8cec19 feat(naming): 인명용 한자 데이터와 빌드 스크립트
57e8688 feat(premium): 길일 택일 결정론 엔진
ea966f7 feat(premium): 2027 대운 결정론 엔진
7fb8671 feat(premium): 간지 공용 모듈
dd11fd9 fix(analytics): GA4 결제 완료 이벤트 실제 결제 금액 반영 (F6)
8e9f744 fix(copy): 로딩 및 결과 문구 내 사주 전문용어 제거 (F5)
11f2783 fix(fortune): 로그인 후 입력값 자동 복원 (F4)
205a00b fix(fortune): 추천 상품 숨김 상품 링크 방지 및 가시성 연동 (F3)
da64804 fix(annual): 연도 파라미터(2026/2027) 분기 및 상품 일치 (F2)
3ac6629 fix(weekly): 패스 판매 UI 동면 및 표시·청구 불일치 제거 (F1)
09ee39a feat(analytics): 결제·조회 GA4 퍼널 측정 및 카탈로그 미리보기 가드
5cc7517 feat(home): 홈 개편 및 브랜드 토큰 잔재 청소
5dfe7d0 feat(vault): 내 보관함 주문 기반 리포트 표시
106ee6b feat(pay): 결제 완료 분기 처리
1bb3073 feat(report): 공용 리포트 뷰 컴포넌트
86a93ed feat(forms): 공용 생년월일 입력 컴포넌트
cb7c913 fix(pricing): 가격 6,900원 일원화 및 패스 동면
6338414 feat(payments): 클라이언트 라이브러리 결제 handoff 지원
6ea5adb test(contract): 라우트 계약 테스트 3종
e7c1a82 feat(preview): 운영 미리보기 권한(PREVIEW_EMAILS)
c437bfd chore(lint): 브랜치 변경 파일 any 제거 및 린트 에러 0 달성 (R11)
488b2a9 fix(order): 회원 전용 첫 결제 할인 및 기본 type SINGLE 적용 (R7)
f6dbe80 fix(payments): complete 응답 catalogId 추가 및 중복 toCatalogId 정리 (R5, R6)
667cc99 feat(reports): mine 주문 확장 및 view 봉투 읽기 구현 (R9, R10)
e60ba35 feat(reports): 리포트 생성 실제 구현 및 목(mock) 제거 (R3)
da56665 feat(prompts): STYLE_GUIDE 적용 프롬프트 사양 및 표준 검증기 추가 (R8)
1dab776 feat(reports): HMAC 기반 subjectKey 해시 모듈 및 테스트 추가 (R4)
31b3634 fix(infra): prisma-dev 원복 및 lock-race 가드 강화 (R1)
4f9b5e6 feat(gen): 재시도·진단로그·한자검증 포함 JSON 생성 헬퍼
4a0455d feat(reports): 멱등 생성 잠금
1d5d690 feat(validation): 공용 입력 검증 모듈 추가 및 적용
4c71389 fix(order): 카탈로그 기반 판매 가드·회원 첫결제 할인·기간권 판매 중단
```

---

## 3. `npm test` 전체 출력

```
> kongdak@0.1.0 test
> vitest run

 RUN  v5.0.1 C:/Users/gmose/OneDrive/바탕 화면/k-destiny

 ✓ tests/catalog.test.ts (6 tests) 19ms
 ✓ tests/inputs.test.ts (7 tests) 105ms
 ✓ tests/preview.test.ts (4 tests) 5ms
 ✓ tests/subject.test.ts (3 tests) 10ms
 ✓ tests/productIdentity.test.ts (6 tests) 9ms
 ✓ tests/mine.test.ts (3 tests) 7ms
 ✓ tests/entitlementRules.test.ts (16 tests) 12ms
 ✓ tests/subjectKey.test.ts (4 tests) 10ms
 ✓ tests/standardReport.test.ts (8 tests) 10ms
 ✓ tests/productSpecs.test.ts (1 test) 9ms
 ✓ tests/routes/paymentsOrder.test.ts (8 tests) 21ms
 ✓ tests/daeun.test.ts (4 tests) 55ms
 ✓ tests/dateSelection.test.ts (7 tests) 180ms
 ✓ tests/routes/reportsView.test.ts (5 tests) 15ms
 ✓ tests/ganzhi.test.ts (5 tests) 7ms
 ✓ tests/teaser.test.ts (1 test) 4ms
 ✓ tests/smoke.test.ts (1 test) 4ms
 ✓ tests/hanjaGuard.test.ts (2 tests) 6ms
 ✓ tests/teasers.test.ts (3 tests) 102ms
 ✓ tests/naming.test.ts (16 tests) 285ms
stderr | tests/routes/reportsGenerate.test.ts > POST /api/reports/generate route contract tests > case 14: premium FULL fails with 500 and updates report status to FAILED if any section fails
[reports/generate] premium 2027 failed Error: AI section failed

 ✓ tests/routes/reportsGenerate.test.ts (14 tests) 867ms
   ✓ POST /api/reports/generate route contract tests (14)
     ✓ case 13: premium FULL calls generateJson for each section and succeeds 440ms
     ✓ case 14: premium FULL fails with 500 and updates report status to FAILED if any section fails 386ms

 Test Files  21 passed (21)
      Tests  124 passed (124)
   Start at  14:10:08
   Duration  1.91s (transform 55%, tests 23%, import 20%, worker 2%)
```

---

## 4. `npx tsc --noEmit; echo EXIT=$LASTEXITCODE`

```
EXIT=0
```

---

## 5. `npx eslint $(git diff --name-only main -- '*.ts' '*.tsx' '*.mjs')` 출력

```
(Clean, 0 errors, 0 warnings across all 110 modified/new files since main)
```

---

## 6. `npx next build > build.log 2>&1; echo EXIT=$LASTEXITCODE` 및 build.log 마지막 30줄

### 명령어 실행 종료 코드:
```
EXIT=0
```

### build.log 마지막 30줄:
```
??? /api/auth/register
??? /api/checkout
??? /api/compat
??? /api/compat/deep-report
??? /api/fortune/annual
??? /api/fortune/daily
??? /api/fortune/weekly
??? /api/generate-compat
??? /api/hermes/health
??? /api/hermes/kpi
??? /api/og/compat
??? /api/payments/complete
??? /api/payments/confirm
??? /api/payments/order
??? /api/push/subscribe
??? /api/reports/generate
??? /api/reports/mine
??? /api/reports/view
??? /api/subscriptions/create
??? /api/user/claim-unlock
??? /api/user/entitlement
??? /api/user/profile
??? /api/user/saju-check
??? /api/user/saju-profile
??? /api/webhooks/gumroad
??? /api/webhooks/paddle
??? /api/webhooks/portone
??? /api/webhooks/toss
????/apple-icon.png
????/icon.png
????/icon.svg
????/robots.txt
????/sitemap.xml

? Proxy (Middleware)

?? (Static)   prerendered as static content
?  (Dynamic)  server-rendered on demand
```

---

## 7. 프리미엄 라우트 계약 테스트 출력 (`tests/routes/reportsGenerate.test.ts`)

```
 RUN  v5.0.1 C:/Users/gmose/OneDrive/바탕 화면/k-destiny

stderr | tests/routes/reportsGenerate.test.ts > POST /api/reports/generate route contract tests > case 14: premium FULL fails with 500 and updates report status to FAILED if any section fails
[reports/generate] premium 2027 failed Error: AI section failed

 ✓ tests/routes/reportsGenerate.test.ts (14 tests) 833ms
   ✓ POST /api/reports/generate route contract tests (14)
     ✓ case 1: invalid JSON -> 400
     ✓ case 2: unknown catalogId -> 404
     ✓ case 3: invalid input for inputKind -> 400
     ✓ case 4: FREE with non-free product -> 400
     ✓ case 5: FREE succeeds and saves report with COMPLETED
     ✓ case 6: TEASER succeeds without saving report
     ✓ case 7: FULL without orderId -> 401
     ✓ case 8: FULL with orderId for different catalogId -> 403
     ✓ case 9: FULL with valid orderId -> 200/202 idempotency
     ✓ case 10: generation failure -> 500 and FAILED status
     ✓ case 11: premium FULL with compat order -> 403
     ✓ case 12: premium TEASER returns only whitelisted teaser fields without paid fields
     ✓ case 13: premium FULL calls generateJson for each section and succeeds
     ✓ case 14: premium FULL fails with 500 and updates report status to FAILED if any section fails

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  14:11:41
   Duration  1.56s (tests 58%, transform 28%, import 13%)
```

---

## 8. `grep -rn "gemini-2.5-pro" app lib` 결과 (정확히 1곳)

```
lib/premium/models.ts:4:  process.env.GEMINI_PREMIUM_MODEL || "gemini-2.5-pro",
```
- `app` 및 `lib` 디렉토리 전수 검색 결과 정확히 1곳만 발견됨을 검증 완료하였습니다.

---

## 9. 새 환경변수 목록 (값 제외)

배포 전 서버 `.env`에 설정이 필요한 신규 환경변수 목록입니다:
1. `SUBJECT_HASH_SECRET` (필수, `openssl rand -hex 32` 등으로 생성 — 미설정 시 리포트 API 500 차단)
2. `PREVIEW_EMAILS` (필수, 운영 미리보기 권한 계정 이메일 목록, 콤마 구분)
3. `GEMINI_PREMIUM_MODEL` (선택, 기본값 `gemini-2.5-pro`)

---

## 10. 미실행 항목과 사유

1. **개발 DB 및 실제 Gemini API 호출 미실행:**
   - 로컬 개발 DB(`.env.development.local`) 및 실결제/Gemini API 키가 제공되지 않은 환경이므로, 지시문 제약 사항에 따라 `next dev` 수동 브라우징 및 실제 Gemini 1회 호출을 일체 실행하지 않았습니다.
   - 이에 따라 "프리미엄 3종 생성 소요시간(ms)", "finishReason 실측", "실 브라우저 스크린샷"은 **미실행(개발 DB 및 API 키 부재)**으로 보고합니다.
2. **샘플 리포트(`data/samples/*.json`) 본문:**
   - 지시문의 "AI 본문을 손으로 지어내지 않는다"는 절대 규칙에 따라, 실제 결정론적 엔진 결과(대운 주기, 성명학 5개 이름 및 원획, 택일 5선)만 실제 계산치로 기입하고, AI 생성 텍스트 필드는 `"샘플 준비 중"` 플레이스홀더로 커밋하였습니다.
3. **프리미엄 상품 대외 공개(미실행):**
   - 프리미엄 3종(`premium_2027_daeun`, `premium_naming`, `premium_date_selection`)은 모두 `isHidden: true`를 엄격히 유지하고 있습니다. 배포 후 사장님의 V3 운영 테스트 통과 전까지 공개되지 않습니다.
4. **git push 및 서버 배포(미실행):**
   - 원 지시문 절대 규칙에 따라 push 및 배포는 수행하지 않았습니다.

---

## 11. 스스로 의심 지점

1. **AI 병렬 호출 시 서버 응답 타임아웃:**
   - 2027 대운의 경우 4개 섹션, 작명/택일은 2개 섹션을 `Promise.all`로 병렬 호출합니다. Gemini API 응답이 10~15초 이상 지연될 경우 최초 요청이 브라우저 타임아웃에 걸릴 수 있습니다. (서버 측 `proxy_read_timeout 120s` 설정 권장 및 클라이언트 폴링 202 복구 로직이 구현되어 있으나 실환경 체감 속도 모니터링 필요).
2. **모바일 웹뷰 환경에서 sessionStorage pending input:**
   - 모바일에서 외부 결제창 리다이렉트 후 복귀 시 사파리 시크릿 브라우징 환경에서 `sessionStorage` 접근이 차단되거나 유실될 수 있습니다. (비로그인 시 로그인 유도 가드가 동작하므로 세션 유지는 보장되나, 게스트 폼 입력 복원 시 테스트 필요).
3. **인명용 한자 추가 개정 가능성:**
   - 대법원규칙 제3220호(2025-07-19) 기준으로 9,460자가 구축되어 있으나, 향후 법원행정처의 인명용 한자 추가 고시가 있을 경우 정기적으로 빌드 스크립트(`scripts/naming/build-name-hanja.ts`)를 재실행하여 동기화할 수 있도록 파이프라인을 유지해야 합니다.
