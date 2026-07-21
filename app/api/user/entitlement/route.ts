import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Source-of-truth entitlement check. Must never be cached — a purchase that
// just completed has to be reflected immediately when the user returns.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
} as const;

/**
 * GET /api/user/entitlement
 *
 * Returns what the current user is entitled to see. This is the single place
 * that decides "is the premium content unlocked?".
 *
 *   - premium:  active subscription (tier === PREMIUM) or ADMIN
 *   - hasReport: purchased at least one single report ($2.99)
 *   - unlocked: premium || hasReport  (convenience for the client)
 *
 * Before this existed, a $2.99 single-report purchase created a PurchasedReport
 * row that NOTHING ever read, so paying customers stayed locked out. This closes
 * that gap.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { authenticated: false, premium: false, hasReport: false, unlocked: false },
      { status: 200, headers: NO_STORE }
    );
  }

  const [user, reportCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true, role: true, email: true, subscriptionStatus: true, premiumEndDate: true },
    }),
    prisma.purchasedReport.count({ where: { userId: session.user.id } }),
  ]);

  // A PREMIUM tier only counts while the subscription window is still open.
  // (The webhook sets premiumEndDate; a null endDate means non-expiring access,
  // e.g. a manual/admin grant.) Without this check an expired subscriber keeps
  // full access forever because nothing ever downgrades the tier column.
  const now = new Date();
  const premiumActive =
    user?.tier === "PREMIUM" &&
    (!user.premiumEndDate || user.premiumEndDate > now);
  const premium = premiumActive || user?.role === "ADMIN";
  const hasReport = reportCount > 0;

  return NextResponse.json(
    {
      authenticated: true,
      email: user?.email ?? session.user.email ?? null,
      premium,
      hasReport,
      unlocked: premium || hasReport,
    },
    { status: 200, headers: NO_STORE }
  );
}
