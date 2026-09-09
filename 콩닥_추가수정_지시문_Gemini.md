# 콩닥 추가 수정 지시문 (Gemini 실행용) — 탈퇴기능 · 로그인 디자인 · OAuth 연동

**절대 규칙**
- 궁합 엔진·K-loop·결제 코어의 정상 로직 변경 금지(국소 수정만). Prisma는 **additive만**, 배포는 `npx prisma db push`(migrate 아님, `--accept-data-loss` 금지).
- 민감 API(탈퇴 등)는 서버에서 `session.user.role === 'ADMIN'` 검증 + `logAdminAction` 감사로그.
- 시크릿 커밋 0. 완료 후 `npm run build` 통과 → 커밋 → `safe_deploy.py`.

---

## 1. 어드민 회원 탈퇴(삭제) 기능

**목적:** 테스트 재현(같은 이메일 재가입/재로그인) + 실서비스 회원탈퇴(개인정보보호법상 파기 권리) 대응. CS가 어드민에서 클릭으로 처리.

**신규 API:** `app/api/admin/users/delete/route.ts` (POST)
- `getAdminSessionOrThrow()`로 관리자 검증. body: `{ userId, reason }`. reason 필수.
- **안전 가드:** 대상이 `role === 'ADMIN'`이면 거부(400), 본인(admin.id === userId) 삭제 거부(400). 실수로 관리자 잠금 방지.

**FK 처리(스키마 확인 완료 — 아래대로 하면 크래시 없음):**
- `prisma.user.delete()`가 자동 처리(onDelete):
  - **Cascade 삭제:** UserSajuProfile(생년월일 등 PII 파기 ✅), Account(소셜 연동), Session, PurchasedReport, Subscription, WeeklyFortune.
  - **SetNull(보존):** Order.userId, PushSubscription.userId.
- **관계(FK)가 없어 자동 처리 안 되는 것 → 트랜잭션에서 수동 null 처리 필수:**
  - `Unlock.userId`, `Compatibility.userId` (둘 다 String? 이고 User와 relation 없음 → 안 지우면 삭제된 유저 id가 그대로 남는 orphan).

**구현(트랜잭션):**
```ts
await prisma.$transaction([
  prisma.unlock.updateMany({ where: { userId }, data: { userId: null } }),
  prisma.compatibility.updateMany({ where: { userId }, data: { userId: null } }),
  prisma.user.delete({ where: { id: userId } }), // 나머지는 FK가 처리(cascade/setNull)
]);
```
- 삭제 결과: **User.email(unique) 해제 → 같은 이메일 재가입 가능**, Account 삭제 → 카카오/네이버/구글 재로그인 시 새 계정 생성. **Order는 userId=null로 보존**(전자상거래법상 결제·거래기록 5년 보관 의무 준수).
- 감사로그: `logAdminAction({ action: 'USER_DELETE', targetType: 'USER', targetId: userId, detail: { reason, emailMasked, ordersKept: <count> }})`. 이메일은 마스킹(`ab***@...`) 저장.

**어드민 UI(AdminDashboard.tsx 회원 테이블 / 고객조회 탭):**
- 회원 행에 **"탈퇴 처리"** 버튼 → 확인 모달(사유 입력 + "정말 삭제" 확인) → 위 API 호출 → 성공 시 목록 갱신.
- 모달에 "주문/결제 기록은 법정 보관을 위해 유지되며, 개인정보(생년월일·명식)와 계정만 삭제됩니다" 안내 문구.

---

## 2. 로그인/회원가입 페이지 디자인 → 콩닥 톤으로 교체

**파일:** `app/[locale]/login/page.tsx`
**문제:** 이 페이지만 아직 옛 K-Destiny **다크 코스믹 테마**(`design.md`)를 쓰고 있음 — `bg-background`(다크), 글래스모피즘 `bg-white/[0.03]`, **입력창 `bg-black/40`(첨부 스크린샷의 짙은 회색 박스)**, `text-gold` 골드 그라데이션, `font-serif` 흰색 그라데이션 제목. 헤더/나머지 사이트는 이미 콩닥(크림 배경·핑크 포인트)이라 **로그인 카드만 이질적**.

**작업:** 로직(핸들러·framer-motion·소셜 로그인 함수·i18n)은 그대로 두고 **className/시각요소만** 콩닥 라이트 테마로 교체. 정확한 토큰은 **콩닥 결과 페이지(`app/[locale]/compat/...`)·요금안내(`pricing`) 페이지를 열어 동일 팔레트/버튼/카드 스타일을 재사용**할 것. 기준:
- **배경:** 다크(`bg-background`) → 콩닥 크림(사이트 공통 크림 톤, 예: `#FFF8F0` 계열). 우주 blur/stardust 배경 레이어(`bg-stardust`, `blur-[120px]` purple/gold glow) **제거**.
- **카드:** 다크 글래스 → 흰색/크림 카드 + 부드러운 그림자(`rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)]` 수준), 무거운 `shadow-[0_0_40px_rgba(0,0,0,0.5)]` 제거.
- **입력창(핵심):** `bg-black/40 text-white` → **흰색 배경 + 연한 보더 + 진한 텍스트**: `bg-white border border-[#F0E3D6] rounded-2xl text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-[콩닥핑크]/40 focus:border-[콩닥핑크]`. (콩닥핑크 = 로고/포인트 코랄핑크, 실제 값은 결과 페이지에서 확인해 통일.)
- **라벨:** `text-gray-300 uppercase tracking-wide` → 콩닥 톤 `text-gray-600`, uppercase 남발 완화.
- **제목:** `font-serif` + 흰색 그라데이션·`text-gold` Sparkles → 콩닥 제목 스타일(핑크/브라운) + 상단에 **두근이 마스코트**(있으면 `public`의 두근이 이미지) 배치.
- **CTA 버튼(회원가입/로그인):** 골드 그라데이션 → 콩닥 프라이머리 버튼(사이트 결제/CTA 버튼과 동일 스타일). 로딩 오버레이의 골드 스피너도 콩닥 포인트색으로.
- **소셜 버튼(카카오 노랑·네이버 초록·구글):** 브랜드 고정색이라 **유지**. 다만 컨테이너 라운드/그림자는 카드 톤과 맞춤.
- 다크 전용 잔재(`text-gold`, `bg-white/5`, `border-white/10`, `from-white via-gray-200` 등) 전수 치환. 라이트 배경에서 대비 확인.

