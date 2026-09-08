import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionOrThrow } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await getAdminSessionOrThrow();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();

    if (!query) {
      return NextResponse.json({ error: "검색어를 입력해주세요." }, { status: 400 });
    }

    // 1. 회원 조회 (이메일 또는 ID)
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { id: query },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tier: true,
        premiumEndDate: true,
        createdAt: true,
      },
      take: 5,
    });

    // 2. 주문 조회 (email, orderId, userId, compatId)
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { orderId: { contains: query, mode: "insensitive" } },
          { compatId: query },
          { userId: { in: users.map((u) => u.id) } },
        ],
      },
      include: {
        unlocks: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 3. 언락 목록 조회
    const unlocks = await prisma.unlock.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { compatId: query },
          { userId: { in: users.map((u) => u.id) } },
          { orderId: { in: orders.map((o) => o.id) } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 4. 연관된 궁합 메타정보 조회
    const compatIds = Array.from(
      new Set([
        ...orders.map((o) => o.compatId).filter(Boolean),
        ...unlocks.map((u) => u.compatId).filter(Boolean),
      ])
    ) as string[];

    const compatibilities = await prisma.compatibility.findMany({
      where: {
        id: { in: compatIds },
      },
      select: {
        id: true,
        shareToken: true,
        score: true,
        personA: true,
        personB: true,
        createdAt: true,
      },
    });

    const compatMap = new Map(compatibilities.map((c) => [c.id, c]));

    return NextResponse.json({
      query,
      users,
      orders: orders.map((o) => ({
        ...o,
        compatInfo: o.compatId ? compatMap.get(o.compatId) || null : null,
      })),
      unlocks: unlocks.map((u) => ({
        ...u,
        compatInfo: compatMap.get(u.compatId) || null,
      })),
    });
  } catch (error: any) {
    console.error("[admin/customers/search] Error:", error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || "고객 정보 검색 중 오류가 발생했습니다." },
      { status }
    );
  }
}
