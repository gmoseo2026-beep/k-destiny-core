import prisma from "@/lib/prisma";

export function maskEmail(email: string | null): string {
  if (!email) return "—";
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [user, domain] = parts;
  const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***` : `${user}***`;
  return `${maskedUser}@${domain}`;
}

export interface ExecuteUserDeletionParams {
  targetUserId: string;
  actorUserId: string;
  action: "USER_DELETE" | "SELF_DELETE";
  reason: string;
  targetEmail: string | null;
  targetName?: string | null;
}

/**
 * 회원 계정 영구 삭제 및 개인정보 파기 트랜잭션 (관리자 탈퇴 처리 · 회원 셀프 탈퇴 공용).
 *
 * - 전자상거래법상 5년 보관 대상인 Order 행은 삭제하지 않는다 (schema `onDelete: SetNull`로 `userId=null` 보존).
 * - 살아 있는 Order.claimToken 은 삭제 직전에 소각하여 탈퇴 후 미귀속 주문 재귀속을 차단한다 (M-12).
 * - Unlock 은 userId/email 파기와 함께 expiresAt 을 즉시 만료 처리해 남은 열람 기간의 리포트 접근을 차단한다.
 * - User 삭제 시 UserSajuProfile, Account, Session, PurchasedReport, Subscription, WeeklyFortune, UserDailyFortune 은 Cascade 삭제된다.
 */
export async function executeUserDeletion(
  params: ExecuteUserDeletionParams,
): Promise<{ ordersKept: number }> {
  const { targetUserId, actorUserId, action, reason, targetEmail, targetName } = params;

  const ordersKept = await prisma.order.count({
    where: { userId: targetUserId },
  });

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.adminAuditLog.create({
      data: {
        adminUserId: actorUserId,
        action,
        targetType: "USER",
        targetId: targetUserId,
        detail: {
          reason: reason.trim(),
          emailMasked: maskEmail(targetEmail),
          ...(action === "USER_DELETE" ? { userName: targetName ?? null } : { selfRequested: true }),
          ordersKept,
        },
      },
    });

    await tx.order.updateMany({
      where: { userId: targetUserId },
      data: { claimToken: null, claimTokenExpiresAt: null },
    });

    await tx.unlock.updateMany({
      where: { userId: targetUserId },
      data: { userId: null, email: null, expiresAt: now },
    });

    await tx.compatibility.updateMany({
      where: { userId: targetUserId },
      data: { userId: null },
    });

    await tx.telegramAccount.updateMany({
      where: { userId: targetUserId },
      data: { userId: null },
    });

    if (tx.pushSubscription?.deleteMany) {
      await tx.pushSubscription.deleteMany({ where: { userId: targetUserId } });
    }
    if (tx.annualFortune?.deleteMany) {
      await tx.annualFortune.deleteMany({ where: { userId: targetUserId } });
    }
    if (tx.generatedReport?.updateMany) {
      await tx.generatedReport.updateMany({
        where: { userId: targetUserId },
        data: { userId: null },
      });
    }
    if (tx.reportCache?.updateMany) {
      await tx.reportCache.updateMany({
        where: { userId: targetUserId },
        data: { userId: null },
      });
    }
    if (tx.compatInvite?.updateMany) {
      await tx.compatInvite.updateMany({
        where: { creatorId: targetUserId },
        data: { creatorId: null },
      });
    }
    if (tx.coupon?.deleteMany) {
      await tx.coupon.deleteMany({
        where: {
          ownerKey: { in: [targetUserId, `u:${targetUserId}`] },
          usedOrderId: null,
        },
      });
    }

    await tx.user.delete({
      where: { id: targetUserId },
    });
  });

  return { ordersKept };
}
