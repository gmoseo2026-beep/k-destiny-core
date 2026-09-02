import { NextRequest, NextResponse } from "next/server";
import { payments } from "@/lib/payments";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { paymentKey, orderId, amount } = body;

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderId }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 로그인 사용자 주문일 경우 소유권 검증
    if (order.userId && order.userId !== session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (order.status === "PAID") {
      return NextResponse.json({ message: "Already paid" }, { status: 200 });
    }

    // 서버 결제 금액 검증
    if (order.amount !== Number(amount)) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // PG 승인 요청
    const pgResponse = await payments.confirmPayment({
      paymentKey,
      orderId,
      amount: order.amount,
    });

    // 상태 업데이트
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        tossPaymentKey: paymentKey,
      }
    });

    // 건별 언락 (단건 결제일 경우)
    if (order.type === 'SINGLE' && order.compatId) {
      const existingUnlock = await prisma.unlock.findUnique({
        where: { compatId: order.compatId }
      });
      
      if (!existingUnlock) {
        await prisma.unlock.create({
          data: {
            compatId: order.compatId,
            orderId: order.id,
            userId: order.userId,
            email: order.email,
          }
        });
      }
    } else if (order.type === 'PERIOD_PASS' && order.userId) {
      const user = await prisma.user.findUnique({ where: { id: order.userId } });
      const now = new Date();
      
      let baseDate = now;
      if (user?.premiumEndDate && user.premiumEndDate > now) {
         baseDate = user.premiumEndDate;
      }
      
      const newEndDate = new Date(baseDate);
      if (order.planId === '1_MONTH') newEndDate.setMonth(newEndDate.getMonth() + 1);
      else if (order.planId === '3_MONTHS') newEndDate.setMonth(newEndDate.getMonth() + 3);
      
      await prisma.user.update({
        where: { id: order.userId },
        data: {
           tier: 'PREMIUM',
           premiumStartDate: user?.premiumStartDate || now,
           premiumEndDate: newEndDate,
           planType: order.planId,
           paidAmount: (user?.paidAmount || 0) + order.amount,
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      orderId, 
      paymentInfo: {
        status: pgResponse.status,
        totalAmount: pgResponse.totalAmount,
        approvedAt: pgResponse.approvedAt
      } 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Payment confirmation failed:", error);
    return NextResponse.json({ error: error.message || "Confirmation failed" }, { status: 500 });
  }
}
