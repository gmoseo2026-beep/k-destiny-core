import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getProduct } from "@/lib/catalog";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const cleanCode = typeof code === "string" ? code.trim() : "";
    if (!cleanCode || !/^[a-f0-9]{16,64}$/i.test(cleanCode)) {
      return NextResponse.json(
        { error: "선물 코드를 찾을 수 없어요." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const gift = await prisma.giftCode.findUnique({ where: { code: cleanCode } });
    if (!gift) {
      return NextResponse.json(
        { error: "선물 코드를 찾을 수 없어요." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const purchaseOrder = await prisma.order.findUnique({
      where: { orderId: gift.purchaseOrderId },
      select: { status: true },
    });

    const product = getProduct(gift.catalogId);
    const now = Date.now();
    let status: "AVAILABLE" | "USED" | "EXPIRED" | "UNPAID" = "AVAILABLE";
    if (!purchaseOrder || purchaseOrder.status !== "PAID") {
      status = "UNPAID";
    } else if (gift.used) {
      status = "USED";
    } else if (new Date(gift.expiresAt).getTime() <= now) {
      status = "EXPIRED";
    }

    return NextResponse.json(
      {
        code: gift.code,
        catalogId: gift.catalogId,
        productName: product?.name ?? "운세 리포트",
        target: product?.target ?? "individual",
        inputKind: product?.inputKind ?? "person",
        tier: product?.tier ?? "standard",
        senderNickname: gift.senderNickname,
        recipientNickname: gift.recipientNickname,
        message: gift.message,
        status,
        expiresAt: gift.expiresAt.toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: unknown) {
    console.error("[api/gift/[code]]", e);
    return NextResponse.json(
      { error: "선물 정보를 불러오지 못했어요." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
