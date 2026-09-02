import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Subscription model has been deprecated. Please use period passes." },
    { status: 410 }
  );
}
