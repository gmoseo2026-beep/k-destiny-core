import prisma from "@/lib/prisma";

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

  // 3. Single unlock check for a specific compatId
  if (compatId) {
    if (orderId) {
      // 게스트 인증: 추측 불가 토큰인 orderId로 소유권 증명
      const order = await prisma.order.findUnique({
        where: { orderId }
      });
      if (order && order.status === 'PAID' && order.compatId === compatId) {
        return { entitled: true, reason: 'UNLOCK' };
      }
    }

    // [Vuln 3 Fix] IDOR 방지: 단건 해금 시 반드시 소유권 검증 (userId 또는 email)
    const whereClause: any = { compatId };
    
    if (userId) {
      whereClause.userId = userId;
    } else if (email) {
      whereClause.email = email;
    } else {
      // 증명 수단이 없으면 접근 차단
      return { entitled: false, reason: 'NONE' };
    }

    const unlock = await prisma.unlock.findFirst({
      where: whereClause
    });
    if (unlock) return { entitled: true, reason: 'UNLOCK' };
  }

  return { entitled: false, reason: 'NONE' };
}
