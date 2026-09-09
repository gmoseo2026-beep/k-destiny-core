# 콩닥 Opus5 보안 재검수 결과 — 탈퇴 · claim 토큰 연동 · 로그인 디자인

검수일: 2026-09-09 / 대상: 이전 오픈게이트 패치 이후 추가된 3개 변경

검수 범위: `app/api/admin/users/delete/route.ts`, `app/api/payments/complete/route.ts`, `app/api/user/claim-unlock/route.ts`, `prisma/schema.prisma`

교차확인: `lib/entitlement.ts`, `lib/payments/grant.ts`, `lib/payments/client.ts`, `app/[locale]/pay/complete/page.tsx`, `components/DashboardView.tsx`, `components/CompatResultClient.tsx`, `components/Analytics.tsx`, `app/api/auth/[...nextauth]/route.ts`, `app/api/compat/route.ts`, `app/api/payments/order/route.ts`

---

## 0. 오픈 가부 판정

**조건부 오픈 불가 (blocker 3건).** H-6 · H-7 · H-8을 수정하기 전에는 오픈하지 않기를 권고한다. 세 건 모두 **결제 소유권 경계**를 직접 무너뜨리며, 수정 난이도는 각각 10줄 이내다.

| 번호 | 심각도 | 요약 | blocker |
|---|---|---|---|
| H-6 | **High** | `/api/payments/complete`가 무인증·무제한 재호출 가능 → claimToken 재발급/탈취 + 정당 구매자 토큰 무효화 | ✅ |
| H-7 | **High** | claim-unlock `orderId` 폴백 = 무검증 소유권 선점 (★1) | ✅ |
| H-8 | **High** | 탈퇴(삭제)된 사용자의 JWT가 계속 유효 — role 포함, 철회 수단 없음 | ✅ |
| M-8 | Medium | `kd_claim` 90일 + 무확인 자동 연동 → 공용 PC 구매 가로채기 | 권고 |
| M-9 | Medium | claimToken이 응답 본문에도 반환 (★2) — 불필요한 노출 | 권고 |
| M-10 | Medium | orderId가 `?paymentId=`로 GA4 `page_location`에 유출 (orderId는 열람 베어러 토큰) | 권고 |
| M-11 | Medium | 탈퇴 시 감사로그가 보장되지 않음 (에러 삼킴 + 트랜잭션 밖) | 권고 |
| M-12 | Medium | 탈퇴 후 주문이 "무주공산 claim 대상"으로 남음 (claimToken 미정리) | 권고 |
| L-2~L-7 | Low | §4 참조 | — |

**회귀 검사(C)는 전부 통과.** H-1(Order.id vs orderId 키), M-7(최초 주문자만 Compatibility 귀속), M-5(Unlock 행 없으면 거부)는 여전히 올바르다. 이메일 차단 제거는 열람 권한(entitlement)에 **영향 없음**을 코드로 확인했다.

---

## 1. ★1 / ★2 결론 (우선 판정 요청 항목)

### ★1 — orderId 폴백: **제거해야 한다 (수용 불가)**

Cowork의 지적이 맞다. 다만 **"기록 귀속 한정이라 수용 가능"이라는 완화 논리는 성립하지 않는다.** 근거 3가지:

1. **정당 구매자의 영구 락아웃.** 타인이 먼저 귀속하면 `order.userId`가 채워지고, 이후 진짜 구매자가 로그인해 연동을 시도하면 `claim-unlock/route.ts:56`에서 **영구 409**다. 자가 복구 경로가 없어 전부 CS 수동 처리로 떨어진다.
2. **PII 이전.** 귀속에 성공하면 `Compatibility.userId`까지 공격자에게 넘어가고(`claim-unlock/route.ts:106`), `/api/compat` GET(`app/api/compat/route.ts:200`)이 공격자 대시보드에 **두 사람의 이름·성별을 영구 노출**한다. 레코드에는 `fourPillars`(생년월일 역산이 가능한 준-PII)도 함께 남는다.
3. **권한의 성격이 바뀐다.** 게스트의 orderId 열람권은 `Unlock.expiresAt` 90일에 묶여 있지만, 계정 귀속은 `userId` 기반이라 **만료 이후에도 목록·기록으로 남는다.**

**shareToken 교차 확인 결과: 바이럴 링크에는 orderId가 절대 실리지 않는다.** 공유 링크는 `/{locale}/compat/{compatId}?ref={shareToken}` 형태뿐이고(`CompatResultClient.tsx:139`, `pay/complete/page.tsx:70`), `shareToken`은 `crypto.randomBytes(18)`이며 GET 응답에도 orderId는 포함되지 않는다. **다만 결제 리다이렉트 URL에는 실린다 — M-10 참조.**

