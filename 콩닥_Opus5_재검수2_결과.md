# 콩닥 Opus5 보안 재검수 결과 (2차) — claim 이메일 폴백 경로

검수일: 2026-09-10 / 대상: `kd_claim` 쿠키 경로 위에 추가된 **2차(이메일 일치) 폴백**

**주 검수 대상**: `app/api/user/claim-unlock/route.ts`, `components/CompatResultClient.tsx`

**교차확인**: `app/api/auth/[...nextauth]/route.ts`, `app/api/auth/register/route.ts`, `app/api/payments/order/route.ts`, `app/api/payments/complete/route.ts`, `app/api/admin/users/delete/route.ts`, `lib/entitlement.ts`, `lib/prisma.ts`, `prisma/schema.prisma`, `components/DashboardView.tsx`, `node_modules/next-auth/core/lib/callback-handler.js`(v4.24.14), `node_modules/next-auth/providers/{kakao,naver,google}.js`

---

## 0. 오픈 가부 판정

### **조건부 오픈 불가 — blocker 2건 (H-1, H-2).**

두 건 모두 **"세션 이메일 = provider가 검증한 이메일"이라는 가드의 대전제를 직접 깬다.** 수정은 각각 5~10줄이고, 고치면 나머지는 Medium 이하다.

| 번호 | 심각도 | 요약 | blocker |
|---|---|---|---|
| **H-1** | **High** | `mode:"insensitive"`가 `ILIKE`로 컴파일 → 세션 이메일의 `%`·`_`가 **SQL 와일드카드로 동작**. 임의 compatId의 미연동 PAID 주문을 통째로 탈취 | ✅ |
| **H-2** | **High** | Kakao `is_email_verified` 미검증(Google `email_verified`도 미검증) → **가드 전제 붕괴**. 미인증 이메일로 계정을 만들면 `password==null` + OAuth Account를 모두 만족 | ✅ |
| M-1 | Medium | `User.email` 유니크는 대소문자 구분(Postgres) → 케이스 변형으로 NextAuth `AccountNotLinked` 차단 우회, 그런데 주문 매칭은 대소문자 무시 | 권고 |
| M-2 | Medium | 연동 트랜잭션에 `userId: null` 조건이 없음 → TOCTOU(동시 요청 시 last-write-wins) | 권고 |
| M-3 | Medium | H-8 토큰 무효화가 `token.email`을 남김 → 삭제된 계정의 JWT가 **같은 이메일로 새로 가입한 사용자에게 재바인딩** | 권고 |
| L-1 | Low | 이메일 경로에서 `claimToken` 미소각 → L-6 불변식 부분 훼손(주인 있는 주문에 살아 있는 베어러 토큰) | 권고 |
| L-2 | Low | 쿠키 경로가 `compatId`를 무시 → 다른 궁합 페이지에서 배너·토스트가 사실과 다르게 표시 | 권고 |
| L-3 | Low | claim-unlock에 레이트리밋 없음 (H-1 수정 후 실익은 낮음) | 선택 |

### 회귀 검사 — **전부 통과**

- **엔타이틀먼트(점검 4)**: `lib/entitlement.ts`는 `userId` / `orderId`만 본다. `email` 파라미터는 시그니처(`lib/entitlement.ts:13`)와 구조분해(`:17`)에만 있고 **본문에서 한 번도 쓰이지 않는다**. 이메일 차단 제거·2차 경로 추가가 열람 판정에 미치는 영향은 **없다**.
- **쿠키 경로 소각(H-6/L-6)**: `claim-unlock/route.ts:236-245`에서 `isCookieClaim`일 때만 `claimToken`/`claimTokenExpiresAt`을 null로 밀어 넣는다. 기존 동작 그대로다. 발급 1회 제한(`payments/complete/route.ts:54-67`)도 그대로다.
- **first-claim-wins(점검 3)**: `order.userId` 409(`:209`), `unlock.userId` 409(`:220`), `Compatibility`는 `updateMany({ where: { id, userId: null } })`(`:266-274`)로 이미 조건부다. **논리는 옳다** — 다만 동시성 보장이 없다(M-2).
- **PERIOD_PASS 오염 없음**: 기간권 주문은 `compatId`가 null이고(`payments/order/route.ts:63`) 이메일 쿼리는 `compatId: <문자열>`을 요구하므로 절대 매칭되지 않는다.

---

## 1. 점검 1 결론 — 가드 전제는 **견고하지 않다**

> 요청: "`password == null && OAuth 계정 보유`가 세션 이메일 = provider 검증 이메일을 실제로 보장하는가?"

