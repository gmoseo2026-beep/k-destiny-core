# 콩닥 커밋 D — 서버 확장(전체 카탈로그 결제→열람 완성) Gemini 지시문

> 목표: 카탈로그 전 상품(단품 15 + 세트 6)이 **실제로 결제→열람까지** 되게 서버를 안전하게 확장.
> 검증: **서브커밋 D1→D2→D3** 순서로, 각 단계 build+tsc 통과 후 커밋 → Opus5 프리체크 → 다음 단계. 배포는 D3 프리체크 통과 후.
> 배경: 스키마·권한이 이미 productType/productKey/Unlock/claimToken 기반으로 일반화돼 있음. **없는 조각만 채우는 작업**이지, 재작성이 아님.

---

## 🔒 보안 불변식 (INVARIANTS — 절대 훼손 금지)
확장하되 아래는 반드시 그대로 유지/적용:
1. **서버 권위 가격**: 결제 금액은 **서버가 CATALOG에서 조회해 결정.** 클라가 보낸 price/amount 절대 신뢰 금지.
2. **서버 redaction**: 미entitled(비회원·미결제)에겐 **티저만**, 유료 본문 0바이트. 클라 블러 금지.
3. **금액 검증**: complete에서 `payment.amount === order.amount` 대조 유지.
4. **게스트 claim 토큰**: kd_claim httpOnly·7일·claimToken:null 단일발급 가드 유지.
5. **Unlock.expiresAt이 유효기간 유일 출처**(fail-closed). 행 없으면 거부.
6. **결정론 점수**: 미리보기 점수 == 결제 후 점수.
7. **소유권 검증**: 유료 열람은 userId 또는 orderId(claim)로 소유 증명된 경우만(IDOR 금지).
8. 기존 하드닝 주석(H-2/H-6/M-5/M-8/M-9 등) 로직 보존.

---

## 현재 상태 (확인됨)
- `Unlock`(userId, productType, productKey, compatId, expiresAt), `Order`(…, productType, productKey, claimToken), `isEntitled({productKey})`, `applyPaidOrder`(grant), complete의 claim/kd_claim = **이미 일반화 구조 존재.**
- **빠진 것:**
  - order route: ANNUAL_2026만 productType/productKey·가격 세팅. **일반 SINGLE은 productType/productKey 미설정 + 가격이 1900/2900 고정**(세트 12900 반영 안 됨).
  - isEntitled: productKey 언락이 **userId 경로만** 있고 **게스트(orderId/claim) 경로 없음** → 게스트가 단품 결제해도 열람 불가.
  - 생성: annual/compat/weekly/daily만 존재. **나머지 상품 생성 엔드포인트 없음.** annual은 year=2026 하드코딩(2027 불가).
  - 클라: 비annual은 "준비중" 스텁, 가격라벨 1900 하드코딩.

---

## D1 — 결제 백엔드 일반화 (UI 변경 없음)

**목표:** 어떤 catalog productId든 올바른 가격·productType/productKey로 주문 생성 + 결제 시 Unlock 생성 + 게스트 열람 권한 판정.

1. **order route(`app/api/payments/order/route.ts`)**: 요청에 `productId` 받기 → `lib/catalog.ts`의 `getProduct(productId)`로 서버에서 조회.
   - 금액 = 서버가 CATALOG.price로 결정(세트 12900, 신년세트 16900, 단품 6900). **첫 결제 할인**은 기존 로직 유지하되 상품군별로: 단품 첫구매 4900(해당 productType 과거 PAID 없을 때), 세트는 정가.
   - `productType` = 상품 type(FORTUNE/COMPAT/SET), `productKey` = productId. couple 상품은 compatId 연결.
   - 알 수 없는 productId → 400. (기존 ANNUAL_2026 분기는 productKey 규칙만 통일되게 유지 or 일반 경로로 흡수)
2. **grant(`lib/payments/grant.ts`, applyPaidOrder)**: 주문의 productType/productKey/compatId로 **Unlock 생성(90일 expiresAt)** 되는지 확인·일반화. (compat는 기존대로 compatId, 개인/세트는 productKey 기준.)
3. **isEntitled(`lib/entitlement.ts`)**: productKey 언락에 **게스트 경로 추가** — `orderId`(claim) 주어지면 해당 PAID order의 productKey와 대조 + 유효 Unlock 있으면 통과. (compat의 orderId 경로와 동일 패턴, M-5 fail-closed 유지.)
4. 세트: 세트 결제 시 구성 단품 각각에 대한 열람권을 부여(세트 productKey 하나로 묶어 판정하거나, 구성 productKey 각각 Unlock 생성 — 택1, 일관되게).