> ⚠️ **중요: 폴백 제거만으로는 공격이 닫히지 않는다.** H-6 때문에 공격자는 orderId만으로 `/api/payments/complete`를 호출해 **정식 claimToken 쿠키를 새로 발급받을 수 있다.** ★1과 H-6은 반드시 함께 고쳐야 한다.

### ★2 — claimToken 응답 본문 반환: **제거해야 한다 (불필요함이 확인됨)**

전체 코드베이스에서 `result.claimToken`을 읽는 클라이언트가 **한 곳도 없다**(grep 검증 완료). 자동 연동은 서버가 `kd_claim` 쿠키로만 처리한다(`DashboardView.tsx:73`, `CompatResultClient.tsx:143`).

즉 현재 본문 반환은 **순수한 추가 공격면**이다. httpOnly의 이점을 실제로 무력화하는 조합은 다음이다:

- 본문으로 토큰이 JS 컨텍스트에 노출된다 (XSS·악성 확장·로깅 프록시가 읽을 수 있음)
- 그리고 `claim-unlock/route.ts:14`가 **body의 `claimToken`을 그대로 수용**한다

이 둘이 합쳐지면 "쿠키를 못 읽어도 토큰만 알면 귀속 가능"이 되어 httpOnly가 방어하려던 시나리오가 그대로 뚫린다. **본문 반환 제거 + body claimToken 수용 중단**을 함께 적용해야 httpOnly가 제값을 한다.

---

## 2. Blocker 상세

### H-6 (High) — `/api/payments/complete` 무인증 재호출 → claimToken 재발급/탈취

**위치:** `app/api/payments/complete/route.ts:18`, `:34-40`, `:58-64`

**원인.** 게스트 주문은 `order.userId`가 null이므로 L18의 소유권 가드가 통째로 통과한다. 그 뒤 로직에 **호출 횟수 제한도, 재발급 방지도 없다.** `applyPaidOrder`는 멱등이지만(`grant.ts:13`) 라우트는 그대로 진행해 **매 호출마다 claimToken을 새로 만들어 덮어쓰고**(`claimToken`은 `@unique`) 쿠키를 새로 심는다.

**재현 시나리오**

1. 공격자가 게스트 주문의 `orderId`를 입수한다 (M-10의 GA4 유출, 공용 PC 브라우저 히스토리, 결제완료 화면 캡처 등).
2. `POST /api/payments/complete {"paymentId":"kd_ord_…"}` — 로그인 불필요. 200 OK와 함께 **자기 브라우저에 유효한 `kd_claim` 쿠키**를 받는다.
3. 동시에 DB의 `claimToken`이 덮어써져 **정당 구매자의 기존 `kd_claim` 쿠키는 어떤 주문과도 매칭되지 않게 된다** — 구매자의 자동 연동이 조용히 영구 고장.
4. 공격자가 가입/로그인 후 `/ko/dashboard` 진입 → `DashboardView.tsx:73`이 자동으로 claim-unlock 발사 → 주문·Unlock·Compatibility가 공격자 계정으로 귀속.
5. 진짜 구매자는 이후 영구 409.

**부가 영향.** 인증 없이 호출될 때마다 PortOne `getPayment`를 외부 호출한다 → 무인증 비용 증폭 / PG 레이트리밋 소진 경로.

**최소 수정안** (`app/api/payments/complete/route.ts`)

```ts
await applyPaidOrder(paymentId, payment.id ?? payment.transactionId);

// [SECURITY] claim 토큰은 주문당 정확히 1회만 발급한다.
// 게스트 주문은 orderId 외에 호출자를 식별할 수단이 없으므로 "최초 완료 호출자"에게만 준다.
// 이미 발급됐거나 이미 계정에 귀속된 주문은 재발급하지 않는다(토큰 덮어쓰기 = 정당 구매자 무효화).
let issuedClaim: string | null = null;
if (!order.claimToken && !order.userId) {
  const token = crypto.randomUUID();
  const updated = await prisma.order.updateMany({
    where: { id: order.id, claimToken: null }, // 동시성 가드
    data: {
      claimToken: token,
      claimTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // M-8: 90일 → 7일
    },
  });
  if (updated.count === 1) issuedClaim = token;
}
```

- 응답 본문에서 `claimToken` 필드 삭제 (★2).
- 쿠키는 `issuedClaim !== null`일 때만 설정.
- `/api/payments/complete`에 IP 기반 레이트리밋(`lib/rateLimiter.ts`) 추가 권장.

---

### H-7 (High) — claim-unlock `orderId` 폴백 (★1)

**위치:** `app/api/user/claim-unlock/route.ts:32-37`

