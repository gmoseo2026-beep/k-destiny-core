// This checkout route has been removed.
// Lemon Squeezy integration has been permanently deprecated.
// Future payment processing will use Paddle via /api/webhooks/paddle
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This payment provider is no longer active. Please contact support." },
    { status: 410 }
  );
}
