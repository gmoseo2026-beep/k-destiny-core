# 콩닥 — claim 연동 보완 (A안: 이메일 일치 추가 허용) Gemini 지시문

## 배경 / 문제
게스트 결제 후 계정 연동이 지금은 **httpOnly `kd_claim` 쿠키 단일 경로**뿐이라, 쿠키를 잃으면(다른 기기/브라우저에서 로그인, PG 인앱브라우저 결제, 시크릿창, 카카오 무이메일) **정당한 구매자도 스스로 연동 불가 → CS행**. 실제 E2E에서 이 케이스가 발생함(주문은 PAID·claimToken 발급·userId=null 정상인데 브라우저에 쿠키가 없어 `claimable:false`).

## 목표
쿠키 경로는 **그대로 유지(primary)**하고, 쿠키가 없을 때를 위한 **2차 허용 경로**를 추가한다:
> **로그인한 사용자의 (OAuth로 검증된) 이메일 == 주문의 결제 이메일** 이면, 해당 미연동 PAID 주문을 연동 허용.

**이건 "차단 조건"이 아니라 "추가 허용" 경로다.** 이전에 제거한 email 403 차단(H-7)을 되살리는 게 아니라, 소유권 증명 수단을 하나 더 여는 것.

## ★보안 가드 (반드시 — Opus5 재검수 대상)
1. **OAuth 검증 이메일만 허용.** credentials(이메일+비번) 가입은 이메일 인증 절차가 없어(register가 emailVerified 미설정), 공격자가 피해자 이메일로 가입해 그 이메일의 게스트 주문을 가로챌 수 있다. 따라서 이 경로는 **해당 유저가 google/naver/kakao 소셜 계정을 가진 경우에만** 허용:
   ```ts
   const oauthAcct = await prisma.account.findFirst({
     where: { userId: session.user.id, provider: { in: ["google", "naver", "kakao"] } },
     select: { id: true },
   });
   // oauthAcct 없으면 이메일 일치 경로 사용 금지(쿠키 경로만).
   ```
2. **이메일 비교는 대소문자 무시, 양쪽 trim.** `session.user.email`이 없으면(카카오 무이메일) 이 경로 자체가 불가 → 그 사용자는 쿠키 경로로만.
3. 대상 주문은 **`status=PAID` + `userId=null`(미연동)** 만. 이미 연동된 주문은 기존 409 로직 유지.
4. compatId는 클라이언트가 보내지만(결과 페이지의 `data.id`), **이 경로에선 안전**하다: 반드시 `order.email == 본인 검증 이메일`이어야 매칭되므로, 남의 주문 compatId를 넣어도 이메일이 안 맞아 못 가져간다. 그래도 compatId는 형식 검증(문자열)만 하고 신뢰 판정엔 쓰지 말 것.

## 구현

### 1) `app/api/user/claim-unlock/route.ts` — POST
- 쿠키(`kd_claim`) 기반 조회는 **그대로 유지(1순위)**.
- 쿠키로 주문을 못 찾았을 때만 아래 2차 경로 실행:
  - body에서 `compatId`만 다시 받는다(형식: non-empty string). (H-7 때 body 파싱을 없앴지만, 이 경로 한정으로 compatId만 허용 — 위 가드4로 안전.)
  - `session.user.email` 있고 + OAuth 계정 보유(가드1) 확인.
  - 주문 조회:
    ```ts
    order = await prisma.order.findFirst({
      where: {
        compatId,                    // Compatibility.id (cuid)
        status: "PAID",
        userId: null,
        email: { equals: session.user.email, mode: "insensitive" },
      },
      orderBy: { createdAt: "asc" },
    });
    ```
  - 찾으면 **기존 연동 트랜잭션 로직 그대로**(Unlock.userId, Order.userId, 최초주문 Compatibility 귀속). claimToken 소각은 이 경로에선 대상 아님(쿠키 아님) — Order.userId만 세팅.
- 쿠키로도, 이메일로도 못 찾으면 기존처럼 404.
- **주의:** 쿠키 경로 실패 시 `failAndClearCookie`로 쿠키를 지우는데, 이메일 경로를 시도하기 전에 지우지 말 것. 순서: (a) 쿠키 있으면 쿠키로 조회 → 성공 시 처리, (b) 쿠키로 못 찾고 이메일 경로도 실패해야 최종 실패 응답. 쿠키 삭제는 최종 실패 응답에서.

### 2) `app/api/user/claim-unlock/route.ts` — GET (배너 노출 판정)
- 지금은 쿠키만 확인. **query `?compatId=` 를 받아**, 쿠키로 claimable 아니면 위와 동일한 이메일 일치 조건으로 한 번 더 확인해서 `{claimable:true, compatId}` 반환.
- 상태 변경 없음(SELECT만). 가드1(OAuth 계정)·가드2(이메일) 동일 적용.

### 3) `components/CompatResultClient.tsx`
- 마운트 시 GET 호출에 **`?compatId=${data.id}` 추가**:
  ```ts
  fetch(`/api/user/claim-unlock?compatId=${encodeURIComponent(data.id)}`)
  ```
- "연동하기" POST는 이미 `body: { compatId: data.id }`를 보내므로 그대로 두면 됨(2차 경로가 이 compatId를 사용).

## 검증
1. `npx tsc --noEmit` + `npm run build` 통과.
2. 변경 파일 목록 보고 → 커밋 → `python scripts/safe_deploy.py`(Deploy VERIFIED 확인).
3. **E2E 2케이스:**
   - (쿠키 경로) 같은 브라우저 연속: 로그아웃→게스트결제→"보관하기"→로그인→결과서 "연동하기" 성공.
   - (이메일 경로) 쿠키 없는 상태: 결제 이메일과 **같은 이메일의 구글/네이버 계정**으로 다른 브라우저에서 로그인→결과 페이지→"연동하기" 성공. **다른 이메일이면 안 떠야** 정상(음성 케이스도 확인).
4. **Opus5 재검수 필수**(claim-unlock GET/POST): OAuth 검증 가드 우회, 이메일 위조, compatId 조작으로 타인 주문 탈취 가능성 집중 점검.

## 남는 한계(문서화)
- 카카오 무이메일 + 쿠키 소실 사용자는 여전히 자가 연동 불가 → 어드민 수동 연동(기존) 또는 향후 (B)안 "결제 이메일 인증코드" 도입으로 커버. 유료 본격화 시 (B) 검토.
