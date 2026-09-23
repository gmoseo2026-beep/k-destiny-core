# REVIEW_HANDOFF (커밋 C)

## ① 변경 파일 및 목적
- `components/FortuneNewClient.tsx`: 임시로 막아두었던(alert 스텁) 전체 리포트 열람 로직을 제거하고, `GuestCheckoutModal`과 `requestPortOnePayment`를 통한 단건 결제 연동 및 `blockPaymentIfInApp` 인앱 가드를 적용했습니다. (총운 `annual_2026`은 세션 없을 시 기존처럼 로그인 페이지로 리다이렉트).
- `lib/catalog.ts`: 상품 목록에 `isHidden` 속성을 추가하고, 미완성 혹은 표시를 원치 않는 상품(ex: 10년 대운 등)을 필터링하도록 로직을 변경했습니다.
- `app/[locale]/products/[id]/page.tsx`, `components/CompatNewClient.tsx`, `components/CompatResultClient.tsx`, `components/FortuneNewClient.tsx`: 과거의 `#FF5C77`, `#FFF6F1` 등 하드코딩된 헥스 컬러 토큰들을 `globals.css`의 최신 브랜드 컬러 디자인 토큰(`bg-coral`, `bg-cream`, `text-ink` 등)으로 모두 치환했습니다.

## ② 결정론 로직 요약
- 궁합 점수나 사주 계산식(결정론 로직) 자체는 커밋 C에서 변경되지 않았으며, UI 및 결제 연동에 집중했습니다.
- 상품 필터링 로직: `getAllProducts().filter(p => !p.isHidden)`

## ③ 테스트 결과
- `npx tsc --noEmit`: 타입 에러 없이 성공적으로 완료되었습니다.
- `npm run build`: 17개의 정적 페이지를 포함해 전체 빌드가 에러 없이 성공적으로(5.7s) 완료되었습니다.

## ④ 보안/PII/결제 변경점
- PII: 생년월일 처리 로직은 기존 방식을 유지합니다.
- 결제: 기존 검증된 `requestPortOnePayment`와 `verifyAndCompletePayment` 플로우를 `FortuneNewClient`에도 동일하게 이식했습니다. 게스트도 단건 결제를 완료할 수 있습니다.
- 보안(인앱 가드): 카카오/인스타 등 인앱 브라우저에서 결제창이 열리지 않고, Safari/Chrome 등 외부 브라우저로 열도록 안내하는 `blockPaymentIfInApp`를 일관성 있게 적용했습니다.

## ⑤ 스스로 의심 지점(리스크)
- `FortuneNewClient.tsx`에서 총운(`annual_2026`)은 요구사항 "총운은 기존 /fortune/annual 강한 플로우 후퇴 금지"에 따라 비회원일 경우 결제 모달 띄우지 않고 기존처럼 `sessionStorage`에 입력값 저장 후 로그인 화면으로 즉시 리다이렉트합니다. 이 분기 처리가 의도한 정책에 정확히 부합하는지 실 가동 확인이 필요할 수 있습니다.
- `CompatNewClient.tsx`나 기타 컴포넌트들에서 Tailwind 클래스(`bg-coral`, `bg-cream` 등)로 헥스 치환 작업 시, `opacity`가 적용된 경우(`bg-[#FFF6F1]/40`)도 `bg-cream/40` 등으로 적절하게 치환되었으나 Tailwind 설정 내 opacity 지원 여부에 따라 일부 투명도가 다르게 렌더링될 수 있습니다. 렌더링 후 육안 확인이 필요합니다.
