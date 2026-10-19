import { NextRequest, NextResponse } from "next/server";
import {
  genAI,
  FREE_MODELS,
  PREMIUM_MODELS,
  LOCALE_CONFIG,
  compatContextBlock,
  buildCompatPrompt,
  validateCompatOutputLanguage,
} from "@/lib/destinyGen";
import { getClientIp, checkChatRateLimit } from "@/lib/rateLimiter";
import prisma from "@/lib/prisma";
import { logGeneration, errorCode } from "@/lib/reports/genLog";

async function runGeminiOnce(prompt: string, models: string[]): Promise<string> {
  let modelName = models[0];
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error(`Failed with ${modelName}, trying fallback`, e);
    modelName = models[1];
    const fallbackModel = genAI.getGenerativeModel({ model: modelName });
    const fallbackResult = await fallbackModel.generateContent(prompt);
    return fallbackResult.response.text();
  }
}

export async function POST(req: NextRequest) {
  const tStart = Date.now();
  try {
    const body = await req.json();
    const { compatId, shareToken, isPremium = false } = body;

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
      void logGeneration({ catalogId: "compat_basic", kind: "SUMMARY", ok: true, cached: true });
      return new NextResponse(compat.summaryKo, { status: 200 });
    }

    // 5. Build prompt — 언어는 요청 본문의 locale 을 믿지 않고 compat.locale 을 따른다
    const recordLocale = (compat as { locale?: string | null }).locale;
    const targetLang: "en" | "ja" | "zh" | undefined =
      recordLocale === "en" || recordLocale === "ja" || recordLocale === "zh"
        ? recordLocale
        : undefined;
    const effectiveLocale = targetLang ?? "ko";
    const toneGuide = LOCALE_CONFIG[effectiveLocale]?.toneGuide || LOCALE_CONFIG["ko"].toneGuide;

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

    const prompt = buildCompatPrompt(isPremium, contextBlock, toneGuide, null, targetLang);

    // 6. Generate via Gemini (with 1 regeneration retry if foreign language validation fails)
    const models = isPremium ? PREMIUM_MODELS : FREE_MODELS;
    let resultText = await runGeminiOnce(prompt, models);

    if (targetLang) {
      let check = validateCompatOutputLanguage(resultText, targetLang);
      if (!check.ok) {
        console.warn(
          `[generate-compat] Foreign output validation failed (${targetLang}: ${check.reason}), retrying once...`
        );
        resultText = await runGeminiOnce(prompt, models);
        check = validateCompatOutputLanguage(resultText, targetLang);
        if (!check.ok) {
          void logGeneration({
            catalogId: "compat_basic",
            kind: "SUMMARY",
            ok: false,
            ms: Date.now() - tStart,
            error: `lang_validation_${check.reason ?? "failed"}`,
          });
          return NextResponse.json(
            { error: "Failed to generate compatibility reading in target language" },
            { status: 500 }
          );
        }
      }
    }

    // 7. Save to DB
    await prisma.compatibility.update({
      where: { id: compat.id },
      data: isPremium ? { premiumKo: resultText } : { summaryKo: resultText }
    });

    if (!isPremium) void logGeneration({ catalogId: "compat_basic", kind: "SUMMARY", ok: true, ms: Date.now() - tStart });
    return new NextResponse(resultText, { status: 200 });

  } catch (error) {
    console.error("[generate-compat] Error:", error);
    void logGeneration({ catalogId: "compat_basic", kind: "SUMMARY", ok: false, ms: Date.now() - tStart, error: errorCode(error) });
    return NextResponse.json({ error: "Failed to generate compatibility reading" }, { status: 500 });
  }
}
