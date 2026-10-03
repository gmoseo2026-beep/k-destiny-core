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
