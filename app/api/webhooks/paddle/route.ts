import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/* ─────────────────────────────────────────────
 * Paddle Webhook — POST handler (Placeholder)
 * This route is prepared for future Paddle integration.
 * ───────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    console.log("[Paddle Webhook] Received event");

    // TODO: Implement Paddle webhook verification and processing
    // 1. Verify Paddle webhook signature
    // 2. Parse event type (subscription.created, subscription.activated, etc.)
    // 3. Update user tier in database accordingly

    return NextResponse.json(
      { ok: true, message: "Paddle webhook received" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[Paddle Webhook] Error:", error);
    return NextResponse.json(
      { ok: true, message: "Internal error — logged" },
      { status: 200 }
    );
  }
}
