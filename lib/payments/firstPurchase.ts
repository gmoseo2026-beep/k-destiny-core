import prisma from "@/lib/prisma";

/**
 * 회원 첫 결제 할인(FIRST_PURCHASE_PRICE) 대상인가.
 * 주문 금액을 정하는 /api/payments/order 와 회원 화면 안내가 같은 판정을 쓴다.
 * 수동 발급(admin_manual)·0원 주문·환불(CANCELED) 주문은 "결제한 적"으로 치지 않는다.
 */
export async function isFirstPurchaseEligible(userId: string): Promise<boolean> {
  const anyPaid = await prisma.order.findFirst({
    where: { userId, status: "PAID", provider: { not: "admin_manual" }, amount: { gt: 0 } },
    select: { id: true },
  });
  return !anyPaid;
}
