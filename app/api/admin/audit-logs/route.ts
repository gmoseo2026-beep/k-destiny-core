import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionOrThrow } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await getAdminSessionOrThrow();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // 관리자 유저 정보 매핑
    const adminUserIds = Array.from(new Set(logs.map((l) => l.adminUserId)));
    const adminUsers = await prisma.user.findMany({
      where: { id: { in: adminUserIds } },
      select: { id: true, name: true, email: true },
    });
    const adminMap = new Map(adminUsers.map((u) => [u.id, u]));

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        adminUser: adminMap.get(log.adminUserId) || { id: log.adminUserId, name: "관리자", email: "" },
      })),
    });
  } catch (error: any) {
    console.error("[admin/audit-logs] Error:", error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || "감사 로그 조회 중 오류가 발생했습니다." },
      { status }
    );
  }
}