**원인.** 이 경로에는 claimToken·만료·소유 증명이 **하나도 없다.** 로그인만 되어 있으면 body의 `orderId` 문자열만으로 미연동 주문을 자기 계정에 묶는다.

**재현 시나리오.** 로그인 상태에서
`POST /api/user/claim-unlock {"orderId":"kd_ord_<타인의 게스트 주문>"}` → 200, 귀속 완료.
(전제: 해당 주문이 `PAID`이고 `userId`가 아직 null. 게스트 결제의 기본 상태다.)

**주의 — 이 폴백은 실제 사용되고 있다.** `CompatResultClient.tsx:153`이 localStorage의 `unlockToken`(= 자기 orderId)을 `orderId`로 보낸다. 따라서 단순 삭제는 **정상 게스트→회원 전환 연동을 깨뜨린다.** 두 가지 중 하나로 처리해야 한다.

**최소 수정안 (권장 A안 — 완전 제거 + 발급 경로 쿠키 일원화)**

```ts
// 2. orderId 기반 조회 (하위 호환) — 블록 전체 제거
```

그리고 `CompatResultClient.tsx:153`의 body를 `{ compatId: data.id }`로 바꾼다. 게스트가 결제한 기기에는 H-6 수정 후에도 `kd_claim` 쿠키가 남아 있으므로(같은 브라우저) 정상 연동은 쿠키로 계속 동작한다. 결제 후 쿠키가 유실된 기기는 CS 대응으로 넘긴다.

**대안 B안 (폴백 유지가 필요하다면 — 소유 증명 추가)**

```ts
if (!order && orderId) {
  order = await prisma.order.findFirst({
    where: {
      orderId,
      userId: null,
      status: "PAID",
      claimTokenExpiresAt: { gt: new Date() }, // 결제 직후 창구만 허용
    },
  });
}
```

B안은 "결제 후 7일 이내 + 미귀속"으로 창을 좁힐 뿐, orderId를 아는 타인은 여전히 선점할 수 있다. **A안을 권고한다.**

---

### H-8 (High) — 삭제된 사용자의 JWT가 계속 유효

**위치:** `app/api/auth/[...nextauth]/route.ts:82-97` (jwt 콜백)

**원인.** 세션 전략이 `jwt`인데(`:72`) 콜백이

```ts
const dbUser = await prisma.user.findUnique({ ... });
if (dbUser) { token.id = …; token.role = …; token.tier = …; }
// else 분기 없음 → 토큰이 마지막 값을 그대로 유지한 채 반환된다
```

이다. 사용자가 삭제되면 DB 조회가 null이 되고, **토큰은 무효화되지 않고 마지막 id/role/tier를 JWT 만료 전까지(기본 30일) 그대로 들고 다닌다.** `Session` 테이블 Cascade 삭제는 JWT 전략에서 아무 효과가 없다.

**재현 시나리오 (권한 상승 — 가장 심각)**

1. 관리자 A가 관리자 B를 USER로 강등한다. (delete 라우트가 ADMIN 삭제를 막으므로 실무상 반드시 거치는 절차다.)
2. B가 아무 요청도 하지 않아 B의 JWT는 아직 `role: "ADMIN"`인 상태로 남아 있다.
3. A가 B를 탈퇴 처리한다 → `User` 행 소멸.
4. 이후 B의 jwt 콜백은 `dbUser === null`이라 role을 갱신하지 못하고 **`role: "ADMIN"`을 계속 반환한다.**
5. B는 `getAdminSessionOrThrow`를 그대로 통과해 **환불·언락발급·회원삭제 등 관리자 권한을 유지**한다. DB에 행이 없으므로 **다시 강등할 방법조차 없다.**

**재현 시나리오 (일반 사용자).** 탈퇴 처리된 사용자가 그대로 `POST /api/compat` 호출 → `Compatibility.userId`에 FK가 없으므로 **존재하지 않는 userId를 가진 고아 행**이 계속 생성된다. `claim-unlock`은 `Order.userId` FK 위반으로 500.

**최소 수정안** (jwt 콜백)

```ts
if (dbUser) {
  // ...기존 로직...
} else {
  // [SECURITY] 탈퇴·삭제된 사용자 — 남아 있는 JWT를 즉시 무효화한다.
  // (JWT 전략이라 Session 행 Cascade 삭제로는 세션이 끊기지 않는다)
  delete token.id;
  delete token.role;
  delete token.tier;
  token.sub = undefined;
}
```

`session` 콜백이 `session.user.id`를 `''`로 만들고, 모든 라우트가 `session?.user?.id` 부재로 401 처리하므로 나머지 코드 변경 없이 닫힌다.

---

