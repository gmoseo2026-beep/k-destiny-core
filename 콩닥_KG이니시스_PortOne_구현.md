# 콩닥 결제 — KG이니시스(PortOne v2) 테스트모드 구현 (완성 코드)

**목표:** PortOne 안내대로 "테스트모드로 결제페이지 + 결제모듈(결제창) 호출까지 실제 구현" → KG이니시스/카드사 심사 진행 가능 상태로 만든다.
**적용:** 안티그래비티(Gemini)가 아래 코드를 프로젝트에 반영 → 커밋/푸시/배포. 이후 Opus5 보안검수.
**재사용:** Order 생성·`isEntitled`(패스 만료)·상품/가격·약관은 그대로. **PG 호출부만 PortOne로 연결.**

---

## 0. PortOne 콘솔에서 먼저(사용자 작업)
1. 결제연동 > 연동정보 > 채널관리 > **채널 추가** → 연동모드 **테스트**, PG **KG이니시스**, 결제모듈 **결제창(일반결제)**. 테스트 MID는 `INIpayTest` 자동.
2. 생성된 **채널키(channelKey)** 와 **상점 ID(storeId)** 확보.
3. 연동정보 > **API Secret(V2)** 확보(서버 결제조회/취소용).
4. 웹훅관리 > 결제모듈 **V2** > 엔드포인트 `https://kongdak.kr/api/webhooks/portone`, Content-Type `application/json` → 저장 후 **웹훅 시크릿** 확보.
> 테스트 채널: 실제 카드로 승인 후 매일 23:00~23:50 자동취소. **국민카드(및 제휴 카카오뱅크 등)는 테스트 미지원.** 카카오/네이버페이는 테스트에 기본 노출되나 실서비스는 별도 계약.

## 1. 패키지 & env
```
npm i @portone/browser-sdk @portone/server-sdk
```
`.env` (시크릿 커밋 금지):
```
PG_PROVIDER=portone
NEXT_PUBLIC_PORTONE_STORE_ID=store-xxxxxxxx
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=channel-xxxxxxxx   # KG이니시스 테스트 채널키
PORTONE_API_SECRET=xxxxxxxx                          # V2 API Secret
PORTONE_WEBHOOK_SECRET=xxxxxxxx
```

## 2. lib/payments/portone.ts (신규 — provider 인터페이스 구현)
```ts
import { PaymentProvider } from "./provider";
import { Order } from "@prisma/client";
import { NextRequest } from "next/server";
import * as PortOneServer from "@portone/server-sdk";

const API = "https://api.portone.io";
const SECRET = process.env.PORTONE_API_SECRET || "";
const WEBHOOK_SECRET = process.env.PORTONE_WEBHOOK_SECRET || "";

function authHeader() {
  return { Authorization: `PortOne ${SECRET}`, "Content-Type": "application/json" };
}

export const portoneProvider: PaymentProvider = {
  // 클라 결제창 파라미터(프론트에서 직접 requestPayment 하지만 인터페이스 유지)
  requestPaymentParams(order: Order) {
    return {
      storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID,
      channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
      paymentId: order.orderId,
      orderName: order.type === "SINGLE" ? "콩닥 심층 궁합 리포트" : "콩닥 플러스 이용권",
      totalAmount: order.amount,
      currency: "CURRENCY_KRW",
      payMethod: "CARD",
    };
  },

  // PortOne은 PG에서 승인 완료 → 별도 capture 없음. getPayment로 검증만.
  async confirmPayment({ paymentKey }) {
    return this.getPayment(paymentKey);
  },

  async getPayment(paymentId: string) {
    const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
      method: "GET",
      headers: authHeader(),
    });
    if (!res.ok) {
      const e = await res.text();
      throw new Error(`PortOne getPayment failed: ${res.status} ${e}`);
    }
    return res.json();
  },

  async cancelPayment(paymentId: string, reason: string, cancelAmount?: number) {
    const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(cancelAmount ? { reason, amount: cancelAmount } : { reason }),
    });
    if (!res.ok) {
      const e = await res.text();
      throw new Error(`PortOne cancel failed: ${res.status} ${e}`);
    }
    return res.json();
  },

  // 웹훅 서명검증 (@portone/server-sdk). rawBody 필수.
  async verifyWebhook(req: NextRequest) {
    const raw = await req.text();
    const headers = Object.fromEntries(req.headers.entries());
    const verified = await PortOneServer.Webhook.verify(WEBHOOK_SECRET, raw, headers);
    return verified; // { type, timestamp, data: { paymentId, ... } }
  },

  // 구독/정기결제 미사용
  async issueBillingKey() { throw new Error("billing not supported"); },
  async chargeBilling() { throw new Error("billing not supported"); },
};
```

