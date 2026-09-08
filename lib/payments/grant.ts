import prisma from "@/lib/prisma";

export async function applyPaidOrder(orderId: string, providerTxId?: string) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { orderId } });
    if (!order) return { ok: false, reason: "no_order" };

    // 원자적 status 체크 + 전환 (이미 PAID면 count === 0 → 권한부여 스킵)
    const res = await tx.order.updateMany({
      where: { orderId, status: { not: "PAID" } },
      data: { status: "PAID", tossPaymentKey: providerTxId ?? order.tossPaymentKey },
    });
    if (res.count === 0) return { ok: true, already: true };

    // 이후 Unlock / 패스 연장 진행 (같은 트랜잭션 안에서)
    if (order.type === "SINGLE" && order.compatId) {
      // [SECURITY / H-2] 이전에는 compatId 만으로 존재 여부를 봤기 때문에, 같은 궁합을
      // 두 번째로 결제한 사용자에게는 Unlock 행이 생성되지 않았다(대금만 수령).
      // 이제 (compatId, orderId) 복합 유니크로 "주문당 1행"을 보장한다.
      // status 가드(위 updateMany)가 이미 1회 실행을 보장하므로 이 조회는 이중 안전장치다.
      const exist = await tx.unlock.findUnique({
        where: { compatId_orderId: { compatId: order.compatId, orderId: order.id } },
      });
      if (!exist) {
        const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 결제일로부터 90일간 유효
        await tx.unlock.create({
          data: {
            compatId: order.compatId,
            orderId: order.id,
            userId: order.userId,
            email: order.email,
            expiresAt,
          },
        });
      }
    } else if (order.type === "PERIOD_PASS" && order.userId) {
      const months = order.planId === "1_MONTH" ? 1 : order.planId === "3_MONTHS" ? 3 : 0;
      if (months > 0) {
        const user = await tx.user.findUnique({ where: { id: order.userId }, select: { premiumEndDate: true } });
        const now = new Date();
        const base = user?.premiumEndDate && user.premiumEndDate > now ? new Date(user.premiumEndDate) : now;
        const end = new Date(base); end.setMonth(end.getMonth() + months);
        await tx.user.update({
          where: { id: order.userId },
          data: { tier: "PREMIUM", premiumEndDate: end, planType: order.planId, subscriptionStatus: "ACTIVE", paidAmount: order.amount },
        });
      }
    }

    return { ok: true };
  });
}


/**
 * [SECURITY / H-4] 결제 취소(환불) 시 부여했던 권한을 원자적으로 회수한다.
 *
 * 이전에는 SINGLE 의 Unlock 만 지우고 PERIOD_PASS 의 premiumEndDate 는 그대로 뒀기 때문에,
 * "패스 결제 → 열람 → 카드 취소" 를 반복하면 무한 무료 이용이 가능했다.
 *
 * applyPaidOrder 와 대칭 구조:
 *   - updateMany 의 status 가드로 정확히 1회만 회수(이중 취소 웹훅 무해)
 *   - PAID 였던 주문만 회수한다(PENDING/FAILED 는 부여된 적이 없음)
 *   - 전부 같은 트랜잭션 안에서 수행
 *
 * 기간 롤백은 "부여했던 개월수만큼 되돌리기"다. 단순히 tier=FREE 로 만들면
 * 다른 주문으로 정상 구매해 둔 잔여 기간까지 함께 날아간다.
 */
export async function revokePaidOrder(orderId: string) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { orderId } });
    if (!order) return { ok: false, reason: "no_order" };

    // 원자적 status 체크 + 전환 (이미 CANCELED면 count === 0 → 회수 스킵)
    const res = await tx.order.updateMany({
      where: { orderId, status: { not: "CANCELED" } },
      data: { status: "CANCELED" },
    });
    if (res.count === 0) return { ok: true, already: true };

    // 부여된 적 없는 주문(PENDING/FAILED)은 회수할 것도 없다.
    if (order.status !== "PAID") return { ok: true, notGranted: true };

    if (order.type === "SINGLE") {
      await tx.unlock.deleteMany({ where: { orderId: order.id } });
    } else if (order.type === "PERIOD_PASS" && order.userId) {
      const months = order.planId === "1_MONTH" ? 1 : order.planId === "3_MONTHS" ? 3 : 0;
      if (months > 0) {
        const user = await tx.user.findUnique({
          where: { id: order.userId },
          select: { premiumEndDate: true },
        });
        // premiumEndDate 가 null 이면 결제로 만들어진 기간이 아니다(수동/관리자 부여) → 건드리지 않는다.
        if (user?.premiumEndDate) {
          const now = new Date();
          const rolled = new Date(user.premiumEndDate);
          rolled.setMonth(rolled.getMonth() - months);
          const end = rolled < now ? now : rolled;
          const stillActive = end > now;
          await tx.user.update({
            where: { id: order.userId },
            data: {
              premiumEndDate: end,
              tier: stillActive ? "PREMIUM" : "FREE",
              subscriptionStatus: stillActive ? "ACTIVE" : "CANCELLED",
            },
          });
        }
      }
    }

    return { ok: true };
  });
}