## 3. Medium

### M-8 — `kd_claim` 90일 + 무확인 자동 연동 → 공용 PC 구매 가로채기

`payments/complete/route.ts:63`이 maxAge 90일, `DashboardView.tsx:73`이 **사용자 확인 없이 자동 발사**한다.

**재현.** PC방/공용 PC에서 게스트가 결제만 하고 로그인하지 않은 채 자리를 뜬다 → 90일 안에 같은 브라우저에서 **누구든 로그인만 하면 대시보드 진입 즉시 그 결제가 조용히 그 사람 계정으로 귀속된다.** 국내 공용 PC 이용 문화상 현실적인 시나리오다.

**수정안:** ① maxAge를 90일 → **7일**(claim은 결제 직후에 일어나는 행위다), ② `claimTokenExpiresAt`도 7일로 통일(H-6 패치에 포함), ③ 자동 귀속 대신 **"결제하신 궁합을 이 계정에 저장할까요? [연동하기]"** 배너로 1클릭 확인을 받는 것을 권고.

### M-9 — claimToken 응답 본문 반환 (★2)

`payments/complete/route.ts:52` 본문 필드 제거 + `claim-unlock/route.ts:14`의 `bodyClaimToken` 수용 제거:

```ts
const { compatId } = body;
const effectiveClaimToken = req.cookies.get("kd_claim")?.value;
```

### M-10 — orderId가 GA4 `page_location`으로 유출

`lib/payments/client.ts:106`이 `redirectUrl = …/pay/complete?paymentId=${order.orderId}`를 만든다. `components/Analytics.tsx:31`의 `gtag('config', …)`는 기본값으로 **쿼리스트링을 포함한 전체 URL을 `page_location`으로 전송**한다(`Analytics`는 `app/[locale]/layout.tsx:157`에서 전역 마운트). `client.ts:18-23` 주석이 명시적으로 피하겠다고 선언한 바로 그 유출이 리다이렉트 경로에서 그대로 발생한다.

orderId는 `lib/entitlement.ts:56`에서 **열람 베어러 토큰**으로 쓰이므로, GA4 접근 권한자·데이터 내보내기·브라우저 히스토리 전부가 열람 경로가 된다. (Referer는 최신 브라우저 기본 `strict-origin-when-cross-origin`으로 완화됨.)

**수정안:** 결제창 호출 직전 `localStorage`에 `kongdak_pending_order`로 orderId를 저장하고 `redirectUrl`에서 쿼리를 제거, `/pay/complete`는 localStorage에서 읽는다. 병행 완화로 `pay/complete/page.tsx` 마운트 즉시 `router.replace`로 쿼리를 제거한다(GA config가 먼저 발사될 수 있어 단독 대책으로는 불충분).

※ H-6·H-7 수정 후에는 orderId 유출의 영향이 "귀속 탈취"에서 "설계상 게스트 열람권"으로 축소되므로 Medium으로 판정.

### M-11 — 탈퇴 감사로그가 보장되지 않음

`admin/users/delete/route.ts:91`의 `logAdminAction`은 **트랜잭션 밖**에 있고, `lib/adminAuth.ts:59`가 예외를 삼키고 null을 반환한다. 즉 **영구 삭제는 성공하고 감사 기록만 사라지는 조합이 가능하다.** 개인정보 파기 이력은 PIPA 대응상 필수 기록이다.

**수정안:** `$transaction`을 interactive 형태로 바꾸고 `tx.adminAuditLog.create`를 **같은 트랜잭션 안에서 먼저** 수행한다. 로그 실패 시 삭제도 롤백되어야 한다.

```ts
await prisma.$transaction(async (tx) => {
  await tx.adminAuditLog.create({
    data: { adminUserId: admin.id, action: "USER_DELETE", targetType: "USER", targetId: userId, detail: { … } },
  });
  // M-12: Cascade 이후에는 where:{userId}가 매칭되지 않으므로 반드시 delete 앞에서
  await tx.order.updateMany({ where: { userId }, data: { claimToken: null, claimTokenExpiresAt: null } });
  await tx.unlock.updateMany({ where: { userId }, data: { userId: null, email: null } });
  await tx.compatibility.updateMany({ where: { userId }, data: { userId: null } });
  await tx.user.delete({ where: { id: userId } });
});
```

### M-12 — 탈퇴 후 주문이 "무주공산 claim 대상"으로 남음

탈퇴 시 `Order.userId`는 `onDelete: SetNull`로 null이 되지만 **`claimToken`·`claimTokenExpiresAt`은 그대로 살아 있다.** 결과적으로 탈퇴가 "유효 토큰을 가진 미귀속 게스트 주문"을 새로 만들어낸다 — H-6/H-7 공격의 신선한 표적이다. 수정은 위 M-11 코드에 포함.

