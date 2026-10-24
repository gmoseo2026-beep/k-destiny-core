# REVIEW_HANDOFF — P-016-2 (무료 결과 + 대화형 입력 + 홈 세로 3:4 표지 4종)

> **작성 일시**: 2026-10-24
> **범위**: `docs/uiux/decisions/P-016.md` §P-016-2 (무료 궁합 결과 5개 항목 + 대화형 입력 4단계) 및 §P-016-5 선행 표지 4장(`public/covers/`)
> **검증 상태**: `tsc --noEmit` 0 errors · 변경 파일 `eslint` 0 errors · `vitest` 69파일 521개 통과(1 skip) · `npm run build` exit 0
> **DB 변경 (SQL)**: 없음 (P-016-2는 스키마 변경 없음)

## 1. 변경 파일과 이유

| 파일 | 이유 |
|---|---|
| `lib/compatPercentile.ts` (신규) | 점수 분포(전체 1,177쌍, 중앙값 86, 상위 30%=90, 상위 25%=91, 상위 10%=94) 기준 결정론 함수 `getCompatTopPercent` · `formatCompatTopPercentBadge` 구현. **상위 30% 이내(`score >= 90`)일 때만** `"상위 N% 궁합"` 반환 |
| `lib/compatCuriosity.ts` (신규) | 대화형 입력 4단계 `"지금 제일 궁금한 것"` 4개 선택지(`그 사람 마음` / `다시 만날 수 있을지` / `오래 갈지` / `다툼 이유`) 및 AI 말투 힌트 결합 함수 `appendCuriosityToneGuide` |
| `lib/compatFreeText.ts` | 무료 요약 마지막 문장을 중간에서 끊고 `"…그런데 그 사람은…"`으로 이어지게 자르는 `cutCompatFreeEnding` 추가 (기존 `parseCompatFreeText` 동작 불변) |
| `lib/teaserBlurCopy.ts` | 잠긴 영역 핵심 단어 서버/공통 마스킹 함수 `maskKeyWordForPreview`(`●●●`) 및 상품별 잠긴 문장 2줄 `getTeaserMaskedLines` 추가 |
| `lib/reports/teaser.ts` | `clipTeaserForView`에서 잠긴 섹션 `hooks`의 핵심 단어를 서버에서 `●●●`로 가려 클라이언트로 전달(원문 단어 브라우저 미전송) |
| `lib/reports/standardSamplePreview.ts` | `loadStandardSamplePreview`에서 잠긴 섹션 첫 문장의 핵심 단어를 서버에서 `●●●`로 마스킹한 뒤 전달 |
| `components/report/TeaserUnlockPanel.tsx` | 잠긴 부분 핵심 단어를 `●●●`로 가린 문장 2줄 노출 |
| `components/CompatResultClient.tsx` | ① `"속마음 ??? · 표현 방식 ??? · 다툼 회복 ???"` 잠긴 점수 칸 3개 카드(`nextReadingHref` 연결 + `locked_card_click` 이벤트) ② 무료 요약 마지막 문장 끊기(`cutCompatFreeEnding`) + 바로 아래 미리보기 버튼 ③ 상위 30% 이내일 때만 `"상위 N% 궁합"` 배지 표시 ④ 점수 공개 전 `"분석 끝! 눌러서 확인하기"`(콩이·닥이 하트) 클릭 시 카운트업 연출 + `score_reveal_click` 이벤트 |
| `components/CompatNewClient.tsx` | 한 화면에 질문 하나씩(`1. 나` → `2. 상대` → `3. 관계` → `4. 지금 제일 궁금한 것` 1개 선택) 대화형 4단계 입력 + 생일 칸 아래 `"생일은 암호화돼 저장돼요"` 문구 + 단계별 GA4 이벤트(`compat_step_next`, `compat_curiosity_select`). `compat_created` · `teaser_created` 발사 시점은 기존과 100% 동일하게 유지 |
| `app/api/generate-compat/route.ts` | 한국어 무료 궁합 AI 해석 생성 시 선택된 `curiosity`를 `appendCuriosityToneGuide`로 말투 가이드에만 반영(결정론 점수·키워드 무영향, `buildCompatPrompt` 시그니처·원문 불변) |
| `tests/compatPercentile.test.ts` (신규) | `getCompatTopPercent` · `formatCompatTopPercentBadge`(동일 입력=동일 출력, 경계값 89 vs 90, 중앙값 86 미노출, 91=25%, 94=10%, 단조성), `cutCompatFreeEnding`, `maskKeyWordForPreview`, `appendCuriosityToneGuide` 단위 테스트 13건 |
| `public/covers/cover_love_single.{png,webp}` 외 3종 (신규) | P-016-5 홈 포스터 슬라이드용 세로 3:4 표지 4장(`cover_love_single`, `cover_reunion`, `cover_inner_mind`, `cover_2027`) 생성 및 `.png`·`.webp` 저장 |

## 2. 결정론 로직 요약
- `lib/saju.ts`, `lib/trueSolarTime.ts`, `lib/compatibility.ts` 수정 없음.
- `lib/compatPercentile.ts`: 오직 `score` 숫자 하나만으로 상위 퍼센트를 계산하는 순수 결정론 함수. `score < 90`(상위 30% 밖)이면 `null`을 반환해 화면에 표시하지 않음.
- 대화형 입력 4단계의 `"지금 제일 궁금한 것"` 선택값은 `sessionStorage`를 통해 `/api/generate-compat`의 `toneGuide` 문장 톤에만 반영되며, `/api/compat`의 점수·키워드 계산에는 일절 관여하지 않음.

## 3. 보안 · PII · 결제 · 이벤트 변경점
- 잠긴 영역의 핵심 단어 마스킹(`●●●`)은 서버(`loadStandardSamplePreview`, `clipTeaserForView`)에서 수행된 후 클라이언트로 전달되어 브라우저 네트워크 응답에 원문 단어가 노출되지 않음.
- `compat_created` 및 `teaser_created` 이벤트는 기존과 동일하게 `/api/compat` 및 `/api/reports/generate` 응답 직후에 발사됨(`score_reveal_click` 클릭 여부와 무관).
- 추가된 GA4 이벤트: `locked_card_click`, `score_reveal_click`, `compat_step_next`, `compat_curiosity_select`.

---

# REVIEW_HANDOFF — 결제 전환 개편 0단계(누수 막기) + 1단계(무료=질문, 유료=답)

> **작성 일시**: 2026-10-03
> **배경**: 하루 40~50건 궁합이 만들어지는데 결제는 0~2건. 무료 결과가 이미 답을 다 줘서 궁금할 게 남지 않았고(무료 궁합 = 점수+키워드+케미 해설 전문+갈등 1개+팁), 총운·세트·프리미엄은 결제 전에 로그인을 강제했다. 사장님 결정: 가격 인하 없음, 포지셔닝은 연애·관계 유지, 무료 궁합 축소 승인, 로그인 강제 해제 승인, 간편결제(카카오페이·네이버페이·삼성페이) 표기.
> **검증 상태**: `vitest` 323 통과(40 skip) · `tsc --noEmit` 0 errors · `next build` exit 0 · 변경 파일 lint: 새 오류 0(기존 deep-report `any` 3건은 이번 변경 전부터 있음)

---

## 1. 변경 파일과 목적

### 0단계 — 누수 막기
| 파일 | 목적 |
|---|---|
| `lib/catalog.ts` | `requiresLogin: true` 8건 제거(총운 2·세트 3·프리미엄 3). 약한 hook 3개를 질문형으로(2027 신년운·건강운·2027 대운) |
| `app/api/fortune/annual/route.ts` | **비회원 전체 총운 경로 신설**: 비회원이 `orderId` 를 내면 `orderGrants` 로 권한 확인 → 전체 총운 생성 → `GeneratedReport`(cacheKey `FULL:<order.id>:annual_YYYY`, userId null)에 보관. 202(생성 중)/409(반복 실패) 처리. 미리보기 무료 본문 앞 절반만(`clipAnnualFree`). 예언형 기본 문구 4개 교체 |
| `app/[locale]/fortune/annual/AnnualFortuneClient.tsx` | 로그인 알림·이동 제거. 이 기기의 결제 토큰(총운 단품 또는 총운이 든 세트)+입력값으로 결제 후 자동으로 전체 총운 열기. 입력값이 없으면 폼 → 제출 시 전체 총운 |
| `components/FortuneNewClient.tsx` | 로그인 강제 블록 제거(세트 추천 클릭도 결제 모달로) |
| `components/premium/PremiumNewClient.tsx` | 프리미엄 로그인 강제 제거(열람은 기존 주문번호 토큰 경로 `report/new`) |
| `app/api/og/card/route.tsx` (신규) | 공유 카드 이미지: 홈 = "그 사람, 지금 나를 어떻게 생각할까?", 상품 = 상품 hook(질문). 숨김 상품은 홈 카드 |
| `lib/seo.ts` | `productShareMeta()`, `OG_CARD_URL`(v=2). 홈 제목·설명을 새 포지셔닝으로, 기본 공유 이미지를 동적 카드로 |
| `app/[locale]/products/[id]/page.tsx`, `compat/new`, `fortune/new`, `premium/[id]/new` | 상품별 og:title·og:url·og:image. 예전에는 모든 상품 링크가 홈 카드에 og:url=/ko 였다 |
| `app/[locale]/page.tsx` | 홈 `<title>`·description 새 포지셔닝 |
| `components/GuestCheckoutModal.tsx` | 카카오페이·네이버페이·삼성페이·카드 배지 + "다음 화면에서 골라요". 이니시스 카드창에 간편결제가 이미 있으나(`noeasypay` 미설정) 손님이 결제창을 열기 전엔 몰랐다 |
| `lib/useSeenOnce.ts` (신규), `TeaserUnlockPanel`, `CompatResultClient`, `lib/gtag.ts` | `view_paywall` 을 "결제 안내가 화면에 50% 이상 보인 순간 1회"로 통일. 렌더 시점·클릭·모달 열림에서 중복 발사하던 5곳 제거(모달 열림은 `checkout_open`) |

### 1단계 — 무료/유료 경계 재설계
| 파일 | 목적 |
|---|---|
| `lib/compatFreeText.ts` (신규) | 무료 궁합 형식 `[맞히는 장면]`×2 + `[아직 말하지 않은 것]`×1 파서. 예전 저장본은 첫 문단만(갈등·팁 = 답은 숨김) |
| `lib/destinyGen.ts` | 무료 궁합 프롬프트 재작성(장면 2 + 답을 가린 질문 1, 조언·결론·판정 금지, 해요체). 유료 심층 궁합에 `PROMISED ANSWERS`: cautions[0]=먼저 서운함을 삼키는 쪽 지목, 무료가 열어 둔 질문에 coreDynamic 첫 두 문장에서 답 |
| `app/api/compat/deep-report/route.ts` | 저장된 무료 해석에서 열린 질문을 꺼내 유료 프롬프트에 전달 |
| `components/CompatResultClient.tsx` | 무료 = 장면 2 + "두 사람이 아직 말하지 않은 것" 카드(답 보기 버튼). 잠금 목록을 이름이 들어간 구체적 질문 4개로("먼저 서운함을 삼키는 쪽은 ●●●" 등). 이름 비우면 당신/그 사람 |
| `lib/prompts/productSpecs.ts` | 미리보기에 `unsaid`(답을 가린 질문) 추가, hooks 2개 이상 `●●` 빈칸. 전체 리포트에 `promisedRules`(미리보기의 hooks·unsaid 에 해당 섹션에서 답하라) |
| `lib/reports/standard.ts`, `lib/reports/teaser.ts` | `StandardTeaser.unsaid?`. 검증기: unsaid 필수 + 무료 본문 되풀이 금지 |
| `app/api/reports/generate/route.ts` | FULL 생성 시 같은 사람의 TEASER 저장본을 찾아 약속(hooks·unsaid)을 프롬프트에 전달(못 찾으면 그냥 생성) |
| `components/report/StandardReportView.tsx` | "아직 모르는 것 하나" 카드 + 답 보기. 흐림 자리 문구 교체 |
| `components/FortuneNewClient.tsx` | 총운 미리보기: 서버가 만들던 영역별 hook·"●월" 티저를 이제 보여 줌(전엔 버려짐) + TeaserUnlockPanel |
| `components/product/StandardProductDetail.tsx`, `components/home/HomeExplore.tsx` | 상품 상세 h1·홈 추천 카드에서 질문(hook)을 크게, 상품 이름은 작은 라벨 |

### 테스트
- 신규 `tests/compatFreeText.test.ts`(4), `tests/routes/annualGuest.test.ts`(6: 없는 주문 403·미결제 402·다른 상품 주문 403·결제 총운 200·세트 주문 200·주문번호 없으면 미리보기+절반)
- 수정 `tests/catalog.test.ts`(로그인 강제 상품 없음), `tests/routes/paymentsOrder.test.ts`(총운 비회원 주문 200), `tests/standardReport.test.ts`(unsaid 검증)

## 2. 결정론 로직
점수·키워드 계산은 손대지 않았다(`lib/saju.ts`, `lib/trueSolarTime.ts`, `lib/compatibility.ts` 무변경). 비회원 전체 총운의 yearScore 도 AI 값을 버리고 `calculateAnnualYearScore` 로 덮는다(테스트로 확인).

