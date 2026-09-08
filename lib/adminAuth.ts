import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export interface AdminSession {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
}

/**
 * 서버 사이드에서 현재 요청의 관리자 권한을 엄격히 검증합니다.
 * 관리자가 아니거나 세션이 없으면 에러를 던집니다.
 */
export async function getAdminSessionOrThrow(): Promise<AdminSession> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const err: any = new Error("인증이 필요합니다.");
    err.status = 401;
    throw err;
  }

  if (session.user.role !== "ADMIN") {
    const err: any = new Error("관리자 권한이 없습니다.");
    err.status = 403;
    throw err;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    role: session.user.role,
  };
}

/**
 * 관리자 민감 액션에 대한 감사 로그를 데이터베이스에 영구 기록합니다.
 */
export async function logAdminAction(params: {
  adminUserId: string;
  action: "REFUND" | "UNLOCK_GRANT" | "UNLOCK_EXTEND" | "ROLE_CHANGE" | string;
  targetType: "ORDER" | "UNLOCK" | "USER" | string;
  targetId: string;
  detail?: any;
}) {
  try {
    return await prisma.adminAuditLog.create({
      data: {
        adminUserId: params.adminUserId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        detail: params.detail ?? {},
      },
    });
  } catch (error) {
    console.error("[logAdminAction] Failed to write audit log:", error);
    // 감사 로그 기록 실패 시 에러 로깅
    return null;
  }
}
