import { NextResponse } from "next/server";
import { lemonSqueezySetup, createCheckout } from "@lemonsqueezy/lemonsqueezy.js";

// Initialize the Lemon Squeezy client
lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { variantId, planId, locale } = body;

    if (!variantId) {
      return NextResponse.json(
        { error: "variantId is required" },
        { status: 400 }
      );
    }

    const storeId = process.env.LEMON_SQUEEZY_STORE_ID || 420430;
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const redirectUrl = `${origin}/${locale || "en"}/dashboard?success=true&planId=${planId || "1month"}`;

    // Create a Lemon Squeezy checkout session (with 10s timeout)
    const checkoutPromise = createCheckout(
      storeId,
      variantId,
      {
        productOptions: {
          redirectUrl,
        },
        checkoutData: {
          custom: {
            locale: locale || "en",
          }
        }
      }
    );

    const { error, data } = await Promise.race([
      checkoutPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Checkout request timed out (10s)")), 10000)
      ),
    ]);

    if (error) {
      console.error("Lemon Squeezy Checkout Error:", error);
      return NextResponse.json(
        { error: "Failed to generate Lemon Squeezy checkout URL" },
        { status: 500 }
      );
    }

    if (!data?.data?.attributes?.url) {
      return NextResponse.json(
        { error: "Invalid response from Lemon Squeezy" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.data.attributes.url });
  } catch (err: any) {
    console.error("Checkout Session Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
