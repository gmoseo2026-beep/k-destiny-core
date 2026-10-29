import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redeemGiftCode } from "@/lib/payments/gift";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const session = await getServerSession(authOptions).catch(() => null);
    const body = await req.json().catch(() => ({}));

    const catalogId =
      typeof body?.catalogId === "string" ? body.catalogId.trim() : "";
    const compatId =
      typeof body?.compatId === "string" && body.compatId.trim()
        ? body.compatId.trim()
        : null;

    const result = await redeemGiftCode({
      code,
      catalogId,
      compatId,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, reason: result.reason },
        { status: result.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        orderId: result.orderId,
        catalogId: result.catalogId,
        compatId: result.compatId,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: unknown) {
    console.error("[api/gift/[code]/redeem]", e);
    return NextResponse.json(
      { error: "선물을 여는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
