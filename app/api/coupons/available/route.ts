import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { findUsableCoupon } from "@/lib/reviews";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const body = (await req.json().catch(() => null)) as {
      couponCode?: unknown;
      guestOrderTokens?: unknown;
    } | null;

    const couponCode = typeof body?.couponCode === "string" ? body.couponCode.trim() : null;
    const guestOrderTokens = Array.isArray(body?.guestOrderTokens)
      ? body.guestOrderTokens.filter((t): t is string => typeof t === "string" && t.length > 0).slice(0, 20)
      : [];

    const coupon = await findUsableCoupon({
      couponCode,
      userId: session?.user?.id ?? null,
      guestOrderTokens,
    });

    if (!coupon) {
      return NextResponse.json({ coupon: null }, { headers: NO_STORE });
    }

    return NextResponse.json(
      {
        coupon: {
          code: coupon.code,
          amount: coupon.amount,
          expiresAt: coupon.expiresAt.toISOString(),
        },
      },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ coupon: null }, { headers: NO_STORE });
  }
}
