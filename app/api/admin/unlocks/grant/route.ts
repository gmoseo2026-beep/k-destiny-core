import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionOrThrow, logAdminAction } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionOrThrow();
    const body = await req.json();
    const { compatId, email, userId, days = 90, reason } = body;

    if (!compatId) {
      return NextResponse.json({ error: "궁합 식별자(compatId)가 필요합니다." }, { status: 400 });
    }
    if (!reason || typeof reason !== "string" || reason.trim() === "") {
      return NextResponse.json({ error: "발급/연장 사유를 입력해주세요." }, { status: 400 });
    }

    // 1. 궁합 레코드 조회
    const compat = await prisma.compatibility.findFirst({
      where: {
        OR: [{ id: compatId }, { shareToken: compatId }],
      },
    });

    if (!compat) {
      return NextResponse.json({ error: "해당 궁합 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000);

    // 2. 이미 존재하는 Unlock 레코드 확인
    let existingUnlock = await prisma.unlock.findFirst({
      where: {
        compatId: compat.id,
        ...(userId ? { userId } : email ? { email } : {}),
      },
    });

    let resultUnlock;

    if (existingUnlock) {
      // 기존 Unlock 만료일 및 소유자 업데이트
      resultUnlock = await prisma.unlock.update({
        where: { id: existingUnlock.id },
        data: {
          expiresAt,
          userId: userId ?? existingUnlock.userId,
          email: email ?? existingUnlock.email,
        },
      });
    } else {
      // 새 Unlock 발급: Unlock은 Order(id)를 외래키로 참조하므로 관리자 수동 주문(0원) 생성 후 연결
      const manualOrderId = `admin_ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const manualOrder = await prisma.order.create({
        data: {
          orderId: manualOrderId,
          userId: userId ?? null,
          email: email ?? null,
          compatId: compat.id,
          type: "SINGLE",
          amount: 0,
          status: "PAID",
          provider: "admin_manual",
        },
      });

      resultUnlock = await prisma.unlock.create({
        data: {
          compatId: compat.id,
          orderId: manualOrder.id,
          userId: userId ?? null,
          email: email ?? null,
          expiresAt,
        },
      });
    }

    // 3. 감사 로그 기록
    await logAdminAction({
      adminUserId: admin.id,
      action: "UNLOCK_GRANT",
      targetType: "UNLOCK",
      targetId: resultUnlock.id,
      detail: {
        compatId: compat.id,
        shareToken: compat.shareToken,
        email,
        userId,
        days: Number(days),
        expiresAt: expiresAt.toISOString(),
        reason: reason.trim(),
        wasExisting: !!existingUnlock,
      },
    });

    return NextResponse.json({
      success: true,
      message: `성공적으로 심층 리포트 열람 권한이 부여되었습니다. (만료일: ${expiresAt.toLocaleDateString("ko-KR")})`,
      unlock: resultUnlock,
      shareToken: compat.shareToken,
    });
  } catch (error: any) {
    console.error("[admin/unlocks/grant] Error:", error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || "언락 발급 중 오류가 발생했습니다." },
      { status }
    );
  }
}
