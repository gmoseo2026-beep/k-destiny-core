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
  email?: string | null; // For guest users
}): Promise<EntitlementResult> {
  const { userId, role, tier, compatId, email } = params;

  // 1. ADMIN is always entitled to everything (testing/bypass)
  if (role === 'ADMIN') {
    return { entitled: true, reason: 'ADMIN' };
  }

  // 2. Active subscription (or Premium tier unexpired)
  if (tier === 'PREMIUM') {
    return { entitled: true, reason: 'SUBSCRIPTION' };
  }

  if (userId) {
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
    // If logged in, check by userId
    if (userId) {
      const unlock = await prisma.unlock.findFirst({
        where: { compatId, userId }
      });
      if (unlock) return { entitled: true, reason: 'UNLOCK' };
    }
    
    // If guest, check by email
    if (email) {
      const unlock = await prisma.unlock.findFirst({
        where: { compatId, email }
      });
      if (unlock) return { entitled: true, reason: 'UNLOCK' };
    }
  }

  return { entitled: false, reason: 'NONE' };
}