## 3. 보안·PII·결제 변경점
- **권한 판정은 기존 규칙 그대로**: 비회원 총운은 표준 상품과 같은 `orderGrants`(추측 불가 orderId = 소유 증명, PAID, 상품/세트 일치, 만료). 권한 확인 전에는 AI 호출 0회(테스트).
- 비회원 전체 총운은 생년월일 원본을 저장하지 않는다(`subjectHash` 만, 테스트로 원본 미포함 확인). 입력값은 기존처럼 같은 탭 sessionStorage.
- 결제 금액·PG 호출 방식 변경 없음. 간편결제는 표기만(결제수단 파라미터 그대로 CARD).
- 시크릿 하드코딩 없음.

## 4. 스스로 의심하는 지점
1. **비회원 총운 결제 후 다른 기기·탭**: 결제 토큰과 입력값이 그 기기에만 있다. 다른 기기에선 열람 불가(표준 상품과 같은 한계). 결제 완료 화면의 "가입하고 보관" 안내에 의존.
2. **비회원이 결제 후 다른 생년월일을 입력**하면 첫 생성본(주문 단위 보관)이 계속 나온다 — 한 주문으로 여러 사람 보기 방지라 의도된 동작이지만 오타 입력 시 문의가 올 수 있다.
3. **미리보기 검증기가 unsaid 를 필수로 요구** → 모델이 빠뜨리면 재시도 비용. 실측 3건 모두 정상 생성.
4. 예전에 저장된 미리보기·무료 궁합(구형식)은 새 카드 없이 보인다(무료 궁합은 갈등·팁을 숨김 처리).
5. 실제 PG 결제(이니시스 PC 팝업)는 자동화 브라우저가 팝업을 막아 끝까지 확인하지 못했다. 비회원 총운 결제→열람은 route 테스트로만 검증.
6. `FortuneNewClient` 가 `lib/prompts/productSpecs`(프롬프트 원문)를 클라이언트로 가져온다 — 이번 변경 전부터. 프롬프트 노출 우려로 별도 정리 권장.
7. 테스트 중 운영 DB에 PENDING 주문 1건(4,900원, test@example.com)과 테스트 궁합·미리보기 몇 건이 생겼다(로컬 dev 가 운영 DB 사용).

## 5. 측정
`view_paywall`(보임) → `click_unlock_teaser`/`click_unsaid`/`click_unlock_single` → `checkout_open` → `checkout_submit` → `begin_checkout` → `purchase_confirmed`. 로컬에서 `view_paywall → click_unlock_teaser → checkout_open` 순서·1회 발사 확인. 배포 후 1주 이전/이후 비교(트래픽이 작아 A/B 불가).

---

# 추가(2026-10-03 오후) — 결제한 비회원이 다시 들어오는 길

> **계기**: 사장님이 비회원으로 2026 총운을 결제·열람·환불. 12:48 전체 열람 → 12:49 상품 화면으로 재진입(`/fortune/new?productId=annual_2026`) → 미리보기와 결제 안내만 나옴(접속 기록으로 확인). 총운 전체 화면에 링크 복사·가입 저장도 없었음.
> **검증**: `vitest` 337 통과 · `tsc` 0 errors · `next build` exit 0 · 로컬 프로덕션 빌드에서 화면 흐름 확인(결제는 불가해 서버 응답만 대체) + 환불·만료 경로는 실제 서버 응답으로 확인

## 원인(전 상품 공통)
1. 상품·입력 화면이 이 기기의 결제 증명(localStorage `kongdak_order_*`)을 보지 않았다 → 재진입 시 미리보기·결제 안내.
2. 총운 전체 화면에 보관 안내 없음, 일반·프리미엄 리포트 화면에 가입 저장 없음. 결제를 계정에 묶는 버튼은 대시보드·궁합 화면에만.
3. 이미 만든 리포트도 입력값(sessionStorage)이 없으면 생년월일을 다시 요구.
4. 환불·만료 뒤 기기에 남은 결제 증명이 정리되지 않아 오류 화면.

## 변경
| 파일 | 내용 |
|---|---|
| `lib/payments/deviceOrders.ts` (신규) | 기기의 결제 내역 읽기(`parseOrderTokenKey`·`ownedOrdersFor`·`deviceOrderHref`), 서버 확인 후 무효 토큰 정리(`listValidDeviceOrders`·`forgetDeviceOrder`) |
| `app/api/payments/owned/route.ts` (신규) | 제시한 orderId 중 지금 유효한 것(PAID + 만료 전 권한)만 반환. 30개 제한. 모르는 주문 정보는 안 나감 |
| `components/OwnedReportNotice.tsx` (신규) | "이미 결제한 리포트예요 → 다시 보기". 상품 상세(표준·프리미엄), 운세·궁합 입력 화면, 홈(비회원), `/me`(비회원)에 배치 |
| `components/GuestKeepBanner.tsx` (신규) | 비회원: 링크 복사 + 가입하고 저장 / 로그인 + 묶을 결제 있음: [이 계정에 저장하기](누를 때만, M-8 유지). 총운·일반·프리미엄 리포트 화면에 배치 |
| `app/api/fortune/annual/route.ts` | 비회원: 권한 확인을 입력 검증 앞으로, 저장본이 있으면 생년월일 없이 반환(`NEED_INPUT`·`NOT_PAID`·`NO_ACCESS` code). 회원: 비회원 때 결제해 계정에 연동한 주문의 저장본을 프로필 없이도 그대로 반환. `firstViewedAt` 기록 |
| `app/api/reports/generate/route.ts` | FULL: 주문 권한 확인 직후 저장본(`FULL:<order.id>:<catalogId>`)이 READY 면 입력 없이 반환 |
| `AnnualFortuneClient.tsx` | 결제 증명만으로 자동 열기, 환불·만료면 증명 정리 후 안내, 결제 확인 안내, 보관 배너, 결제한 총운에선 "다른 생년월일로 다시 보기" 숨김, 한자 표기(丙午年) 제거 |
| `components/report/ReportNewClient.tsx` | 입력값이 없어도 먼저 시도(저장본 열기), 400 이면 입력 폼, 402·403 이면 증명 정리 + 안내 |
| `pay/complete`, `CompatResultClient`, `MeClient` | "링크만 있으면 다른 기기에서도 볼 수 있다"는 식의 틀린 안내 수정(링크는 같은 브라우저에서만, 다른 기기는 가입 저장). "평생·영구" 표현 제거(열람 90일/365일) |

## 보안·PII
- 열람 판정은 그대로 서버(`orderGrants`). 새 API 는 **제시한** orderId 의 유효 여부만 답한다.
- 입력 없이 저장본을 주는 경로도 주문 권한 확인 뒤에만 탄다(테스트: 없는 주문 403, 환불 402, AI 호출 0).
- 계정 연동은 여전히 httpOnly `kd_claim` 쿠키 + 사용자 클릭.

## 의심 지점
1. 실제 결제 → 재진입 → 저장본 열기를 운영에서 끝까지 해 보지 못했다(유효한 테스트 주문이 없음). 서버는 route 테스트, 화면은 응답 대체로 확인.
2. `kd_claim` 쿠키는 가장 최근 결제 1건만 가리킨다 → 비회원이 여러 건 결제 후 가입하면 최근 1건만 [이 계정에 저장하기]로 묶인다(나머지는 그 기기에서만).
3. 궁합 상품은 같은 두 사람이라도 궁합을 새로 만들면 다른 궁합 id 가 된다 → "이미 결제한 리포트" 안내로만 이어진다(입력을 새로 하면 새 미리보기).

---

# 추가(2026-10-03 밤) — 결제 모달 간소화

> **근거(GA4 7일)**: 결제 안내를 본 80명 → 결제 모달 24명(30%) → 결제창(PG) 8명(33%) → 결제 7명. 10/2~10/3 은 모달을 연 15명 중 결제하기를 누른 사람이 4명(사장님 테스트 2건 포함). 가장 큰 구멍이 모달이었다.
> **사장님 승인**: 모바일 이메일 필수 해제, 동의 체크박스 → 버튼 아래 고지.
> **검증**: `vitest` 341 통과 · `tsc` 0 · `next build` exit 0 · 로컬(테스트 채널, 모바일 화면)에서 입력 칸 0개 → 결제하기 → 이니시스 모바일 결제창(카카오페이·네이버페이 노출) 도달 확인

| 파일 | 내용 |
|---|---|
| `components/GuestCheckoutModal.tsx` | 모바일: 입력 칸 없음(이름은 앞에서 넣은 값 또는 "콩닥 고객"), 하단 시트 + 스크롤, 체크박스 대신 고지 문구, `checkout_close {reason, seconds, typed, inapp}` 측정. PC: 이니시스 필수값 3칸 유지 |
| `app/api/payments/order/route.ts`, `lib/payments/client.ts` | 비회원 이메일 선택(보내면 형식 검사). PG 호출에 빈 이메일을 넣지 않음 |
| `app/api/payments/contact/route.ts` (신규) | 결제 후 이메일 남기기: orderId 소지자만, 이메일이 없는 주문에 1회만 기록, 응답·로그에 이메일 없음 |
| `app/api/payments/complete/route.ts`, `pay/complete/page.tsx` | `needsEmail` → 결제 완료 화면에 "영수증·문의용 이메일(선택)" |
| `messages/ko.json` | 약관 제9조 8항: "필수 동의 항목으로 고지" → "결제 버튼과 함께 고지하며 결제를 진행하면 동의", 개정일 추가 |
| `docs/ops/nginx-000-default-deny.conf` | 서버에 적용한 nginx 기본 차단 블록 사본(모르는 Host 는 444 / TLS 거절). aba-love.com 이 이 서버 IP 를 가리키던 문제 |

## 의심 지점
1. 이메일 없는 비회원 주문은 문의 시 주문번호나 결제 시각으로 찾아야 한다(결제 완료 화면에서 이메일을 남기지 않은 경우).
2. PC 흐름(팝업)은 결제 완료 화면을 거치지 않는다 — PC 는 이메일을 모달에서 받으므로 영향 없음.
3. 체크박스 없는 고지 방식의 법적 판단은 사장님 결정 사항(약관 문구는 맞춰 둠).
4. 모달 이탈 원인은 `checkout_close` 가 며칠 쌓여야 숫자로 확인된다.

---

# 추가(2026-10-04) — 구매자 오류 수정, 측정 정리, 가입 유도

> **근거**: 10/4 11:19 회원이 "이 사람 세트" 12,900원 결제(가입 3분 뒤). 9/29 이후 결제 4건 모두 가입 후 1~5분 안의 회원. 이틀 유입은 인스타 유료 광고 78 · 스레드 27(전부 홈 `/ko` 착지). 무료 한도 도달 9명.
> **검증**: `vitest` 348 통과 · `tsc` 0 · `next build` exit 0 · 로컬 빌드에서 한도 화면·로그인 복귀 주소·GA 차단 확인 · 운영 배포 VERIFIED(c8afde0, 68d72b8, a5303ba)

| 구분 | 파일 | 내용 |
|---|---|---|
| 버그 | `app/api/reports/mine/route.ts`, `components/MeClient.tsx`, `components/report/ReportNewClient.tsx`, `app/api/reports/generate/route.ts` | 보관함의 정통 궁합이 [리포트 만들기]로 떠서 500(`missing spec for compat_basic`) — 구매자가 6번 겪음. `COMPAT_ROUTE` 로 궁합 결과 화면에 연결, 생성 API 는 400 안내 |
| 버그 | `app/[locale]/login/page.tsx` | `?callbackUrl=` 을 무시하고 항상 대시보드로 보내던 문제. 같은 사이트 경로(`/`로 시작, `//`·역슬래시 불가)만 허용해 복귀 |
| 화면 | `app/[locale]/pay/complete/page.tsx` | 회원에게는 "가입하고 보관" 대신 "내 보관함", 비회원 보관 안내는 비회원에게만 |
| 측정 | `lib/payments/client.ts`, `pay/complete`, `app/api/payments/complete/route.ts` | 모바일 결제도 GA4 `purchase` 전송. `transaction_id` 는 주문번호(열람 증명) 대신 영수증 id(`order.id`) |
| 측정 | `components/Analytics.tsx` | localhost·`/admin` 은 `ga-disable` 로 전송 차단 |
| 측정 | `lib/inAppBrowser.ts`, `prisma/schema.prisma`(Order.clientEnv, nullable 추가), `app/api/payments/order/route.ts`, `GuestCheckoutModal` | 접속 환경 라벨(`threads:m` 등)을 결제 이벤트와 주문에 기록. 스레드 UA("Barcelona") 인식 |
| 전환 | `lib/previewLimit.ts`, `app/api/reports/generate/route.ts`, `PreviewLimitPanel`, `FortuneNewClient`, `CompatNewClient` | 무료 미리보기: 비회원 3 · 회원 6. 한도에 닿은 비회원에게 "가입하면 N개 더" → 가입 후 같은 상품 미리보기로 복귀(운세 `auto=1`, 궁합 `from=`) |
| 외부 설정 | GA4(Google 태그) | 원치 않는 추천: accounts.google.com, kauth.kakao.com, accounts.kakao.com, nid.naver.com, inicis.com |

