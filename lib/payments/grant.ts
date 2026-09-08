import prisma from "@/lib/prisma";

export async function applyPaidOrder(orderId: string, providerTxId?: string) {
  const order = await prisma.order.findUnique({ where: { orderId } });
  if (!order) return { ok: false, reason: "no_order" };
  if (order.status === "PAID") return { ok: true, already: true };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { orderId },
      data: { status: "PAID", tossPaymentKey: providerTxId ?? order.tossPaymentKey },
    });

    if (order.type === "SINGLE" && order.compatId) {
      const exist = await tx.unlock.findUnique({ where: { compatId: order.compatId } });
      if (!exist) {
        await tx.unlock.create({
          data: { compatId: order.compatId, orderId: order.id, userId: order.userId, email: order.email },
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
  });
  return { ok: true };
}
