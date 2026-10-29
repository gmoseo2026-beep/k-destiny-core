import { payments } from "@/lib/payments";
import { revokePaidOrder } from "@/lib/payments/grant";

export interface RefundableOrderInfo {
  orderId: string;
  amount: number;
  status: string;
  provider: string;
}

export interface AutoRefundResult {
  refunded: boolean;
  pgStatus: "SUCCESS" | "ALREADY_CANCELLED" | "SKIPPED" | "PG_FAILED";
  error?: string;
}

/**
 * 리포트 생성 + 재생성까지 모두 실패했을 때 PG 결제 취소 및 내부 권한(Order CANCELED, Unlock 회수)을 수행한다.
 * app/api/admin/orders/refund/route.ts 의 PG 취소·권한 회수 규칙과 동일하게 동작한다.
 */
export async function autoRefundFailedOrder(
  order: RefundableOrderInfo,
  reason = "두근이에게 묻기 리포트 생성 실패 자동 환불",
): Promise<AutoRefundResult> {
  if (order.status !== "PAID") {
    return { refunded: false, pgStatus: "SKIPPED", error: `NOT_PAID:${order.status}` };
  }

  const skipPg =
    order.provider === "admin_manual" ||
    order.provider === "gift_redeem" ||
    order.amount <= 0;

  let pgStatus: AutoRefundResult["pgStatus"] = "SKIPPED";

  if (!skipPg) {
    try {
      await payments.cancelPayment(order.orderId, reason);
      pgStatus = "SUCCESS";
    } catch (pgError: unknown) {
      const errMsg = pgError instanceof Error ? pgError.message : String(pgError ?? "");
      const isAlreadyCancelled =
        errMsg.includes("이미 취소") ||
        errMsg.includes("ALREADY_CANCELLED") ||
        errMsg.includes("already cancelled") ||
        errMsg.includes("취소된 거래");

      if (!isAlreadyCancelled) {
        console.error("[autoRefundFailedOrder] PG cancel failed:", pgError);
        return {
          refunded: false,
          pgStatus: "PG_FAILED",
          error: errMsg || "PG_CANCEL_FAILED",
        };
      }
      pgStatus = "ALREADY_CANCELLED";
    }
  }

  const revoked = await revokePaidOrder(order.orderId);
  if (!revoked.ok) {
    console.error("[autoRefundFailedOrder] revokePaidOrder failed:", revoked.reason);
    return {
      refunded: false,
      pgStatus,
      error: revoked.reason || "REVOKE_FAILED",
    };
  }

  return {
    refunded: true,
    pgStatus,
  };
}
