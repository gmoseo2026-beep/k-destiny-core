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