## 3. lib/payments/index.ts (PG 스위치)
```ts
import { tossProvider } from "./toss";
import { portoneProvider } from "./portone";

export const payments =
  process.env.PG_PROVIDER === "portone" ? portoneProvider : tossProvider;
```

## 4. lib/payments/grant.ts (신규 — 결제완료 시 권한부여, 멱등·트랜잭션)
```ts
import prisma from "@/lib/prisma";

export async function applyPaidOrder(orderId: string, providerTxId?: string) {
  const order = await prisma.order.findUnique({ where: { orderId } });
  if (!order) return { ok: false, reason: "no_order" };
  if (order.status === "PAID") return { ok: true, already: true };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { orderId },
      data: { status: "PAID", tossPaymentKey: providerTxId ?? order.tossPaymentKey },
    });

    if (order.type === "SINGLE" && order.compatId) {
      const exist = await tx.unlock.findUnique({ where: { compatId: order.compatId } });
      if (!exist) {
        await tx.unlock.create({
          data: { compatId: order.compatId, orderId: order.id, userId: order.userId, email: order.email },
        });
      }
    } else if (order.type === "PERIOD_PASS" && order.userId) {
      const months = order.planId === "1_MONTH" ? 1 : order.planId === "3_MONTHS" ? 3 : 0;
      if (months > 0) {
        const user = await tx.user.findUnique({ where: { id: order.userId }, select: { premiumEndDate: true } });
        const now = new Date();
        const base = user?.premiumEndDate && user.premiumEndDate > now ? new Date(user.premiumEndDate) : now;
        const end = new Date(base); end.setMonth(end.getMonth() + months);
        await tx.user.update({
          where: { id: order.userId },
          data: { tier: "PREMIUM", premiumEndDate: end, planType: order.planId, subscriptionStatus: "ACTIVE", paidAmount: order.amount },
        });
      }
    }
  });
  return { ok: true };
}
```

## 5. app/api/payments/complete/route.ts (신규 — 서버 검증)
```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { payments } from "@/lib/payments";
import { applyPaidOrder } from "@/lib/payments/grant";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { paymentId } = await req.json();
    if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { orderId: paymentId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // 소유권: 회원 주문이면 세션 일치 필수(게스트 주문은 orderId 자체가 토큰)
    if (order.userId && session?.user?.id !== order.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 서버가 PortOne에 조회해 상태·금액 대조 (클라 신뢰 금지)
    const payment = await payments.getPayment(paymentId);
    if (payment.status !== "PAID") {
      return NextResponse.json({ error: "Payment not completed", status: payment.status }, { status: 402 });
    }
    if (Number(payment.amount?.total) !== order.amount) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    await applyPaidOrder(paymentId, payment.id ?? payment.transactionId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error("[payments/complete]", e);
    return NextResponse.json({ error: e.message || "complete failed" }, { status: 500 });
  }
}
```

## 6. app/api/webhooks/portone/route.ts (신규 — 서명검증·재조회·멱등)
```ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { payments } from "@/lib/payments";
import { applyPaidOrder } from "@/lib/payments/grant";

export async function POST(req: NextRequest) {
  try {
    // 서명검증(내부에서 rawBody 사용). 실패 시 throw → 400.
    const event: any = await payments.verifyWebhook(req);
    const type: string = event?.type || "";
    const paymentId: string | undefined = event?.data?.paymentId;
    if (!paymentId) return NextResponse.json({ ok: true }, { status: 200 });

    const order = await prisma.order.findUnique({ where: { orderId: paymentId } });
    if (!order) return NextResponse.json({ ok: true }, { status: 200 });

    if (type.startsWith("Transaction.Paid")) {
      const payment = await payments.getPayment(paymentId);
      if (payment.status === "PAID" && Number(payment.amount?.total) === order.amount) {
        await applyPaidOrder(paymentId, payment.id ?? payment.transactionId);
      }
    } else if (type.startsWith("Transaction.Cancelled")) {
      if (order.status !== "CANCELED") {
        await prisma.order.update({ where: { orderId: paymentId }, data: { status: "CANCELED" } });
        if (order.type === "SINGLE") {
          await prisma.unlock.deleteMany({ where: { orderId: order.id } });
        }
        // 패스 취소 시 premiumEndDate 회수는 정책 확정 후(초기엔 수동 처리) — 주석 유지.
      }
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[webhooks/portone]", e);
    return NextResponse.json({ ok: false }, { status: 400 }); // 서명 실패 등
  }
}
```
> Next.js App Router route는 기본이 raw 접근 가능(req.text()). 별도 bodyParser 설정 불필요.

