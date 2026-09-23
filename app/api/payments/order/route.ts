import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { getProduct, isSellable, FIRST_PURCHASE_PRICE } from "@/lib/catalog";
import { toStorageKey } from "@/lib/productIdentity";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    let { type, productId, product, compatId, email, planId } = body;
    
    // Legacy compatibility for field name
    productId = productId || product;

    if (type === 'PERIOD_PASS') {
      // [D4] PERIOD_PASS 분기는 더 이상 사용되지 않으므로 410 반환
      return NextResponse.json({ error: "기간권 판매가 종료되었습니다." }, { status: 410 });
      /*
      if (!session?.user?.id) {
         return NextResponse.json({ error: "Login required for period pass" }, { status: 401 });
      }
      
      let amount = 0;
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
      */
    }

    if (type === 'SINGLE') {
      // Legacy compatibility for annual and initial compat
      let catalogId = productId;
      if (productId === "ANNUAL_2026") catalogId = "annual_2026";
      else if (!productId && compatId) catalogId = "compat_basic";

      const catalogItem = getProduct(catalogId);
      if (!catalogItem || !isSellable(catalogItem)) {
        return NextResponse.json({ error: "유효하지 않거나 판매할 수 없는 상품입니다." }, { status: 400 });
      }

      if (catalogItem.requiresLogin && !session?.user?.id) {
        return NextResponse.json({ error: "로그인이 필요합니다.", code: "LOGIN_REQUIRED" }, { status: 401 });
      }

      const requiresCompatId = catalogItem.target === "couple";
      if (requiresCompatId) {
        if (!compatId) {
          return NextResponse.json({ error: "compatId is required for this product" }, { status: 400 });
        }
        const existingCompat = await prisma.compatibility.findUnique({ where: { id: compatId } });
        if (!existingCompat) {
          return NextResponse.json({ error: "궁합 정보를 찾을 수 없습니다." }, { status: 404 });
        }
      }

      let parsedEmail = session?.user?.email || null;
      if (!session?.user?.id) {
        if (!email || typeof email !== 'string') {
          return NextResponse.json({ error: "Email is required for guest checkout" }, { status: 400 });
        }
        parsedEmail = email.trim().toLowerCase();
        if (!isValidEmail(parsedEmail)) {
          return NextResponse.json({ error: "유효하지 않은 이메일 형식입니다." }, { status: 400 });
        }
      }

      let amount = catalogItem.price;

      // First purchase discount for standard non-SET products.
      if (catalogItem.tier === "standard" && catalogItem.type !== "SET") {
        const searchUser = session?.user?.id ? { userId: session.user.id } : { email: parsedEmail };
        if (searchUser.userId || searchUser.email) {
          const pastOrders = await prisma.order.findFirst({
            where: {
              ...searchUser,
              status: 'PAID',
              provider: { not: 'admin_manual' },
              amount: { gt: 0 },
            }
          });
          if (!pastOrders) {
            amount = Math.min(amount, FIRST_PURCHASE_PRICE);
          }
        }
      }

      const { productType, productKey } = toStorageKey(catalogItem.id);
      
      // 세트이면서 궁합(커플) 포함 시 주문에 compatId 저장 (커밋 D1 보완 지시)
      // D1 지시사항: type === "SET"이면서 구성에 관계상품이 포함된(=target couple) 세트는 compatId를 주문에 저장.
      // catalogItem.target === "couple" 이면 이미 compatId를 가지고 있음.
      const orderCompatId = requiresCompatId ? compatId : null;

      const orderId = `kd_ord_${uuidv4().replace(/-/g, '')}`;
      const order = await prisma.order.create({
        data: {
          orderId,
          userId: session?.user?.id || null,
          email: parsedEmail,
          compatId: orderCompatId,
          productType,
          productKey,
          type: "SINGLE",
          amount,
          status: "PENDING",
          provider: process.env.PG_PROVIDER || "portone",
        }
      });

      return NextResponse.json(
        { orderId: order.orderId, amount: order.amount, type: order.type, orderName: catalogItem.name },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Invalid order type" }, { status: 400 });

  } catch (e) {
    // [SECURITY / L-4] Prisma 예외 원문은 서버 로그에만 남긴다.
    console.error("[payments/order]", e);
    return NextResponse.json({ error: "주문 생성에 실패했습니다." }, { status: 500 });
  }
}