## 의심 지점
1. 가입 유도의 효과는 미확인 — "가입자가 결제한다"는 상관이지 인과가 아니다. `preview_limit_view{signup_offer}` → `preview_limit_signup_click` → 가입 → 결제로 확인.
2. 한도는 기기(쿠키) 기준. 인앱에서 외부 브라우저로 넘어가 가입하면 쿠키·입력값이 따라오지 않는다.
3. `clientEnv` 는 클라이언트가 보낸 값(형식만 검사). 판정에는 쓰지 않고 분석용.
4. 청약철회 고지는 체크박스 없이 버튼 아래 고지 유지(사장님 결정 10/4).
5. 메타 픽셀은 보류(광고를 소액·7일만 운영 예정).

---

# 추가(2026-10-05) — 결제 실패 복귀, 로그인 중복 콜백, 카카오페이 바로가기

> **근거(10/4~10/5)**: 모달을 연 14명 중 11명이 닫음(입력 칸을 없앤 뒤에도 비율 그대로). 비회원 결제창 이탈 2건 — 잔액부족(가입 후 재결제 성공), 스레드 인앱에서 이니시스 결제창 미복귀. 가입 유도 흐름은 운영에서 1회 끝까지 동작 확인.
> **검증**: `vitest` 348 · `tsc` 0 · build exit 0 · 배포 VERIFIED(d9df37a, 56d4ed5). 카카오페이 바로가기는 로컬 테스트 채널과 **운영 채널** 모두에서 카카오페이 결제 화면으로 직행 확인(결제는 하지 않음)

| 파일 | 내용 |
|---|---|
| `components/GuestCheckoutModal.tsx`, `lib/payments/client.ts` | 모바일: [카카오페이로 결제](EASY_PAY + easyPayProvider KAKAOPAY) + [카드·네이버페이·삼성페이로 결제](기존 창). `method` 를 checkout_submit·begin_checkout·payment_failed 에 기록. 닫은 이유는 이벤트 이름으로도(`checkout_close_x/cancel/backdrop/fast`) |
| `lib/payments/client.ts`, `app/[locale]/pay/complete/page.tsx` | 결제 실패·취소 복귀 화면에 [다시 결제하러 가기](결제를 시작한 화면, 미리보기 자동 복원 `auto`·`from`) |
| `app/[locale]/login/page.tsx` | 이미 로그인된 상태면 callbackUrl 로 즉시 이동, 같은 사이트의 절대 callbackUrl 허용, 로그인 화면으로의 복귀 금지 |

## 의심 지점
1. PC 는 카카오페이 바로가기가 없다(이니시스 PC 필수값·팝업 방식이라 확인 불가).
2. 네이버페이·삼성페이 직접 호출은 넣지 않았다(같은 방식으로 가능, 수요를 보고 결정).
3. 테스트로 운영 DB 에 PENDING 주문 몇 건(재물운 4,900원, 비회원)이 생겼다.

---

# 추가(2026-10-05) — 검색용 페이지(띠 궁합 78쌍 · 출생연도별 2027 운세 48개)

> **근거**: 유입이 유료 인스타·스레드뿐이고 검색 유입이 사실상 0(이틀간 구글 수집 13회·네이버 5회, 사이트맵 31개 주소). 광고비 없이 유입을 늘릴 길은 검색뿐이라, "쥐띠 소띠 궁합"·"95년생 2027년 운세" 같은 긴 검색어를 받을 페이지를 만들었다.
> **검증**: `vitest` 362 통과(신규 14) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 상세·모아보기·뒤집힌 주소 308·없는 주소 404·사이트맵 159개·공유 카드·`seo_cta_click` 발사 확인.

| 파일 | 내용 |
|---|---|
| `lib/seo/zodiac.ts` | 결정론. 띠 관계는 `lib/compatibility.ts` 의 표를 **읽기만** 한다(엔진 수정 없음). 관계 유형별 고정 점수(단짝 92 · 한 팀 88 · 닮은꼴 78 · 무난 74 · 서운 62 · 날 선 56 · 정반대 50), 쌍 주소 정본화, 출생연도 → 띠·색·2027년 나이·그 해와의 관계·삼재 단계 |
| `lib/seo/content.ts`, `scripts/seo/generateContent.ts` | 본문 형식·검사기와 생성 스크립트. AI 는 위 사실을 받아 **문장만** 쓴다. 한자·전문용어·단정적 예언이 섞이면 버리고 다시 생성. 결과는 `data/seo/*.json` 에 저장(런타임 AI 호출 없음) |
| `data/seo/zodiac-pairs.json`, `data/seo/fortune-2027.json` | 저장된 본문 78 + 48 |
| `app/[locale]/zodiac/*`, `app/[locale]/fortune/2027/*` | 모아보기 2개 + 상세 2종. 제목·설명·canonical·공유 카드·FAQ/경로 구조화 데이터. 뒤집힌 쌍 주소(ox-rat)는 정본(rat-ox)으로 308 |
| `components/seo/*` | 본문 조각(서버) + CTA 버튼(클라이언트, `seo_cta_click {page, target}`) |
| `app/api/og/card/route.tsx` | `?z=<띠 쌍>`, `?y=<출생연도>` 카드. 자유 문장은 받지 않는다 |
| `app/sitemap.ts`, `components/Footer.tsx` | 사이트맵 31 → 159개. 모든 화면 하단에 [띠 궁합] [2027년 운세] 링크 |
| `tests/seoZodiac.test.ts`, `tests/seoContent.test.ts` | 결정론(순서 무관·경계 연도) + 저장된 글 전체가 규칙을 지키는지 |

## 결정론 요약
- 띠 궁합 점수 = 두 띠의 관계 유형 하나로 정해지는 고정값(같은 입력 = 같은 점수). 화면에 "띠 기준 궁합"이라고 밝히고, 실제 궁합(생년월일)은 다를 수 있다고 안내해 무료 궁합으로 보낸다.
- 출생연도 페이지는 점수를 보여 주지 않는다. 띠·나이·그 해와의 관계 문구만 계산값이다.

## 보안/PII/결제
- 개인정보를 받지 않는 공개 페이지다. 결제·DB 변경 없음. 생성 스크립트는 `.env` 의 기존 키를 읽기만 한다(커밋 없음).

## 의심 지점
1. **본문은 AI 가 쓴 글이다.** 형식·금칙어는 전수 검사했지만 내용의 질은 표본만 읽었다. "삼재"는 해당 띠(돼지·토끼·양)의 글에서만 쓴다(흔히 쓰는 말이라 허용, 겁주지 않는 문장으로).
2. 띠만으로 본 점수가 실제 궁합 점수와 다르게 나올 수 있다(예: 띠 50점인데 실제 80점). 화면에서 "큰 틀"이라고 밝혔다.
3. 띠는 입춘에 바뀌므로 1~2월 초 출생은 앞 해 띠일 수 있다 — 출생연도 페이지 하단에 고지.
4. 검색 노출은 수 주가 걸리고 보장되지 않는다. 126개가 한꺼번에 생겨 "얇은 글"로 보일 위험을 줄이려고 쌍·나이대마다 내용을 다르게 썼다.
5. 2028년이 되면 `FORTUNE_TARGET_YEAR` 와 폴더 이름(2027)을 새로 만들어야 한다(지금은 고정).

## 검색엔진 등록(2026-10-05, 배포 addc2c9 · 6c5fd34 VERIFIED)
- **구글 서치 콘솔**(도메인 속성 kongdak.kr): 사이트맵 재제출(이전에는 6개 주소만 읽힌 상태) + 색인 생성 요청 8건(홈, 궁합 입력, 모아보기 2개, 상세 4개).
- **네이버·빙**: `scripts/seo/indexnow.ts` 로 사이트맵의 159개 주소 통보(네이버 200, 빙 202). 열쇠 파일은 `public/<열쇠>.txt` — 규약상 공개하는 값이라 비밀이 아니다.
- 새 페이지를 만들거나 크게 고치면 배포 후 `npx tsx scripts/seo/indexnow.ts` 를 다시 실행한다.
- 미완: 네이버 서치어드바이저 화면(사이트맵 제출 확인)은 자동화 브라우저에서 접근이 막혀 직접 확인하지 못했다.

---

# 추가(2026-10-05) — 제휴 배너 전용 주소, 이어보기 카드, 선택 수신 동의

> **근거**: (1) 커플다이어리 앱(플레이스토어 10만+)에 배너를 무료로 싣기로 함 — 효과를 숫자로 봐야 협업 여부를 정할 수 있다. (2) 회원 22명 중 구매 6명 전원이 가입 후 10분 안에 결제, 나중에 돌아와 산 사람 0명. 미구매 15명에게는 수신 동의가 없어 홍보 연락을 할 수 없다.
> **검증**: `vitest` 379 통과(신규 17) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 가입(선택 동의 체크) → 동의 저장·`marketing_optin` → 보관함 스위치로 철회·`marketing_optout` → 미리보기 생성 → 홈·보관함 이어보기 카드·`resume_card_view/click` → 전용 주소 302·쿠키·클릭 집계 → 관리자 집계 화면까지 확인. 테스트 계정과 테스트 클릭은 삭제했다.

| 파일 | 내용 |
|---|---|
| `lib/campaignLinks.ts`, `app/[locale]/go/[code]/route.ts` | `/ko/go/cd1~cd4` → 클릭을 하루 단위로 세고(봇 제외, `SiteCounter` 키 `go:<코드>:<한국 날짜>`) utm 을 붙여 `/ko/compat/new` 로 보낸다. 유입 표시 쿠키 `kd_src`(httpOnly, 30일) |
| `app/api/payments/order/route.ts`, `prisma/schema.prisma` | `Order.campaign`(추가 칸) — 쿠키의 유입 표시를 정해진 형식일 때만 저장. 금액·권한 판정에는 쓰지 않는다 |
| `app/[locale]/admin/campaigns/page.tsx`, `admin/layout.tsx` | 관리자 > 배너 유입: 배너별 오늘·7일·누적 클릭, 결제 시작·완료·금액, 날짜별 클릭 |
| `lib/member/resume.ts`, `app/api/user/resume/route.ts`, `components/member/ResumeCard.tsx` | 미리보기만 보고 결제하지 않은 것(최근 2개)을 회원 홈·보관함에 "이어보기"로. 이미 산 것·그 상품이 든 세트를 산 것·숨긴 상품·60일 지난 것은 제외 |
| `app/api/reports/generate/route.ts` | 비회원 때 만든 미리보기를 가입 후 다시 보면 그 행에 회원을 이어 둔다(주인 없는 행만) |
| `lib/marketingConsent.ts`, `components/MarketingConsentSync.tsx`, `app/api/user/marketing-consent/route.ts`, `components/member/MarketingConsentToggle.tsx`, 로그인 화면 | (선택) 혜택·새 소식 받기 — 기본은 체크 안 됨. 체크하고 1시간 안에 로그인하면 계정에 저장. 보관함 스위치로 언제든 철회. `User.marketingConsent`, `marketingConsentAt`(추가 칸) |
| `messages/ko.json`, `app/[locale]/privacy/page.tsx` | 개인정보 처리방침에 선택 수집 항목·목적·보유 기간, 유입 구분 쿠키 고지 추가(10/5 개정) |

## 보안/PII/결제
- 전용 주소는 IP·기기 정보를 저장하지 않는다(숫자만 올린다). 유입 표시는 `출처:배너` 형식의 짧은 글자뿐.
- 결제 금액·열람 권한 로직은 건드리지 않았다. DB 는 칸 3개 추가만(기존 데이터 변경 없음).
- 수신 동의는 기록만 한다. 실제 발송 기능은 없다 — 보낼 때는 제목에 (광고) 표기와 수신 거부 방법을 넣어야 한다.

## 의심 지점
1. 앱이 배너를 앱 안 화면(웹뷰)으로 열면 결제창(이니시스·카카오페이 앱 전환)이 막힐 수 있다. 실제 기기에서 한 번 눌러 봐야 안다.
2. 클릭 수는 사람이 같은 배너를 여러 번 누르면 그만큼 올라간다(순방문자 수가 아니다). 순방문은 GA4 로 본다.
3. 결제 귀속은 같은 기기·같은 브라우저 30일 기준이다. 앱 안 화면에서 보고 나중에 다른 브라우저로 결제하면 잡히지 않는다.
4. 이어보기는 저장된 내 정보가 없는 회원이면 입력 화면이 그 상품으로 열린다(같은 탭에 방금 넣은 값이 있으면 바로 미리보기).
5. 소셜 로그인 사용자는 체크 칸을 지나치기 쉽다 — 동의율이 낮으면 결제 완료 화면 등 다른 자리를 검토.

## 배너 유입 — 가입·매출 집계 추가(2026-10-06)
> **검증**: `vitest` 388 통과(신규 9) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬에서 전용 주소 클릭 → 가입 → 관리자 화면에 가입 1건 표시 확인(테스트 계정·테스트 클릭 삭제).

