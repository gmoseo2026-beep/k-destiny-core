import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { compatId, orderId, claimToken: bodyClaimToken } = body;
    const cookieClaimToken = req.cookies.get("kd_claim")?.value;

    const effectiveClaimToken = bodyClaimToken || cookieClaimToken;

    let order = null;

    // 1. claimToken 기반 조회 (쿠키 또는 body 우선)
    if (effectiveClaimToken) {
      order = await prisma.order.findUnique({
        where: { claimToken: effectiveClaimToken },
      });

      if (order && order.claimTokenExpiresAt && order.claimTokenExpiresAt < new Date()) {
        return NextResponse.json({ error: "만료된 연동 토큰입니다." }, { status: 400 });
      }
    }

    // 2. orderId 기반 조회 (하위 호환)
    if (!order && orderId) {
      order = await prisma.order.findUnique({
        where: { orderId },
      });
    }

    if (!order) {
      return NextResponse.json(
        { error: "연동할 결제 주문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: "결제가 완료되지 않은 주문입니다." },
        { status: 400 }
      );
    }

    const targetCompatId = compatId || order.compatId;

    // 이미 다른 회원에게 연동된 경우 선점 방지
    if (order.userId && order.userId !== session.user.id) {
      return NextResponse.json(
        { error: "이미 다른 계정에 연동된 주문입니다." },
        { status: 409 }
      );
    }

    // [OAuth 연동 권장안 A]
    // 기존의 order.email === session.user.email 403 차단 조건은 완전히 제거.
    // 카카오(이메일 미제공) 및 네이버/구글(이메일 불일치) 회원도 주문/토큰 소유권으로 안전하게 연동됨.

    // 3. Unlock 레코드 확인 (Order.id 연결)
    const unlock = await prisma.unlock.findFirst({
      where: { orderId: order.id },
    });

    if (unlock && unlock.userId && unlock.userId !== session.user.id) {
      return NextResponse.json(
        { error: "이미 다른 계정에 연동된 결제 권한입니다." },
        { status: 409 }
      );
    }

    // 4. 계정 연동 업데이트 (Unlock, Order, Compatibility)
    await prisma.$transaction(async (tx) => {
      // Unlock에 userId 할당
      if (unlock && !unlock.userId) {
        await tx.unlock.update({
          where: { id: unlock.id },
          data: { userId: session.user.id },
        });
      }

      // Order에 userId 할당
      if (!order.userId) {
        await tx.order.update({
          where: { id: order.id },
          data: { userId: session.user.id },
        });
      }

      // Compatibility 최초 결제 주문인 경우에만 원작성자로 귀속
      if (targetCompatId) {
        const firstPaidOrder = await tx.order.findFirst({
          where: { compatId: targetCompatId, status: "PAID" },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

        if (firstPaidOrder?.id === order.id) {
          await tx.compatibility.updateMany({
            where: {
              id: targetCompatId,
              userId: null,
            },
            data: {
              userId: session.user.id,
            },
          });
        }
      }
    });

    // 5. 연동 완료 응답 생성 및 1회성 claimToken 쿠키 삭제
    const response = NextResponse.json({
      success: true,
      message: "궁합 결과가 계정에 성공적으로 연동되었습니다.",
      compatId: targetCompatId,
      orderId: order.orderId,
    });

    response.cookies.delete("kd_claim");

    return response;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[claim-unlock] Error:", err);
    return NextResponse.json(
      { error: err.message || "계정 연동 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