**부분적으로만 보장한다.** 세 갈래로 나눠 답한다.

### (a) password가 null이 될 다른 경로 — **없음 (전제 성립)**

전체 코드베이스에서 `User.password`에 쓰는 곳은 **`app/api/auth/register/route.ts:65`의 `prisma.user.create` 단 하나**다.

- `register`는 `existingUser` 존재 시 409로 끊고(`:50-56`) **기존 유저에 password를 얹지 않는다** → OAuth 유저가 나중에 비번을 갖게 되는 경로 없음.
- 비밀번호 재설정/변경/해제 라우트가 **존재하지 않는다** → password를 null로 되돌릴 경로 없음.
- `prisma.user.update`를 호출하는 곳(`admin/users/role`, `admin/actions.ts`, `webhooks/gumroad`)은 전부 `role`/`tier`/`premium*`만 건드린다.
- **결론: 이 축은 안전하다.**

### (b) 계정 연결(account linking)로 User.email이 어긋날 수 있는가 — **없음 (전제 성립)**

next-auth v4.24.14 `callback-handler.js`를 직접 읽어 확인했다.

- 로그인 상태에서 새 provider를 연결하면 `linkAccount({...account, userId: user.id})`(`:137`, `:173`)만 호출한다. **`updateUser`를 부르지 않으므로 `User.email`은 갱신되지 않는다.**
- `PrismaAdapter`의 `updateUser`는 이 앱에서 호출되는 경로가 없다(JWT 세션 + email provider 미사용).
- jwt 콜백은 매 요청 `dbUser.email`을 다시 읽어 `token.email`에 넣는다(`[...nextauth]/route.ts:88`). 즉 **세션 이메일 = User.email = 최초 가입 provider가 준 이메일**로 고정된다.
- **결론: 연결 후에도 email drift는 없다.** (다만 "현재 로그인한 provider의 이메일"이 아니라 "최초 가입 provider의 이메일"이라는 점은 인지 필요.)

### (c) provider가 준 이메일이 정말 "검증된" 이메일인가 — **아니다 → H-2**

여기서 전제가 깨진다. `password == null ⟹ OAuth 가입`까지는 참이지만, **`OAuth 가입 ⟹ 이메일 검증됨`은 거짓**이다.

`app/api/auth/[...nextauth]/route.ts:19` Kakao 커스텀 profile:

```ts
email: profile.kakao_account?.email,   // is_email_verified / is_email_valid 를 보지 않는다
```

카카오는 `kakao_account.email`과 함께 `is_email_verified`·`is_email_valid`를 내려주며, **미인증 이메일이 내려올 수 있다고 공식 문서가 명시**한다. Google/Naver도 next-auth 기본 profile을 그대로 쓰므로 `email_verified` 클레임을 검사하지 않는다(`providers/google.js:20-27`, `providers/naver.js:15-22`).

그리고 `createUser`는 항상 `emailVerified: null`로 만든다(`callback-handler.js:164-167`) → **`User.emailVerified`는 이 판정에 쓸 수 없다.**

---

## 2. H-1 (Blocker) — `mode:"insensitive"`가 세션 이메일을 SQL 와일드카드로 만든다

**위치**: `app/api/user/claim-unlock/route.ts:84`(GET), `:185`(POST)

### 증거 (컴파일된 SQL을 직접 캡처)

Prisma 7.8.0 + `@prisma/adapter-pg` 어댑터를 스파이로 감싸 실제 생성 SQL을 찍었다(DB 접속 없음, SELECT만):

```
SQL>  SELECT "public"."Order"."id" FROM "public"."Order"
      WHERE ("public"."Order"."compatId" = $1
        AND "public"."Order"."status" = CAST($2::text AS "public"."OrderStatus")
        AND "public"."Order"."userId" IS NULL
        AND "public"."Order"."email" ILIKE $3)
      ORDER BY "public"."Order"."createdAt" ASC LIMIT $4 OFFSET $5
ARGS> ["PROBE","PAID","probe%test@example.com","1","0"]
```

`equals` + `mode:"insensitive"`는 **`=`가 아니라 `ILIKE`로 컴파일되고, Prisma는 LIKE 메타문자(`%`, `_`)를 이스케이프하지 않는다.** 파라미터 바인딩은 되지만 와일드카드 의미는 그대로 살아 있다.

### 재현 시나리오

