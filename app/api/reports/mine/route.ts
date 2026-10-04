import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { expandOrderReports } from "@/lib/reports/mine";
import { toCatalogId } from "@/lib/productIdentity";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        status: "PAID",
      },
      include: {
        unlocks: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const orderExpandedMap = new Map<string, ReturnType<typeof expandOrderReports>>();
    const allCacheKeys: string[] = [];

    for (const order of orders) {
      const expanded = expandOrderReports(order);
      orderExpandedMap.set(order.id, expanded);
      for (const row of expanded) {
        if (!row.catalogId.startsWith("annual_") && row.catalogId !== "compat_basic") {
          allCacheKeys.push(row.cacheKey);
        }
      }
    }

    const dbReports =
      allCacheKeys.length > 0
        ? await prisma.generatedReport.findMany({
            where: { cacheKey: { in: allCacheKeys } },
            select: {
              id: true,
              cacheKey: true,
              catalogId: true,
              status: true,
              createdAt: true,
            },
          })
        : [];

    const reportByKey = new Map(dbReports.map((r) => [r.cacheKey, r]));

    const result = orders.map((order) => {
      const expanded = orderExpandedMap.get(order.id) ?? [];
      const orderCatalogId = toCatalogId(order.productType, order.productKey, order.compatId);

      const reports = expanded.map((row) => {
        if (row.catalogId.startsWith("annual_")) {
          return {
            catalogId: row.catalogId,
            reportId: null,
            status: "ANNUAL_ROUTE",
            createdAt: null,
          };
        }
        // 정통 궁합(단품·세트 구성품)은 궁합 결과 화면이 심층 리포트를 연다. 여기서 "리포트 만들기"로
        // 보내면 일반 리포트 생성 API 가 500 을 냈다(2026-10-04 세트 구매 손님이 6번 겪음).
        if (row.catalogId === "compat_basic") {
          return {
            catalogId: row.catalogId,
            reportId: null,
            status: "COMPAT_ROUTE",
            compatId: row.compatId,
            createdAt: null,
          };
        }
        const rep = reportByKey.get(row.cacheKey);
        return {
          catalogId: row.catalogId,
          reportId: rep?.id ?? null,
          status: rep?.status ?? "NOT_STARTED",
          createdAt: rep?.createdAt ?? null,
        };
      });

      return {
        orderId: order.orderId,
        catalogId: orderCatalogId,
        compatId: order.compatId,
        expiresAt: order.unlocks[0]?.expiresAt ?? null,
        reports,
      };
    });

    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    console.error("[GET /api/reports/mine] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: NO_STORE });
  }
}