**전자상거래법 확인 결과 — 통과.** `Order`는 `onDelete: SetNull`(`schema.prisma:247`)로 **삭제되지 않고 보존**된다. `ordersKept` 카운트도 감사로그에 남는다. `Order.email`은 대금결제·계약 기록의 거래 상대 식별자로서 5년 보존의 법적 근거가 있으므로 유지가 타당하다(다만 **분리보관 정책 문서화 필요**). 반면 `Unlock.email`은 법정 보존 대상이 아니므로 위와 같이 null 처리를 권고한다.

---

## 4. Low

- **L-2 — 파기 후에도 남는 준-PII.** `Compatibility.userId`만 null이 되고 `personA/personB`의 **이름(최대 20자)과 `fourPillars`가 영구 잔존**한다. `fourPillars`는 생년월일·시를 사실상 역산할 수 있는 값이라 "개인정보 파기가 완료되었습니다"라는 응답 문구와 어긋난다(원본 `dob`가 저장되지 않는 점은 `compat/route.ts:113`에서 확인됨). 공유 링크·타인의 Unlock 무결성 때문에 행 자체는 지울 수 없으므로, **이름 익명화(`"탈퇴한 사용자"`) + 파기 정책 명문화**를 권고.
- **L-3 — `TelegramAccount.userId` 고아 행.** FK가 선언되어 있지 않아(`schema.prisma:137`) 탈퇴 후에도 삭제된 userId를 가리키는 행이 남는다. 휴면 기능이라 영향은 낮지만 파기 누락이다.
- **L-4 — 원문 에러 메시지 반환.** `delete/route.ts:114`, `claim-unlock/route.ts:134`, `complete/route.ts:70`이 `err.message`를 그대로 클라이언트에 돌려준다. Prisma/PortOne 예외 메시지에 테이블·컬럼·내부 상태가 실린다. 기존 admin 라우트 공통 관례라 신규 회귀는 아니나, 500 계열은 고정 문구로 바꾸고 원문은 서버 로그로만 남기는 것을 권고.
- **L-5 — 실패한 claim의 쿠키가 정리되지 않음.** `claim-unlock/route.ts:127`은 성공 시에만 쿠키를 삭제한다. 404/409로 끝난 쿠키는 90일간 남아 대시보드 진입마다 무의미한 claim 요청을 반복한다. 409(이미 타 계정 귀속) 응답에서도 쿠키를 삭제하도록 권고.
- **L-6 — claim 성공 후 DB의 claimToken이 남는다.** 주석은 "1회성"이라 하지만 쿠키만 지운다. 재귀속은 `order.userId` 409 가드가 막으므로 실피해는 없으나, 성공 트랜잭션에서 `claimToken: null`로 소각하는 편이 의도와 일치한다.
- **L-7 — `/api/payments/order`가 Order 레코드 전체를 반환**한다(`order/route.ts:69`). 생성 시점엔 `claimToken`이 null이라 현재는 무해하지만, 필드 화이트리스트(`orderId`, `amount`)로 좁히는 것이 안전하다.

---

## 5. 회귀 검사 (C) — 전부 통과

