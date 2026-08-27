import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { payments } from "@/lib/payments";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { authKey, customerKey } = body; 

    if (!authKey || !customerKey) {
      return NextResponse.json({ error: "Missing billing auth parameters" }, { status: 400 });
    }

    // 서버의 userId와 클라이언트가 요청한 customerKey가 일치하는지 강제 검증 (키 오염 방지)
    if (customerKey !== userId) {
      return NextResponse.json({ error: "Invalid customerKey" }, { status: 403 });
    }

    // 1. Issue Billing Key
    const billingResponse = await payments.issueBillingKey({ authKey, customerKey });
    if (!billingResponse || !billingResponse.billingKey) {
      return NextResponse.json({ error: "Failed to issue billing key" }, { status: 400 });
    }

    const { billingKey } = billingResponse;

    // 2. Create PENDING subscription order (9900 KRW)
    const orderId = `kd_ord_${uuidv4().replace(/-/g, '')}`;
    const amount = 9900;

    const order = await prisma.order.create({
      data: {
        orderId,
        userId,
        type: "SUBSCRIPTION",
        amount,
        status: "PENDING"
      }
    });

    // 3. Charge the billing key for the first payment
    const chargeResponse = await payments.chargeBilling(billingKey, order);

    // 4. Update Order to PAID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        tossPaymentKey: chargeResponse.paymentKey,
      }
    });

    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // 1 month from now

    // 5. Upsert subscription
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        status: "ACTIVE",
        billingKey,
        customerKey,
        currentPeriodEnd,
      },
      create: {
        userId,
        status: "ACTIVE",
        billingKey,
        customerKey,
        currentPeriodEnd,
      }
    });

    return NextResponse.json({ success: true, subscription: true }, { status: 200 });

  } catch (error: any) {
    console.error("Subscription create failed:", error);
    return NextResponse.json({ error: error.message || "Failed to create subscription" }, { status: 500 });
  }
}