| 파일 | 내용 |
|---|---|
| `prisma/schema.prisma` | `User.campaign`(추가 칸) — 배너를 누른 뒤 가입한 회원의 유입 표시 |
| `app/[locale]/go/[code]/route.ts`, `lib/campaignLinks.ts` | 누른 시각 쿠키 `kd_src_t` 추가. `isSignupAfterClick`: 누른 **뒤에** 만든 계정만 가입으로 인정(원래 회원이 배너를 누른 것은 제외) |
| `app/api/user/attribution/route.ts`, `components/CampaignSignupSync.tsx` | 로그인 직후 한 번, 서버가 쿠키를 읽어 계정에 표시를 남긴다(요청 본문은 받지 않음, 이미 표시가 있으면 그대로). GA4 `signup_from_campaign` |
| `lib/campaignStats.ts`, `app/[locale]/admin/campaigns/page.tsx` | 오늘·7일·누적 요약(매출·클릭·가입·결제), 배너별 클릭→가입→결제→매출과 전환율, 날짜별 표. 매출 = 결제 완료(PAID) 합계 — 환불·취소 제외. 배너로 가입한 회원이 다른 기기에서 결제한 주문도 포함 |

**의심 지점**: 가입 귀속은 배너를 누른 그 브라우저에서 가입해야 잡힌다(앱 안 화면에서 누르고 다른 브라우저에서 가입하면 빠진다). 비회원 결제는 가입 수에는 없고 매출에는 들어간다.

---

# 추가(2026-10-06) — 수신 동의 물어보기 카드, 앱 설치 집계, 관리자 "회원·설치"

> **근거**: 회원 25명 중 수신 동의 0명(로그인 화면 체크 칸 도입 후 가입 3명 모두 미체크), 이메일은 12명뿐(카카오 8명 중 0명, 네이버 7명 중 2명). 앱 설치는 기록 장치가 없어 서버 기록으로 "하루 3~4회 실행"만 보였다.
> **검증**: `vitest` 394 통과(신규 6) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬에서 가입 → 홈 카드 표시 → (이메일 없는 회원) 빈 값 오류 → 이메일 입력·동의 저장 → 잘못된 이메일 400 → 설치·실행 집계 → 관리자 화면 표시 확인. 테스트 계정·집계 삭제.

| 파일 | 내용 |
|---|---|
| `components/member/MarketingConsentCard.tsx`, `components/DashboardView.tsx` | 회원 홈에서 한 번 묻는다(아직 정하지 않은 회원만). 받을게요/괜찮아요 중 하나를 고르면 다시 묻지 않는다. 결제 흐름 화면에는 띄우지 않는다 |
| `app/api/user/marketing-consent/route.ts`, `prisma/schema.prisma` | GET 에 `decided`·`hasEmail` 추가. 계정에 이메일이 없는 회원은 동의할 때 소식 받을 이메일을 함께 받는다 → `User.contactEmail`(추가 칸). **로그인용 `email` 에는 쓰지 않는다**(확인되지 않은 주소로 계정이 엮이는 것 방지) |
| `components/PwaTracker.tsx`, `app/api/pwa/event/route.ts`, `lib/pwaStats.ts` | 설치(appinstalled)·설치된 앱 실행(탭 세션당 1회)·처음 연 기기를 하루 단위 숫자로 센다(`SiteCounter` 키 `pwa:<종류>:<한국 날짜>`). 로그인 회원이면 `User.pwaInstalledAt`(추가 칸) |
| `components/InstallPWAButton.tsx` | GA4: `pwa_banner_view`·`pwa_install_click`·`pwa_install_choice`·`pwa_banner_dismiss` |
| `lib/audienceStats.ts`, `app/[locale]/admin/audience/page.tsx`, `admin/layout.tsx` | 관리자 > 회원·설치: 보낼 수 있는 회원(동의+이메일)·가입 경로별 표, 설치한 기기·앱 실행·알림 구독·날짜별 표 |
| `app/robots.ts` | `/api/pwa` 수집 차단 |

## 보안/PII
- `contactEmail` 은 PII — 로그·화면에 내지 않는다(관리자 화면은 개수만). 형식만 검사하고 본인 확인 메일은 보내지 않는다(발송 기능이 아직 없다).
- 설치 집계는 숫자만 올린다. 부풀리기 방지로 같은 IP 는 하루 30회까지(메모리에서만 세고 저장하지 않음).

## 의심 지점
1. 기존 회원 25명 전원에게 다음 방문 때 카드가 한 번 뜬다(사이트 안 안내라 동의 없이 가능).
2. `contactEmail` 은 확인되지 않은 주소다 — 실제 발송 전에 수신 확인 절차를 넣을지 정해야 한다.
3. "설치한 기기"는 기기 저장소 기준이라 앱 데이터를 지우면 다시 세어진다. 집계 시작(10/6) 전에 설치한 기기는 다음 실행 때 잡힌다.
4. 카카오 이메일 동의 항목은 카카오 개발자 콘솔 설정이 필요하다(미완, 사장님 계정).

---

# 추가(2026-10-07) — 메타 픽셀(광고 성과 측정)

> **근거**: 인스타그램 광고가 끝난 10/6 부터 유입이 1/3 로 줄었고(하루 약 69명 → 25명), 지난 광고는 239회 방문에 GA4 기준 결제 1건이었다. 광고를 다시 하기 전에 메타가 "결과를 보고 결제까지 가는 사람"을 학습할 수 있게 사이트 안의 행동을 알린다.
> **검증**: `vitest` 403 통과(신규 9) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 상품 화면 PageView·ViewContent 기록, 결제 복귀 주소의 paymentId 가 가려진 채 기록되는 것 확인(로컬은 기록만, 전송 없음).

| 파일 | 내용 |
|---|---|
| `lib/metaPixel.ts` | 측정 이벤트 → 메타 표준 이벤트(view_item→ViewContent, compat_created·teaser_created→Lead, checkout_open→InitiateCheckout, begin_checkout→AddPaymentInfo, purchase→Purchase+금액+eventID). 주소의 paymentId·orderId·token 등을 보내는 순간에만 가린다(History 원본 함수 사용 — Next 라우터가 모르게) |
| `components/MetaPixel.tsx`, `components/Providers.tsx` | 픽셀 불러오기(운영만), 화면이 바뀔 때 PageView. `autoConfig` 끔(버튼·페이지 정보 자동 수집 안 함), 자동 고급 매칭 미사용. localhost 는 `window.__fbqLog` 에 기록만, 관리자 화면 제외 |
| `lib/gtag.ts` | `trackEvent` 가 메타에도 알린다(GA 가 막혀 있어도) |
| `next.config.ts` | CSP 에 `connect.facebook.net`(script·connect), `www.facebook.com`(img·connect) 허용 |
| `messages/ko.json`, `app/[locale]/privacy/page.tsx` | 개인정보 처리방침 5항에 행태정보 처리·국외 이전(Meta, 미국)·거부 방법 고지(10/7 개정) |

## 보안/PII
- 메타로 가는 값: 화면 주소(민감한 쿼리 제거), 상품 id, 금액, 영수증 번호(중복 제거용 eventID). **생년월일·이름·이메일·궁합 id 는 보내지 않는다**(테스트로 고정).
- 픽셀 ID(2390478744821136)는 공개 값이라 코드 기본값으로 두었다(`NEXT_PUBLIC_META_PIXEL_ID` 로 바꿀 수 있음). 전환 API 토큰은 아직 쓰지 않는다 — 쓸 때는 서버 환경변수로만.

## 의심 지점
1. 궁합 결과 주소(`/ko/compat/<공유 토큰>`)는 PageView 로 메타에 전달된다(공유용 공개 주소라 가리지 않았다).
2. 결제 건수가 적어 "구매" 최적화는 학습이 안 된다 → 처음에는 Lead(결과 봄)나 InitiateCheckout 을 목표로 잡을 것.
3. 서버 전송(전환 API)은 미적용 — 광고 차단·iOS 제한으로 일부 누락이 있을 수 있다.
4. 맞춤형 광고 고지는 방침에 넣었지만 쿠키 동의 배너는 없다(국내 서비스 기준).

## 광고 소재별 전용 주소(2026-10-07, 배포 87938ac VERIFIED)
- `lib/campaignLinks.ts`: 인스타 영상 광고 6개(`ig-b1~3` 속마음 입력 화면, `ig-a1~3` 무료 궁합 입력 화면). `CampaignLink.query` 추가.
- `/ko/go/<코드>` 가 광고 플랫폼의 클릭 표시(`fbclid`·`gclid`·`ttclid` 등 정해진 6종, 형식 검사)를 도착 주소로 넘긴다 — 이전에는 버려져서 픽셀이 광고 클릭을 알아볼 수 없었다. 그 밖의 쿼리는 넘기지 않는다.
- 관리자 화면 이름을 "광고·배너 유입"으로 변경. `vitest` 404 통과.
- 영상 제작 자료는 `SNS/광고영상_2026-10/`(커밋하지 않음): 장면별 프롬프트 가이드, 참조 이미지, 실제 화면 녹화, 마지막 화면·표정 컷.

---

# 추가(2026-10-08) — 검색 기술 점검(claude-seo 기술 점검 기준)과 수정

> **근거**: 운영 사이트를 항목별로 점검(수집·색인·보안·주소·모바일·구조화 데이터·렌더링·IndexNow). 서버 렌더링, HTTPS·보안 헤더, 404 상태 코드, robots, IndexNow 는 정상. 아래는 고친 것.
> **검증**: `vitest` 404 통과 · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 이동(308)·canonical·robots·상품 구조화 데이터·사이트맵 확인.

| 문제 | 수정 |
|---|---|
| canonical 을 선언하지 않은 화면이 레이아웃의 canonical(홈)을 물려받음 — `/fortune/annual`(색인 대상인데 홈의 중복으로 표시), `/pay/complete` 등 | `buildPageMetadata(..., { inherited: true })` — 레이아웃은 canonical 을 물려주지 않는다. 홈은 `app/[locale]/page.tsx` 가 직접 선언 |
| `/pay/complete`·`/onboarding`·`/fortune/weekly` 가 색인 허용 | `NOINDEX_PATHS` 에 추가 + 얇은 레이아웃 |
| 사이트맵에 리다이렉트되는 `/pricing`, 매 요청마다 "지금"으로 찍히는 lastmod, `/fortune/new`·`/fortune/annual` 누락 | `/pricing` 제거, 고정 날짜(`SITE_UPDATED`·`SEO_PAGES_UPDATED`), 두 주소 추가(159 → 160) |
| `www.kongdak.kr` 가 그대로 200(주소 이원화), 루트 `/` → `/ko` 가 임시 이동(307) | `middleware.ts` 에서 둘 다 308 |
| 상품 상세 제목 14자·설명 19자, 상품 구조화 데이터 없음 | `productSearchMeta`(이름 — 설명 | 콩닥 / 질문 + 무료 미리보기 + 가격), `ProductJsonLd`(Product + Offer + BreadcrumbList) |
| 입력 화면 제목이 "상대방 정보 입력"·"내 사주 정보 입력" | `PAGE_META` 의 검색용 제목·설명 사용 |
| `/fortune/annual` 설명의 "병오년" | "붉은 말의 해"로 |

## 의심 지점
1. 루트 `/` 의 308 은 브라우저가 오래 기억한다. 다른 로케일을 다시 깨울 때는 이 이동부터 손봐야 한다.
2. 핵심 웹 지표(LCP 등)는 이번에 측정하지 못했다 — PageSpeed 공개 API 가 하루 한도 초과.
3. 동면 로케일(`/en/...`)은 여전히 200 으로 한국어 화면을 내고 canonical 로만 합친다(삭제 금지 규칙에 따라 유지).

---

# 추가(2026-10-08) — 검색용 페이지 응답 시간(Cloudflare 보관 준비)

> **근거(실측)**: 네이버 수집 현황에서 페이지당 약 1초. 서버가 페이지를 만드는 시간은 0.03~0.07초(서버 안에서 직접 호출), 한국에서 Cloudflare 를 거치면 첫 바이트 0.55~1.1초. 차이는 전부 Cloudflare 중계 서버 ↔ 프랑스 원본 왕복이다. nginx 는 이미 keepalive 620초·TLS 1.3·gzip 이라 서버 쪽에서 더 줄일 것이 거의 없다.
> **검증**: `vitest` 408 통과(신규 `tests/edgeCache.test.ts` 4건) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 헤더 확인.

