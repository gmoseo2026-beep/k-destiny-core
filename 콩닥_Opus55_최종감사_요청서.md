# 콩닥(kongdak) 전면 개편 — 최종 종합 감사 요청 (for Opus 5.5)

안녕하세요. 콩닥 서비스 대개편의 **마지막 검증**을 부탁드립니다. 아래 컨텍스트를 먼저 숙지하신 뒤, 실제 배포될 코드를 직접 열어보고 **6개 축(코딩·보안·서비스구조·디자인·성능·성공가능성)**을 감사해 주세요. 이건 실제 상용 서비스이고 결제가 걸려 있어 정확성이 최우선입니다.

---

## 0. 검증 원칙 (반드시)
- **추측 금지, 실제 코드 확인.** 커밋된 실제 파일을 열어 근거로 판단해 주세요. (요약/보고서 신뢰 X)
- **배포하지 마세요.** 발견사항 리포트만. 배포는 사장님이 최종 결정.
- 결제/권한/redaction 등 **보안 민감 코드는 특히 정밀하게.**

## 1. 서비스 개요
- **콩닥** = 한국 2030 여성 타깃 **사주·궁합 웹서비스** (`kongdak.kr`). 마스코트 "두근이" + 감성 톤.
- 스택: **Next.js 15/16 App Router(Turbopack), Prisma + Supabase(Postgres), NextAuth v4, PortOne v2(KG이니시스 카드결제), Tailwind v4.** 서버: Contabo. AI 생성: Google Gemini.
- 사업자: 디아이컴퍼니. 목표: **안정적 매출 확보 → 차기 서비스 개발 자금.**

## 2. 왜 개편했나 (배경)
- 유입은 있었으나 **결제 0**. 원인 진단: ①인앱 브라우저(인스타/스레드)에서 KG이니시스 결제 불가 ②상품이 궁합·총운 2개뿐(얇음) ③관계상품 부재. GA4상 방문 대비 무료 완료율·결제 전환 붕괴.
- 그래서 **카탈로그 확장 + 디자인 개편 + 결제경로 수리 + 서버 일반화**를 4커밋으로 진행 중.

## 3. 비즈니스 모델 (성공가능성 판단에 필요)
- **사건재 모델**: 사주는 습관재 아님. 내 팔자는 안 변하니 총운은 연 1회(신년). **반복 매출 = "대상/사건이 바뀔 때"** — 특히 **관계/궁합**(상대가 바뀌면 재구매)이 핵심 엔진.
- **정기결제(구독) 불가**(PG 규정) → 구독 없앰. 상품 = **단품 + 세트**(+PERIOD_PASS 기간권은 레거시로 존재).
- 가격: **단품 6,900(첫결제 4,900) / 세트 12,900 / 신년세트 16,900.** 디지털재라 **마진 ~96%**(PG 3.3% + AI 수십원 + 서버 월 1.2만).
- 손익분기 ≈ 월 방문 2,500명. 목표 월순익 300만 ≈ 방문 1.2만/월. **승부처 = 스레드(무료) 유입 + 관계 카테고리 재구매 + 신년(12~2월) 대목.**
- 경쟁: 사주레시피(개당 1만원대·다품목·명리감수·스레드 500만뷰), 사주아이(990원 원조). 콩닥 차별점 = 두근이 감성 + 매일 데일리 + 관계 깊이.

