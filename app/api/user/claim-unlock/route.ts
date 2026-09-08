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

    const { compatId, orderId } = await req.json();
    if (!compatId || !orderId) {
      return NextResponse.json({ error: "compatId와 orderId가 필요합니다." }, { status: 400 });
    }

    // 1. 주문 유효성 확인
    const order = await prisma.order.findUnique({
      where: { orderId },
    });

    if (!order || order.status !== "PAID" || order.compatId !== compatId) {
      return NextResponse.json({ error: "유효하지 않은 주문입니다." }, { status: 404 });
    }

    // 2. Unlock 레코드 확인
    const unlock = await prisma.unlock.findUnique({
      where: {
        compatId_orderId: {
          compatId,
          orderId,
        },
      },
    });

    if (!unlock) {
      return NextResponse.json({ error: "열람 권한 내역을 찾을 수 없습니다." }, { status: 404 });
    }

    // 이미 다른 회원에게 귀속된 경우 도용 방지
    if (unlock.userId && unlock.userId !== session.user.id) {
      return NextResponse.json({ error: "이미 다른 계정에 연동된 결제 건입니다." }, { status: 409 });
    }

    // 3. 계정 연동 업데이트 (Unlock, Order, Compatibility)
    await prisma.$transaction(async (tx) => {
      // Unlock에 userId 할당
      if (!unlock.userId) {
        await tx.unlock.update({
          where: { id: unlock.id },
          data: { userId: session.user.id },
        });
      }

      // Order에 userId가 없으면 할당
      if (!order.userId) {
        await tx.order.update({
          where: { id: order.id },
          data: { userId: session.user.id },
        });
      }

      // Compatibility에 userId가 없으면 할당
      await tx.compatibility.updateMany({
        where: {
          id: compatId,
          userId: null,
        },
        data: {
          userId: session.user.id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "궁합 결과가 계정에 성공적으로 연동되었습니다.",
      compatId,
    });
  } catch (error: any) {
    console.error("[claim-unlock] Error:", error);
    return NextResponse.json(
      { error: error.message || "계정 연동 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
