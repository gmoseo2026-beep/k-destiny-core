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
      const exist = await tx.unlock.findUnique({ where: { compatId: order.compatId } });
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