## 4. 개편 구조 & 현재 상태
Gemini(개발)가 아래 커밋 순서로 작업, 각 단계 프리체크:
- **커밋 A(완료):** 디자인 시스템(Tailwind v4 토큰: 화이트 베이스 + coral #FF3E6C + 카테고리 컬러, 탈파스텔) + 공통 ui 컴포넌트(Button/Card/Tag/Badge/ScoreGauge/ReportSection) + Navbar.
- **커밋 B(완료):** `lib/catalog.ts`(단품 15 + 세트 6) + 상품상세/입력폼/홈 개편.
- **커밋 C(완료·이슈있었음):** 결제 배선 + 디자인 토큰 적용. (당시 비annual 상품 dead-end·pay-without-unlock 발견 → Option B로 전환)
- **커밋 D(진행중):** 서버 확장으로 전 상품 결제→열람 완성.
  - **D1(완료):** order route가 catalog에서 서버권위 가격·productType/productKey 결정 + grant가 Unlock 생성 + entitlement 게스트 claim 경로.
  - **D1.1(완료):** 관계/커플세트 열람을 **compatId까지 일치**해야 부여(상대 무제한 열람 매출누수 차단).
  - **D2(방금 완료 — 이번 감사 핵심):** 콘텐츠 생성 일반화 + 권한기반 redaction. 상품별 프롬프트, 연도 파라미터화(2027 버그 수정), 관계상품 compatId, 결정론 점수.
  - **D3(미착수):** 프런트 최종 배선(스텁 제거, 가격라벨, 세트 UI, 인앱가드 전상품) + 마감.

## 5. 🔒 보안 불변식 8개 (감사 시 각각 검증)
1. **서버 권위 가격** — 금액은 서버가 `lib/catalog.ts`에서 결정, 클라 금액 무시.
2. **서버 redaction** — 미entitled(비회원·미결제)에게 **유료 본문 0바이트**, 티저만. (클라 블러 금지)
3. **금액 검증** — complete에서 `payment.amount === order.amount` 대조.
4. **게스트 claim 토큰** — kd_claim httpOnly·7일·claimToken:null 단일발급 가드.
5. **Unlock.expiresAt 유일 출처(fail-closed)** — 행 없으면 거부.
6. **결정론 점수** — 미리보기 점수 == 결제 후 점수.
7. **소유권 검증(IDOR 방지)** — 유료 열람은 userId 또는 orderId(claim) 증명 필요. **관계상품은 compatId까지 일치.**
8. 기존 하드닝 주석(H-2/H-6/M-5/M-8/M-9 등) 로직 보존.

## 6. 감사 요청 항목 (6축)
**① 코딩 품질:** 타입안전성, 에러핸들링, 중복/데드코드, 컴포넌트 재사용성, 유지보수성. (예: `FortuneNewClient` 등에 남은 스텁/TODO·`// depending on your API` 류 미완성 흔적)
**② 보안(최우선):** 위 불변식 8개 전수 검증. 특히 **D2 생성 라우트가 미결제자에게 유료 본문을 진짜 0바이트로 막는지**, 관계상품 compatId 스코핑, rate limit, 입력검증, PII(비회원 미저장), 웹훅/claim 재사용 공격.
**③ 서비스 구조:** catalog→order→grant→entitlement→generate→열람 흐름의 **일관성**(productType/productKey 규칙, annual 콜론형 "ANNUAL:2026", 세트↔구성품 판별, 캐시 키). 데드링크(미완성 상품 노출 여부).
**④ 디자인:** 탈파스텔/사주레시피 벤치 달성도, 토큰 일관성(옛 #FF5C77/#FFF6F1 잔재), 모바일 우선, 접근성(대비·포커스), 신뢰감/전환 설계(잠금·CTA).
**⑤ 성능:** Gemini 생성 지연(thinkingBudget:0·maxOutputTokens 적정성), DB 쿼리 N+1/인덱스, 캐시 전략, 번들 크기, LCP.
**⑥ 성공 가능성(냉정하게):** 사건재+관계반복+신년 모델의 현실성, 가격/전환/유입 가정의 타당성, 사주레시피·사주아이 대비 차별성과 승산, 최대 리스크 3가지와 보완책.

## 7. 감사할 핵심 파일
- 결제·권한: `app/api/payments/order/route.ts`, `.../complete/route.ts`, `lib/payments/grant.ts`, `lib/payments/client.ts`, `lib/entitlement.ts`
- 생성·redaction: `app/api/fortune/annual/route.ts`, **D2 신규 생성 라우트**, `lib/destinyGen.ts`, `lib/catalog.ts`
- 프런트: `components/FortuneNewClient.tsx`, `components/CompatNewClient.tsx`, `components/CompatResultClient.tsx`, `app/[locale]/products/[id]/page.tsx`, `components/ui/*`, `app/globals.css`
- 인앱: `lib/inAppBrowser.ts`
- 참고 문서(있으면): `REVIEW_HANDOFF.md`, 루트의 `콩닥_통합_실행스펙`/`콩닥_커밋D_서버확장_지시문` 등 핸드오프 md.

## 8. 산출물 형식 (이렇게 주세요)
1. **심각도별 발견사항**: 🔴Blocker / 🟠High / 🟡Medium / ⚪Low — 각 항목에 파일·라인·근거·수정안.
2. **D3 착수 전 반드시 고칠 것**(Blocker/High) 체크리스트.
3. **배포 가능 여부 판정** + 남은 위험.
4. **성공 가능성 소견**(냉정한 현실 평가 + 우선순위 3가지).

첨부: 아래는 방금 완료된 **D2 작업 결과 보고**입니다. 이 보고를 그대로 믿지 말고 실제 코드로 교차검증해 주세요.

---

### [여기에 D2 결과 보고 붙여넣기]
(Gemini가 보낸 D2 커밋 요약·변경파일·커밋해시를 그대로 붙여주세요.)
