# 콩닥 Opus5 보안 재검수 요청 — 신규 3개 변경 (탈퇴 · claim 토큰 연동 · 로그인 디자인)

## 컨텍스트
이전 오픈게이트(C-1, H-1~H-5, M-1, M-2)는 이미 수정·배포 완료(Cowork 프리체크 통과). 이번 재검수는 **그 이후 추가된 3개 변경**만 대상. 결제-권한 경계를 다시 건드렸으니 **adversarial**하게 봐줘. 스택: Next.js App Router, Prisma+Supabase, NextAuth v4(카카오/네이버/구글/Credentials), PortOne v2. 배포는 `prisma db push`(additive).

## 검수 대상 파일
- `app/api/admin/users/delete/route.ts` (신규 — 회원 영구 삭제)
- `app/api/payments/complete/route.ts` (수정 — claim 토큰/쿠키 발급 추가)
- `app/api/user/claim-unlock/route.ts` (수정 — 이메일 일치 차단 제거, 토큰 기반 귀속)
- `prisma/schema.prisma` (Order에 `claimToken @unique`, `claimTokenExpiresAt` 추가)
- (참고) `components/DashboardView.tsx`, `components/CompatResultClient.tsx` (쿠키 감지 자동 연동), `app/[locale]/login/page.tsx`(디자인만 — 보안 무관)

## Cowork가 먼저 발견한 확인 필요 지점 (우선 판정 요청)

### ★1. claim-unlock의 orderId 폴백이 권장안 A를 부분 무력화 (claim-unlock L32~37)
- 설계 의도: 결제 완료 시 브라우저에 심는 httpOnly `kd_claim` 토큰 소유로만 귀속(이메일 무관, 유출 방지).
- 그런데 토큰이 없으면 **body의 `orderId`로 주문을 찾아 그대로 귀속**하는 하위호환 경로가 있음. 이 경로엔 **claimToken/만료 검증이 없어**, orderId(공유 결과 링크 등으로 노출될 수 있는 값)만 알면 **미연동(userId=null) 주문을 타인이 자기 계정에 선점 귀속** 가능.
- 판정 요청: 이 폴백을 **제거**할지, 유지 시 리스크(접근권이 아니라 "기록 귀속" 한정)가 수용 가능한지. orderId가 공개 바이럴 링크(shareToken)에 절대 노출되지 않는지도 교차 확인.

### ★2. claimToken이 complete 응답 본문에도 반환됨 (complete L46~55)
- `kd_claim`은 httpOnly로 심는데, 동일 `claimToken`을 **JSON 응답 본문으로도 반환**함(게스트 열람용 orderId와 함께). 클라 JS가 토큰을 읽어 부주의하게 저장/노출할 여지. httpOnly의 이점이 약화되는지, 본문 반환이 실제로 필요한지(자동 연동은 서버가 쿠키로 처리하므로 본문 토큰 불필요해 보임) 판정.

## 위협 모델별 확인 체크리스트

**A. 회원 삭제 (admin/users/delete)**
- 비관리자 접근 차단(`getAdminSessionOrThrow`), 관리자 계정/본인 삭제 차단 가드 우회 가능성.
- 트랜잭션 원자성: `Unlock.userId`/`Compatibility.userId` 수동 null → `User.delete`(Cascade: Profile/Account/Session/Subscription/PurchasedReport/WeeklyFortune, SetNull: Order/PushSubscription). **과삭제(특히 Order 소실)·orphan·FK 오류** 없는지.
- 전자상거래법: Order가 `userId=null`로 실제 보존되는지(삭제 안 됨).
- 영구 삭제 액션이므로 감사로그(`USER_DELETE`, 이메일 마스킹) 항상 남는지, IDOR(임의 userId 삭제)·마지막 관리자 잠금 시나리오.

**B. claim 토큰 연동 (payments/complete + claim-unlock)**
- 토큰 생성이 **PAID·금액 검증 성공 이후**에만 일어나는지(결제 코어 로직 훼손 없이 additive인지).
- `first-claim-wins`: 정당한 결제자보다 **타인이 먼저 귀속**할 수 있는 경로(쿠키는 브라우저 귀속이나, ★1 orderId 폴백 포함).
- 쿠키 속성: httpOnly/Secure(프로드)/SameSite=Lax/Path/만료 90일 적절성, OAuth 왕복 유지 vs CSRF 노출.
- 이미 귀속된 주문 재귀속 차단(order.userId, unlock.userId 409), 만료 토큰 거부.
- 이메일 차단 제거가 **열람 권한(entitlement)에는 영향 없는지**(isEntitled는 userId/orderId 기반 유지) — 회귀 확인.

**C. 회귀 (이전 오픈게이트 유지)**
- claim-unlock을 다시 손댔으므로 H-1(Order.id vs orderId 키), M-7(최초 주문자만 Compatibility 귀속)이 **여전히 올바른지** 재확인.

## 산출물
- 심각도(Critical/High/Medium/Low)별 findings + 각 항목 재현 시나리오 + 최소 수정안.
- **오픈 가부 판정**(blocker 유무)과 ★1/★2에 대한 명확한 결론.
