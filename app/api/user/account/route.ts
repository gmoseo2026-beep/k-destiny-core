import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { executeUserDeletion } from "@/lib/accountDeletion";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * 셀프 회원 탈퇴 — 로그인한 본인 계정만 삭제한다.
 * 전자상거래법상 5년 보관 대상인 Order 행은 삭제하지 않고(onDelete: SetNull) userId 귀속만 해제된다.
 */
export async function DELETE(req?: NextRequest | Request) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const sessionUserId = session?.user?.id;
    if (!sessionUserId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401, headers: NO_STORE },
      );
    }

    if (req) {
      const body = (await req.json().catch(() => null)) as { userId?: unknown } | null;
      if (body && body.userId !== undefined && body.userId !== sessionUserId) {
        return NextResponse.json(
          { error: "본인 계정만 탈퇴할 수 있습니다." },
          { status: 403, headers: NO_STORE },
        );
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "회원 정보를 찾을 수 없습니다." },
        { status: 404, headers: NO_STORE },
      );
    }

    if (targetUser.role === "ADMIN") {
      return NextResponse.json(
        { error: "관리자 계정은 직접 탈퇴할 수 없습니다." },
        { status: 400, headers: NO_STORE },
      );
    }

    const { ordersKept } = await executeUserDeletion({
      targetUserId: sessionUserId,
      actorUserId: sessionUserId,
      action: "SELF_DELETE",
      reason: "회원 본인 직접 탈퇴",
      targetEmail: targetUser.email,
    });

    return NextResponse.json(
      {
        success: true,
        ordersKept,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("[api/user/account DELETE] failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json(
      { error: "회원 탈퇴 처리 중 오류가 발생했습니다." },
      { status: 500, headers: NO_STORE },
    );
  }
}
