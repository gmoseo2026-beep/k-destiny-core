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

/** 이메일 2차 경로를 허용할 소셜 provider. */
const TRUSTED_OAUTH_PROVIDERS = ["google", "naver", "kakao"] as const;

/**
 * 이메일 비교는 반드시 이 함수를 거친다(양쪽 모두 정규화 후 정확 일치).
 *
 * [SECURITY / H-1] 이전에는 `email: { equals: userEmail, mode: "insensitive" }` 였다.
 * Prisma 의 insensitive 모드는 `=` 가 아니라 **`ILIKE` 로 컴파일되고 LIKE 메타문자를
 * 이스케이프하지 않는다**(생성 SQL 로 확인: `"Order"."email" ILIKE $3`).
 * 즉 세션 이메일에 `%` 가 들어 있으면 `WHERE email ILIKE '%@gmail.com'` 이 되어
 * 그 궁합의 미연동 PAID 주문을 통째로 매칭한다. `_` 는 한 글자 와일드카드라
 * 공격자가 없어도 `kim_su@` 가 `kim-su@` 주문을 가져가는 오연동이 성립한다.
 * 이메일 일치는 이 경로의 유일한 소유권 증명이므로 와일드카드 여지를 남기지 않는다.
 */
function normalizeEmail(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

/**
 * [SECURITY / H-1] provider 가 준 값이라도 형식을 한 번 더 좁힌다.
 * `%` `_` `'` `"` 등 비교를 왜곡할 수 있는 문자를 가진 세션 이메일은 아예 경로에 들이지 않는다.
 */
const EMAIL_PATTERN = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

/**
 * 이메일 2차 경로 자격 판정.
 *
 * [보안 가드 1-강화] "비밀번호가 없는 순수 OAuth 계정"에게만 허용한다. credentials 가입자는
 * 이메일 미검증이라, 남의 이메일을 선점해 그 이메일 게스트 주문을 탈취할 수 있다.
 * password == null ⟹ OAuth 가입이고, [SECURITY / H-2] 이후로는 provider 가 검증 플래그를
 * 내려준 이메일만 User.email 에 저장되므로 세션 이메일 = 검증된 이메일이 성립한다.
 */
async function isEmailPathEligible(userId: string): Promise<boolean> {
  const [dbUser, oauthAcct] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    }),
    prisma.account.findFirst({
      where: { userId, provider: { in: [...TRUSTED_OAUTH_PROVIDERS] } },
      select: { id: true },
    }),
  ]);
  return !!oauthAcct && dbUser != null && dbUser.password == null;
}

/**
 * 해당 궁합의 미연동 PAID 주문 중 세션 이메일과 정확히 일치하는 가장 오래된 주문.
 *
 * compatId 에는 인덱스가 있고(schema.prisma `@@index([compatId])`) 궁합당 주문 수는 소수이므로
 * 후보를 좁혀서 가져온 뒤 애플리케이션에서 정확 비교한다(H-1 참조).
 */
async function findClaimableOrderByEmail(compatId: string, sessionEmail: string) {
  const wanted = normalizeEmail(sessionEmail);
  if (!EMAIL_PATTERN.test(wanted)) return null;

  const candidates = await prisma.order.findMany({
    where: { compatId, status: "PAID", userId: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      orderId: true,
      userId: true,
      compatId: true,
      status: true,
      email: true,
    },
  });

  return candidates.find((order) => normalizeEmail(order.email) === wanted) ?? null;
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
      if (await isEmailPathEligible(session.user.id)) {
        // [보안 가드 2, 3] 이메일 정확 일치 + PAID + 미연동(userId=null) 주문만 조회
        const emailOrder = await findClaimableOrderByEmail(compatId, userEmail);

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
        };
      }
    }

    // ----------------------------------------------------
    // 2차 경로: 쿠키로 주문을 못 찾았을 때만 OAuth 검증 이메일 일치 확인 (A안)
    // ----------------------------------------------------
    if (!orderToClaim && bodyCompatId && session.user.email) {
      const userEmail = session.user.email.trim();

      if (await isEmailPathEligible(session.user.id)) {
        // [보안 가드 2, 3, 4] 이메일 정확 일치 + PAID + 미연동(userId=null) 주문 매칭
        const emailOrder = await findClaimableOrderByEmail(bodyCompatId, userEmail);

        if (emailOrder) {
          orderToClaim = {
            id: emailOrder.id,
            orderId: emailOrder.orderId,
            userId: emailOrder.userId,
            compatId: emailOrder.compatId,
            status: emailOrder.status,
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

    // 4. 계정 연동 업데이트 (Order, Unlock, Compatibility)
    //
    // [SECURITY / M-2] orderToClaim 은 트랜잭션 **밖에서** 읽은 스냅샷이다. 예전에는
    // `update({ where: { id } })` 로 조건 없이 덮어썼기 때문에, 서로 다른 두 사용자가 같은
    // 주문에 동시에 들어오면 양쪽 다 위의 409 검사를 통과한 뒤 나중 쓰기가 이겼다.
    // `updateMany({ where: { id, userId: null } })` 로 바꿔 DB 가 승자를 결정하게 하고,
    // 진 쪽은 아무것도 쓰지 않은 채 409 로 떨어진다(Order 귀속이 이 트랜잭션의 관문이므로
    // Unlock·Compatibility 보다 먼저 판정한다).
    const conflict = await prisma.$transaction(async (tx) => {
      // Order에 userId 할당
      if (!orderToClaim.userId) {
        const claimed = await tx.order.updateMany({
          where: { id: orderToClaim.id, userId: null },
          data: {
            userId: session.user.id,
            // [SECURITY / L-6, L-1] 어느 경로로 연동했든 1회용 claim 토큰을 소각한다.
            //
            // 예전에는 쿠키 경로에서만 소각했다. 이메일 경로로 연동하면 주문에 주인이 생긴 뒤에도
            // claimToken 이 최대 7일 살아 있어서, "연동된 주문에는 살아 있는 베어러 토큰이 없다"는
            // L-6 불변식이 깨졌다(예: 게스트가 PC방에서 결제 → 휴대폰에서 이메일 경로로 연동 →
            // PC방 브라우저에는 유효한 kd_claim 쿠키가 그대로 남는다). 지금은 409 가 막아주지만,
            // 토큰 자체를 남기지 않는 편이 방어 계층이 하나 더 두껍다.
            claimToken: null,
            claimTokenExpiresAt: null,
          },
        });

        if (claimed.count === 0) return true; // 경쟁에서 졌다 → 아무것도 쓰지 않고 409
      }

      // Unlock에 userId 할당
      if (unlock && !unlock.userId) {
        await tx.unlock.updateMany({
          where: { id: unlock.id, userId: null },
          data: { userId: session.user.id },
        });
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

      return false;
    });

    if (conflict) {
      return failAndClearCookie("이미 다른 계정에 연동된 주문입니다.", 409);
    }

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
