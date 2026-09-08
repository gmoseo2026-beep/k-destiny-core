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
