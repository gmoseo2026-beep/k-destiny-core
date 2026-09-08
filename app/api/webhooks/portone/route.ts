import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { payments } from "@/lib/payments";
import { applyPaidOrder, revokePaidOrder } from "@/lib/payments/grant";

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
    } else if (
      type.startsWith("Transaction.Cancelled") ||
      type.startsWith("Transaction.PartialCancelled")
    ) {
      // [SECURITY / H-4] 취소 여부도 웹훅 타입 문자열이 아니라 PG 재조회로 판정한다.
      // (이전에는 PartialCancelled 가 startsWith("Transaction.Cancelled") 에 걸리지 않아
      //  부분취소가 완전히 무시됐다)
      const payment = await payments.getPayment(paymentId);
      const total = Number(payment.amount?.total);
      const cancelled = Number(payment.amount?.cancelled ?? 0);
      const amountsKnown = Number.isFinite(total) && Number.isFinite(cancelled);
      const partialOnly = amountsKnown && cancelled > 0 && cancelled < total;

      if (partialOnly) {
        // 단일 SKU 서비스라 부분취소는 정상 플로우가 아니다. 자동 회수 대신 수동 확인 대상으로 남긴다.
        console.warn("[webhooks/portone] partial cancel — 수동 확인 필요", {
          paymentId,
          total,
          cancelled,
        });
      } else {
        // 전액취소이거나 금액을 확정할 수 없는 경우 → 권한 회수(fail-closed).
        await revokePaidOrder(paymentId);
      }
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[webhooks/portone]", e);
    return NextResponse.json({ ok: false }, { status: 400 }); // 서명 실패 등
  }
}
