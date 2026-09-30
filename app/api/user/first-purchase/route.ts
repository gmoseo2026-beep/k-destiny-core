import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { FIRST_PURCHASE_PRICE } from "@/lib/catalog";
import { isFirstPurchaseEligible } from "@/lib/payments/firstPurchase";

const NO_STORE = { "Cache-Control": "no-store" };

// 회원 화면의 "회원 첫 결제 4,900원" 안내용. 주문 금액 판정과 같은 함수를 쓴다.
export async function GET() {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ eligible: false }, { status: 401, headers: NO_STORE });
  const eligible = await isFirstPurchaseEligible(session.user.id);
  return NextResponse.json({ eligible, price: FIRST_PURCHASE_PRICE }, { headers: NO_STORE });
}