1. 공격자가 `%`를 포함한 이메일(예: `%@gmail.com`, 극단적으로 `%@%`)로 OAuth 계정을 만든다. `%`는 RFC 5322 local-part에서 **유효한 문자**이고, H-2(미인증 이메일 수용) 때문에 provider 측 소유 증명도 필요 없다.
2. 로그인 → `password == null`, kakao Account 존재 → `emailPathEligible === true`.
3. 공개 공유 링크에서 아무 `compatId`나 집는다(공유카드 URL에 그대로 노출됨).
4. `POST /api/user/claim-unlock  {"compatId":"<피해자 궁합>"}`
5. `WHERE email ILIKE '%@gmail.com'` → **해당 궁합의 미연동 PAID 주문 중 가장 오래된 것이 매칭**된다.
6. `Order.userId` + `Unlock.userId`가 공격자로 세팅 → `isEntitled`가 UNLOCK 통과 → **심층 리포트 무료 열람**. 게다가 최초 PAID 주문이면 `Compatibility.userId`까지 넘어가 두 사람의 이름·성별·`fourPillars`가 공격자 대시보드에 남는다(`/api/compat` GET).
7. 정당 구매자는 이후 영구 409 → 자가 복구 불가, 전건 CS.

**`%` 없이도 사고가 난다**: `_`도 와일드카드다. `kim_su@naver.com` 사용자가 같은 궁합의 `kim-su@naver.com` 주문을 매칭해 가져가는 오연동이 성립한다. 이건 공격자가 없어도 발생하는 결제-소유권 오배정이다.

### 최소 수정안 (권장 — 와일드카드 클래스를 통째로 제거)

`compatId`는 인덱스가 있고(`schema.prisma:251`) 궁합당 주문 수는 소수이므로, 후보를 뽑아 JS에서 정확 비교한다.

```ts
// GET / POST 공통
const norm = (s?: string | null) => s?.trim().toLowerCase() ?? "";
const candidates = await prisma.order.findMany({
  where: { compatId, status: "PAID", userId: null },
  orderBy: { createdAt: "asc" },
});
const emailOrder = candidates.find((o) => o.email && norm(o.email) === norm(userEmail)) ?? null;
```

추가로, 세션 이메일에 대한 **형식 가드**를 진입 조건에 넣어 이중 방어한다(가입 시점에 이미 걸러야 할 값이지만 여기서도 막는다):

```ts
const EMAIL_RE = /^[A-Za-z0-9._+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
if (!EMAIL_RE.test(userEmail)) return notClaimable;  // % _ ' " 등 배제
```

> 참고: `app/api/admin/customers/search/route.ts:19,20,40,41,57`도 같은 `insensitive`를 쓰지만 **`contains` 검색 용도 + ADMIN 전용**이라 권한 경계가 아니다. 수정 대상 아님(다만 `%` 입력 시 전체 스캔이므로 인지만).

---

## 3. H-2 (Blocker) — Kakao 이메일 인증 여부를 보지 않는다 → 가드 전제 붕괴

**위치**: `app/api/auth/[...nextauth]/route.ts:14-24`(kakao profile), 기본 provider를 쓰는 google/naver

### 재현 시나리오 (H-1 없이도 성립)

1. 피해자가 **게스트로** 결제. `Order.email = victim@naver.com` (본인이 타이핑한 값, `payments/order/route.ts:62`). 게스트라 **콩닥에 계정이 없다** — 이게 이 기능의 주 타깃 시나리오다.
2. 공격자가 자신의 카카오계정 이메일을 `victim@naver.com`으로 등록한다(미인증 상태 가능).
3. 공격자가 카카오로 콩닥 로그인. 콩닥에 `victim@naver.com` User가 없으므로 next-auth의 `AccountNotLinked` 차단(`callback-handler.js:152-159`)에 걸리지 않고 **새 User가 생성**된다 → `password = null`, kakao `Account` 존재.
4. `emailPathEligible === true` → 공유 링크에서 얻은 compatId로 POST → 피해자의 결제 탈취.

**피해자에게 계정이 있어도** M-1(케이스 변형)과 조합하면 우회된다: `getUserByEmail`은 `findUnique({where:{email}})`로 **대소문자 구분 정확 일치**인데, 주문 매칭은 대소문자 무시다. 공격자가 `Victim@naver.com`으로 오면 `AccountNotLinked`를 피해 새 User가 만들어지고 주문은 여전히 매칭된다.

### 최소 수정안

```ts
KakaoProvider({
  // ...
  profile(profile) {
    const acct = profile.kakao_account;
    // [보안] 카카오는 미인증·무효 이메일을 내려줄 수 있다. 검증된 값만 신뢰한다.
    const verifiedEmail =
      acct?.is_email_verified === true && acct?.is_email_valid !== false
        ? acct.email
        : null;
    return {
      id: profile.id.toString(),
      name: acct?.profile?.nickname,
      email: verifiedEmail,
      image: acct?.profile?.profile_image_url?.replace('http://', 'https://'),
    };
  },
}),

GoogleProvider({
  // ...
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email_verified ? profile.email : null,
      image: profile.picture,
    };
  },
}),
```