| 변경 | 파일 | 이유 |
|---|---|---|
| 띠 궁합·출생연도 운세 4개 경로에만 `Cache-Control: public, max-age=0, must-revalidate` + `Cloudflare-CDN-Cache-Control: max-age=86400, stale-while-revalidate=604800` | `lib/seo/edgeCache.ts`, `next.config.ts`(맨 뒤 규칙) | 브라우저는 지금처럼 매번 확인, Cloudflare 만 하루 보관(+7일은 보관본을 내주며 뒤에서 갱신). 이 헤더는 브라우저로 전달되지 않는다 |
| 같은 주소의 화면 전환용 데이터 요청(`rsc` 등 4개 요청 헤더)에는 붙이지 않음 | 같은 파일의 `missing` 조건 | 운영에서 `RSC: 1` 만 붙여도 페이지 주소로 `text/x-component` 가 200 으로 나온다. 이게 보관되면 다음 방문자가 깨진 화면을 본다 |
| `NEXT_LOCALE` 쿠키 끔(`localeCookie: false`) | `i18n/routing.ts` | 읽는 곳이 없고, `Set-Cookie` 가 붙은 응답은 Cloudflare 가 보관하지 않는다 |
| www → 대표 주소 이동을 `host` 헤더로만 판단, 이동 응답에 두 캐시 헤더 모두 `no-store` | `middleware.ts` | 운영에서 `X-Forwarded-Host: www.kongdak.kr` 를 꾸며 보내면 대표 주소에서도 자기 자신으로 308 이 났다(nginx 가 이 헤더를 덮어쓰지 않음). 보관이 켜지면 요청 한 번으로 그 페이지가 무한 이동에 갇힌다 |
| 배포 때 지난 빌드의 `/_next/static` 파일을 14일간 함께 둠(`/root/.kongdak-static-keep`) | `scripts/safe_deploy.py` | 빌드가 `.next` 를 지우므로 보관 중인 HTML·열어 둔 탭이 가리키는 옛 JS·CSS 가 404 가 된다. 실패해도 배포는 계속된다 |

**Cloudflare 캐시 규칙(2026-10-08 17:34 KST 적용, 소유자 요청으로 대시보드에서 생성)** — 이름 `SEO pages edge cache (zodiac, fortune 2027)`. 코드만으로는 속도가 달라지지 않는다(Cloudflare 는 HTML 을 기본으로 보관하지 않는다):
- 조건: 호스트 `kongdak.kr`, 경로가 `/ko/zodiac` 또는 `/ko/fortune/2027` 로 시작, 쿼리 문자열 없음
- 캐시 대상으로 지정 + Edge TTL "원본의 cache-control 헤더가 있으면 따르고 없으면 보관하지 않음"
- 상태 코드 500 이상은 보관하지 않음
- Browser TTL: 원본 헤더를 따름 — 이게 없으면 Cloudflare 기본값이 브라우저용 `max-age=0` 을 4시간으로 바꿔 내보낸다(적용 직후 실제로 확인하고 추가)

**운영 실측(규칙 적용 후, 한국 PC 기준)**: 보관본이 없는 첫 요청 1.0~1.3초(`MISS`) → 이후 0.25~0.29초(`HIT`). `RSC: 1` 요청은 `BYPASS` 로 보관되지 않고, 쿼리가 붙은 주소·홈·입력 화면·상품 화면은 `DYNAMIC` 그대로다.

## 결정론/보안
- 보관 대상 화면은 서버에서 세션·쿠키를 읽지 않는다. 쿠키·언어·기기를 바꿔 보낸 요청의 본문 해시가 같음을 확인했다. 개인 결과 화면(`/compat/...` 등)은 대상이 아니며 `source` 에 `*` 를 쓰지 않았다(테스트로 고정).
- 시크릿 없음. Cloudflare API 토큰을 쓰지 않는 구성이다(배포 때 자동 비우기 없음).

## 의심 지점
1. 방문이 드문 페이지는 보관본이 없는 첫 요청에서 지금과 같은 시간이 걸린다. 보관은 Cloudflare 지점별이라 네이버 수집기가 닿는 지점에 보관본이 있어야 효과가 난다 — 규칙을 켠 뒤 네이버 수집 현황의 다운로드 시간으로 확인할 것.
2. 검색용 페이지 내용(글·메뉴의 상품 목록)을 고치면 최대 하루(+다음 요청 한 번) 늦게 보인다. 급하면 Cloudflare 에서 해당 주소를 비운다.
3. 없는 띠 주소의 404 와 뒤집힌 주소의 308 에도 보관 헤더가 붙는다(내용이 정해져 있어 무해). 500 은 캐시 규칙의 상태 코드 조건으로 막아야 한다.
4. (기존 동작) `Next-Router-Prefetch: 1` 만 붙이고 `RSC` 없이 보낸 요청은 응답 없이 10초 이상 매달린다(홈 포함, 운영·로컬 동일). 이번 변경과 무관하지만 연결을 붙잡는 요청이라 기록해 둔다.

---

# 추가(2026-10-08 밤) — 광고 도착 화면 머리말과 버튼 가격 표시

> **근거(10-08 실측)**: 인스타 광고 전용 주소 `ig-b1` 164클릭 → 입력 완료 약 25(15%) → 미리보기 약 25 → 결제 1. GA4: 방문자의 12%만 입력을 시작하고, 시작한 사람은 87%가 끝낸다. 결제창을 연 5명 중 4명이 3초 안에 닫았다. 생성 실패 0건·결제 정상이라 고장이 아니라 화면 문제다.
> **검증**: `vitest` 413 통과(신규 `tests/landingCopy.test.ts` 5건) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 휴대폰 폭으로 머리말 확인, 입력 → 미리보기 생성 → 버튼 문구 확인(가로 넘침 없음).

| 변경 | 파일 |
|---|---|
| 상품 입력 화면(`/compat/new?productId=…`, 정통 궁합 제외) 머리말을 그 상품의 질문 + "무료 미리보기 · 가입 없이 30초" + 알려 주는 것 3줄로 교체. 속마음은 광고 영상 B 의 약속과 같은 문장("그 사람, 지금 나를 어떻게 생각할까?") | `lib/landingCopy.ts`(신규), `components/CompatNewClient.tsx`, `app/[locale]/compat/new/page.tsx`(상품 화면에서는 공통 머리말을 그리지 않음) |
| 제출 버튼을 "<상품 이름> 무료로 미리 보기"로, 아래에 "가입도 결제도 없이 바로 볼 수 있어요" | `components/CompatNewClient.tsx` |
| 미리보기의 "이어서 읽기"·"답 보기" 버튼에 가격을 붙이고, 잠긴 칸 위에 "아래 이야기는 전체 리포트(4,900원)에서 열려요" 한 줄 | `components/report/StandardReportView.tsx`(`unlockPrice`), 호출부 `CompatNewClient`·`FortuneNewClient` |
| 궁합 결과 화면 상단 잠금 배너에 가격 | `components/CompatResultClient.tsx` |
| 버튼용 짧은 가격 `basePriceLabel` | `lib/catalog.ts` |
| 미리보기 제목 "우리의 그 사람의 속마음 미리보기" → "그 사람의 속마음 미리보기" | `components/CompatNewClient.tsx` |

## 측정
- 신규 `product_landing_view { productId }` — 상품 머리말이 그려질 때 1회(지난 궁합 이어보기 `from=` 은 제외). 퍼널: `product_landing_view → compat_created → teaser_created → click_unlock_teaser → checkout_open → purchase`.
- 비교 기준(변경 전, 10-08): 클릭 대비 입력 완료 15%, 결제창을 3초 안에 닫은 비율 4/5.

## 결정론/보안/결제
- 가격·결제 로직은 건드리지 않았다. 버튼 문구의 금액은 `product.price`(결제 금액과 같은 출처)에서만 만든다.
- 머리말 문구는 상품별로 고정이다(같은 상품 = 같은 문구, 테스트). 한자·전문용어·단정 표현 검사 포함.
- 로컬 확인 때 운영 DB 에 가짜 생년월일의 궁합 1건·미리보기 1건이 생겼다(10-08 22시경).

## 의심 지점
1. 머리말이 길어져 입력 칸이 첫 화면에서 약 150px 아래로 내려갔다. 입력 시작률이 오히려 떨어지면 안내 3줄을 접는 쪽을 검토.
2. 다른 광고 문구(B1 "답장은 오는데, 마음은 모르겠을 때", B3 "읽씹 3일째…")와 머리말이 글자 그대로 같지는 않다. 소재별로 머리말을 바꾸려면 `utm_content` 를 읽어야 한다.
3. 가격을 먼저 보이면 버튼 누르는 수 자체는 줄 수 있다. 봐야 할 값은 누른 수가 아니라 결제 완료 수다.

## 광고 도착 화면을 홈으로(2026-10-09 새벽, 사장님 결정)
- `lib/campaignLinks.ts`: 인스타 광고 6개(`ig-b1~3`, `ig-a1~3`)의 도착을 입력 화면에서 홈(`/ko?utm_…`)으로. `ig-bio`(프로필 링크)와 커플다이어리 배너(`cd1~4`)는 그대로.
- 근거(인스타 앱 유입, nginx 합계): 홈 도착 37 → 입력 6(16%) → 결제 1 / 입력 화면 도착·옛 머리말 158 → 17(11%) → 1 / 새 머리말 58 → 3(5%) → 결제창 2회 열고 미완료. 표본이 작고 광고 조건도 달라 확정은 아니다. 반반 비교를 권했으나 사장님이 바로 전환을 택했다.
- 유입 집계(`Order.campaign`, `/ko/admin/campaigns`)는 쿠키 기준이라 그대로 동작한다.

## 비회원 홈 맨 위 "함께했어요" 한 줄 + 앱 설치 배너는 회원에게만(2026-10-09 새벽, 사장님 결정)
- `components/home/VisitorPill.tsx`(신규): 두근이 얼굴 3개 + "벌써 N명이 함께했어요". `HomeHeroCompact` 맨 위에 넣었다 — 이 머리말은 비회원에게만 그려지므로 로그인 전에만 보인다. 시안 3종 중 A안(`docs/design-drafts/함께했어요_시안.png`).
- 숫자는 `SiteCounter "visitors"`(같은 기기는 한 번만 센 방문 수, 2026-09-24 시작) 그대로다. 900명부터 보인다(`VISITOR_PILL_MIN_DISPLAY`, 적용 시점 997명). 아래쪽 큰 칸(`VisitorSection`, 1,000명 문턱)은 그대로.
- `components/InstallPWAButton.tsx`: 설치 배너와 `pwa_banner_view` 를 로그인한 회원에게만. 이미 설치한 사람에게 뜨는 알림 켜기 안내는 그대로.
- 검증: `vitest` 414 통과(문턱 테스트 1건 추가) · `tsc` 0 · lint 0 · build exit 0 · 로컬 운영 빌드 휴대폰 폭에서 비회원 홈에 한 줄 표시, 설치 배너 없음(5초 대기), 가로 넘침 0. 회원 화면의 설치 배너는 로그인해서 직접 보지는 않았다(조건 한 줄 변경).
- 측정 이벤트는 추가하지 않았다(누를 수 없는 표시라 행동이 없다). 효과는 홈 도착 → `compat_created` 비율로 본다.
- 의심 지점: "함께했어요"는 방문 수를 뜻한다. 궁합을 본 사람 수로 읽힐 수 있으나 아래 큰 칸에 "방문한 분 · 같은 기기는 한 번만"이라고 적혀 있다.

---

# 추가(2026-10-11) — 사흘간 매출 0원 진단, 10-08 낮 상태로 복원, 배포 오류 수정

> **상황**: 10-09~10-11 방문자 745명(GA4)·인스타 광고 593클릭(약 5만 원)에 결제 0건, 결제 시도(주문 생성)도 0건.
> **고장 여부**: 아니다. 사흘간 사람 요청의 5xx 0건, 입력·생성 API 전부 200. 운영 사이트를 인스타 앱 UA 로 홈 → 입력 → 결과 → 결제 시트 → 카카오페이 화면까지 직접 따라가 정상 확인(10-11 18시, 콘솔 오류·실패 응답 없음).

## 원인(증거 순)
| 관찰 | 숫자 |
|---|---|
| 광고 도착을 홈으로 바꾼 뒤 입력 완료율 하락 | 인스타 클릭 대비 궁합 생성: 10-08(입력 화면 도착) 192클릭 중 26 = 13.5% → 10-09~11(홈 도착) 593클릭 중 47 = 7.9% |
| 홈에 온 사람은 대부분 무료 궁합으로 감(하단 고정 버튼) | 궁합 생성 44명 중 유료 상품 미리보기를 본 사람 23명. 지금까지 결제의 대부분은 "그 사람" 상품 미리보기에서 나왔다(정통 궁합 결제는 1건) |
| 미리보기 버튼에 가격을 붙인 뒤 누르는 사람이 급감 | `click_unlock_teaser`: 10-08 미리보기 12명 중 5명(42%) → 10-09~11 23명 중 2명(9%) |
| 가격을 미리 보여 줘도 결제창을 바로 닫는 비율은 그대로 | 결제창 연 10명 중 6명이 3초 안에 닫음, 결제 버튼 0명 → "가격을 몰라서 닫는다"는 가설은 틀렸다 |
| 결제하던 유입이 사라짐 | 스레드 유입(홈 열림) 10-07 22 → 10-09 8 → 10-10 1 → 10-11 0. 네이버 12 → 3 |

10-08 밤~10-09 새벽에 바꾼 세 가지(상품 머리말, 버튼 가격, 홈 도착)는 모두 효과가 없거나 나빴다. 앞의 둘은 내(Claude) 제안이었다.

