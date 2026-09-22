import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { CATALOG } from "@/lib/catalog";

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
  productKey?: string | null; // For specific products (e.g. "ANNUAL:2026" or "annual_2026")
}): Promise<EntitlementResult> {
  const { userId, role, tier, compatId, email, orderId, productKey } = params;

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

  const now = new Date();

  // 2-1. Single unlock check for a specific productKey
  if (productKey) {
    // Parse legacy "ANNUAL:2026" or standard catalog IDs like "annual_2026"
    let pType = "";
    let pKey = "";
    if (productKey.includes(':')) {
      [pType, pKey] = productKey.split(':');
    } else {
      pKey = productKey;
      const catalogItem = CATALOG.find((c) => c.id === pKey);
      pType = catalogItem ? catalogItem.type : (pKey.startsWith("annual_") ? "ANNUAL" : "FORTUNE");
    }
    
    // Find sets containing this product
    const setsContainingProduct = CATALOG.filter((c) => c.type === "SET" && c.items?.includes(pKey));
    const allowedKeys = [{ pType, pKey }];
    for (const set of setsContainingProduct) {
      allowedKeys.push({ pType: "SET", pKey: set.id });
    }

    // Check Guest via orderId
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { orderId },
        include: { unlocks: true },
      });
      if (order && order.status === 'PAID') {
        const matchingUnlock = order.unlocks?.find((u) => 
          allowedKeys.some(ak => u.productType === ak.pType && u.productKey === ak.pKey)
        );
        if (matchingUnlock && (!matchingUnlock.expiresAt || matchingUnlock.expiresAt > now)) {
          return { entitled: true, reason: 'UNLOCK' };
        }
      }
    }

    // Check Member via userId
    if (userId) {
      const unlock = await prisma.unlock.findFirst({
        where: {
          userId,
          OR: allowedKeys.map(ak => ({
            productType: ak.pType,
            productKey: ak.pKey,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
          }))
        },
      });
      if (unlock) {
        return { entitled: true, reason: 'UNLOCK' };
      }
    }
    
    // If no compatId fallback, return NONE
    if (!compatId) {
      return { entitled: false, reason: 'NONE' };
    }
  }

  // 3. Single unlock check for a specific compatId
  if (compatId) {
    const setsContainingCompat = CATALOG.filter((c) => c.type === "SET" && c.items?.includes("compat_basic"));
    const allowedSetKeys = setsContainingCompat.map(s => s.id);

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { orderId },
        include: { unlocks: true },
      });
      if (order && order.status === 'PAID') {
        const matchingUnlock = order.unlocks?.find((u) => {
           if (u.compatId === compatId && (!u.productType || u.productType === "COMPAT")) return true;
           // Also check if they unlocked a SET that contains compat_basic
           if (u.productType === "SET" && u.productKey && allowedSetKeys.includes(u.productKey)) return true;
           return false;
        });
        if (matchingUnlock && (!matchingUnlock.expiresAt || matchingUnlock.expiresAt > now)) {
          return { entitled: true, reason: 'UNLOCK' };
        }
      }
    }

    const whereClause: Prisma.UnlockWhereInput = { compatId };
    if (userId) {
      whereClause.userId = userId;
    } else {
      return { entitled: false, reason: 'NONE' };
    }

    const unlock = await prisma.unlock.findFirst({
      where: {
        ...whereClause,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
    if (unlock) {
      return { entitled: true, reason: 'UNLOCK' };
    }
    
    // Check if user has SET for compat_basic
    if (userId && allowedSetKeys.length > 0) {
      const setUnlock = await prisma.unlock.findFirst({
        where: {
          userId,
          productType: "SET",
          productKey: { in: allowedSetKeys },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        }
      });
      if (setUnlock) return { entitled: true, reason: 'UNLOCK' };
    }
  }

  return { entitled: false, reason: 'NONE' };
}