**부작용 주의**: 이메일이 null이면 `User.email`도 null → 이메일 2차 경로 자체가 비활성(1차 쿠키 경로는 정상). 이는 지시문이 말한 "카카오 무이메일" CS 케이스와 동일한 취급이며, **의도한 fail-closed**다. 로그인 자체는 계속 가능하다.

**대안(더 강한 방어, 권장 병행)**: 이메일 경로 자격을 `Account.provider`까지 좁힌다 — 신뢰할 provider가 검증 이메일을 준 계정만 허용.

---

## 4. Medium

### M-1 — User.email 유니크가 대소문자 구분이라 케이스 변형으로 차단 우회

`prisma/schema.prisma:61` `email String? @unique`. Postgres 유니크는 대소문자 구분이므로 `a@x.com`과 `A@x.com`이 공존한다. `register`는 `toLowerCase()`(`register/route.ts:16`)하지만 **OAuth 생성 경로는 provider가 준 원문 그대로** 저장한다. 그 결과 next-auth의 `AccountNotLinked` 방어는 대소문자 구분, claim 매칭은 대소문자 무시 → 비대칭이 H-2의 증폭기가 된다.

**수정안**: `signIn` 콜백 또는 어댑터 래퍼에서 `user.email`을 소문자로 정규화한 뒤 생성한다. 기존 행은 additive 마이그레이션으로 소문자 중복 여부만 점검(충돌 시 수동 병합).

### M-2 — 연동 트랜잭션의 TOCTOU

`claim-unlock/route.ts:235-255`. `orderToClaim`은 트랜잭션 **밖에서** 읽은 스냅샷이고, `tx.order.update({ where: { id } })`에는 `userId: null` 조건이 없다. 서로 다른 두 사용자가 같은 주문에 동시에 들어오면(케이스 변형 이메일 2개, 또는 쿠키 경로 + 이메일 경로) 양쪽 다 `:209` 409를 통과한 뒤 **나중 쓰기가 이긴다**. `unlock.update`(`:228`)도 동일.

**수정안** — 조건부 쓰기로 바꾸고 count로 승자를 판정:

```ts
const claimed = await tx.order.updateMany({
  where: { id: orderToClaim.id, userId: null },
  data: { userId, claimToken: null, claimTokenExpiresAt: null },  // L-1 반영: 두 경로 모두 소각
});
if (claimed.count === 0) throw new ClaimConflict();   // → 409 로 변환
if (unlock) {
  await tx.unlock.updateMany({
    where: { id: unlock.id, userId: null },
    data: { userId },
  });
}
```

`Compatibility`는 이미 `updateMany + userId: null`이라 올바르다.

### M-3 — H-8 토큰 무효화가 `token.email`을 남긴다 (기존 패치의 구멍)

`[...nextauth]/route.ts:103-108`에서 삭제된 사용자의 토큰은 `id`/`role`/`tier`/`sub`를 지우지만 **`token.email`은 남는다.** 다음 요청에서 `userId`가 falsy → `else if (token.email)` 분기(`:113`)로 내려가 **이메일로 사용자를 다시 조회**한다.

**재현**: 관리자가 A(`a@x.com`)를 삭제 → A의 브라우저에 JWT는 만료(기본 30일)까지 남음 → 이후 누군가 `a@x.com`으로 가입(register는 이메일 미검증, OAuth도 가능) → **A의 낡은 JWT가 신규 계정의 `userId`/`role`로 되살아난다.** 계정 탈취.

**수정안**: 무효화 분기에서 `delete token.email`(및 `name`/`picture`)도 함께 수행한다. 두 else 분기 모두.

---

## 5. Low