| 항목 | 결과 | 근거 |
|---|---|---|
| **H-1** Order.id vs orderId 키 혼동 | ✅ 정상 | `claim-unlock:69` Unlock 조회는 `orderId: order.id`(FK), `:35` 주문 조회는 `where: { orderId }`(비즈니스 키), `:92` 갱신은 `where: { id: order.id }`. `grant.ts:29`의 저장 규약과 일치. |
| **M-7** 최초 주문자만 Compatibility 귀속 | ✅ 정상 | `claim-unlock:99-115`. `targetCompatId`가 클라이언트 입력(`compatId`)을 우선하지만, `firstPaidOrder`를 **그 compatId로 재조회해 `order.id`와 대조**하므로 타 궁합 지정은 무조건 불일치로 떨어진다. 결제 이력이 없는 compatId를 넣으면 `null?.id !== order.id`로 차단. `updateMany`의 `userId: null` 조건이 이중 방어. |
| **M-5** Unlock 행 없으면 거부 | ✅ 유지 | `entitlement.ts:67` 변경 없음. |
| **이메일 차단 제거의 entitlement 영향** | ✅ 영향 없음 | `isEntitled`는 `email` 파라미터를 구조분해만 하고 **본문에서 한 번도 사용하지 않는다**(`entitlement.ts:17`). 판정은 전적으로 `userId` / `orderId`+`Unlock` 기반. 카카오(이메일 미제공) 대응 목적 달성. |
| **claim 토큰 생성 위치** | ✅ 정상 | `complete:34`는 `payment.status === "PAID"` 검증(`:24`)과 금액 대조(`:27`), `applyPaidOrder`(`:31`) **이후**에만 실행. 결제 코어는 손대지 않은 순수 additive. |
| **재귀속 차단 / 만료 거부** | ✅ 정상 | `claim-unlock:56`(order.userId 409), `:72`(unlock.userId 409), `:27`(만료 토큰 400), `:46`(PAID 아니면 400). |
| **CSRF** | ✅ 방어됨 | NextAuth 세션·`kd_claim` 모두 SameSite=Lax → 크로스사이트 POST에 쿠키가 실리지 않는다. 상태 변경 라우트는 전부 POST. |
| **쿠키 속성** | ⚠️ 부분 | httpOnly ✅ / prod Secure ✅ / SameSite=Lax ✅(OAuth 왕복에 필요하고 CSRF 관점도 안전) / Path=/ ✅ / **maxAge 90일 ✗ → M-8**. |
| **탈퇴 IDOR·최종 관리자 잠금** | ✅ 정상 | `getAdminSessionOrThrow`로 ADMIN 강제, `role === "ADMIN"` 대상 차단(`:53`), 본인 삭제 차단(`:60`). ADMIN을 전면 차단하므로 최종 관리자 잠금은 발생하지 않는다. 강등 후 삭제 경로는 감사로그가 남는다(단 **H-8과 결합 시 권한 잔존** — §2 참조). |
| **탈퇴 트랜잭션 FK 무결성 / 과삭제** | ✅ 정상 | `Unlock.userId`·`Compatibility.userId`는 FK 미선언이므로 수동 null이 옳다. `Unlock.order`는 Order Cascade인데 Order 자체가 삭제되지 않으므로 Unlock 소실 없음. `WeeklyFortune`/`PurchasedReport`/`Subscription`/`UserSajuProfile`/`Account`/`Session` Cascade, `Order`/`PushSubscription` SetNull — 과삭제·FK 오류·고아 없음(L-3 제외). |
| **PERIOD_PASS 게스트 우회** | ✅ 불가 | `order/route.ts:16`이 PERIOD_PASS에 로그인을 강제 → `userId`가 항상 존재해 409 가드에 걸린다. |
| **로그인 페이지 디자인 변경** | ✅ 보안 무관 | 확인함. |

---

## 6. 권장 수정 순서

1. **H-8** — jwt 콜백 else 분기 (3줄, 리스크 최저, 효과 최대)
2. **H-6 + M-9(★2)** — complete 라우트: 1회 발급 가드 + 본문 토큰 제거 + 만료 7일 + 레이트리밋
3. **H-7(★1) + M-9** — claim-unlock: orderId 폴백 및 body claimToken 수용 제거, `CompatResultClient.tsx:153` body 정리
4. **M-11 + M-12** — delete 라우트: 감사로그를 트랜잭션 안으로, claimToken 소각, `Unlock.email` null
5. **M-8** — 쿠키 7일 + 자동 귀속 → 1클릭 확인 UX
6. **M-10** — redirectUrl에서 paymentId 제거(localStorage 경유)
7. **L-2~L-7** — 정리

전부 적용 후 DoD: `tsc --noEmit` → `lint` → `build` → `lib/compatibility.ts` 단위테스트 → 결제→로그인→연동 수동 1회전 → GA4 이벤트 발사 확인.

---

## 7. 스스로 의심한 지점 (검증 완료)

- **"orderId 폴백은 실제로 안 쓰이는 죽은 코드 아닌가?"** → 아니다. `CompatResultClient.tsx:153`이 사용 중이라 단순 삭제 시 정상 연동이 깨진다. 그래서 A안에 클라이언트 수정을 함께 넣었다.
- **"공격자가 orderId를 실제로 얻을 수 있나?"** → `kd_ord_` + uuidv4(122bit)라 추측·열거는 불가능하다. 유일한 현실 경로가 M-10(GA4 `page_location`)과 공용 기기 히스토리라서 이 둘을 별도 항목으로 분리해 판정했다. **바이럴 shareToken 링크에는 실리지 않음을 확인했다.**
- **"claim-unlock의 클라이언트 지정 compatId로 타 궁합을 훔칠 수 있나?"** → 없다. `firstPaidOrder` 대조가 막는다(§5 M-7).
- **"H-8의 관리자 권한 잔존이 실제로 도달 가능한가?"** → 도달 가능하다. delete 라우트가 ADMIN 삭제를 막기 때문에 **"강등 후 삭제"가 유일한 정상 절차**이고, 그 사이 대상이 요청을 보내지 않으면 토큰이 ADMIN인 채로 동결된다. 오히려 정상 운영 절차를 따를수록 재현된다.
- **"webhook 경로에는 claimToken이 없는데 문제 아닌가?"** → 보안 문제는 아니지만 기능 갭이다. 모바일에서 브라우저가 닫혀 웹훅만 도달하면(`webhooks/portone/route.ts`) 쿠키가 발급되지 않아 자동 연동이 불가능하다. H-6 수정 시 "최초 완료 호출자에게만 발급" 규칙과 함께 CS 재발급 경로를 확보해 둘 것.

