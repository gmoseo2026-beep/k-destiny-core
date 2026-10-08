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
