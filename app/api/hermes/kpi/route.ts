import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/hermes/kpi — Daily KPI report for Hermes v2
 * Returns: total users, premium users, today signups, revenue estimate
 * Protected by HERMES_SECRET header
 */
export async function GET(req: Request) {
  const secret = req.headers.get("x-hermes-secret");
  if (secret !== process.env.HERMES_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalUsers, premiumUsers, todaySignups, recentPurchases] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { tier: "PREMIUM" } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.purchasedReport.count({ where: { createdAt: { gte: todayStart } } }),
    ]);

    // Revenue estimate: premium * avg $7.99 + single reports * $2.99
    const estimatedMonthlyRevenue = premiumUsers * 7.99 + recentPurchases * 2.99;

    return NextResponse.json({
      date: now.toISOString().slice(0, 10),
      totalUsers,
      premiumUsers,
      todaySignups,
      todaySingleReports: recentPurchases,
      conversionRate: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) + "%" : "0%",
      estimatedMonthlyRevenue: `$${estimatedMonthlyRevenue.toFixed(2)}`,
      status: "healthy",
    });
  } catch (error: any) {
    console.error("[Hermes KPI]", error);
    return NextResponse.json({ error: "Failed to generate KPI" }, { status: 500 });
  }
}