**D1 완료기준:** 타입상 모든 상품이 올바른 금액으로 주문 생성되고, 결제(모의/실제) 시 Unlock 생성 + 회원/게스트 모두 entitlement 판정. build+tsc 통과. **이 단계엔 생성/화면 변경 없음.**

---

## D2 — 콘텐츠 생성 일반화 + redaction

**목표:** productId별 리포트 생성 엔드포인트. 미entitled 티저 / entitled 전체, 서버 redaction 동일.

1. **범용 생성 라우트**(예 `app/api/fortune/generate/route.ts` 또는 productType별): 입력(사주/상대사주) + productId → `lib/catalog.ts` promptKey → `lib/destinyGen.ts`의 해당 프롬프트 빌더로 생성.
   - **destinyGen에 상품별 프롬프트 추가**(promptKey: wealth_analysis, career_analysis, reunion, inner_mind, cheating_tendency, marriage_compat, conflict_resolution, secret_love, charm_analysis, love_single_analysis, health_analysis, spicy_annual, personality_basic 등). **AI스러움 배제 규칙**(구어체·구체·상투구 금지) 적용.
   - **연도 파라미터화**: annual의 year=2026 하드코딩 제거 → productId(annual_2026/2027)에 따라 연도 주입. (2027이 2026 내용 뱉는 버그 수정)
   - 관계 상품: 상대 생년월일 입력 필요(compat 계산 재사용).
   - 세트: 구성 단품들을 생성해 묶어 반환 + 종합 대시보드용 데이터.
2. **redaction**: 미entitled → 점수+헤드라인+훅/티저만. 전체 본문·타임라인은 서버에서 제외. entitled(회원 Unlock or 게스트 claim)만 전체. (annual route의 A/B 패턴 그대로 복제.)
3. **결정론 점수**: 상품별 점수 함수(기존 calculateAnnualYearScore/compat 점수 재사용 또는 확장)로 미리보기==결제후 일치.
4. 결과 캐시: (userId 또는 guest, productKey, 입력해시)로 저장(재열람·환불판정). 신규 테이블 필요 시 **additive 마이그레이션**만(파괴적 변경 금지), 스키마/마이그레이션 계획 먼저 보고.

**D2 완료기준:** 각 productId가 티저→(권한 시)전체를 서버 redaction 지켜 반환. 2027 정상. build+tsc 통과.

---

## D3 — 프런트 배선 + 마감

1. `FortuneNewClient`·`CompatNewClient`/결과: **productId를 생성·결제에 전달.** "준비중" 스텁 제거, 모든 개인/관계/세트 상품이 입력→티저→결제→전체열람까지 동작.
2. `requestPortOnePayment`: productId 전달, order route가 가격 결정. **가격 라벨은 CATALOG에서**(1900 하드코딩·`// depending on your API` 주석 제거).
3. 세트 상세/결제/열람 동선(구성 리포트 묶음 표시).
4. 인앱 결제가드(blockPaymentIfInApp)·게스트 결제 모달 전 상품 적용.
5. 디자인 토큰 잔재 정리(#FF5C77/#FFF6F1 남은 것 → coral/cream).
6. 총운(annual)은 기존 강한 플로우 유지(후퇴 금지).

**D3 완료기준:** 카탈로그 노출 전 상품이 실제 결제→열람. 죽은 링크 0. build+tsc 통과. **커밋만, 배포 전 Opus5 프리체크.**

---

## 보고 (각 서브커밋)
변경 파일 + 핵심 diff + build/tsc 로그 + (D1/D2) 위 불변식 8개 준수 자가확인 체크. 그러면 Opus5가 D1·D2·D3 각각 프리체크 후 배포 승인.

## 특히 프리체크에서 볼 것 (Gemini는 미리 자기검열)
- 가격이 서버 CATALOG에서만 결정되는가(클라 금액 무시).
- 미결제 응답에 유료 본문 0바이트인가.
- 게스트 단품/세트 결제 후 실제 열람되는가(claim 경로).
- 세트 결제 1건이 구성 전체 열람권으로 이어지는가.
- 2027 등 연도 상품이 올바른 연도로 생성되는가.
