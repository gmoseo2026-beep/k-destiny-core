import { PaymentProvider } from "./provider";
import { Order } from "@prisma/client";
import { NextRequest } from "next/server";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "";

// https://docs.tosspayments.com/reference
const TOSS_API_URL = "https://api.tosspayments.com/v1";

function getAuthHeader() {
  const basicToken = Buffer.from(`${TOSS_SECRET_KEY}:`, "utf-8").toString("base64");
  return {
    Authorization: `Basic ${basicToken}`,
    "Content-Type": "application/json",
  };
}

export const tossProvider: PaymentProvider = {
  requestPaymentParams(order: Order) {
    // 클라이언트에서 결제창 띄울 때 사용할 데이터
    return {
      amount: order.amount,
      orderId: order.orderId,
      orderName: order.type === 'SINGLE' ? "콩닥 심층 궁합 리포트" : "콩닥 플러스 무제한 구독",
      customerEmail: order.email || undefined,
    };
  },

  async confirmPayment({ paymentKey, orderId, amount }) {
    const res = await fetch(`${TOSS_API_URL}/payments/confirm`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Toss confirm failed: ${errorData.message}`);
    }

    return res.json();
  },

  async issueBillingKey({ authKey, customerKey }) {
    const res = await fetch(`${TOSS_API_URL}/billing/authorizations/issue`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({ authKey, customerKey }),
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  },

  async chargeBilling(billingKey: string, order: Order) {
    const res = await fetch(`${TOSS_API_URL}/billing/${billingKey}`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        customerKey: order.userId, 
        amount: order.amount,
        orderId: order.orderId,
        orderName: "콩닥 플러스 무제한 구독",
        customerEmail: order.email || undefined,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Toss billing charge failed: ${errorData.message}`);
    }

    return res.json();
  },

  async cancelPayment(paymentKey: string, cancelReason: string, cancelAmount?: number) {
    const res = await fetch(`${TOSS_API_URL}/payments/${paymentKey}/cancel`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({ cancelReason, cancelAmount }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Toss cancel failed: ${errorData.message}`);
    }

    return res.json();
  },

  async verifyWebhook(req: NextRequest) {
    const body = await req.json();
    return body;
  },

  async getPayment(paymentKey: string) {
    const res = await fetch(`${TOSS_API_URL}/payments/${paymentKey}`, {
      method: "GET",
      headers: getAuthHeader(),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Toss getPayment failed: ${errorData.message}`);
    }

    return res.json();
  }
};