---

# 부록 A. 패치 적용 기록 (2026-09-09)

위 findings 중 **blocker 3건 + Medium 5건 + Low 4건**을 적용했다. 변경 9개 파일 / +396 −131 라인.

## A-1. 적용한 항목

| 항목 | 파일 | 조치 |
|---|---|---|
| **H-8** | `app/api/auth/[...nextauth]/route.ts` | jwt 콜백 두 분기 모두에 `else` 추가 — `dbUser`가 없으면 `token.id/role/tier/sub` 제거로 토큰 무효화 |
| **H-6** | `app/api/payments/complete/route.ts` | ① 이미 `PAID`면 PG 재조회 생략(무인증 외부 API 증폭 차단) ② claim 토큰을 `updateMany({ where: { id, claimToken: null } })`로 **주문당 1회만** 발급 ③ 발급에 성공했을 때만 쿠키 설정 |
| **H-7 (★1)** | `app/api/user/claim-unlock/route.ts` | `orderId` 폴백 블록 **완전 제거**. 소유권 판정은 httpOnly `kd_claim` 쿠키 단일 경로 |
| **M-9 (★2)** | `payments/complete`, `claim-unlock` | 응답 본문의 `claimToken` 제거 + body의 `claimToken` 수용 중단 |
| **M-8** | `complete`, `DashboardView`, `CompatResultClient` | 쿠키·토큰 만료 90일 → **7일**. 자동 귀속 폐지 → `GET /api/user/claim-unlock`(신규, 조회 전용)으로 가능 여부만 확인하고 **"연동하기" 클릭 시에만** POST |
| **M-10** | `components/Analytics.tsx`, `pay/complete/page.tsx` | GA4 `page_location`에서 `paymentId/orderId/claimToken/token` 제거 + 페이지 진입 즉시 `history.replaceState`로 주소창 쿼리 제거 |
| **M-11** | `admin/users/delete/route.ts` | `$transaction`을 interactive로 전환, `adminAuditLog.create`를 **같은 트랜잭션 안에서 가장 먼저** 실행 (로그 실패 = 삭제 롤백) |
| **M-12** | `admin/users/delete/route.ts` | `user.delete` **앞에서** `Order.claimToken/claimTokenExpiresAt` 소각, `Unlock.email` 파기 |
| **L-3** | `admin/users/delete/route.ts` | `TelegramAccount.userId` 수동 null (FK 없어 Cascade 미적용) |
| **L-4** | `delete`, `claim-unlock`, `complete`, `order` | 500 응답을 고정 문구로 대체, 예외 원문은 서버 로그에만. 단 `getAdminSessionOrThrow`가 던진 401/403 메시지는 그대로 노출(의도된 안내) |
| **L-5** | `claim-unlock` | 404/400/409 응답에서도 `kd_claim` 쿠키 폐기 (`failAndClearCookie`) |
| **L-6** | `claim-unlock` | 연동 성공 트랜잭션에서 `claimToken`을 DB에서 소각 |
| **L-7** | `payments/order/route.ts` | Order 레코드 전체 반환 → `{ orderId, amount, type }` 화이트리스트 |
| **추가 강화** | `claim-unlock` | 요청 본문 파싱 자체를 제거. 귀속 대상을 `order.compatId`로 고정해 보안 판정 경로에서 공격자 제어 입력을 완전히 제거 |

## A-2. 의도적으로 적용하지 않은 항목

