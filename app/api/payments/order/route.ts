import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { isSellableFor, FIRST_PURCHASE_PRICE } from "@/lib/catalog";
import { getEffectiveProduct } from "@/lib/catalogVisibility";
import { toStorageKey } from "@/lib/productIdentity";
import { canPreview } from "@/lib/preview";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const type = body.type ?? "SINGLE";
    const productId = body.productId || body.product;
    const compatId = body.compatId;
    const email = body.email;

    if (type === "PERIOD_PASS") {
      // [D4] PERIOD_PASS 분기는 더 이상 사용되지 않으므로 410 반환
      return NextResponse.json({ error: "기간권 판매가 종료되었습니다." }, { status: 410 });
    }

    if (type === "SINGLE") {
      // Legacy compatibility for annual and initial compat
      let catalogId = productId;
      if (productId === "ANNUAL_2026") catalogId = "annual_2026";
      else if (!productId && compatId) catalogId = "compat_basic";

      const preview = canPreview(session?.user?.email);
      const catalogItem = await getEffectiveProduct(catalogId);
      if (!catalogItem || !isSellableFor(catalogItem, preview)) {
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
        if (!email || typeof email !== "string") {
          return NextResponse.json({ error: "Email is required for guest checkout" }, { status: 400 });
        }
        parsedEmail = email.trim().toLowerCase();
        if (!isValidEmail(parsedEmail)) {
          return NextResponse.json({ error: "유효하지 않은 이메일 형식입니다." }, { status: 400 });
        }
      }

      let amount = catalogItem.price;
      const sessionUserId = session?.user?.id ?? null;
      if (sessionUserId && catalogItem.tier === "standard" && catalogItem.type !== "SET") {
        const anyPaid = await prisma.order.findFirst({
          where: { userId: sessionUserId, status: "PAID", provider: { not: "admin_manual" }, amount: { gt: 0 } },
          select: { id: true },
        });
        if (!anyPaid) amount = Math.min(amount, FIRST_PURCHASE_PRICE);
      }

      const { productType, productKey } = toStorageKey(catalogItem.id);
      
      // 세트이면서 궁합(커플) 포함 시 주문에 compatId 저장 (커밋 D1 보완 지시)
      const orderCompatId = requiresCompatId ? compatId : null;

      const orderId = `kd_ord_${uuidv4().replace(/-/g, "")}`;
      const order = await prisma.order.create({
        data: {
          orderId,
          userId: sessionUserId,
          email: parsedEmail,
          compatId: orderCompatId,
          productType,
          productKey,
          type: "SINGLE",
          amount,
          status: "PENDING",
          provider: process.env.PG_PROVIDER || "portone",
        },
      });

      return NextResponse.json(
        { orderId: order.orderId, amount: order.amount, type: order.type, orderName: catalogItem.name },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
  } catch (e: unknown) {
    // [SECURITY / L-4] Prisma 예외 원문은 서버 로그에만 남긴다.
    console.error("[payments/order]", e);
    return NextResponse.json({ error: "주문 생성에 실패했습니다." }, { status: 500 });
  }
}