- **L-1 — 이메일 경로에서 claimToken 미소각** (`claim-unlock/route.ts:246-253`). 주문이 이미 특정 계정 소유가 됐는데 `claimToken`은 최대 7일 살아 있다. 현재는 `:209` 409가 막아주지만, "연동된 주문에는 살아 있는 베어러 토큰이 없다"는 L-6 불변식이 깨진다. **두 경로 모두 소각**으로 통일할 것(M-2 패치에 포함).
- **L-2 — 쿠키 경로가 compatId를 무시한다** (`claim-unlock/route.ts:138`). `findUnique({where:{claimToken}})`는 요청의 compatId와 무관하게 주문을 찾는다. 궁합 B 페이지에서 GET을 호출해도 쿠키가 가리키는 궁합 A가 `claimable:true`로 돌아오고(`:47-51`), 배너를 누르면 A가 연동되는데 토스트는 "이 궁합이 연동됐다"고 말한다. 보안 문제는 아니지만(쿠키 소유자 본인) **오해 유발 + 사용자가 B는 연동됐다고 착각**한다. 응답의 `compatId`로 문구를 분기하거나, 페이지 컨텍스트에서는 `compatId` 일치 시에만 배너를 띄울 것.
- **L-3 — 레이트리밋 없음**. `lib/rateLimiter.ts`가 있는데 claim-unlock에는 적용되지 않았다. H-1을 고치면 무차별 대입의 실익이 거의 없어지지만, GET이 "내 이메일로 결제된 주문이 이 궁합에 있는가" 오라클이므로 IP/세션당 완만한 제한을 권한다.

---

## 6. 점검 항목별 최종 답변

| # | 점검 항목 | 결론 |
|---|---|---|
| 1 | 가드 전제(`password==null && OAuth`) 견고성 | **부분 성립.** password 축(a)·linking 축(b)은 **안전**. provider 이메일 검증 축(c)이 **깨져 있다 → H-2** |
| 2 | compatId 조작 IDOR | **의도상 차단, 실제로는 우회 가능.** 정확 일치라면 안전하나 `ILIKE` 때문에 이메일 조건이 무력화된다 → **H-1**. H-1 수정 시 음성(다른 이메일·credentials 유저)·양성(동일 이메일 순수 OAuth) 모두 정상 |
| 3 | first-claim-wins & 경쟁 | **로직은 정확, 동시성 보장 없음** → M-2 |
| 4 | 엔타이틀먼트 회귀 | **없음.** `isEntitled`는 email을 쓰지 않는다. 쿠키 경로 소각(H-6/L-6) 회귀도 없음 |
| 5 | 정보 노출 | **낮음.** 404/409 문구는 쿠키 소유자에게만 도달하고, GET은 본인 이메일 기준이라 타인 이메일을 유추시키지 않는다. 단 H-1 상태에서는 GET 자체가 광역 오라클이 된다 |

---

## 7. 오픈 전 체크리스트

1. **H-1 수정** — `mode:"insensitive"` 제거, JS 정확 비교 + 이메일 형식 가드. (GET·POST 2곳)
2. **H-2 수정** — kakao `is_email_verified`, google `email_verified` 검사.
3. M-2 / L-1 — 조건부 `updateMany` + 두 경로 모두 claimToken 소각.
4. M-3 — H-8 무효화 시 `token.email` 제거.
5. M-1 — OAuth 생성 시 이메일 소문자 정규화.
6. **테스트(현재 이메일 경로는 동적 테스트 0건)**
   - 양성: 게스트 결제(`x@gmail.com`) → 쿠키 삭제 → 같은 이메일 구글 로그인 → 연동 성공, `Order.userId`·`Unlock.userId` 일치
   - 음성 1: 다른 이메일 OAuth → 404
   - 음성 2: credentials 가입자(같은 이메일) → 404
   - 음성 3: **`%`·`_` 포함 이메일 유저 → 404** (H-1 회귀 테스트, 필수)
   - 음성 4: 이미 연동된 주문 → 409, 재귀속 없음
   - 회귀: 쿠키 경로 E2E 재확인 + `claimToken`/`claimTokenExpiresAt` null 확인

---

## 8. 스스로 의심하는 지점

- **H-1의 실현 가능성은 "provider가 `%` 포함 이메일을 발급하는가"에 달려 있다.** `%`는 RFC상 유효하지만 카카오/네이버/구글이 실제로 받아주는지는 확인하지 않았다. 다만 (i) `_`만으로도 오연동이 성립하고, (ii) 방어가 외부 서비스의 입력 검증에 의존하는 구조 자체가 결함이며, (iii) 수정 비용이 5줄이므로 **blocker 판정을 유지**한다.
- **H-2는 카카오 문서 기준 판단이다.** 카카오가 실제로 미인증 이메일을 내려주는지 실계정 테스트로 확인하면 더 확실하다. 확인 전이라도 `is_email_verified` 검사는 무해하므로 선반영을 권한다.
- **M-3은 이번 변경과 무관한 기존(H-8 패치) 구멍**이다. 다만 "세션 이메일 → userId 바인딩의 무결성"이라는 이번 검수의 주제와 같은 축이라 함께 보고한다.
