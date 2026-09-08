import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface EntitlementResult {
  entitled: boolean;
  reason: 'ADMIN' | 'SUBSCRIPTION' | 'UNLOCK' | 'NONE';
}

export async function isEntitled(params: {
  userId?: string | null;
  role?: string | null;
  tier?: string | null;
  compatId?: string | null;
  email?: string | null; // For legacy/compatibility
  orderId?: string | null; // For guest users
}): Promise<EntitlementResult> {
  const { userId, role, tier, compatId, email, orderId } = params;

  // 1. ADMIN is always entitled to everything (testing/bypass)
  if (role === 'ADMIN') {
    return { entitled: true, reason: 'ADMIN' };
  }

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true, premiumEndDate: true }
    });

    if (user && user.tier === 'PREMIUM') {
      const now = new Date();
      if (!user.premiumEndDate || user.premiumEndDate > now) {
        return { entitled: true, reason: 'SUBSCRIPTION' };
      }
      // If expired, treat as FREE (we can optionally update tier to FREE here)
      // We fall through to check UNLOCKs.
    }
    
    // Check for active subscriptions just in case
    const activeSub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        currentPeriodEnd: { gte: new Date() }
      }
    });
    if (activeSub) {
      return { entitled: true, reason: 'SUBSCRIPTION' };
    }
  }

  // 3. Single unlock check for a specific compatId (유효기간: 90일)
  if (compatId) {
    const now = new Date();

    if (orderId) {
      // 게스트 인증: 추측 불가 토큰인 orderId로 소유권 증명
      const order = await prisma.order.findUnique({
        where: { orderId },
        include: { unlocks: true },
      });
      if (order && order.status === 'PAID' && order.compatId === compatId) {
        // [SECURITY / M-5] Unlock 행이 없으면 "부여된 적 없음"이다 → 거부.
        // 이전에는 행이 없을 때 order.createdAt + 90일을 합성해서 부여했는데(fail-open),
        // 부여 실패·수동 삭제·취소 웹훅 유실 케이스가 전부 무료로 통과했다.
        // 유효기간 판정의 유일한 출처는 DB 의 Unlock.expiresAt 이다.
        const matchingUnlock = order.unlocks?.find((u) => u.compatId === compatId);
        if (matchingUnlock && (!matchingUnlock.expiresAt || matchingUnlock.expiresAt > now)) {
          return { entitled: true, reason: 'UNLOCK' };
        }
      }
    }

    // [Vuln 3 Fix] IDOR 방지: 단건 해금 시 반드시 소유권 검증 (userId 또는 email)
    const whereClause: Prisma.UnlockWhereInput = { compatId };

    if (userId) {
      whereClause.userId = userId;
    } else if (email) {
      whereClause.email = email;
    } else {
      // 증명 수단이 없으면 접근 차단
      return { entitled: false, reason: 'NONE' };
    }

    // [SECURITY / H-2] 같은 궁합을 여러 명이 결제하면 compatId 당 Unlock 이 여러 행이다.
    // 만료 조건을 WHERE 에 넣어, 어느 행 하나라도 유효하면 통과하도록 판정을 확정한다.
    // (orderBy 없는 findFirst 는 어떤 행이 잡힐지 비결정적이라 만료된 행에 걸릴 수 있었다)
    const unlock = await prisma.unlock.findFirst({
      where: {
        ...whereClause,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
    if (unlock) {
      return { entitled: true, reason: 'UNLOCK' };
    }
  }

  return { entitled: false, reason: 'NONE' };
}
