import * as PortOne from "@portone/browser-sdk/v2";

export interface BuyerInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
}

export interface PayOptions {
  type: "SINGLE" | "PERIOD_PASS";
  planId?: "1_MONTH" | "3_MONTHS";
  compatId?: string;
  buyer: BuyerInfo;
  locale?: string;
}

export async function requestPortOnePayment(opts: PayOptions): Promise<boolean> {
  // 1) 서버가 주문 생성 (금액은 서버에서 결정)
  const orderRes = await fetch("/api/payments/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: opts.type,
      planId: opts.planId,
      compatId: opts.compatId,
      email: opts.buyer.email,
    }),
  });

  const order = await orderRes.json();
  if (!orderRes.ok) {
    alert(order.error || "주문 생성 실패");
    return false;
  }

  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;

  if (!storeId || !channelKey) {
    alert("결제 설정(Store ID 또는 Channel Key)이 누락되었습니다.");
    return false;
  }

  const locale = opts.locale || "ko";
  const redirectUrl = `${window.location.origin}/${locale}/pay/complete?paymentId=${order.orderId}`;

  // 2) PortOne v2 결제창 호출 (KG이니시스)
  const res = await PortOne.requestPayment({
    storeId,
    channelKey,
    paymentId: order.orderId,
    orderName: opts.type === "SINGLE" ? "콩닥 심층 궁합 리포트" : "콩닥 플러스 이용권",
    totalAmount: order.amount,
    currency: "CURRENCY_KRW",
    payMethod: "CARD",
    customer: {
      fullName: opts.buyer.fullName,
      email: opts.buyer.email,
      phoneNumber: opts.buyer.phoneNumber,
    },
    redirectUrl,
  });

  // 3) PC: 프로미스 반환 (res.code != null 이면 취소/실패). 모바일: redirectUrl로 이동.
  if (res && res.code != null) {
    alert(`결제 실패: ${res.message || res.code}`);
    return false;
  }

  // 4) 서버 결제 검증 (서버가 PortOne getPayment 로만 최종 판정)
  return await verifyAndCompletePayment(order.orderId);
}

export async function verifyAndCompletePayment(paymentId: string): Promise<boolean> {
  try {
    const r = await fetch("/api/payments/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });

    if (r.ok) {
      window.location.reload();
      return true;
    } else {
      const e = await r.json();
      alert(e.error || "결제 확인에 실패했습니다.");
      return false;
    }
  } catch (err: any) {
    alert("결제 확인 서버 통신 중 오류가 발생했습니다.");
    return false;
  }
}