**주의:** `login/layout.tsx`도 다크 배경 강제하면 함께 정리. 반응형(`min-h-[100dvh]`)·인앱브라우저 안내 로직은 유지.

---

## 3. OAuth 이메일 불일치 시 결제-계정 연동 문제 (★오픈 전 필수)

**문제:** 현재 `claim-unlock`은 `order.email === session.user.email`이어야 연동됨. 그러나 **카카오는 이메일 미제공(동의 안 함/미노출)이 흔하고**, 네이버/구글도 결제 이메일과 로그인 이메일이 다를 수 있음 → **정상 결제자 다수가 연동 실패(403)**. 열람 자체는 이미 `orderId`(추측 불가 secret)로 되므로, claim의 진짜 증명 수단은 **이메일이 아니라 orderId 소유**여야 함.

### 권장안 A — 결제 완료 시 서명 claim 쿠키 발급 (이메일 무관)

**Prisma(additive):** `Order`에 아래 2개 컬럼 추가.
```prisma
claimToken          String?   @unique
claimTokenExpiresAt DateTime?
```

**결제 완료** `app/api/payments/complete/route.ts` — 결제 PAID 검증 **성공 이후**에만(코어 검증 로직은 건드리지 말고 뒤에 추가):
- 랜덤 `claimToken`(예: `crypto.randomUUID()`) 생성, Order에 저장, `claimTokenExpiresAt = now + 90d`.
- 응답(또는 리다이렉트 전)에 **httpOnly, Secure, SameSite=Lax, Path=/, Max-Age=90d** 쿠키 `kd_claim` 설정. 값 = `claimToken`(또는 `{orderId, claimToken}` JSON). **SameSite=Lax 필수**(카카오 OAuth 왕복 리다이렉트 후에도 쿠키 유지되도록).

**연동** `app/api/user/claim-unlock/route.ts` 수정:
- 로그인 세션 필수(그대로).
- **claimToken을 쿠키에서 읽어** Order를 `where: { claimToken }`로 조회(클라가 orderId를 몰라도 됨).
- 검증: 토큰 유효(만료 전) + `order.status === 'PAID'` + `order.userId == null`(**선점 연동, 먼저 로그인한 사람이 임자**) → `session.user.id`로 귀속(**이메일/제공자 무관**).
- 이미 `order.userId`가 있으면 409(그대로). 연동 성공 후 쿠키 삭제(1회성).
- **기존 이메일 일치 403 차단 블록은 제거.** (이메일이 같으면 자동연동 편의로만 남기고, 절대 차단 조건으로 쓰지 말 것.)

**UX(자동 연동):** 결제한 브라우저에서 로그인(어떤 소셜이든) 성공 후, 대시보드/결과 진입 시 `kd_claim` 쿠키가 있으면 claim-unlock을 **자동 호출** → 사용자가 아무 것도 안 해도 계정에 붙음. (수동 "내 계정에 저장" 버튼도 유지 가능.)

### 대안 B — 최소 변경(빠른 오픈용, 팀 결정 시)
- 쿠키 없이 `claim-unlock`에서 **이메일 일치 검사만 제거**하고 "`orderId` 소유 + `order.userId == null` 이면 연동" 로 완화.
- 완화 조건: **orderId를 공개(바이럴 shareToken) 링크에 절대 노출 금지**(결제자 전용 결과 링크에만), 연동 가능 기간 = Unlock 유효기간(90일).
- 리스크: 결제자가 자기 결과 링크를 claim 전에 유출하면 타인이 선점 연동 가능(접근이 아니라 "기록 귀속"만 영향). A보다 약함.

> 기본은 **A로 구현**. 속도상 B를 택하면 이 문서에 사유 남기고 Opus5 재검수에 그 결정 포함.

---

## 완료·검증
1. 위 3건 구현. Prisma additive면 `db push`.
2. `npm run build` 통과 → 변경/신규 파일 목록 보고 → 커밋 → `safe_deploy.py`(BUILD_EXIT=0 / Deploy VERIFIED 확인).
3. **E2E 재현:** ① 게스트 결제 → **카카오(또는 이메일 다른 계정)로 로그인 → 자동/수동 claim → 리포트가 계정에 연동·열람** 성공(3번 검증). ② 어드민에서 그 테스트 계정 **탈퇴 처리 → 같은 이메일로 재가입 가능** 확인(1번 검증). ③ 로그인 페이지 콩닥 디자인 육안 확인(2번).
4. 3번은 결제-권한 경계 변경이므로 **Opus5 재검수 대상**(claim-unlock, payments/complete, admin/users/delete).