## 한 일
1. **10-08 낮(마지막으로 결제가 나온 구성)으로 복원**: 광고 6개 주소 → 상품 입력 화면(`lib/campaignLinks.ts`), 입력 화면 머리말·제출 버튼 원복, 미리보기 버튼의 가격 문구 제거, 궁합 결과 상단 배너 문구 원복. `lib/landingCopy.ts`·`basePriceLabel`·`product_landing_view` 삭제. 미리보기 제목 교정("그 사람의 속마음 미리보기")만 남김.
2. **유지**: 비회원 홈 맨 위 "벌써 N명이 함께했어요", 앱 설치 배너는 회원에게만.
3. **배포 중 오류 수정**(10-09 `ChunkLoadError` 3건): 원인은 `rm -rf .next` 후 같은 자리에 2분간 다시 빌드하는 동안 옛 서버가 방문자를 받는 것. `next.config.ts` 의 `distDir` 가 `NEXT_DIST_DIR` 를 읽게 하고, `scripts/safe_deploy.py` 는 `.next-new` 에 빌드 → 결과 확인 → `mv` 로 교체와 재시작을 한 명령으로. 직전 빌드는 `.next-old` 로 남는다. 빌드 실패 시 `.next` 는 손대지 않는다(이전에는 "옛 버전이 그대로 돈다"는 안내와 달리 `.next` 가 이미 지워져 있었다). `tsconfig.json` 에 `.next-new/types` include 를 넣어 빌드가 tsconfig 를 고쳐 쓰지 않게 했다. 로컬에서 다른 폴더 빌드 → 이름 바꿔 실행해 화면·API·OG 이미지 200 확인.
4. **`ProductVisibility DB timeout`**: 서버 재시작 직후 미국 DB 첫 연결이 1.5초를 넘겨 기본값으로 떨어지던 것. 기다리는 시간을 4초로, 실패하면 15초 동안은 다시 두드리지 않고 기본값 사용(`lib/catalogVisibility.ts`). 기능 영향은 없던 경고다.
5. `인증이 필요합니다` 1건은 로그인 없이 `/admin` 을 연 요청이다(정상 차단).

## 검증
`vitest` 409 통과 · `tsc` 0 · 변경 파일 lint 0 · build exit 0(다른 폴더 빌드 포함, tsconfig 변화 없음).

## 의심 지점
1. 복원해도 인스타 "게시물 홍보" 클릭의 결제율은 지금까지 0.3~0.6% 였다(클릭당 약 100원, 회수 약 30원). 화면을 고쳐서 본전이 될 가능성은 낮고, 유입의 질이 더 큰 변수다.
2. 로컬·운영 직접 확인으로 운영 DB 에 가짜 생년월일 궁합 1건과 PENDING 주문 1건이 생겼다(10-11 18시경).
3. 새 배포 방식은 이번이 첫 실전이다.

---

# 추가(2026-10-13) — 연말 특가(12/31까지)와 홈 강조 영역

> **결정(사장님)**: 2026년 총운 4,900 → 3,000원, 2027 대운 프리미엄 리포트 19,900 → 9,900원, 2027년 신년운은 그대로. 2026-12-31 23:59(KST)까지. 스레드 한 달 홍보와 함께 간다.
> **기준선**: 9/24 이후 2026 총운 결제 2건, 대운 프리미엄 0건(결제 시도도 0건).
> **검증**: `vitest` 413 통과(특가 테스트 4건 추가) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 홈·상품 상세·구조화 데이터 가격 확인.

## 결정론/결제(가장 중요한 부분)
- `lib/catalog.ts`: 두 상품의 `price`·`originalPrice` 를 **읽는 순간의 시각**으로 계산되게 했다(`Object.defineProperty` getter, `seasonPriceAt(id, now)`). 화면 표시·서버 주문 금액(`app/api/payments/order/route.ts` 의 `catalogItem.price`)·세트 비교가 모두 같은 값을 본다. 호출부를 하나씩 고치는 방식은 한 곳만 빠져도 보이는 값과 결제 값이 어긋나서 택하지 않았다.
- 2027-01-01 00:00(KST)부터는 배포 없이 원래 값(4,900 / 19,900)으로 돌아간다. 경계는 테스트로 고정(12-31 23:59:59 = 특가, 01-01 00:00:00 = 원래 값).
- 기간 중 취소선 값은 직전까지 실제로 받던 값이다(총운 4,900, 대운 19,900). 딱지는 `discountBadge()` — "연말 특가 · 12/31까지".
- 회원 첫 결제 규칙·PG 금액 검증은 건드리지 않았다(주문에 저장된 금액으로 검증).

## 화면
- `components/home/SeasonPromoBanner.tsx`(신규): 홈 머리말 바로 아래(회원·비회원 모두). 특가 2개 카드(직전 가격 취소선, 남은 날 D-n) + 기본 혜택 3가지. 기간이 끝나거나 상품을 숨기면 사라진다.
- 홈 격자에 "특가" 딱지, 프리미엄 목록·띠·상세에 취소선과 기한.
- 격자 아래 "전체 리포트 ○원" 안내는 특가가 아닌 상품 값으로(탭 전체가 3,000원처럼 보이지 않게).
- **세트**: 취업/이직 세트(7,900) = 취업운 4,900 + 2026 총운 3,000 이 되어 기간 중 아끼는 금액이 0이다. 홈 "세트로 한 번에"에서 따로 사는 것보다 싸지 않은 세트는 내보이지 않게 했다(`SetRow`). 추천(`setsContaining`)·상세의 "따로 사면" 문구는 원래부터 같은 조건으로 숨는다.
- 약관 제9조에 기간 한정 가격 한 줄, 개정 표기 추가(`messages/ko.json`).

## 측정
- `season_promo_view { items }` — 특가 영역이 화면에 보인 순간 1회. `home_card_click { section: "season_promo", productId }`.
- 판단: 두 상품의 결제 건수를 위 기준선과 견준다.

## 의심 지점
1. 브라우저 쪽 가격 표시는 방문자 기기의 시계를 따른다. 시계가 틀린 기기는 화면 값과 결제 값이 다를 수 있다(결제 금액은 서버 시각 기준, 결제창에 금액이 다시 표시된다).
2. 12/31 까지면 2027 운세 성수기(12월)에도 대운 리포트를 절반 값에 팔게 된다.
3. 홈 구조를 또 바꿨다. 광고 유입은 입력 화면으로 가므로 주로 스레드·검색·직접 방문에 영향이 간다.

---

# 2026-10-14 · Gemini 4 UI/UX 1차 병합 (P-001a·P-002a·P-001b)

> 절차: `docs/uiux/` — Gemini 제안 → Claude 결정서(`decisions/`) → Gemini 구현(`uiux/P-00N` 브랜치) → Claude 검토·수정·병합·배포.
> **검증**: `tsc` 0 · 변경 파일 lint 0 · `vitest` 420 통과 · build exit 0 · 로컬 운영 빌드(kongdak.local:3099, GA 전송·`/api/*` 가로채서 끊음)에서 GA 전송값 확인.

## 무엇이 바뀌나
- **P-001a 측정**: GA4 이벤트가 지금 보는 화면 주소로 잡힌다(`lib/gtag.ts`가 이벤트마다 `page_location`을 싣고, `components/Analytics.tsx`가 화면 이동 때 `gtag('set')`). 상품 상세 버튼 `product_cta_click`, 관련 상품 `related_product_click` 추가. `DashboardView`의 직접 `gtag` 호출을 `trackEvent`로.
- **P-002a**: 두 사람 상품 미리보기(또는 한도 안내)가 뜨면 주소에 `from=<궁합 id>`를 넣는다(`replaceState`, `lib/compatFromUrl.ts`). 새로고침·인앱 → 다른 브라우저로 열어도 입력 없이 같은 미리보기. 같은 id로 효과가 다시 돌지 않게 막았다(`handledFromRef`).
- **P-001b 어드민**: 첫 탭이 지표. 재구매(같은 궁합·같은 회원, 세트에 든 단품 재결제 표시), 상품별 미완료 열, 접속 환경·유입 표시·결제 수단 표. 미리보기 수는 저장본 재열람 제외. `Order.payMethod`(KAKAOPAY|CARD|null) 추가 — **운영 DB에 칸을 먼저 추가함(10-14, `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "payMethod" TEXT`)**.

## Claude가 Gemini 구현에서 바꾼 것
1. `components/Analytics.tsx`: Gemini 판은 GA 스크립트가 **주소창의 `paymentId`를 직접 지우고**(`History.prototype.replaceState`), `history.pushState/replaceState`를 `defineProperty` 게터로 덮어썼다. 결제 완료 화면은 마운트 뒤 주소에서 `paymentId`를 읽어 결제를 확정하므로, 순서가 어긋나면 결제 확정이 안 된다. Next 라우터의 history 처리와도 부딪힐 수 있다. → 원래 스크립트로 되돌리고 `gtag('set', { page_location })` 한 줄과 공통 지우기 목록만 넣었다.
2. `withCompatFromParam`을 클라이언트 컴포넌트에서 `lib/compatFromUrl.ts`로 옮김(가짜 도메인 `saju.kongdak.com` 제거).
3. 어드민의 `payMethod` 별도 원시 조회(`$queryRaw` + 실패 시 빈 값)를 없애고 `select`에 넣음(칸을 먼저 만들었으므로).

## 확인(로컬 운영 빌드)
- `/ko/products/inner_mind` → 하단 버튼 → `/ko/compat/new`: `view_item`·`product_cta_click`의 주소 = 상품 상세, 상품 상세 체류 시간(`user_engagement`)도 상품 상세 주소, 화면 이동 1번에 `page_view` 1번(GA가 같은 전송을 두 주소로 보내 패킷은 두 벌).
- `/ko/pay/complete?paymentId=…&orderId=…&claimToken=…&token=…`: GA 전송값 어디에도 네 값 없음(0건). 화면은 `paymentId`를 읽어 `/api/payments/complete`를 호출함(주소 정리는 화면이 함).

## 의심 지점
1. 미리보기 화면 주소가 바뀔 때 GA가 `page_view`를 한 번 더 보낼 수 있다(`from` 붙은 주소). 미리보기 수는 `teaser_created`로 보고, `via=compat_continue`(새로고침·다른 브라우저 재열람)는 빼고 본다.
2. `from=` 주소를 남에게 보내면 그 두 사람의 미리보기가 열린다. 궁합 id는 원래 공유 주소에 쓰이는 값이라 새로 드러나는 것은 없지만, 속궁합처럼 민감한 상품 미리보기도 열린다.
3. 어드민 집계는 최근 주문 300건 기준이다(지금 62건).

## 추가 수정(같은 날, 커밋 보안 검토 지적)
- 지적: 결제 완료 주소의 `paymentId`가 GA의 이전 주소(`page_referrer`)로 나갈 수 있다.
- 로컬 패킷으로 재현: 비밀값이 붙은 주소에서 gtag.js가 먼저 뜨면, 설정(`page_location`)을 지워도 gtag.js가 그 주소를 기억했다가 다음 화면의 `page_view`·`user_engagement`에 `dr`로 보냈다(8건). 이번 변경 전 코드에도 있던 경로다. 실제 결제 완료 화면은 마운트 직후 주소를 정리해 재현되지 않았지만, 기기에 따라 순서가 바뀔 수 있다.
- 수정(`components/Analytics.tsx`): 주소에 지울 값이 있는 동안에는 gtag.js를 **불러오지도** 설정하지도 않는다. 정리되면(50ms 간격, 최대 10초) 그때 불러온다. 정리되지 않으면 그 화면은 측정하지 않는다. 주소창은 건드리지 않는다.
- 확인: 상품 흐름·결제 완료 화면·정리되지 않는 화면 → 다른 화면, 세 경우 모두 GA 전송값의 비밀값 0건.

---

