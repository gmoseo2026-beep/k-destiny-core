import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionOrThrow } from "@/lib/adminAuth";
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
    //
    // [SECURITY / M-11] 감사로그를 같은 트랜잭션 안에서 먼저 쓴다.
    // 이전에는 logAdminAction 이 트랜잭션 밖에 있었고 내부에서 예외를 삼켰기 때문에,
    // "영구 삭제는 성공했는데 감사 기록만 사라지는" 조합이 가능했다.
    // 개인정보 파기 이력은 PIPA 대응상 필수 기록이므로 로그 실패 시 삭제도 롤백되어야 한다.
    await prisma.$transaction(async (tx) => {
      await tx.adminAuditLog.create({
        data: {
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
        },
      });

      // [SECURITY / M-12] 살아 있는 claim 토큰을 소각한다.
      //
      // Order.userId 는 onDelete: SetNull 로 null 이 되는데 claimToken 은 그대로 남아 있었다.
      // 결과적으로 탈퇴가 "유효 토큰을 가진 미귀속 게스트 주문"을 새로 만들어내 재귀속 표적이 됐다.
      // Cascade 로 userId 가 null 이 된 뒤에는 where:{userId} 가 매칭되지 않으므로 반드시 delete 앞에서 수행한다.
      await tx.order.updateMany({
        where: { userId },
        data: { claimToken: null, claimTokenExpiresAt: null },
      });

      // Unlock.email 은 법정 보존 대상이 아니다(거래기록은 Order 가 보존한다) → 함께 파기.
      await tx.unlock.updateMany({
        where: { userId },
        data: { userId: null, email: null },
      });

      await tx.compatibility.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // [SECURITY / L-3] TelegramAccount.userId 에는 FK 가 없어 Cascade 가 걸리지 않는다.
      // 그대로 두면 삭제된 userId 를 가리키는 연결 정보가 남는다(파기 누락).
      await tx.telegramAccount.updateMany({
        where: { userId },
        data: { userId: null },
      });

      await tx.user.delete({
        where: { id: userId },
      });
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
