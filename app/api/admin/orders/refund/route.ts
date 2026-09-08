import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionOrThrow, logAdminAction } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";
import { payments } from "@/lib/payments";
import { revokePaidOrder } from "@/lib/payments/grant";

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionOrThrow();
    const body = await req.json();
    const { orderId, reason, cancelAmount } = body;

    if (!orderId) {
      return NextResponse.json({ error: "주문 식별자(orderId)가 필요합니다." }, { status: 400 });
    }
    if (!reason || typeof reason !== "string" || reason.trim() === "") {
      return NextResponse.json({ error: "환불 사유를 입력해주세요." }, { status: 400 });
    }

    // 1. 주문 조회 (orderId 또는 id)
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderId }, { id: orderId }],
      },
    });

    if (!order) {
      return NextResponse.json({ error: "해당 주문을 찾을 수 없습니다." }, { status: 404 });
    }

    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: `결제 완료(PAID) 상태의 주문만 환불할 수 있습니다. (현재 상태: ${order.status})` },
        { status: 400 }
      );
    }

    // 2. PG사 결제 취소 요청
    let pgResult = null;
    try {
      pgResult = await payments.cancelPayment(order.orderId, reason.trim(), cancelAmount ? Number(cancelAmount) : undefined);
    } catch (pgError: any) {
      console.error("[admin/orders/refund] PG cancel failed:", pgError);
      // 만약 PG사에서 이미 취소된 주문이거나 오류인 경우에도 DB 정합성 회수가 필요할 수 있으므로 에러 메시지 반환
      return NextResponse.json(
        { error: `PG사 결제 취소 실패: ${pgError.message || "취소 통신 오류"}` },
        { status: 502 }
      );
    }

    // 3. 내부 권한 및 상태 원자적 회수 (Order CANCELED, Unlock 삭제, 패스 기간 롤백)
    const revokeResult = await revokePaidOrder(order.orderId);
    if (!revokeResult.ok) {
      return NextResponse.json(
        { error: `내부 권한 회수 실패: ${revokeResult.reason || "알 수 없는 오류"}` },
        { status: 500 }
      );
    }

    // 4. 감사 로그 기록
    await logAdminAction({
      adminUserId: admin.id,
      action: "REFUND",
      targetType: "ORDER",
      targetId: order.orderId,
      detail: {
        reason: reason.trim(),
        cancelAmount: cancelAmount ? Number(cancelAmount) : order.amount,
        totalAmount: order.amount,
        buyerEmail: order.email,
        userId: order.userId,
        pgResult,
      },
    });

    return NextResponse.json({
      success: true,
      message: "환불 및 권한 회수가 성공적으로 완료되었습니다.",
      orderId: order.orderId,
    });
  } catch (error: any) {
    console.error("[admin/orders/refund] Error:", error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || "환불 처리 중 오류가 발생했습니다." },
      { status }
    );
  }
}
