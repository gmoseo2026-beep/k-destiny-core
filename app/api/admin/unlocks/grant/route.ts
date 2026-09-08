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

    let targetEmail = email && typeof email === "string" && email.trim() !== "" ? email.trim().toLowerCase() : null;
    let targetUserId = userId && typeof userId === "string" && userId.trim() !== "" ? userId.trim() : null;

    // 3) email 또는 userId 중 하나는 필수 (둘 다 없으면 400 — compatId 단독 조회 금지)
    if (!targetUserId && !targetEmail) {
      return NextResponse.json(
        { error: "email 또는 userId 중 하나는 필수입니다. (compatId 단독 조회 및 발급 금지)" },
        { status: 400 }
      );
    }

    // 1-1. email이 전달되었고 userId가 없는 경우, 기존 회원인지 확인하여 userId로 자동 연결
    if (!targetUserId && targetEmail) {
      const existingMember = await prisma.user.findUnique({
        where: { email: targetEmail },
        select: { id: true },
      });
      if (existingMember) {
        targetUserId = existingMember.id;
      }
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

    // 2) days 를 최대 90으로 clamp (KG 열람 유효기간 준수)
    const rawDays = Number(days);
    const clampedDays = isNaN(rawDays) ? 90 : Math.min(Math.max(rawDays, 1), 90);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + clampedDays * 24 * 60 * 60 * 1000);

    // 3. 이미 존재하는 Unlock 레코드 확인 (compatId + userId 또는 email 특정 조회)
    const unlockWhere: any = { compatId: compat.id };
    if (targetUserId) {
      unlockWhere.userId = targetUserId;
    } else {
      unlockWhere.email = targetEmail;
    }

    let existingUnlock = await prisma.unlock.findFirst({
      where: unlockWhere,
    });

    let resultUnlock;
    let manualOrder: any = null;

    if (existingUnlock) {
      // 기존 Unlock 만료일 및 소유자 업데이트
      resultUnlock = await prisma.unlock.update({
        where: { id: existingUnlock.id },
        data: {
          expiresAt,
          userId: targetUserId ?? existingUnlock.userId,
          email: targetEmail ?? existingUnlock.email,
        },
      });
    } else {
      // 새 Unlock 발급: Unlock은 Order(id)를 외래키로 참조하므로 관리자 수동 주문(0원) 생성 후 연결
      const manualOrderId = `admin_ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      manualOrder = await prisma.order.create({
        data: {
          orderId: manualOrderId,
          userId: targetUserId ?? null,
          email: targetEmail ?? null,
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
          userId: targetUserId ?? null,
          email: targetEmail ?? null,
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
        email: targetEmail,
        userId: targetUserId,
        days: clampedDays,
        expiresAt: expiresAt.toISOString(),
        reason: reason.trim(),
        wasExisting: !!existingUnlock,
      },
    });

    return NextResponse.json({
      success: true,
      message: `언락이 성공적으로 ${existingUnlock ? "연장" : "발급"}되었습니다. (만료: ${expiresAt.toISOString().slice(0, 10)})`,
      unlock: resultUnlock,
      claimOrderId: manualOrder?.orderId ?? null,
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
