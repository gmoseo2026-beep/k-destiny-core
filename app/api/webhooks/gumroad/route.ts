import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/* ─────────────────────────────────────────────
 * Gumroad Webhook — POST handler (v4: full lifecycle)
 * Products:
 *   - Single Report ($2.99): moseo.gumroad.com/l/zmqhr
 *   - Monthly ($7.99): moseo.gumroad.com/l/ykcjwk
 *   - Annual ($49.99): moseo.gumroad.com/l/gywfqd
 *
 * Handles BOTH Gumroad delivery styles at one URL:
 *   - Sale "ping" (form-encoded) — grants access
 *   - Resource subscriptions (JSON): refund, dispute, cancellation,
 *     subscription_ended, subscription_restarted — revokes/updates access.
 *     Register the same URL for these resources via Gumroad's API:
 *     PUT https://api.gumroad.com/v2/resource_subscriptions
 *       ?access_token=...&resource_name=refund&post_url=<this URL>
 *
 * v3→v4 changes:
 *   - Refund/dispute now REVOKES access (v3 only ignored the grant)
 *   - cancellation → subscriptionStatus=CANCELLED (access kept until endDate)
 *   - subscription_ended → tier=FREE, status=EXPIRED
 *   - subscription_restarted → tier=PREMIUM, status=ACTIVE, endDate extended
 *
 * Retained from v3 (revenue + security critical):
 *   1. PRICE UNIT FIX — Gumroad's ping sends `price` in USD *cents*
 *      (e.g. "299" for $2.99); dollars are also accepted defensively.
 *   2. Sender verification — ?secret= (GUMROAD_WEBHOOK_SECRET) and
 *      seller_id (GUMROAD_SELLER_ID); each enforced only when configured.
 *   3. Idempotency — duplicate sale_id never double-creates PurchasedReport.
 * ───────────────────────────────────────────── */

