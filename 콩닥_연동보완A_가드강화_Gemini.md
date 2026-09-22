# 콩닥 — claim 이메일 경로 OAuth 가드 강화 (Gemini 지시문)

## 문제 (프리체크 발견)
`app/api/user/claim-unlock/route.ts`의 2차(이메일 일치) 경로 가드가 **"OAuth 계정 보유 여부"만** 검사한다. 이건 "세션 이메일이 OAuth로 검증됐다"를 보장하지 못해 우회 가능:
1. 피해자(victim@x.com) 미가입 상태에서
2. 공격자가 **credentials로 victim@x.com 가입**(register는 기존 유저만 막음, emailVerified 없음)
3. 공격자가 **자기 소셜계정을 그 계정에 연결** → "OAuth 계정 보유" 가드 통과 + 세션 이메일=victim@x.com
4. victim@x.com 결제 게스트 주문을 compatId만 알면 탈취

## 수정 원리
유저 생성 경로는 둘뿐: **(a) OAuth 가입 → `password = null`, 이메일은 provider가 검증** / **(b) credentials 가입 → `password` 있음, 이메일 미검증**. 따라서 이메일 2차 경로를 **`password == null`(순수 OAuth 유저)에게만** 허용하면, credentials로 남의 이메일을 선점하는 공격 벡터가 원천 차단된다. (순수 OAuth 유저의 세션 이메일은 항상 본인 provider 검증 이메일.)

## 구현 — `app/api/user/claim-unlock/route.ts`

GET·POST **양쪽**의 이메일 2차 경로 가드를, 기존 "OAuth 계정 존재" 확인에 더해 **"비밀번호 미설정(순수 OAuth)"** 조건을 추가한다.

기존:
```ts
const oauthAcct = await prisma.account.findFirst({
  where: { userId: session.user.id, provider: { in: ["google", "naver", "kakao"] } },
  select: { id: true },
});
if (oauthAcct) { /* 이메일 일치 주문 조회 */ }
```

수정:
```ts
// [보안 가드 1-강화] 이메일 2차 경로는 "비밀번호가 없는 순수 OAuth 계정"에게만 허용한다.
// credentials 가입자는 이메일 미검증이라, 남의 이메일을 선점해 그 이메일 게스트 주문을
// 탈취할 수 있다. password == null ⟹ OAuth 가입 ⟹ 세션 이메일은 provider 검증 이메일.
const dbUser = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { password: true },
});
const oauthAcct = await prisma.account.findFirst({
  where: { userId: session.user.id, provider: { in: ["google", "naver", "kakao"] } },
  select: { id: true },
});
const emailPathEligible = !!oauthAcct && dbUser != null && dbUser.password == null;

if (emailPathEligible) { /* 이메일 일치 주문 조회 (기존 로직 그대로) */ }
```

- **GET·POST 두 곳 모두** 동일하게 적용.
- 쿠키(1차) 경로는 **변경 없음**. 이메일(2차) 경로 진입 조건만 강화.
- 나머지 조회 조건(`compatId`, `status:PAID`, `userId:null`, `email insensitive 일치`)과 트랜잭션 로직은 그대로.

## 검증
1. `npx tsc --noEmit` + `npm run build` 통과.
2. 변경 파일 보고 → 커밋 → `python scripts/safe_deploy.py`(Deploy VERIFIED 확인).
3. 회귀: 쿠키 경로 정상, 순수 OAuth(구글/네이버/카카오) + 결제이메일 일치 시 이메일 경로 정상 동작.
4. **Opus5 재검수 대상**(claim-unlock GET/POST): 강화된 가드가 credentials-선점·계정연결 우회를 실제로 막는지 최종 확인.

## 한계(문서화)
- credentials(이메일+비번)로 가입한 정상 유저는 이메일 2차 경로 불가 → 쿠키 경로 또는 어드민 수동 연동 사용. (대부분 소셜 로그인이라 영향 작음.)
