import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const NO_STORE = { "Cache-Control": "no-store" };
const EMAIL = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

/**
 * POST /api/payments/contact  { orderId, email }
 *
 * 결제를 마친 비회원이 이메일을 선택으로 남긴다(영수증·문의 대응용).
 * 2026-10-03: 모바일 결제 모달에서 이메일 칸을 없애고, 결제가 끝난 뒤에 받는다.
 *
 * - orderId(추측 불가)를 가진 사람만 쓸 수 있다.
 * - 이메일이 아직 없는 주문에만 한 번 적는다(덮어쓰지 않는다) — 남이 나중에 바꿔 치지 못하게.
 * - 이메일은 응답·로그에 싣지 않는다(PII).
 */
export async function POST(req: NextRequest) {
  let orderId = "";
  let email = "";
  try {
    const body = (await req.json()) as { orderId?: unknown; email?: unknown };
    if (typeof body.orderId === "string") orderId = body.orderId;
    if (typeof body.email === "string") email = body.email.trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400, headers: NO_STORE });
  }
  if (!orderId || orderId.length > 100) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400, headers: NO_STORE });
  if (!EMAIL.test(email) || email.length > 200) {
    return NextResponse.json({ error: "이메일 주소를 확인해 주세요." }, { status: 400, headers: NO_STORE });
  }

  try {
    const order = await prisma.order.findUnique({ where: { orderId }, select: { id: true } });
    if (!order) return NextResponse.json({ error: "주문을 찾을 수 없어요." }, { status: 404, headers: NO_STORE });

    const saved = await prisma.order.updateMany({ where: { id: order.id, email: null }, data: { email } });
    if (saved.count === 1) {
      await prisma.unlock.updateMany({ where: { orderId: order.id, email: null }, data: { email } });
    }
    // 이미 이메일이 있는 주문이어도 성공으로 답한다(있는지 없는지를 알려 주지 않는다)
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch (e) {
    console.error("[payments/contact] error", e instanceof Error ? e.name : "unknown");
    return NextResponse.json({ error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  }
}