# 2026-10-15 · 프리미엄 입력 화면 글씨 안 보임 + 전 페이지 대비 점검
- 원인: 공용 `components/forms/BirthFields.tsx`는 밝은 화면용(흰 칸, 글자색 지정 없음, 회색 제목). 어두운 프리미엄 입력 화면(`/ko/premium/<id>/new`)에 그대로 들어가 흰 칸에 밝은 글씨·어두운 바탕에 어두운 제목이 됐다.
- 수정: `tone="light" | "dark"` 추가(밝은 쪽도 글자색 `text-ink`를 명시). 프리미엄 3곳(2027 대운, 택일 두 사람) `tone="dark"`. 커밋 54d5783(입력 칸), be1144c(대비), 둘 다 배포 VERIFIED.
- 전 페이지 대비 검사(390px, 사이트맵 + 입력 흐름 49쪽): 대비 3 미만 6쪽 → 1쪽. 고친 것: "NEW" 딱지(#FF8AA1→#E0245A), 재물 딱지 글씨(#C98A0B→#8A5A00), 흐린 회색 안내 글씨 `text-[#8A8291]` 43곳 → `text-caption`(#6B6470). 남은 1곳은 네이버 로그인 버튼(네이버 지정 색).
- 의심 지점: 결과·미리보기·결제창처럼 데이터가 있어야 열리는 화면은 자동 검사에 들어가지 않았다(코드로 확인한 범위: 프리미엄 화면에 들어가는 공용 부품 중 밝은 전용은 BirthFields 하나였다).

---

# 2026-10-15 · 보안 점검(바이브코딩 보안 체크리스트 기준)
- 계기: "프론트에 키 노출 · SQL 주입 · 인증 없는 API" 체크리스트. 결과와 조치를 정리한다.
- 문제없음으로 확인: 브라우저 번들(라이브 JS 21개)에 API 키·DB 주소·토큰·프롬프트 원문 0건, `NEXT_PUBLIC_` 비밀값 없음, 추적되는 시크릿 파일 없음(`.env.example`만), git 이력 시크릿 0건, `$queryRawUnsafe` 없음(Prisma 매개변수 쿼리), Supabase public 표 25개 전부 RLS 켜짐(정책 0 = anon 접근 불가) + 서버에 Supabase 키 자체가 없음, 관리자 API 전부 `getAdminSessionOrThrow`(401/403), 유료 결과는 `isEntitled`/주문번호로만 열람, 보안 헤더(CSP·HSTS preload·X-Frame-Options DENY·nosniff) 적용.
- 조치 1 (커밋 21db6d0, 배포 VERIFIED): Next.js 16.2.9 → 16.3.8, next-auth 4.24.14 → 4.24.15. 공유카드(`next/og`)와 이미지 최적화(AVIF) 경로의 인증 없는 원격 코드 실행(critical) 등. `npm audit --omit=dev` critical 2 → 0. 남은 high/moderate 11건은 Prisma CLI 로컬 개발 서버(hono·mysql2)·Tailwind·ESLint 등 빌드 도구 안에만 있다(Prisma 6으로 내리는 것만 해결책이라 보류).
- 조치 2: Gumroad 결제 알림(`/api/webhooks/gumroad`)이 서버에 비밀값이 없으면 검증 없이 받던 것을 **비밀값 없으면 503**으로 바꿈. 이전에는 아무나 회원 이메일로 가짜 결제 알림을 보내 유료 등급을 줄 수 있었다(동면 코드라 삭제는 안 함). 테스트 `tests/routes/gumroadWebhook.test.ts`.
- 조치 3: 이메일 로그인(같은 이메일 5회/분·30회/일)과 가입(같은 IP 5회/분·30회/일)에 횟수 제한(`checkAuthRateLimit`). 막히면 "로그인 시도가 너무 많아요" 안내. 테스트 `tests/authRateLimit.test.ts`.
- 조치 4: 쓰이지 않던 `lib/supabaseClient.ts` 삭제(서비스 롤 키 → anon 키 순으로 넘어가는 위험한 기본값).
- 검증: tsc 0 · 바꾼 파일 lint 새 오류 0(register의 `any` 2건은 기존) · vitest 426 통과 · build exit 0.
- 의심 지점: (1) 횟수 제한은 Upstash가 없으면 PM2 프로세스 메모리에 센다(재시작하면 초기화, 여러 프로세스면 프로세스별). (2) 남의 이메일로 로그인을 반복하면 그 사람의 이메일 로그인이 하루 막힐 수 있다(카카오·구글 로그인은 영향 없음). (3) `GET /api/compat?id=`는 id를 아는 사람에게 유료 결과를 돌려준다(id는 추측 불가한 cuid라 유지).

---

# 2026-10-15 · 회원 첫 결제 할인 폐지(사장님 결정)
- 결정: 첫 결제 할인은 없앤다. 표준 단품은 회원·비회원 모두 오픈 기념가 4,900원(취소선 6,900원) 그대로.
- 이유(코드 측): 지금은 기념가 = 첫 결제가(4,900)라 꺼져 있었지만, 기념가를 6,900원으로 되돌리면 자동으로 살아나는 구조였다.
- 바꾼 것: 서버 주문 금액에서 할인 제거(`app/api/payments/order/route.ts`), `priceLabel`의 "회원 첫 결제" 꼬리·`hasFirstPurchaseDiscount`·`FIRST_PURCHASE_PRICE` 삭제(`lib/catalog.ts`), 결제창 "가입하면 첫 결제는" 안내, 맛보기 결제 카드·한도 화면·상품 상세의 첫 결제 표시, 회원 홈 `FirstPurchaseCard`와 `/api/user/first-purchase`, `lib/payments/firstPurchase.ts` 삭제, 약관 제9조의 "회원의 첫 결제 1회는 4,900원" 삭제.
- 남긴 것: 관리자 화면의 "첫 결제(4,900원) 대 정가 결제" 집계는 과거 주문 분류용으로 `LEGACY_FIRST_PURCHASE_PRICE`(4,900)를 쓴다. 쓰이지 않는 `components/PricingClient.tsx`(`/pricing`은 홈으로 이동)의 옛 문구는 화면에 나오지 않아 그대로 뒀다.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 423 통과(첫 결제 안내 API 테스트 3건 삭제, 모든 상품 라벨에 "첫 결제"가 없다는 검사 추가, 결제한 적 없는 회원도 판매가 그대로 청구) · build exit 0.
- 의심 지점: GA4 `first_purchase_banner_click`, `checkout_login_hint_click` 이벤트는 더 이상 나오지 않는다.

---

# 2026-10-15 · MP-1 병합(Gemini 구현, Claude 검토·수정)
- 결정서: `docs/uiux/decisions/MP_매출UX마스터플랜.md` 1묶음. 결과 보고: `docs/uiux/results/MP-1.md`. 커밋 dff1bb6 · 9f7f911 · 5038f00 · 3345ed5 · 23c782f + 검토 수정 1건.
- 1 길일 택일: 가짜 1994·1996 초기값 제거, 빈 생년월일이면 맛보기·결제 모두 막힘(`buildDateSelectionPayload`, 테스트 5케이스). 저장된 커플·본인 정보가 있으면 채움. 이름 칸은 원래 화면에 없어 빈 이름은 "나"로 보냄(택일 생성은 이름을 쓰지 않음).
- 2 취업·이직 세트 연말특가 6,900원(따로 7,900원), 1/1부터 7,900원(따로 9,800원). 약관 제9조 갱신.
- 3 2026·2027 총운: 상품 상세 버튼과 홈 연말특가 배너 → `/fortune/annual?year=`.
- 4 정통 궁합: 권한이 있으면 심층 리포트를 화면당 1회 자동 시작·스크롤, 실패 시 재시도 없이 버튼. 이미 만든 리포트는 서버 캐시라 재방문 비용 없음(대신 재방문 때도 그 영역으로 스크롤된다).
- 5 하단 고정 바: 결제 카드가 보이면 숨김.
- 검토에서 고친 것: Gemini가 `paywallRef`를 카드 전체로 옮겨 `view_paywall`(useSeenOnce, threshold 0.5)이 긴 카드에서 늦게·안 잡힐 수 있었다 → 카드 맨 위 0높이 표시점으로 되돌리고 숨김 판단만 `paywallCardRef`로.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 424 통과 · build exit 0.
- 판정: 2주 뒤 annual_2026/2027 `teaser_created → checkout_open → purchase`를 직전 2주와 비교, 세트 결제 수 기록.

---

# 2026-10-16 · P-007 병합(Gemini 구현, Claude 검토·수정)
- 결정서: `docs/uiux/decisions/P-007.md`, 문구 `decisions/P-007_문구.md`. 커밋 41afca7(ⓐ 권유) · 373e00b(ⓑ 회원 판별) · 7b31fc9(ⓒ 문구) + 검토 수정 1건.
- ⓐ 두 사람 리포트 끝(`ReportViewClient`, 두 사람 상품일 때)과 정통 궁합 심층 리포트 끝(`CompatResultClient`)에 "두 사람 사주로 이어서 볼 수 있어요" 권유: 단품 최대 2개 + 세트 1줄. 표 `lib/recommendations/nextReadings.ts`(7종, id만). 같은 궁합으로 가진 것(이 기기 주문 → `/api/payments/owned` 검증, 회원은 `/api/reports/mine`)·숨긴 상품은 빼고, 확인 중·실패 시 그리지 않음. `/api/reports/view` 응답에 `compatId` 추가. 이동 `/compat/new?productId=&from=&via=next` → `teaser_created.via = next_reading`. 이벤트 `view_next_reading`, `click_next_reading`.
- ⓑ `/compat/[id]` 회원 열람 판별을 `isEntitled`로(`resolveCompatPageEntitlement`): 정통 궁합·그것이 든 세트를 산 회원은 다른 기기에서도 열림. 비회원은 조회 추가 없음. MP-1의 자동 시작과 이어져 그 회원은 심층 리포트가 바로 열린다.
- ⓒ 잠긴 궁합 화면 결제 버튼 아래 "이미 결제하셨나요?" 한 줄 + 로그인 링크, 결제 완료 카카오톡 메시지 설명·버튼 글자.
- 검토에서 고친 것: Gemini가 반려된 문구 초안을 그대로 넣었고 버튼 글자 변경과 `owned_hint_login_click`이 빠져 있었다 → 승인본으로 맞춤.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 437 통과 · build exit 0.
- 의심 지점: 권유로 들어간 미리보기 주소에 `via=next`가 남아 새로고침하면 `teaser_created(via=next_reading)`가 한 번 더 잡힌다. 판정 때 같은 궁합·상품의 중복은 하나로 센다.
- 판정: 배포 후 21일(11-06) 또는 새 결제 쌍 20개 중 먼저. 같은 두 사람의 7일 내 두 번째 결제 비율(기준 13쌍 중 3쌍).

---

# 2026-10-16 · MP-2 병합(Gemini 구현, Claude 검토·수정)
- 결정서: `docs/uiux/decisions/MP-2.md`. 커밋 6c9b105(a 게이지) · 3fbf78b(c 흐림 문구) · 8ae1b1f(d 홈 바로가기) · f00c4ab(e 저장 정보 바로 보기) + 검토 수정 1건. (b) 분량 배지는 반려.
- (a) 궁합 점수 아래 "궁합 점수 세부 분석": 공개 3축(타고난 성향 합 / 두 사람 기운의 균형 / 에너지 온도 조화) + 잠금 2축(서로 채워 주는 정도 / 일상·감정 리듬). 미결제 페이지는 공개 3축 숫자만 받는다(`pickPublicBreakdown`). 잠긴 값은 `/api/compat/deep-report` 성공 응답(권한 확인 뒤, 캐시 포함)에만 `breakdown`으로 실린다. 잠긴 줄 → `checkout_open source=click_gauge_lock`. 매핑 `lib/compatGauge.ts`.
- (c) 맛보기 흐림 문구를 유료 단품 12종별로(`lib/teaserBlurCopy.ts`, 각 상품 2~4번째 유료 섹션 제목을 그대로 옮김). 나머지는 기존 문구.
- (d) 비회원 홈 첫 화면 버튼 2개(우리 궁합 무료로 보기 → /compat/new, 2027 신년운 미리보기 → /fortune/annual?year=2027), `home_hero_cta_click`.
- (e) 상품 상세: 같은 탭에 방금 입력한 정보가 있으면 "저장된 … 정보로 바로 보기"(위·하단 고정) + "다른 생년월일로 새로 입력하기". `product_cta_click location=saved_info_hero|saved_info_sticky`, 두 사람 상품은 `teaser_created.via=saved_detail`.
- 검토에서 고친 것: 결제 후 점수 아래 카드가 5축 전체로 풀리는데 심층 리포트 안에 같은 카드가 한 번 더 있었다 → 뺌. `lib/destinyGen.ts`(타입 한 줄 추가뿐)의 import 를 파일 머리로.
- 검증: tsc 0 · 바꾼 파일 lint 새 오류 0(deep-report `any` 3건은 기존) · vitest 444 통과 · build exit 0.
- 판정: (d) 14일 `home_hero_cta_click`/비회원 홈 세션 ≥ 3%, (e) `saved_info_*` 클릭과 `teaser_created` 도달, (a)(c)는 기능 확인 + 결제 열기 비율이 떨어지지 않는지.

---

# 2026-10-16 · P-008 반쪽 궁합 초대장 병합(Gemini 구현, Claude 검토·수정)
- 결정서: `docs/uiux/decisions/P-008.md`. 커밋 beb1cc6(표·API·초대 화면) · 9259a46(입구 2곳) · a53d026(카톡 카드·OG) · 2152a53(개인정보처리방침) + 검토 수정 fe7707b.
- 흐름: `/compat/new` 상대방 카드의 "생일을 모르나요? 반쪽 초대장 보내기"(또는 궁합 결과 공유 아래 버튼 → `?mode=invite`) → 내 정보만으로 `POST /api/compat/invite` → 카톡/링크 `/ko/compat/invite/<token>` → 받는 사람이 자기 생년월일 + "동의하고 우리 궁합 열기" → `POST /api/compat/invite/<token>`가 일반 궁합과 같은 `Compatibility` 행을 만들고 결과로 이동. 보낸 사람은 같은 링크 또는 `/compat/new` 상단 배너로 결과를 연다.
- 개인정보: 원문 생년월일·시간 저장 없음. `CompatInvite.personA`(사주 계산값 = 생년월일을 추정할 수 있는 값)는 응답에 싣지 않고, 완성 즉시 `{}`, 미완성은 72시간 뒤 삭제(생성·조회 때마다 정리). 완성된 행은 결과 연결만 남긴다. 보낸 사람 브라우저에는 토큰과 시각만.
- 운영 DB: 10-16 Claude가 `CompatInvite` 표 + 인덱스 3개를 추가하고 RLS를 켰다(배포 스크립트의 `prisma db push`는 이후 차이 없음).
- 검토에서 고친 것: ① 화면 두 곳이 서버 파일(`lib/compatInvite.ts`)을 가져와 **lunar-javascript 만세력 표가 브라우저 코드에 실렸다**(빌드 산출물에서 "癸亥"·"SolarUtil" 확인) → 브라우저용 `lib/compatInviteClient.ts` 분리, 분리 후 0건. ② 생년월일 해시에 코드에 적힌 대체 pepper가 있었다 → 기존 궁합과 같은 fail-closed, 서버 오류 문구는 손님에게 숨김. ③ 동시에 두 사람이 채우면 궁합이 둘 생길 수 있었다 → `updateMany`로 1회 선점. ④ `compat_created via=half_invite`, `compat_invite_opened isSender`. ⑤ 개인정보처리방침에 "생년월일을 추정할 수 있는 값" 명시.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 453 통과(초대 9건) · build exit 0.
- 판정(배포 후 21일, 11-06): `compat_invite_shared` ≥ 10 또는 입력 진입자의 3%, `compat_invite_completed` ≥ 3, 직접 `compat_created`가 줄지 않으면 유지. 공유 3건 미만 또는 완성 0건이면 입력 화면 전환 버튼을 접는다.

---

# 2026-10-16 · P-009 제휴 정산 정확도 + 제휴사별 성과 보기 병합(Gemini 구현, Claude 검토·수정)
- 결정서: `docs/uiux/decisions/P-009.md`. 커밋 797703e(A) · 9d73915(B) + 검토 수정 b12cdb3.
- A: `/go`가 `kd_ref`(httpOnly 아님, "<코드>.<초>")를 함께 심고, 인앱 "외부 브라우저로 열기"·링크 복사 주소에 `ksrc`·`ksrct`를 붙인다. `middleware.ts`가 등록된 코드·30일 안 시각만 받아 쿠키를 다시 심고(더 최근 클릭이 있으면 유지, 클릭 수는 안 셈) 두 값을 뺀 주소로 302.
- B: `/ko/partner/<partner>/<key>`(key = HMAC(PARTNER_REPORT_SECRET, partner) 앞 32자, 비밀값 없으면 404). 그 제휴사 코드의 클릭·가입·결제·매출·정산 기준(부가세·환불 제외)만. GA·픽셀 안 보냄, noindex, robots 차단. 관리자 `/ko/admin/campaigns`에 제휴사별 공유 주소 복사.
- 운영: `PARTNER_REPORT_SECRET`을 10-16 서버 `.env`에서 직접 생성(값은 어디에도 출력하지 않음).
- 검토에서 고친 것: ① `lib/inAppBrowser`(화면 7곳이 씀)가 `lib/campaignLinks`를 가져와 **전체 제휴 목록·수수료율이 공개 JS에 실렸다** → 브라우저용 `lib/campaignHandoff.ts` 분리(형식만 확인, 등록 여부는 서버가 확인), 빌드 산출물에서 0건 확인. ② 제휴사 화면 클라이언트가 집계 파일 값을 가져와 같은 문제 → `lib/rateLabel.ts`. ③ 커플다이어리에 `rsRate 0.3`이 들어가 제휴사 화면에 예상 정산액이 떴다 → 삭제(2026년 말까지 무료 제휴). ④ 회원 경로(`User.campaign`) 결제가 기간 제한 없이 실적으로 잡혔다 → `attributedCampaign`: 가입 후 30일 안만(관리자·제휴사 화면 같은 기준). 관리자 화면의 기존 누적 숫자가 조금 줄 수 있다.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 467 통과 · build exit 0.

---

# 2026-10-18 · P-010 무료 궁합 → 같은 두 사람 미리보기 + 상품 입력 화면 문구 병합(Gemini 구현, Claude 검토)
- 결정서: `docs/uiux/decisions/P-010.md`(Gemini의 경쟁사 비교 진단을 실제 화면·DB로 확인한 결과 포함). 커밋 c8ec8ad(A) · 6c89338(B).
- 왜: 10-01~10-18 궁합 약 270건이 무료 궁합에서 멈췄고, 같은 두 사람으로 '그 사람' 미리보기를 여는 길은 결제한 뒤에만 보였다. 사람 수 대비 상품 미리보기가 무료 궁합보다 약 3배 잘 팔린다.
- A: 무료 궁합 결과(결제 전, 관계가 친구가 아닐 때) "우리 사이의 진짜 케미" 아래에 "이 두 사람으로 더 보기" — 속마음·속궁합 카드 2개, 가격 없이 "무료 미리보기 →", `via=free_result`. `NextReadingRecommendations`에 `variant="free_preview"`, `sourceScreen="compat_free"`.
- B: `/compat/new?productId=<두 사람 상품>` 제목 = 상품 `hook`, 제출 버튼 = "<상품명> 무료 미리보기 ✨", 미리보기·한도 화면에서는 제목 숨김(제목을 서버 페이지에서 `CompatNewClient`로 옮김). 상품 상세 하단 버튼도 "<상품명> 무료 미리보기". 정통 궁합은 그대로.
- 검토: diff 직접 확인(가격·결제·엔진·스키마·이벤트 이름 변경 없음, 새 이벤트 없음 — 기존 이벤트에 `source_screen` 값만 같이 보냄). 수정 없음.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 467 통과 · build exit 0 · `.next/static`에 "癸亥"/"SolarUtil" 0건.
- 판정(배포 후 7일, 10-25): 비교 전 10-12~10-18 궁합 173 · 미리보기 64(궁합 100건당 37) · 결제 9. 목표 궁합 100건당 미리보기 55 이상, `teaser_created via=free_result` 수, 결제 건수. 표본이 작으면 14일까지.

---

# 2026-10-18 · P-011 미리보기 읽기 버튼 → 결제 안내 카드로 이동 병합(Gemini 구현, Claude 검토)
- 결정서: `docs/uiux/decisions/P-011.md`. 커밋 f7b516d.
- 바꾼 것: 두 사람·한 사람 상품 미리보기의 "이어서 읽기"·"답 보기"·잠금 카드·총운 달 티저/잠금 영역은 결제창 대신 결제 안내 카드(`#teaser-unlock`)로 스크롤하고 1.2초 강조(`revealUnlockPanel`, 카드가 없으면 예전처럼 결제창). 안내 카드 버튼·하단 고정 바는 그대로 결제창. `click_unlock_teaser`에 `to: "panel" | "checkout"` 추가(한도 화면은 값 없음).
- 검토: diff 직접 확인, 수정 없음. 강조용 `ring-coral` 클래스가 빌드 CSS에 들어간 것 확인.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 471 통과 · build exit 0 · `.next/static` 만세력 0건.
- 기준값(GA4 10-05~10-18, 이벤트 수): checkout_open 115 → checkout_close_fast 56(49%) · checkout_submit 26(23%) · purchase_confirmed 18. teaser_created 229. checkout_open에는 무료 궁합 결과 화면(이번에 안 바꿈)도 섞여 있다.
- 판정(10-25, 부족하면 11-01): 3초 안 닫기 49% → 30% 이하, 열림 → 진행 23% → 30% 이상, 미리보기 100건당 결제 유지. 결제창 열림이 절반 아래로 줄고 결제도 줄면 되돌린다.

---

# 2026-10-18 · P-012 단품 상세 "결과 예시" 병합(Gemini 구현, Claude 검토)
- 결정서: `docs/uiux/decisions/P-012.md`. 커밋 0d47256(A 샘플) · 84b7c8b(B 화면).
- A: `scripts/build_standard_samples.ts`가 가상 인물(지민 / 지민·서준)로 실제 생성 경로(`calculateFourPillars`·`calculateCompatibility`·`sajuContextBlock`/`compatContextBlock`·`buildStandardPrompt`·`generateJson`+검증기)를 그대로 돌려 유료 단품 12개 전체 리포트를 `data/samples/standard/*.json`에 저장. DB는 사전 읽기만. 저장 전 검사 `lib/reports/standardSampleGuard.ts`.
- B: 서버 페이지가 그 상품 샘플 1개만 읽어(`lib/reports/standardSamplePreview.ts`) 점수·제목·요약·첫 장 앞 300자(문장 끝)·나머지 장 첫 문장 60자만 props로 넘김. "이런 내용을 확인할 수 있어요" 아래 "결과 예시"(가상 인물 표시, 워터마크, 끝 흐림, 정적 잠금 줄). 새 이벤트 `sample_preview_view { productId }`.
- 검토: 12개 샘플 본문을 직접 읽음 — 한자·전문용어·단정 표현 0, 실제 리포트와 같은 "흙 기운/바다 물 기운" 비유. 매운맛 총운은 상품 성격대로 직설적("이대로 가면 … 낭비될 겁니다"). 건강운에 병명·진단 표현 없음. 수정 없음.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 476 통과 · build exit 0 · `.next/static`에 만세력·프롬프트·샘플 뒷부분 문장 0건. 상품 상세는 동적 페이지(엣지 캐시 대상 아님).
- 기준값(GA4 10-05~10-18): `view_item` 690회/272명 → `product_cta_click` 53회/18명(사용자 기준 6.6%).
- 판정(10-25~11-01): 상세 → 하단 버튼 비율이 6.6%보다 오르는지, `sample_preview_view`/`view_item`(예시까지 내려 본 비율), 상세에서 시작한 미리보기의 결제가 줄지 않는지.

---

# 2026-10-18 · P-013 2026 총운 화면 연말 특가 표시 연결 병합(Gemini 구현, Claude 검토)
- 결정서: `docs/uiux/decisions/P-013.md`. 커밋 831b640.
- 왜: 홈 연말 특가 배너는 2주간 430명이 봤지만 특가 시작(10-13) 뒤 2026 총운 결제 0건. 배너가 보내는 `/ko/fortune/annual?year=2026`에는 특가 표시가 없고, 5대 영역 카드마다 같은 문장이 5번 반복, 점수 꼬리표가 "대길·길함".
- 바꾼 것(`AnnualFortuneClient.tsx`): `getAnnualSeasonPromo(year, now)` — 특가 중인 연도만 입력 화면 한 줄("연말 특가 · 전체 리포트 4,900원 → 3,000원 · 12/31까지")과 결과 화면 가격 3곳(위 띠·단건 안내·하단 바)에 취소선 + "연말 특가 · 12/31까지" 꼬리표. 값은 모두 `lib/catalog.ts`에서, 특가가 끝나면 저절로 사라짐. 2027은 그대로. 반복 문장은 카드 아래 한 번("영역마다 좋은 때와 조심할 때…"). 점수 꼬리표 쉬운 말(`getAnnualScoreRating`).
- 검토: diff 직접 확인, 수정 없음.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 480 통과 · build exit 0 · 만세력 0건.
- 판정(14일, 11-01): 2026 총운 결제(10-13~10-18 0건), annual_2026 checkout_open. 결제가 계속 없으면 화면이 아니라 상품(10월에 "2026 한 해") 문제로 보고 사장님께 배너에 2027 신년운을 넣는 안을 제안.

---

# 2026-10-19 · P-014 외국인용 무료 궁합 1단계(en/ja/zh) + 반지대학 언어 선택 화면 병합(Gemini 구현, Claude 검토)
- 결정서: `docs/uiux/decisions/P-014.md`(사장님 10-19 결정: 반지대학 홍대·명동 외국인 40~50% → 영어·일본어·중국어 간체, 궁합만, 결제는 2단계 페이팔 $4.99). 커밋 8adb000(A) · 9a2a7da(B) · a9dda72(C).
- A: `/ko/welcome` 언어 선택(휴대폰 언어 버튼 강조, 자동 이동 없음, utm 전달, `welcome_language_click`) → 한국어 `/ko/compat/new`, 외국어 `/{en|ja|zh}/couple`. 외국어 화면은 `components/global/`에 새로 만듦(한국어 Compat 컴포넌트 미사용). 결제·잠금·세트 없음. 키워드·세부 점수 번역 표는 `messages/{en,ja,zh}.json` `Couple`. `/welcome`·`/couple`·`/legal`에서는 한국어 Navbar/Footer 대신 `GlobalChrome`. `kd-ringuniv` 도착 `/welcome`.
- B: `Compatibility.locale`(추가 칸, 운영 DB에 Claude가 10-19 `ALTER TABLE … ADD COLUMN IF NOT EXISTS "locale" TEXT` 적용). `generate-compat`은 요청이 아니라 궁합의 locale로 언어 결정, `buildCompatPrompt(…, lang)` 외국어 분기(한국어 경로 문자열 불변 — 테스트), `validateCompatOutputLanguage`(한글 0, 영어는 한자 0) 실패 시 1회 재생성. `LOCALE_CONFIG.zh`.
- C: `/{en|ja|zh}/legal/{terms,privacy,refund}` 영어 한 벌(noindex), 외국어 공유 카드.
- 검토: diff 직접 확인, 수정 없음. 참고 — 외국어 무료 해석의 "아직 말하지 않은 것" 줄은 답(심층 궁합)이 2단계라 지금은 열린 질문으로만 남는다.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 494 통과 · build exit 0 · `.next/static` 만세력·프롬프트 0건.
