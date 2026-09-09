import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

/**
 * 연동에 실패한 응답에서는 kd_claim 쿠키를 함께 폐기한다.
 *
 * [SECURITY / L-5] 이전에는 성공했을 때만 쿠키를 지웠다. 그래서 이미 타인에게 귀속됐거나
 * 만료된 토큰이 남아 대시보드에 진입할 때마다 무의미한 연동 요청이 반복 발사됐다.
 */
function failAndClearCookie(message: string, status: number) {
  const res = NextResponse.json({ error: message }, { status });
  res.cookies.delete("kd_claim");
  return res;
}

/**
 * GET — 연동 가능한 결제가 있는지만 확인한다(상태 변경 없음).
 *
 * [SECURITY / M-8] 대시보드가 진입 즉시 자동으로 귀속시키던 동작을 대체한다.
 * 공용 PC(PC방 등)에서 게스트가 결제만 하고 로그인하지 않은 채 자리를 뜨면,
 * 같은 브라우저에서 다음으로 로그인한 사람에게 결제가 조용히 넘어갔다.
 * 이제 화면이 이 결과로 배너를 띄우고, 사용자가 직접 누를 때만 POST 가 나간다.
 */
export async function GET(req: NextRequest) {
  const notClaimable = NextResponse.json(
    { claimable: false },
    { headers: { "Cache-Control": "no-store" } }
  );

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return notClaimable;

    const claimToken = req.cookies.get("kd_claim")?.value;
    if (!claimToken) return notClaimable;

    const order = await prisma.order.findUnique({
      where: { claimToken },
      select: { userId: true, status: true, compatId: true, claimTokenExpiresAt: true },
    });

    if (!order) return notClaimable;
    if (order.userId) return notClaimable; // 이미 귀속된 주문
    if (order.status !== "PAID") return notClaimable;
    if (order.claimTokenExpiresAt && order.claimTokenExpiresAt < new Date()) return notClaimable;

    return NextResponse.json(
      { claimable: true, compatId: order.compatId },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[claim-unlock GET] Error:", error);
    return notClaimable;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // [SECURITY / H-7] 요청 본문은 더 이상 읽지 않는다.
    // 귀속 대상은 전적으로 쿠키가 가리키는 주문(order.compatId)이 정한다.
    // 클라이언트가 보내던 compatId 는 M-7 의 firstPaidOrder 대조가 이미 무력화하고 있었지만,
    // 보안 판정 경로에서 공격자 제어 입력을 아예 없애는 편이 낫다.

    // [SECURITY / M-9] claimToken 은 httpOnly 쿠키에서만 읽는다.
    // body 로도 받으면 "쿠키를 못 읽어도 토큰 값만 알면 귀속 가능"이 되어
    // httpOnly 로 얻으려던 방어(XSS·악성 확장·로깅 프록시)가 그대로 무너진다.
    const claimToken = req.cookies.get("kd_claim")?.value;

    // [SECURITY / H-7] orderId 기반 하위호환 폴백을 제거했다.
    //
    // 그 경로에는 claimToken·만료·소유 증명이 하나도 없어서, 로그인만 되어 있으면
    // body 의 orderId 문자열만으로 타인의 미연동(userId=null) 게스트 주문을 선점할 수 있었다.
    // 결과는 "기록 귀속" 수준이 아니다:
    //   - 정당 구매자는 아래 409 에 영구히 걸려 자가 복구가 불가능해진다(전부 CS 수동 처리)
    //   - Compatibility 까지 넘어가 /api/compat 목록에 두 사람의 이름·성별이 영구 노출된다
    //   - Unlock.expiresAt 90일과 무관하게 userId 귀속은 만료 뒤에도 남는다
    // orderId 는 결제 리다이렉트 URL 에 실려 GA4 page_location·브라우저 히스토리로 새어 나가므로
    // "추측 불가하니 안전하다"는 전제도 성립하지 않는다.
    if (!claimToken) {
      return NextResponse.json(
        { error: "연동할 결제 주문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const order = await prisma.order.findUnique({ where: { claimToken } });

    if (!order) {
      return failAndClearCookie("연동할 결제 주문을 찾을 수 없습니다.", 404);
    }

    if (order.claimTokenExpiresAt && order.claimTokenExpiresAt < new Date()) {
      return failAndClearCookie("만료된 연동 토큰입니다.", 400);
    }

    // claim 토큰은 결제 검증 통과 후에만 발급되므로, PAID 가 아니라면 환불된 주문이다.
    if (order.status !== "PAID") {
      return failAndClearCookie("결제가 완료되지 않은 주문입니다.", 400);
    }

    const targetCompatId = order.compatId;

    // 이미 다른 회원에게 연동된 경우 선점 방지
    if (order.userId && order.userId !== session.user.id) {
      return failAndClearCookie("이미 다른 계정에 연동된 주문입니다.", 409);
    }

    // [OAuth 연동 권장안 A]
    // 기존의 order.email === session.user.email 403 차단 조건은 완전히 제거.
    // 카카오(이메일 미제공) 및 네이버/구글(이메일 불일치) 회원도 주문/토큰 소유권으로 안전하게 연동됨.

    // 3. Unlock 레코드 확인 (Order.id 연결)
    const unlock = await prisma.unlock.findFirst({
      where: { orderId: order.id },
    });

    if (unlock && unlock.userId && unlock.userId !== session.user.id) {
      return failAndClearCookie("이미 다른 계정에 연동된 결제 권한입니다.", 409);
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

      // Order에 userId 할당 + [SECURITY / L-6] 1회용 claim 토큰 소각.
      // 주석이 말하는 "1회성"을 DB 에서도 실제로 보장한다(이전엔 쿠키만 지웠다).
      if (!order.userId) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            userId: session.user.id,
            claimToken: null,
            claimTokenExpiresAt: null,
          },
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
    // [SECURITY / L-4] Prisma 예외 원문에는 테이블·컬럼·내부 상태가 실린다 → 서버 로그에만 남긴다.
    console.error("[claim-unlock] Error:", error);
    return NextResponse.json(
      { error: "계정 연동 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
