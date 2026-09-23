import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { orderGrants } from "@/lib/entitlementRules";
import { readEnvelope } from "@/lib/reports/standard";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reportId, orderId } = body;
    if (!reportId || typeof reportId !== "string") {
      return NextResponse.json({ error: "Invalid reportId" }, { status: 400, headers: NO_STORE });
    }

    const report = await prisma.generatedReport.findUnique({
      where: { id: reportId },
    });
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
    if (report.kind !== "FULL") return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
    if (!report.orderId) return NextResponse.json({ error: "Invalid report" }, { status: 400, headers: NO_STORE });

    const order = await prisma.order.findUnique({
      where: { id: report.orderId },
      include: { unlocks: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404, headers: NO_STORE });

    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id ?? null;
    const now = new Date();

    const grant = orderGrants(order, {
      catalogId: report.catalogId,
      compatId: report.compatId,
      now,
      sessionUserId,
      presentedOrderId: typeof orderId === "string" ? orderId : null,
    });

    if (!grant.ok) {
      if (grant.reason === "FORBIDDEN" || grant.reason === "NO_GRANT") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE });
      }
      if (grant.reason === "NOT_PAID") {
        return NextResponse.json({ error: "Not Paid" }, { status: 402, headers: NO_STORE });
      }
      return NextResponse.json({ error: "열람 권한이 없어요." }, { status: 403, headers: NO_STORE });
    }

    if (report.status !== "READY") {
      return NextResponse.json({ status: report.status }, { status: 202, headers: NO_STORE });
    }

    const env = readEnvelope(report.content);
    if (!env) {
      return NextResponse.json({ error: "리포트를 준비하고 있어요. 잠시 후 다시 시도해 주세요." }, { status: 503, headers: NO_STORE });
    }

    // firstViewedAt 기록 (경합 안전 updateMany)
    await prisma.generatedReport.updateMany({
      where: { id: reportId, firstViewedAt: null },
      data: { firstViewedAt: now },
    });

    return NextResponse.json(
      {
        reportId: report.id,
        catalogId: report.catalogId,
        score: env.score,
        data: env.data,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[POST /api/reports/view] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: NO_STORE });
  }
}
