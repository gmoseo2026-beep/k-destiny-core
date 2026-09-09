import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { payments } from "@/lib/payments";
import { applyPaidOrder } from "@/lib/payments/grant";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { paymentId } = await req.json();
    if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { orderId: paymentId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // 소유권: 회원 주문이면 세션 일치 필수(게스트 주문은 orderId 자체가 토큰)
    if (order.userId && session?.user?.id !== order.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 서버가 PortOne에 조회해 상태·금액 대조 (클라 신뢰 금지)
    const payment = await payments.getPayment(paymentId);
    if (payment.status !== "PAID") {
      return NextResponse.json({ error: "Payment not completed", status: payment.status }, { status: 402 });
    }
    if (Number(payment.amount?.total) !== order.amount) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    await applyPaidOrder(paymentId, payment.id ?? payment.transactionId);

    // [OAuth 연동 권장안 A] 결제 완료 시 이메일 무관 서명 claim 토큰 생성 및 쿠키 발급
    const claimToken = crypto.randomUUID();
    const claimTokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90일

    await prisma.order.update({
      where: { id: order.id },
      data: { claimToken, claimTokenExpiresAt },
    });

    // [SECURITY / H-2] 게스트는 세션이 없으므로 리포트 열람 시 소유권을 증명할 수단이
    // orderId(추측 불가 UUID) 뿐이다. 이전에는 이 값을 클라에 돌려주지 않아
    // 결제에 성공한 게스트가 리포트를 영원히 열지 못했다.
    // URL 쿼리로는 넘기지 않는다(히스토리·Referer·GA4 page_location 유출) — 응답 본문으로만 전달.
    const response = NextResponse.json(
      {
        success: true,
        orderId: order.orderId,
        type: order.type,
        compatId: order.compatId,
        claimToken,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );

    // SameSite=Lax 쿠키 설정 (카카오/네이버/구글 OAuth 왕복 후에도 쿠키 유지)
    response.cookies.set("kd_claim", claimToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 90 * 24 * 60 * 60, // 90일
    });

    return response;
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("[payments/complete]", err);
    return NextResponse.json({ error: err.message || "complete failed" }, { status: 500 });
  }
}
