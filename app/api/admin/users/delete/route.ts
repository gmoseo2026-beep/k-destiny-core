import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionOrThrow, logAdminAction } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";

function maskEmail(email: string | null): string {
  if (!email) return "—";
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [user, domain] = parts;
  const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***` : `${user}***`;
  return `${maskedUser}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionOrThrow();
    const body = await req.json().catch(() => ({}));
    const { userId, reason } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "유효한 userId가 필요합니다." },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "탈퇴 사유를 필수로 입력해야 합니다." },
        { status: 400 }
      );
    }

    // 1. 대상 사용자 조회
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "탈퇴 대상 사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 2. 안전 가드
    if (targetUser.role === "ADMIN") {
      return NextResponse.json(
        { error: "관리자 계정은 탈퇴(삭제)할 수 없습니다. 먼저 역할을 일반 사용자로 변경해 주세요." },
        { status: 400 }
      );
    }

    if (admin.id === userId) {
      return NextResponse.json(
        { error: "본인 계정은 관리자 화면에서 직접 탈퇴할 수 없습니다." },
        { status: 400 }
      );
    }

    // 3. 전자상거래법 보관 대상(Order) 카운트 파악 (감사로그용)
    const ordersKept = await prisma.order.count({
      where: { userId },
    });

    // 4. 트랜잭션 실행
    // - Unlock.userId, Compatibility.userId는 관계(FK)가 없으므로 수동 null 처리하여 orphan 방지
    // - User 삭제 시 UserSajuProfile(PII), Account(소셜), Session, Subscription 등은 Cascade 삭제
    // - Order는 schema의 onDelete: SetNull에 의해 userId=null로 영구 보존
    await prisma.$transaction([
      prisma.unlock.updateMany({
        where: { userId },
        data: { userId: null },
      }),
      prisma.compatibility.updateMany({
        where: { userId },
        data: { userId: null },
      }),
      prisma.user.delete({
        where: { id: userId },
      }),
    ]);

    // 5. 감사로그 기록 (이메일 마스킹 처리)
    await logAdminAction({
      adminUserId: admin.id,
      action: "USER_DELETE",
      targetType: "USER",
      targetId: userId,
      detail: {
        reason: reason.trim(),
        emailMasked: maskEmail(targetUser.email),
        userName: targetUser.name,
        ordersKept,
      },
    });

    return NextResponse.json({
      success: true,
      message: "회원 탈퇴 및 개인정보 파기가 완료되었습니다.",
      userId,
      ordersKept,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error("[admin/users/delete] Error:", err);
    return NextResponse.json(
      { error: err.message || "회원 탈퇴 처리 중 오류가 발생했습니다." },
      { status: err.status || 500 }
    );
  }
}
