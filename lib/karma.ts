import { prisma } from "@/lib/prisma";

/**
 * Karma model (chat "energy"):
 *   - ADMIN            → unlimited (never gated, never consumed)
 *   - PREMIUM (active) → 20 per day, refilled lazily at the first access of a
 *                        new server day (no cron needed)
 *   - FREE (logged in) → static starter tokens; NOT refilled daily (upgrade hook)
 *   - Guest            → handled by IP limits, not here
 *
 * This is the single source of truth. The chat UI must read from it (via the
 * entitlement endpoint) rather than its old localStorage counter, which drifted.
 */
export const DAILY_PREMIUM_KARMA = 20;

export interface KarmaState {
  isAdmin: boolean;
  isPremiumActive: boolean;
  unlimited: boolean; // admin only
  karma: number; // remaining tokens (meaningful when !unlimited)
  dailyMax: number | null; // 20 for premium, null otherwise (free is static)
}

function isSameServerDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

/**
 * Load karma, performing the premium daily refill if a new day has started.
 * Safe to call on every read (entitlement) and before every chat.
 */
export async function loadKarmaState(userId: string): Promise<KarmaState> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { usageTokens: true, karmaResetAt: true, tier: true, role: true, premiumEndDate: true },
  });

  const isAdmin = u?.role === "ADMIN";
  const isPremiumActive =
    u?.tier === "PREMIUM" && (!u.premiumEndDate || u.premiumEndDate > new Date());
  let karma = u?.usageTokens ?? 0;

  // Premium: refill to 20 at the first access of a new day.
  if (isPremiumActive && !isAdmin) {
    const now = new Date();
    const last = u?.karmaResetAt ?? null;
    if (!last || !isSameServerDay(last, now)) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { usageTokens: DAILY_PREMIUM_KARMA, karmaResetAt: now },
        select: { usageTokens: true },
      });
      karma = updated.usageTokens;
    }
  }

  return {
    isAdmin,
    isPremiumActive,
    unlimited: isAdmin,
    karma,
    dailyMax: isPremiumActive ? DAILY_PREMIUM_KARMA : null,
  };
}

/** Atomically consume one token. Returns the remaining balance. */
export async function consumeKarma(userId: string): Promise<number> {
  const u = await prisma.user.update({
    where: { id: userId },
    data: { usageTokens: { decrement: 1 } },
    select: { usageTokens: true },
  });
  return u.usageTokens;
}
