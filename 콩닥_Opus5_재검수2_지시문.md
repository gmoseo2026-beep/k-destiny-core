# 콩닥 Opus5 재검수 요청 (2차) — claim 이메일 폴백 경로

## 컨텍스트
이전 오픈게이트(C-1, H-1~H-8, M-*, L-*)는 수정·배포·검증 완료. 이번 변경은 그 위에 추가된 **claim 연동의 2차(이메일 일치) 폴백 경로**뿐이다. 결제-권한 경계라 adversarial하게 봐줘.

**배경:** 게스트 결제 후 계정 연동이 httpOnly `kd_claim` 쿠키 단일 경로뿐이라, 쿠키 유실 시(다른 기기/브라우저, PG 인앱브라우저, 카카오 무이메일) 정당 구매자가 자가 연동 불가 → CS. 이를 완화하려 **쿠키가 없을 때만** 이메일 일치 폴백을 추가함.

## 검수 대상
- `app/api/user/claim-unlock/route.ts` (GET, POST)
- `components/CompatResultClient.tsx` (GET에 `?compatId=` 전달, POST body `{compatId}`)
- 관련: `app/api/auth/[...nextauth]/route.ts`(emailVerified/role), `app/api/auth/register/route.ts`(password 설정 지점), `prisma/schema.prisma`(User.password, Account, Order)

## 현재 구현 요약 (검증해줘)
1. **1차(쿠키) 경로**: `kd_claim` httpOnly 쿠키 → `order.claimToken` 조회 → PAID·미만료·미연동이면 연동, 성공 시 `claimToken`/`claimTokenExpiresAt` 소각 + 쿠키 삭제. (변경 없음)
2. **2차(이메일) 경로** (쿠키로 못 찾았을 때만):
   - 클라가 보낸 `compatId`(=Compatibility.id) 사용.
   - **진입 가드**: `emailPathEligible = !!oauthAcct && dbUser != null && dbUser.password == null`
     - `oauthAcct` = 해당 userId의 google/naver/kakao Account 존재.
     - `dbUser.password == null` = credentials 가입(비번 보유)자를 배제(이메일 미검증 선점 공격 차단).
   - 주문 조회: `{ compatId, status:'PAID', userId:null, email: { equals: session.email, mode:'insensitive' } }`, `orderBy createdAt asc`.
   - 매칭 시 연동(Order.userId·Unlock.userId 세팅, 최초 주문이면 Compatibility 귀속). **이메일 경로는 claimToken 소각 대상 아님.**
3. GET(배너 판정)도 동일 가드로 claimable 계산(상태 변경 없음).

## 집중 점검 포인트
1. **가드 우회**: `password == null && OAuth 계정 보유`가 "세션 이메일 = provider 검증 이메일"을 실제로 보장하는가?
   - 우리가 막으려는 공격: 공격자가 credentials로 피해자 이메일 선점 가입(password 세팅) → 소셜 연결 → 피해자 결제 탈취. 현재 가드가 `password != null`로 이를 막는다. **검증**: password가 null이 될 수 있는 다른 경로(OAuth 가입 외)가 있는가? register 외에 password를 세팅하는 코드가 있는가? OAuth 유저가 나중에 비번을 설정하는 플로우가 있는가? (있다면 가드 전제가 깨짐)
   - **계정 연결(account linking)**: 순수 OAuth 유저(A의 구글)가 자기 계정에 **다른 이메일의 다른 provider**를 연결하면 User.email과 세션 email이 어긋날 수 있는가? NextAuth 설정상 User.email이 어떻게 갱신되는지 확인.
2. **compatId 조작 IDOR**: 공격자가 임의 compatId를 넣어도 `email == 본인 세션 이메일` 조건 때문에 타인 주문을 못 가져가는지(양성/음성).
3. **first-claim-wins & 경쟁**: 동시 요청/이미 연동된 주문(order.userId, unlock.userId) 재귀속 차단(409) 유지.
4. **엔타이틀먼트 회귀**: 이메일 차단 제거·2차 경로 추가가 `isEntitled`(userId/orderId 기반 열람)에 영향 없는지. 쿠키 경로 소각 로직 회귀 없는지(H-6/L-6).
5. **정보 노출**: 실패 응답·GET가 주문 존재 여부/타인 이메일을 유추하게 하지 않는지.

## 이미 확인된 사실(참고)
- 쿠키 경로 E2E 통과: 게스트 결제(gmoseo@naver.com) → 다른 이메일 구글(gmoseo2020) 로그인 → 쿠키로 연동. DB상 order.userId·unlock.userId가 로그인 계정과 일치, claimToken/expiry 소각 확인.
- 이메일 2차 경로는 아직 동적 테스트 안 됨 → **정적 검수로 커버 요청**(양성: 동일 이메일 순수 OAuth, 음성: 다른 이메일·credentials 유저).

## 산출물
- 심각도별 findings + 재현 시나리오 + 최소 수정안, **오픈 가부 판정**. 특히 점검 1(가드 전제)이 견고한지 명확한 결론.
