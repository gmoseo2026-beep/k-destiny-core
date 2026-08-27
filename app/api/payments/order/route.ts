import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { type, compatId, email } = body;
    
    let amount = 2900;
    
    if (type === 'SUBSCRIPTION') {
      amount = 9900;
      if (!session?.user?.id) {
         return NextResponse.json({ error: "Login required for subscription" }, { status: 401 });
      }
    } else {
      // Check for first purchase for SINGLE
      if (session?.user?.id) {
        const pastOrders = await prisma.order.findFirst({
          where: { userId: session.user.id, status: 'PAID', type: 'SINGLE' }
        });
        if (!pastOrders) amount = 1900;
      } else if (email) {
        const pastOrders = await prisma.order.findFirst({
          where: { email, status: 'PAID', type: 'SINGLE' }
        });
        if (!pastOrders) amount = 1900;
      } else {
        return NextResponse.json({ error: "Email is required for guest checkout" }, { status: 400 });
      }
    }

    const orderId = `kd_ord_${uuidv4().replace(/-/g, '')}`;

    const order = await prisma.order.create({
      data: {
        orderId,
        userId: session?.user?.id || null,
        email: email || session?.user?.email || null,
        compatId: type === 'SINGLE' ? compatId : null,
        type: type,
        amount,
        status: "PENDING"
      }
    });

    return NextResponse.json(order, { status: 200 });
  } catch(e: any) {
    return NextResponse.json({ error: e.message || "Failed to create order" }, { status: 500 });
  }
}
