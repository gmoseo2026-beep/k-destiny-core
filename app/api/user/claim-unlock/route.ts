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
 * 1차: httpOnly kd_claim 쿠키로 확인 (1순위)
 * 2차: 쿠키가 없거나 유효하지 않은 경우 query ?compatId= 및 OAuth 검증 이메일 일치로 확인
 */
export async function GET(req: NextRequest) {
  const notClaimable = NextResponse.json(
    { claimable: false },
    { headers: { "Cache-Control": "no-store" } }
  );

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return notClaimable;

    // 1차 경로: 쿠키 확인 (1순위)
    const claimToken = req.cookies.get("kd_claim")?.value;
    if (claimToken) {
      const order = await prisma.order.findUnique({
        where: { claimToken },
        select: { userId: true, status: true, compatId: true, claimTokenExpiresAt: true },
      });

      if (
        order &&
        !order.userId &&
        order.status === "PAID" &&
        (!order.claimTokenExpiresAt || order.claimTokenExpiresAt >= new Date())
      ) {
        return NextResponse.json(
          { claimable: true, compatId: order.compatId },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    // 2차 경로: query ?compatId= 와 OAuth 검증 이메일 일치 확인 (A안)
    const { searchParams } = new URL(req.url);
    const compatId = searchParams.get("compatId")?.trim();
    const userEmail = session.user.email?.trim();

    if (compatId && userEmail) {
      // [보안 가드 1-강화] 이메일 2차 경로는 "비밀번호가 없는 순수 OAuth 계정"에게만 허용한다.
      // credentials 가입자는 이메일 미검증이라, 남의 이메일을 선점해 그 이메일 게스트 주문을
      // 탈취할 수 있다. password == null ⟹ OAuth 가입 ⟹ 세션 이메일은 provider 검증 이메일.
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      });
      const oauthAcct = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          provider: { in: ["google", "naver", "kakao"] },
        },
        select: { id: true },
      });
      const emailPathEligible = !!oauthAcct && dbUser != null && dbUser.password == null;

      if (emailPathEligible) {
        // [보안 가드 2, 3] 대소문자 무시 + PAID + 미연동(userId=null) 주문만 조회
        const emailOrder = await prisma.order.findFirst({
          where: {
            compatId,
            status: "PAID",
            userId: null,
            email: { equals: userEmail, mode: "insensitive" },
          },
          select: { compatId: true },
          orderBy: { createdAt: "asc" },
        });

        if (emailOrder) {
          return NextResponse.json(
            { claimable: true, compatId: emailOrder.compatId },
            { headers: { "Cache-Control": "no-store" } }
          );
        }
      }
    }

    return notClaimable;
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

    // 클라이언트 본문에서 compatId 추출 (2차 이메일 연동 경로용)
    let bodyCompatId: string | null = null;
    try {
      const body = await req.json();
      if (typeof body?.compatId === "string" && body.compatId.trim().length > 0) {
        bodyCompatId = body.compatId.trim();
      }
    } catch {
      // body가 없거나 JSON이 아닐 수 있음 (정상적인 쿠키 단독 요청 등)
    }

    let orderToClaim: {
      id: string;
      orderId: string;
      userId: string | null;
      compatId: string | null;
      status: string;
      isCookieClaim: boolean;
    } | null = null;

    // ----------------------------------------------------
    // 1차 경로: httpOnly kd_claim 쿠키 기반 조회 (1순위)
    // ----------------------------------------------------
    const claimToken = req.cookies.get("kd_claim")?.value;
    if (claimToken) {
      const cookieOrder = await prisma.order.findUnique({ where: { claimToken } });
      if (
        cookieOrder &&
        cookieOrder.status === "PAID" &&
        (!cookieOrder.claimTokenExpiresAt || cookieOrder.claimTokenExpiresAt >= new Date()) &&
        (!cookieOrder.userId || cookieOrder.userId === session.user.id)
      ) {
        orderToClaim = {
          id: cookieOrder.id,
          orderId: cookieOrder.orderId,
          userId: cookieOrder.userId,
          compatId: cookieOrder.compatId,
          status: cookieOrder.status,
          isCookieClaim: true,
        };
      }
    }

    // ----------------------------------------------------
    // 2차 경로: 쿠키로 주문을 못 찾았을 때만 OAuth 검증 이메일 일치 확인 (A안)
    // ----------------------------------------------------
    if (!orderToClaim && bodyCompatId && session.user.email) {
      const userEmail = session.user.email.trim();

      // [보안 가드 1-강화] 이메일 2차 경로는 "비밀번호가 없는 순수 OAuth 계정"에게만 허용한다.
      // credentials 가입자는 이메일 미검증이라, 남의 이메일을 선점해 그 이메일 게스트 주문을
      // 탈취할 수 있다. password == null ⟹ OAuth 가입 ⟹ 세션 이메일은 provider 검증 이메일.
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      });
      const oauthAcct = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          provider: { in: ["google", "naver", "kakao"] },
        },
        select: { id: true },
      });
      const emailPathEligible = !!oauthAcct && dbUser != null && dbUser.password == null;

      if (emailPathEligible) {
        // [보안 가드 2, 3, 4] 대소문자 무시 + PAID + 미연동(userId=null) 주문 매칭
        const emailOrder = await prisma.order.findFirst({
          where: {
            compatId: bodyCompatId,
            status: "PAID",
            userId: null,
            email: { equals: userEmail, mode: "insensitive" },
          },
          orderBy: { createdAt: "asc" },
        });

        if (emailOrder) {
          orderToClaim = {
            id: emailOrder.id,
            orderId: emailOrder.orderId,
            userId: emailOrder.userId,
            compatId: emailOrder.compatId,
            status: emailOrder.status,
            isCookieClaim: false,
          };
        }
      }
    }

    // 쿠키로도, 이메일로도 연동할 주문을 못 찾은 경우 최종 실패 응답 및 쿠키 삭제
    if (!orderToClaim) {
      return failAndClearCookie("연동할 결제 주문을 찾을 수 없습니다.", 404);
    }

    // 이미 다른 회원에게 연동된 경우 선점 방지
    if (orderToClaim.userId && orderToClaim.userId !== session.user.id) {
      return failAndClearCookie("이미 다른 계정에 연동된 주문입니다.", 409);
    }

    const targetCompatId = orderToClaim.compatId;

    // 3. Unlock 레코드 확인 (Order.id 연결)
    const unlock = await prisma.unlock.findFirst({
      where: { orderId: orderToClaim.id },
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

      // Order에 userId 할당
      if (!orderToClaim.userId) {
        if (orderToClaim.isCookieClaim) {
          // 쿠키 경로: [SECURITY / L-6] 1회용 claim 토큰 소각
          await tx.order.update({
            where: { id: orderToClaim.id },
            data: {
              userId: session.user.id,
              claimToken: null,
              claimTokenExpiresAt: null,
            },
          });
        } else {
          // 이메일 경로: claimToken 소각 대상 아님(쿠키 아님) — Order.userId만 세팅
          await tx.order.update({
            where: { id: orderToClaim.id },
            data: {
              userId: session.user.id,
            },
          });
        }
      }

      // Compatibility 최초 결제 주문인 경우에만 원작성자로 귀속
      if (targetCompatId) {
        const firstPaidOrder = await tx.order.findFirst({
          where: { compatId: targetCompatId, status: "PAID" },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

        if (firstPaidOrder?.id === orderToClaim.id) {
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

    // 5. 연동 완료 응답 생성 및 쿠키 삭제
    const response = NextResponse.json({
      success: true,
      message: "구매하신 궁합 결과가 내 계정에 안전하게 연동되었습니다.",
      compatId: targetCompatId,
      orderId: orderToClaim.orderId,
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