- **L-2 (Compatibility 이름 익명화)** — 적용하지 않았다. 궁합 결과는 **공유 링크로 여러 명이 각자 결제해 열람하는 콘텐츠**다. 탈퇴자의 이름을 `"탈퇴한 사용자"`로 덮으면, 같은 궁합을 9,900원 주고 산 제3자의 구매물이 함께 훼손된다. **파기 의무와 구매 콘텐츠 무결성이 충돌하는 지점이라 제품·법무 판단이 필요**하다고 보고 보류했다. `Compatibility`에는 원본 생년월일이 아니라 `birthHash`와 `fourPillars`만 저장된다는 점(`compat/route.ts:113`)을 판단 재료로 남긴다.
- **M-10의 redirectUrl 재설계(localStorage 경유)** — 적용하지 않았다. PG 리다이렉트 경로를 바꾸는 일은 결제 성공률에 직결되고, 인앱 브라우저·앱 전환 시나리오에서 회귀 위험이 크다. 대신 **실제 유출 벡터인 GA4 `page_location`과 브라우저 히스토리를 양쪽에서 차단**하는 쪽을 택했다. 쿼리 파라미터는 여전히 1회 페이지 로드 동안 URL에 존재한다.
- **`/api/payments/complete` IP 레이트리밋** — 적용하지 않았다. 국내 이동통신 CGNAT 환경에서 IP 단위 제한은 **정당한 결제 완료를 막을 위험**이 있다. 원래 걱정거리였던 PG 호출 증폭은 "이미 PAID면 PG 재조회 생략"으로 근본 제거했다.

## A-3. 검증 결과

```
npx tsc --noEmit    → exit 0  (에러 없음)
npm run build       → exit 0  (✓ Compiled successfully)
npm run lint        → 변경 전 118 errors / 변경 후 117 errors
```

**lint는 여전히 실패로 끝나지만 전부 기존 문제다** — `scripts/*.js`의 `require()` 금지, 테스트 파일의 `any`, `GuestCheckoutModal`의 effect 경고 등. 이번 변경으로 **새로 생긴 lint 에러는 0건이고 1건이 줄었다**(`payments/order`의 `catch(e: any)` 제거). `pay/complete/page.tsx`의 effect 경고는 라인 번호만 26 → 38로 밀린 동일 이슈다.

**아직 하지 않은 검증 (배포 전 필수):**
1. **결제 → 로그인 → 연동 수동 1회전.** PortOne 샌드박스와 DB가 필요해 이 세션에서 수행하지 못했다. 특히 확인할 것 — ① 게스트 결제 후 `kd_claim` 쿠키 발급 ② OAuth 왕복 후 쿠키 생존 ③ 배너 노출 및 "연동하기" 성공 ④ 웹훅이 먼저 도착한 경우에도 토큰이 발급되는지.
2. **`prisma db push`** — 스키마 변경은 없으나(claimToken 컬럼은 기존 배포분) 만료 정책이 90일 → 7일로 바뀌었다. **이미 발급된 90일짜리 토큰은 그대로 남으므로**, 배포 시 `UPDATE "Order" SET "claimToken" = NULL, "claimTokenExpiresAt" = NULL WHERE "userId" IS NULL AND "claimTokenExpiresAt" > now() + interval '7 days'` 로 정리할지 결정이 필요하다(정리하면 미연동 구매자는 CS 경유가 된다).
3. **GA4 이벤트 발사 확인** — 측정 이벤트 자체는 건드리지 않았으나 `gtag('config')`를 수정했으므로 page_view 정상 수집 여부를 확인해야 한다.
4. 어드민 회원 탈퇴 1회 실행 후 `AdminAuditLog`에 `USER_DELETE`가 남는지, `Order`가 `userId=null`로 보존되는지 확인.

## A-4. 남은 리스크 / 스스로 의심하는 지점

- **"이미 PAID면 PG 재조회 생략"이 안전한가?** `status`를 `PAID`로 바꾸는 곳은 `applyPaidOrder` 하나뿐이고, 그 호출자는 (a) 서명 검증된 웹훅, (b) PG 조회로 상태·금액을 대조한 이 라우트뿐이다. 결제 없이 `PAID`가 되는 경로는 없다고 판단했다. 다만 **`provider: 'admin_manual'` 수동 주문**은 어드민이 직접 PAID로 만들 수 있으니, 수동 주문 생성 로직을 별도로 한 번 더 확인할 것을 권한다.
- **claim 토큰 발급을 "최초 완료 호출자"에게 주는 규칙**은 게스트 결제에 신원 증명 수단이 orderId뿐이라는 제약에서 나온 차선책이다. 결제 직후 정상 구매자가 가장 먼저 호출하는 것이 정상 흐름이지만, **결제 완료 전에 orderId가 유출된 경우**에는 여전히 선점 여지가 있다. 근본 해결은 결제 시점의 본인 식별(전화번호·본인인증)인데 이는 Phase B 범위다.
- **자동 연동 → 클릭 확인으로 바꾸면서 전환율이 떨어질 수 있다.** 배너는 결과 페이지 최상단과 대시보드 상단에 두어 놓치기 어렵게 했지만, 실제 연동율은 배포 후 관측이 필요하다. `share_card_created`처럼 별도 GA4 이벤트(`claim_banner_shown` / `claim_confirmed`)를 붙여 측정할 것을 권한다.
