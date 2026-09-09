import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { payments } from "@/lib/payments";
import { applyPaidOrder } from "@/lib/payments/grant";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { paymentId } = await req.json();
    if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

    const order = await prisma.order.findUnique({ where: { orderId: paymentId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // 소유권: 회원 주문이면 세션 일치 필수(게스트 주문은 orderId 자체가 토큰)
    if (order.userId && session?.user?.id !== order.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // [SECURITY / H-6] 이미 PAID 인 주문은 PG 재조회 없이 통과시킨다.
    //
    // 게스트 주문은 userId 가 null 이라 위 소유권 가드가 통째로 열려 있다. 예전에는 그 상태로
    // 매 호출마다 PortOne getPayment 를 때렸기 때문에, orderId 만 아는 제3자가 무인증으로
    // 외부 PG API 호출을 증폭시킬 수 있었다. status 는 applyPaidOrder / 검증된 웹훅만이
    // PAID 로 바꾸므로 DB 의 PAID 를 신뢰해도 안전하다.
    // (환불된 주문은 CANCELED 라 아래 검증 경로로 내려가고, PG 가 취소 상태를 돌려줘 402 로 막힌다)
    if (order.status !== "PAID") {
      // 서버가 PortOne에 조회해 상태·금액 대조 (클라 신뢰 금지)
      const payment = await payments.getPayment(paymentId);
      if (payment.status !== "PAID") {
        return NextResponse.json({ error: "Payment not completed", status: payment.status }, { status: 402 });
      }
      if (Number(payment.amount?.total) !== order.amount) {
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }

      await applyPaidOrder(paymentId, payment.id ?? payment.transactionId);
    }

    // [SECURITY / H-6] claim 토큰은 주문당 정확히 1회만 발급한다.
    //
    // 게스트 주문에는 orderId 외에 호출자를 식별할 수단이 없으므로 "최초 완료 호출자"에게만 준다.
    // 이전 구현은 호출할 때마다 토큰을 새로 만들어 덮어썼는데(claimToken 은 @unique),
    // 그 결과 orderId 를 아는 제3자가 (1) 자기 브라우저에 유효한 kd_claim 쿠키를 발급받고
    // (2) 동시에 정당 구매자의 기존 쿠키를 어떤 주문과도 매칭되지 않게 만들어
    // 구매자의 자동 연동을 조용히 영구 고장낼 수 있었다.
    //
    // where 에 claimToken: null 을 넣어 동시 요청에서도 정확히 한 쪽만 성공하게 한다.
    // 웹훅이 먼저 도착해 status 가 이미 PAID 인 경우에도 여기까지 내려와 발급되므로
    // 모바일에서 브라우저가 늦게 복귀하는 시나리오가 막히지 않는다.
    let issuedClaimToken: string | null = null;
    if (!order.claimToken && !order.userId) {
      const token = crypto.randomUUID();
      const issued = await prisma.order.updateMany({
        where: { id: order.id, claimToken: null },
        data: {
          claimToken: token,
          // [SECURITY / M-8] 90일 → 7일. 연동은 결제 직후에 일어나는 행위다.
          // 90일짜리 쿠키는 공용 PC(PC방 등)에서 다음 로그인 사용자에게 결제가
          // 통째로 넘어가는 창을 그만큼 오래 열어 둔다.
          claimTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      if (issued.count === 1) issuedClaimToken = token;
    }

    // [SECURITY / H-2] 게스트는 세션이 없으므로 리포트 열람 시 소유권을 증명할 수단이
    // orderId(추측 불가 UUID) 뿐이다. 이전에는 이 값을 클라에 돌려주지 않아
    // 결제에 성공한 게스트가 리포트를 영원히 열지 못했다.
    // URL 쿼리로는 넘기지 않는다(히스토리·Referer·GA4 page_location 유출) — 응답 본문으로만 전달.
    //
    // [SECURITY / M-9] claimToken 은 본문에 싣지 않는다. 읽는 클라이언트가 없을뿐더러,
    // 본문으로 내보내면 JS 컨텍스트에 노출되어 httpOnly 쿠키로 얻은 이점이 사라진다.
    const response = NextResponse.json(
      {
        success: true,
        orderId: order.orderId,
        type: order.type,
        compatId: order.compatId,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );

    // SameSite=Lax 쿠키 설정 (카카오/네이버/구글 OAuth 왕복 후에도 쿠키 유지)
    if (issuedClaimToken) {
      response.cookies.set("kd_claim", issuedClaimToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7일 — claimTokenExpiresAt 과 동일
      });
    }

    return response;
  } catch (e: unknown) {
    // [SECURITY / L-4] 원문 예외 메시지에는 PortOne·Prisma 내부 상태가 실린다 → 서버 로그에만 남긴다.
    console.error("[payments/complete]", e);
    return NextResponse.json({ error: "결제 확인 중 오류가 발생했습니다." }, { status: 500 });
  }
}