function truthy(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

/**
 * Gumroad sends `price` in USD cents ("299" = $2.99), while the
 * `formatted_price` fallback path produces dollars ("2.99"). Our plan
 * prices never exceed $55, so any value above 100 must be cents.
 */
function normalizePrice(raw: string): number | null {
  const value = parseFloat(raw);
  if (isNaN(value) || value < 0) return null;
  return value > 100 ? value / 100 : value;
}

function resolvePlan(priceStr: string): {
  planType: string; months: number; paidAmount: number;
} | null {
  const price = normalizePrice(priceStr);
  if (price === null) return null;

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

/** Revoke access after a refund / chargeback / dispute. */
async function handleRefund(payload: Record<string, string>) {
  const email = (payload.email || payload.purchaser_email || payload.user_email || "").toLowerCase().trim();
  const saleId = payload.sale_id || "";
  const price = payload.price || payload.formatted_price?.replace(/[^0-9.]/g, "") || "";

  if (!email && !saleId) {
    return NextResponse.json({ ok: true, message: "Refund: no identifiers" }, { status: 200 });
  }

  // 1. Single report refund — remove the exact purchase row when we know the
  //    sale_id, otherwise fall back to the buyer's most recent report.
  if (saleId) {
    const deleted = await prisma.purchasedReport.deleteMany({ where: { gumroadId: saleId } });
    if (deleted.count > 0) {
      console.log(`[Gumroad] 🔻 Refund: removed ${deleted.count} purchased report(s) for sale ${saleId}`);
      return NextResponse.json({ ok: true, message: "Report access revoked" });
    }
  }

  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;
  if (!user) {
    return NextResponse.json({ ok: true, message: "Refund: user not found" }, { status: 200 });
  }

  const plan = price ? resolvePlan(price) : null;

  if (plan?.planType === "SINGLE_REPORT") {
    const latest = await prisma.purchasedReport.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latest) {
      await prisma.purchasedReport.delete({ where: { id: latest.id } });
      console.log(`[Gumroad] 🔻 Refund: removed latest purchased report for ${email}`);
    }
    return NextResponse.json({ ok: true, message: "Report access revoked" });
  }

  // 2. Subscription refund (or unknown price on a known user) — downgrade.
  await prisma.user.update({
    where: { id: user.id },
    data: { tier: "FREE", subscriptionStatus: "REFUNDED", usageTokens: 3 },
  });
  console.log(`[Gumroad] 🔻 Refund: ${email} downgraded to FREE`);
  return NextResponse.json({ ok: true, message: "Subscription revoked" });
}

/** Subscription lifecycle events (JSON resource subscriptions). */
async function handleSubscriptionEvent(
  event: "cancellation" | "subscription_ended" | "subscription_restarted",
  payload: Record<string, string>
) {
  const email = (payload.user_email || payload.email || "").toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ ok: true, message: `${event}: no email` }, { status: 200 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ ok: true, message: `${event}: user not found` }, { status: 200 });
  }

  if (event === "cancellation") {
    // Keep access until premiumEndDate (entitlement already enforces expiry);
    // just record the intent so renewals/emails can respect it.
    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: "CANCELLED" },
    });
    console.log(`[Gumroad] ⏸ ${email} cancelled (access until ${user.premiumEndDate?.toISOString() || "n/a"})`);
    return NextResponse.json({ ok: true, message: "Cancellation recorded" });
  }

  if (event === "subscription_ended") {
    await prisma.user.update({
      where: { id: user.id },
      data: { tier: "FREE", subscriptionStatus: "EXPIRED" },
    });
    console.log(`[Gumroad] ⏹ ${email} subscription ended → FREE`);
    return NextResponse.json({ ok: true, message: "Subscription ended" });
  }

  // subscription_restarted — reactivate using the stored plan length
  const months = user.planType === "ANNUAL" ? 12 : 1;
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + months);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      tier: "PREMIUM",
      subscriptionStatus: "ACTIVE",
      premiumStartDate: now,
      premiumEndDate: endDate,
      usageTokens: 20,
    },
  });
  console.log(`[Gumroad] ▶ ${email} subscription restarted until ${endDate.toISOString()}`);
  return NextResponse.json({ ok: true, message: "Subscription restarted" });
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Shared-secret check (set the ping URL to .../gumroad?secret=XXX) ──
    const expectedSecret = process.env.GUMROAD_WEBHOOK_SECRET;
    if (expectedSecret) {
      const givenSecret = req.nextUrl.searchParams.get("secret");
      if (givenSecret !== expectedSecret) {
        console.warn("[Gumroad] Rejected: bad webhook secret");
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    // ── 2. Parse body — sale pings are form-encoded, resource events are JSON ──
    const contentType = req.headers.get("content-type") || "";
    const payload: Record<string, string> = {};
    if (contentType.includes("application/json")) {
      const json = await req.json().catch(() => ({}));
      Object.entries(json as Record<string, unknown>).forEach(([k, v]) => {
        if (v !== null && v !== undefined && typeof v !== "object") payload[k] = String(v);
      });
    } else {
      const formData = await req.formData();
      formData.forEach((value, key) => { payload[key] = String(value); });
    }

    console.log("[Gumroad Webhook] Received:", Object.keys(payload));

    // ── 3. Seller verification (Gumroad includes seller_id in pings) ──
    const expectedSeller = process.env.GUMROAD_SELLER_ID;
    if (expectedSeller && payload.seller_id && payload.seller_id !== expectedSeller) {
      console.warn("[Gumroad] Rejected: seller_id mismatch");
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    // ── 4. Route resource-subscription lifecycle events ──
    const resource = (payload.resource_name || "").toLowerCase();

    if (resource === "refund" || resource === "dispute" ||
        truthy(payload.refunded) || truthy(payload.disputed) || truthy(payload.chargebacked)) {
      return await handleRefund(payload);
    }
    if (resource === "dispute_won") {
      // Dispute resolved in our favor — nothing to change.
      return NextResponse.json({ ok: true, message: "Dispute won — no change" });
    }
    if (resource === "cancellation" || payload.cancelled_at) {
      return await handleSubscriptionEvent("cancellation", payload);
    }
    if (resource === "subscription_ended" || payload.ended_at) {
      return await handleSubscriptionEvent("subscription_ended", payload);
    }
    if (resource === "subscription_restarted" || payload.restarted_at) {
      return await handleSubscriptionEvent("subscription_restarted", payload);
    }

    // ── 5. Sale ping → grant access ──
    const email = payload.email || payload.purchaser_email || "";
    const price = payload.price || payload.formatted_price?.replace(/[^0-9.]/g, "") || "0";
    const saleId = payload.sale_id || "";

    if (!email) {
      console.warn("[Gumroad] No email — skipping");
      return NextResponse.json({ ok: true, message: "No email" }, { status: 200 });
    }

    const plan = resolvePlan(price);
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
      // Idempotency: Gumroad retries pings — never double-create for one sale
      if (saleId) {
        const existing = await prisma.purchasedReport.findFirst({
          where: { gumroadId: saleId },
          select: { id: true },
        });
        if (existing) {
          console.log(`[Gumroad] Duplicate ping for sale ${saleId} — already processed`);
          return NextResponse.json({ ok: true, message: "Already processed", plan: "SINGLE_REPORT" });
        }
      }

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
