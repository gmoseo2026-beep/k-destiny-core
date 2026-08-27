import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { payments } from "@/lib/payments";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, data } = body;

    // Toss Payments 웹훅 (멱등성 보장)
    if (eventType === "PAYMENT_STATUS_CHANGED") {
      const { orderId, paymentKey } = data;
      
      const order = await prisma.order.findUnique({ where: { orderId }});
      if (!order) {
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // 웹훅 위조 방지: 실제 Toss 서버에 조회하여 교차 검증
      if (!paymentKey) {
        return NextResponse.json({ error: "Missing paymentKey" }, { status: 400 });
      }

      const verifiedPayment = await payments.getPayment(paymentKey);
      if (
        verifiedPayment.orderId !== order.orderId ||
        verifiedPayment.totalAmount !== order.amount
      ) {
        return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
      }

      const verifiedStatus = verifiedPayment.status;

      if (verifiedStatus === "CANCELED" || verifiedStatus === "PARTIAL_CANCELED") {
        await prisma.order.update({
          where: { orderId },
          data: { status: "CANCELED" }
        });
        
        if (order.type === 'SINGLE') {
          await prisma.unlock.deleteMany({
            where: { orderId: order.id }
          });
        }
      } else if (verifiedStatus === "DONE" && order.status !== "PAID") {
        await prisma.order.update({
          where: { orderId },
          data: { status: "PAID", tossPaymentKey: paymentKey }
        });

        if (order.type === 'SINGLE' && order.compatId) {
          const existingUnlock = await prisma.unlock.findUnique({
            where: { compatId: order.compatId }
          });
          if (!existingUnlock) {
            await prisma.unlock.create({
              data: {
                compatId: order.compatId,
                orderId: order.id,
                userId: order.userId,
                email: order.email,
              }
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Toss webhook error:", error);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
