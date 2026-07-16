import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/* ─────────────────────────────────────────────
 * Gumroad Webhook — POST handler (v2: 3-product support)
 * Products:
 *   - Single Report ($2.99): moseo.gumroad.com/l/zmqhr
 *   - Monthly ($7.99): moseo.gumroad.com/l/ykcjwk  
 *   - Annual ($49.99): moseo.gumroad.com/l/gywfqd
 * ───────────────────────────────────────────── */

function resolvePlan(priceStr: string, recurrence?: string): {
  planType: string; months: number; paidAmount: number;
} | null {
  const price = parseFloat(priceStr);
  if (isNaN(price)) return null;

  // Single Report: $2.99 (±$0.50 tolerance)
  if (price >= 2.49 && price <= 3.49) {
    return { planType: "SINGLE_REPORT", months: 0, paidAmount: Math.round(price * 100) };
  }
  // Monthly: $7.99 (±$1.00 tolerance)
  if (price >= 6.99 && price <= 8.99) {
    return { planType: "MONTHLY", months: 1, paidAmount: Math.round(price * 100) };
  }
  // Annual: $49.99 (±$5.00 tolerance)
  if (price >= 44.99 && price <= 54.99) {
    return { planType: "ANNUAL", months: 12, paidAmount: Math.round(price * 100) };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => { payload[key] = String(value); });

    console.log("[Gumroad Webhook] Received:", Object.keys(payload));

    const email = payload.email || payload.purchaser_email || "";
    const price = payload.price || payload.formatted_price?.replace(/[^0-9.]/g, "") || "0";
    const saleId = payload.sale_id || "";
    const recurrence = payload.recurrence || payload.subscription_duration || "";

    if (!email) {
      console.warn("[Gumroad] No email — skipping");
      return NextResponse.json({ ok: true, message: "No email" }, { status: 200 });
    }

    const plan = resolvePlan(price, recurrence);
    if (!plan) {
      console.warn(`[Gumroad] Unknown price: ${price}`);
      return NextResponse.json({ ok: true, message: `Unknown price ${price}` }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      console.warn(`[Gumroad] User not found for email`);
      return NextResponse.json({ ok: true, message: "User not found" }, { status: 200 });
    }

    // ── Handle based on plan type ──
    if (plan.planType === "SINGLE_REPORT") {
      // 단건 구매: PurchasedReport 레코드 생성
      // reportId는 유저의 현재 saju profile을 사용
      const profile = await prisma.userSajuProfile.findUnique({ where: { userId: user.id } });
      await prisma.purchasedReport.create({
        data: {
          userId: user.id,
          reportId: profile?.id || "unknown",
          gumroadId: saleId,
        },
      });
      console.log(`[Gumroad] ✅ Single report purchased for ${email}`);
      return NextResponse.json({ ok: true, message: "Single report unlocked", plan: "SINGLE_REPORT" });
    }

    // Monthly / Annual: 구독 처리
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + plan.months);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        tier: "PREMIUM",
        planType: plan.planType,
        paidAmount: plan.paidAmount,
        premiumStartDate: now,
        premiumEndDate: endDate,
        subscriptionStatus: "ACTIVE",
        usageTokens: 20,
      },
    });

    console.log(`[Gumroad] ✅ ${email} → PREMIUM (${plan.planType}) until ${endDate.toISOString()}`);

    return NextResponse.json({
      ok: true,
      message: `Premium activated for ${email}`,
      plan: plan.planType,
      expiresAt: endDate.toISOString(),
    });
  } catch (error: unknown) {
    console.error("[Gumroad Webhook] Error:", error);
    return NextResponse.json({ ok: true, message: "Internal error — logged" }, { status: 200 });
  }
}
