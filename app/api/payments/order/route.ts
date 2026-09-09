import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { type, compatId, email, planId } = body;
    
    let amount = 2900;
    
    if (type === 'PERIOD_PASS') {
      if (!session?.user?.id) {
         return NextResponse.json({ error: "Login required for period pass" }, { status: 401 });
      }
      
      if (planId === '1_MONTH') amount = 9900;
      else if (planId === '3_MONTHS') amount = 24900;
      else return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    } else if (type === 'SINGLE') {
      // Check for first purchase for SINGLE (admin_manual 및 0원 수동 보상 주문은 첫구매 할인 자격을 소진시키지 않음)
      if (session?.user?.id) {
        const pastOrders = await prisma.order.findFirst({
          where: {
            userId: session.user.id,
            status: 'PAID',
            type: 'SINGLE',
            provider: { not: 'admin_manual' },
            amount: { gt: 0 },
          }
        });
        if (!pastOrders) amount = 1900;
      } else if (email) {
        const pastOrders = await prisma.order.findFirst({
          where: {
            email,
            status: 'PAID',
            type: 'SINGLE',
            provider: { not: 'admin_manual' },
            amount: { gt: 0 },
          }
        });
        if (!pastOrders) amount = 1900;
      } else {
        return NextResponse.json({ error: "Email is required for guest checkout" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
    }

    const orderId = `kd_ord_${uuidv4().replace(/-/g, '')}`;

    const order = await prisma.order.create({
      data: {
        orderId,
        userId: session?.user?.id || null,
        email: email || session?.user?.email || null,
        compatId: type === 'SINGLE' ? compatId : null,
        type: type,
        planId: type === 'PERIOD_PASS' ? planId : null,
        amount,
        status: "PENDING",
        provider: process.env.PG_PROVIDER || "portone",
      }
    });

    // [SECURITY / L-7] Order 레코드 전체를 돌려주지 않는다. 생성 시점엔 claimToken 이 null 이라
    // 지금은 무해하지만, 결제창 호출에 필요한 필드만 화이트리스트로 내보내는 편이 안전하다.
    return NextResponse.json(
      { orderId: order.orderId, amount: order.amount, type: order.type },
      { status: 200 }
    );
  } catch (e) {
    // [SECURITY / L-4] Prisma 예외 원문은 서버 로그에만 남긴다.
    console.error("[payments/order]", e);
    return NextResponse.json({ error: "주문 생성에 실패했습니다." }, { status: 500 });
  }
}
