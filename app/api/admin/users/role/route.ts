import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionOrThrow, logAdminAction } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionOrThrow();
    const { userId, role } = await req.json();

    if (!userId || !role || !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: "유효한 userId와 role이 필요합니다." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    // 본인 관리자 권한 해제 방지
    if (admin.id === userId && role !== "ADMIN") {
      return NextResponse.json({ error: "본인의 관리자 권한을 스스로 해제할 수 없습니다." }, { status: 400 });
    }

    const previousRole = targetUser.role;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: "ROLE_CHANGE",
      targetType: "USER",
      targetId: userId,
      detail: {
        previousRole,
        newRole: role,
        targetEmail: targetUser.email,
        targetName: targetUser.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${targetUser.name || targetUser.email}님의 권한이 ${role}(으)로 변경되었습니다.`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("[admin/users/role] Error:", error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || "권한 변경 중 오류가 발생했습니다." },
      { status }
    );
  }
}