## 7. 프론트 결제창 호출 (결과화면 페이월 + /ko/pricing 버튼 공통)
결제 버튼 클릭 시:
```ts
import * as PortOne from "@portone/browser-sdk/v2";

async function pay(opts: {
  type: "SINGLE" | "PERIOD_PASS";
  planId?: "1_MONTH" | "3_MONTHS";
  compatId?: string;
  buyer: { fullName: string; email: string; phoneNumber: string }; // 이니시스 필수
}) {
  // 1) 서버가 주문 생성(금액 서버 결정)
  const orderRes = await fetch("/api/payments/order", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: opts.type, planId: opts.planId, compatId: opts.compatId, email: opts.buyer.email }),
  });
  const order = await orderRes.json();
  if (!orderRes.ok) { alert(order.error || "주문 생성 실패"); return; }

  // 2) PortOne 결제창
  const res = await PortOne.requestPayment({
    storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
    channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
    paymentId: order.orderId,
    orderName: opts.type === "SINGLE" ? "콩닥 심층 궁합 리포트" : "콩닥 플러스 이용권",
    totalAmount: order.amount,
    currency: "CURRENCY_KRW",
    payMethod: "CARD",
    customer: { fullName: opts.buyer.fullName, email: opts.buyer.email, phoneNumber: opts.buyer.phoneNumber },
    redirectUrl: `${window.location.origin}/ko/pay/complete?paymentId=${order.orderId}`,
  });

  // 3) PC: 프로미스 반환(res.code != null 이면 실패). 모바일: redirectUrl로 이동.
  if (res && res.code != null) { alert(`결제 실패: ${res.message}`); return; }
  await verifyAndGo(order.orderId, opts.compatId);
}

async function verifyAndGo(paymentId: string, compatId?: string) {
  const r = await fetch("/api/payments/complete", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentId }),
  });
  if (r.ok) { /* 리포트 열람으로 이동 or 새로고침 */ location.reload(); }
  else { const e = await r.json(); alert(e.error || "결제 확인 실패"); }
}
```
- **이니시스 PC결제는 fullName·phoneNumber·email 필수** → 게스트 결제 폼에 이름·휴대폰 입력 추가(패스는 로그인 정보 활용).

## 8. app/[locale]/pay/complete/page.tsx (신규 — 모바일 리다이렉트 복귀)
```tsx
"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PayComplete() {
  const sp = useSearchParams();
  const [msg, setMsg] = useState("결제 확인 중…");
  useEffect(() => {
    const paymentId = sp.get("paymentId");
    const code = sp.get("code"); // 실패 시 PortOne이 code 부여
    if (!paymentId) { setMsg("잘못된 접근입니다."); return; }
    if (code) { setMsg("결제가 취소되었거나 실패했습니다."); return; }
    fetch("/api/payments/complete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    }).then(async (r) => {
      if (r.ok) setMsg("결제가 완료되었습니다! 리포트를 확인하세요.");
      else { const e = await r.json(); setMsg(e.error || "결제 확인 실패"); }
    });
  }, [sp]);
  return <div style={{ padding: 40, textAlign: "center" }}>{msg}</div>;
}
```

## 9. 기타
- `app/api/payments/order/route.ts`: 주문 생성 시 `provider: "portone"` 명시(또는 schema default 변경). 나머지 로직 유지.
- 기존 `app/api/webhooks/toss` 및 toss 결제창 경로는 미사용(삭제 또는 방치, PG_PROVIDER로 분기됨).
- 심층 리포트/페이월/entitlement는 기존 그대로.

## 10. 완료 기준(심사용)
- 테스트 채널로 **결제창이 실제로 뜨고**, 카드 결제 → `/complete` 서버검증 → 언락/패스 반영, 웹훅 서명검증·멱등 동작.
- `npm run build` 통과, 시크릿 커밋 0.
- 어드민 우회 유지(테스트). PortOne 콘솔에 웹훅 URL 등록됨.
