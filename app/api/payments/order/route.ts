import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { getProduct } from "@/lib/catalog";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { type, compatId, email, planId, product } = body;
    
    let amount = 0;
    
    if (type === 'PERIOD_PASS') {
      if (!session?.user?.id) {
         return NextResponse.json({ error: "Login required for period pass" }, { status: 401 });
      }
      
      if (planId === '1_MONTH') amount = 9900;
      else if (planId === '3_MONTHS') amount = 24900;
      else return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

      const orderId = `kd_ord_${uuidv4().replace(/-/g, '')}`;
      const order = await prisma.order.create({
        data: {
          orderId,
          userId: session.user.id,
          email: session.user.email || null,
          compatId: null,
          type: type,
          planId: planId,
          amount,
          status: "PENDING",
          provider: process.env.PG_PROVIDER || "portone",
        }
      });
      return NextResponse.json(
        { orderId: order.orderId, amount: order.amount, type: order.type },
        { status: 200 }
      );

    } else if (type === 'SINGLE') {
      let catalogId = product;
      if (product === "ANNUAL_2026") catalogId = "annual_2026";
      else if (!product && compatId) catalogId = "compat_basic";

      const catalogItem = getProduct(catalogId);
      if (!catalogItem) {
        return NextResponse.json({ error: "Invalid or missing product" }, { status: 400 });
      }

      const requiresCompatId = catalogItem.type === "COMPAT" || (catalogItem.type === "SET" && catalogItem.target === "couple");
      if (requiresCompatId && !compatId) {
        return NextResponse.json({ error: "compatId is required for this product" }, { status: 400 });
      }

      if (!session?.user?.id && !email) {
        return NextResponse.json({ error: "Email is required for guest checkout" }, { status: 400 });
      }

      // Preserve legacy productType for annual to maintain compatibility, otherwise use catalog type
      let pType: string = catalogItem.type;
      let pKey = catalogItem.id;
      if (catalogItem.id === "annual_2026") {
        pType = "ANNUAL";
        pKey = "2026";
      } else if (catalogItem.id === "annual_2027") {
        pType = "ANNUAL";
        pKey = "2027";
      }

      amount = catalogItem.price;

      // First purchase discount for SINGLE (non-SET). 단품 첫구매 4900원.
      if (catalogItem.type !== "SET") {
        const searchUser = session?.user?.id ? { userId: session.user.id } : { email };
        const pastOrders = await prisma.order.findFirst({
          where: {
            ...searchUser,
            status: 'PAID',
            type: 'SINGLE',
            productType: pType,
            provider: { not: 'admin_manual' },
            amount: { gt: 0 },
          }
        });
        if (!pastOrders) amount = 4900;
      }

      const orderId = `kd_ord_${uuidv4().replace(/-/g, '')}`;
      const order = await prisma.order.create({
        data: {
          orderId,
          userId: session?.user?.id || null,
          email: email || session?.user?.email || null,
          compatId: requiresCompatId ? compatId : null,
          productType: pType,
          productKey: pKey,
          type: "SINGLE",
          amount,
          status: "PENDING",
          provider: process.env.PG_PROVIDER || "portone",
        }
      });

      return NextResponse.json(
        { orderId: order.orderId, amount: order.amount, type: order.type },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
    }

  } catch (e) {
    // [SECURITY / L-4] Prisma 예외 원문은 서버 로그에만 남긴다.
    console.error("[payments/order]", e);
    return NextResponse.json({ error: "주문 생성에 실패했습니다." }, { status: 500 });
  }
}
