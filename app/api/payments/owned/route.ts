import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_IDS = 30;

/**
 * POST /api/payments/owned  { orderIds: string[] }  →  { valid: string[] }
 *
 * 기기에 남은 결제 증명(orderId) 중 지금도 열람할 수 있는 것만 돌려준다(결제 완료 + 만료 전 권한 보유).
 * 환불·만료된 결제를 "이미 결제한 리포트"로 안내하지 않기 위한 확인용이다.
 *
 * orderId 는 추측할 수 없는 값이고(소유 증명), 응답은 "제시한 id 가 유효한가"뿐이라
 * 모르는 주문의 정보는 새지 않는다. 실제 열람 판정은 각 리포트 API 가 따로 한다.
 */
export async function POST(req: NextRequest) {
  let ids: string[] = [];
  try {
    const body: unknown = await req.json();
    const raw = (body as { orderIds?: unknown })?.orderIds;
    if (Array.isArray(raw)) {
      ids = [...new Set(raw.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 100))].slice(0, MAX_IDS);
    }
  } catch {
    return NextResponse.json({ valid: [] }, { status: 400, headers: NO_STORE });
  }
  if (ids.length === 0) return NextResponse.json({ valid: [] }, { headers: NO_STORE });

  try {
    const now = new Date();
    const orders = await prisma.order.findMany({
      where: { orderId: { in: ids }, status: "PAID" },
      select: { orderId: true, unlocks: { select: { expiresAt: true } } },
    });
    const valid = orders
      .filter((o) => o.unlocks.some((u) => !u.expiresAt || u.expiresAt.getTime() > now.getTime()))
      .map((o) => o.orderId);
    return NextResponse.json({ valid }, { headers: NO_STORE });
  } catch (e) {
    console.error("[payments/owned] error", e);
    // 확인 실패 시 500 → 클라이언트는 토큰을 지우지 않고 그대로 둔다
    return NextResponse.json({ error: "확인에 실패했어요." }, { status: 500, headers: NO_STORE });
  }
}
