import type { Prisma } from "@prisma/client";

/**
 * 비회원 PAID 주문 1건을 회원 계정에 귀속한다(주문·열람 권한·생성 리포트·궁합).
 * /api/user/claim-unlock 와 같은 규칙: 주문 귀속이 관문이다 — `userId: null` 조건으로 DB 가 승자를 정하고,
 * 이미 다른 사람에게 간 주문이면 아무것도 쓰지 않고 false 를 돌려준다.
 * 궁합은 그 궁합의 "최초 결제 주문"일 때만 작성자로 귀속한다.
 */
export async function linkPaidGuestOrder(
  tx: Prisma.TransactionClient,
  order: { id: string; compatId: string | null },
  userId: string,
): Promise<boolean> {
  const claimed = await tx.order.updateMany({
    where: { id: order.id, userId: null, status: "PAID" },
    data: { userId, claimToken: null, claimTokenExpiresAt: null },
  });
  if (claimed.count === 0) return false;

  await tx.unlock.updateMany({ where: { orderId: order.id, userId: null }, data: { userId } });
  await tx.generatedReport.updateMany({ where: { orderId: order.id, userId: null }, data: { userId } });

  if (order.compatId) {
    const firstPaid = await tx.order.findFirst({
      where: { compatId: order.compatId, status: "PAID" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (firstPaid?.id === order.id) {
      await tx.compatibility.updateMany({ where: { id: order.compatId, userId: null }, data: { userId } });
    }
  }
  return true;
}
