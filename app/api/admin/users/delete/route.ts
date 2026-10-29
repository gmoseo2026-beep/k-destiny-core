import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionOrThrow } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";
import { executeUserDeletion } from "@/lib/accountDeletion";

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

    // 3. 공용 트랜잭션으로 영구 삭제 및 개인정보 파기 실행 (Order는 onDelete: SetNull로 보존)
    const { ordersKept } = await executeUserDeletion({
      targetUserId: userId,
      actorUserId: admin.id,
      action: "USER_DELETE",
      reason,
      targetEmail: targetUser.email,
      targetName: targetUser.name,
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
    // [SECURITY / L-4] status 가 붙은 건 getAdminSessionOrThrow 가 의도적으로 던진 인증 오류라
    // 메시지를 그대로 보여준다. 그 외(500)는 Prisma 예외 원문에 테이블·컬럼·내부 상태가
    // 실리므로 고정 문구로 대체하고 원문은 서버 로그에만 남긴다.
    if (err.status) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "회원 탈퇴 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
