import { NextRequest, NextResponse } from "next/server";
import { genAI, FREE_MODELS, PREMIUM_MODELS, LOCALE_CONFIG, compatContextBlock, buildCompatPrompt } from "@/lib/destinyGen";
import { getClientIp, checkChatRateLimit } from "@/lib/rateLimiter";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { compatId, shareToken, locale = "ko", isPremium = false } = body;

    if (!compatId && !shareToken) {
      return NextResponse.json({ error: "Missing compatId or shareToken" }, { status: 400 });
    }

    // 1. Fetch compatibility record (supports id or shareToken)
    const compat = await prisma.compatibility.findUnique({
      where: shareToken ? { shareToken } : { id: compatId! }
    });

    if (!compat) {
      return NextResponse.json({ error: "Compatibility record not found" }, { status: 404 });
    }

    // 2. Validate premium access if requested
    if (isPremium && !compat.isPaid) {
      return NextResponse.json({ error: "Payment required for premium interpretation" }, { status: 403 });
    }

    // 3. Rate limiting (using user IP)
    const clientIp = getClientIp(req);
    const rateCheck = await checkChatRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // 4. Check cache
    if (isPremium && compat.premiumKo) {
      return new NextResponse(compat.premiumKo, { status: 200 });
    } else if (!isPremium && compat.summaryKo) {
      return new NextResponse(compat.summaryKo, { status: 200 });
    }

    // 5. Build prompt
    const toneGuide = LOCALE_CONFIG[locale]?.toneGuide || LOCALE_CONFIG["ko"].toneGuide;
    
    // Type casting JSON back to objects
    type CompatPerson = { name?: string; gender: string; dayMaster: string; elementsScore: Record<string, number> };
    const personA = compat.personA as unknown as CompatPerson;
    const personB = compat.personB as unknown as CompatPerson;
    const breakdown = compat.breakdown as unknown as Record<string, number>;
    const score = compat.score;
    const keywords = compat.keywords;

    const contextBlock = compatContextBlock({
      personA,
      personB,
      relation: compat.relation,
      compatResult: { score, keywords, breakdown }
    });

    const prompt = buildCompatPrompt(isPremium, contextBlock, toneGuide);

    // 6. Generate via Gemini
    const models = isPremium ? PREMIUM_MODELS : FREE_MODELS;
    let modelName = models[0];
    
    // Simple retry logic
    let resultText = "";
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      resultText = response.text();
    } catch (e) {
      console.error(`Failed with ${modelName}, trying fallback`, e);
      modelName = models[1];
      const fallbackModel = genAI.getGenerativeModel({ model: modelName });
      const fallbackResult = await fallbackModel.generateContent(prompt);
      const fallbackResponse = await fallbackResult.response;
      resultText = fallbackResponse.text();
    }

    // 7. Save to DB
    await prisma.compatibility.update({
      where: { id: compat.id },
      data: isPremium ? { premiumKo: resultText } : { summaryKo: resultText }
    });

    return new NextResponse(resultText, { status: 200 });

  } catch (error) {
    console.error("[generate-compat] Error:", error);
    return NextResponse.json({ error: "Failed to generate compatibility reading" }, { status: 500 });
  }
}
