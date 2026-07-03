import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/* ─────────────────────────────────────────────
 * Gumroad Webhook — POST handler
 * Gumroad sends `application/x-www-form-urlencoded`
 * Docs: https://help.gumroad.com/article/164-gumroad-ping
 * ───────────────────────────────────────────── */

/** Map Gumroad price (USD string) → plan metadata */
function resolvePlan(priceStr: string): {
  planType: string;
  months: number;
  paidAmount: number;
} | null {
  const price = parseFloat(priceStr);
  if (isNaN(price)) return null;

  // Allow ±$1.00 tolerance for currency rounding / tax adjustments
  if (price >= 8.99 && price <= 10.99) {
    return { planType: "1_MONTH", months: 1, paidAmount: Math.round(price * 100) };
  }
  if (price >= 22.97 && price <= 24.97) {
    return { planType: "3_MONTHS", months: 3, paidAmount: Math.round(price * 100) };
  }
  if (price >= 34.94 && price <= 36.94) {
    return { planType: "6_MONTHS", months: 6, paidAmount: Math.round(price * 100) };
  }
  if (price >= 58.88 && price <= 60.88) {
    return { planType: "1_YEAR", months: 12, paidAmount: Math.round(price * 100) };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    /* ── 1. Parse form-urlencoded body ── */
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = String(value);
    });

    console.log("[Gumroad Webhook] Received payload keys:", Object.keys(payload));

    /* ── 2. Extract key fields ── */
    const email = payload.email || payload.purchaser_email || "";
    const price = payload.price || payload.formatted_price?.replace(/[^0-9.]/g, "") || "0";

    if (!email) {
      console.warn("[Gumroad Webhook] No email found in payload");
      // Return 200 so Gumroad doesn't retry
      return NextResponse.json({ ok: true, message: "No email — skipped" }, { status: 200 });
    }

    /* ── 3. Determine plan from price ── */
    const plan = resolvePlan(price);
    if (!plan) {
      console.warn(`[Gumroad Webhook] Unknown price: ${price} — cannot map to plan`);
      return NextResponse.json(
        { ok: true, message: `Unknown price ${price} — skipped` },
        { status: 200 }
      );
    }

    /* ── 4. Calculate subscription dates ── */
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + plan.months);

    /* ── 5. Find user and upgrade ── */
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      console.warn(`[Gumroad Webhook] User not found for email: ${email}`);
      return NextResponse.json(
        { ok: true, message: `User not found for ${email}` },
        { status: 200 }
      );
    }

    /* ── 6. Update user to PREMIUM ── */
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tier: "PREMIUM",
        planType: plan.planType,
        paidAmount: plan.paidAmount,
        premiumStartDate: now,
        premiumEndDate: endDate,
        subscriptionStatus: "ACTIVE",
        usageTokens: 20, // Refresh tokens on purchase
      },
    });

    console.log(
      `[Gumroad Webhook] ✅ Upgraded ${email} → PREMIUM (${plan.planType}) until ${endDate.toISOString()}`
    );

    return NextResponse.json({
      ok: true,
      message: `Premium activated for ${email}`,
      plan: plan.planType,
      expiresAt: endDate.toISOString(),
    });
  } catch (error: unknown) {
    console.error("[Gumroad Webhook] Error:", error);
    // Still return 200 to prevent Gumroad from infinite retries
    return NextResponse.json(
      { ok: true, message: "Internal error — logged" },
      { status: 200 }
    );
  }
}
