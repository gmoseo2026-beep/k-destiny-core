import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionOrThrow, logAdminAction } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";
import { payments } from "@/lib/payments";
import { revokePaidOrder } from "@/lib/payments/grant";

// 환불 이중 실행 레이스 방지 (M-3): 단일 프로세스 내 동시 환불 요청 선점 락
const refundingOrderLocks = new Set<string>();

export async function POST(req: NextRequest) {
  let lockAcquiredId: string | null = null;
  try {
    const admin = await getAdminSessionOrThrow();
    const body = await req.json();
    const { orderId, reason, cancelAmount, skipPg } = body;

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

    // 2. 부분 환불 방지 (단건 상품은 부분 환불 시 권한/지표 왜곡 발생)
    if (cancelAmount !== undefined && cancelAmount !== null) {
      const partial = Number(cancelAmount);
      if (!Number.isInteger(partial) || partial !== order.amount) {
        return NextResponse.json(
          { error: "단건 상품은 부분 취소를 지원하지 않으며, 전액 환불만 가능합니다." },
          { status: 400 }
        );
      }
    }

    // 3. 환불 이중 실행 레이스 방지 (M-3): 인메모리 락 선점
    if (refundingOrderLocks.has(order.id)) {
      return NextResponse.json(
        { error: "이미 해당 주문의 환불 처리가 진행 중입니다. 잠시 후 새로고침해 주세요." },
        { status: 409 }
      );
    }
    refundingOrderLocks.add(order.id);
    lockAcquiredId = order.id;

    // 4. PG사 결제 취소 요청
    let pgResult: any = null;
    const isAdminManual = order.provider === "admin_manual";

    if (!isAdminManual && !skipPg) {
      try {
        pgResult = await payments.cancelPayment(order.orderId, reason.trim());
      } catch (pgError: any) {
        console.error("[admin/orders/refund] PG cancel failed:", pgError);
        const errMsg = String(pgError.message || "");
        // 이미 PG사에서 취소된 경우(멱등)는 계속 진행 허용
        const isAlreadyCancelled =
          errMsg.includes("이미 취소") ||
          errMsg.includes("ALREADY_CANCELLED") ||
          errMsg.includes("already cancelled") ||
          errMsg.includes("취소된 거래");

        if (!isAlreadyCancelled) {
          return NextResponse.json(
            { error: `PG사 결제 취소 실패: ${errMsg || "취소 통신 오류"}` },
            { status: 502 }
          );
        }
        pgResult = { status: "ALREADY_CANCELLED", note: errMsg };
      }
    } else {
      pgResult = { status: "SKIPPED", reason: isAdminManual ? "admin_manual" : "skipPg_requested" };
    }

    // 5. 내부 권한 및 상태 원자적 회수 (Order CANCELED, Unlock 삭제, 패스 기간 롤백)
    const revokeResult = await revokePaidOrder(order.orderId);
    if (!revokeResult.ok) {
      // 회수 실패 시 REFUND_REVOKE_FAILED 감사로그를 반드시 남김
      await logAdminAction({
        adminUserId: admin.id,
        action: "REFUND_REVOKE_FAILED",
        targetType: "ORDER",
        targetId: order.orderId,
        detail: {
          reason: reason.trim(),
          amount: order.amount,
          revokeError: revokeResult.reason,
          pgResult: pgResult ? { status: pgResult.status } : null,
        },
      });

      return NextResponse.json(
        { error: `PG 취소는 완료/스킵되었으나 내부 권한 회수 실패: ${revokeResult.reason || "알 수 없는 오류"}. ?skipPg=true 로 재시도 가능합니다.` },
        { status: 500 }
      );
    }

    // 6. 감사 로그 기록 (PII 마스킹 및 화이트리스트 필드만 저장)
    const maskedEmail = order.email
      ? order.email.replace(/(?<=^.{2}).+(?=@)/, "***")
      : null;

    await logAdminAction({
      adminUserId: admin.id,
      action: "REFUND",
      targetType: "ORDER",
      targetId: order.orderId,
      detail: {
        reason: reason.trim(),
        totalAmount: order.amount,
        buyerEmail: maskedEmail,
        userId: order.userId,
        pgStatus: pgResult?.status ?? "SUCCESS",
        receiptUrl: pgResult?.receiptUrl ?? null,
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
  } finally {
    if (lockAcquiredId) {
      refundingOrderLocks.delete(lockAcquiredId);
    }
  }
}
