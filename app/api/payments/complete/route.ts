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
