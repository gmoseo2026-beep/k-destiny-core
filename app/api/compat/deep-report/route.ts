import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { genAI, PREMIUM_MODELS, LOCALE_CONFIG, compatContextBlock, buildCompatPrompt, repairJSON } from "@/lib/destinyGen";
import { isEntitled } from "@/lib/entitlement";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    // [Vuln 3 Fix] 게스트 사용자 검증을 위해 클라이언트가 임의로 보내는 email 대신 orderId를 고유 증명(Token)으로 사용
    const { compatId, orderId, locale = "ko" } = body;

    if (!compatId) {
      return NextResponse.json({ error: "Missing compatId" }, { status: 400 });
    }

    // 1. Check permissions via entitlement
    const entitlement = await isEntitled({
      userId: session?.user?.id,
      role: session?.user?.role,
      tier: session?.user?.tier,
      compatId,
      orderId
    });

    if (!entitlement.entitled) {
      return NextResponse.json({ error: "Payment required for deep report", reason: entitlement.reason }, { status: 403 });
    }

    // 2. Fetch or create DeepReport cache
    const existingReport = await prisma.deepReport.findUnique({
      where: { compatId }
    });

    if (existingReport) {
      return NextResponse.json(existingReport.content, { status: 200 });
    }

    // 3. Generate new DeepReport
    const compat = await prisma.compatibility.findUnique({
      where: { id: compatId }
    });

    if (!compat) {
      return NextResponse.json({ error: "Compatibility record not found" }, { status: 404 });
    }

    const toneGuide = LOCALE_CONFIG[locale]?.toneGuide || LOCALE_CONFIG["ko"].toneGuide;
    
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

    const prompt = buildCompatPrompt(true, contextBlock, toneGuide);

    // Call Gemini
    let modelName = PREMIUM_MODELS[0];
    let resultText = "";
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      resultText = await result.response.text();
    } catch (e) {
      console.error(`Failed with ${modelName}, trying fallback`, e);
      modelName = PREMIUM_MODELS[1] || PREMIUM_MODELS[0];
      const fallbackModel = genAI.getGenerativeModel({ model: modelName });
      const fallbackResult = await fallbackModel.generateContent(prompt);
      resultText = await fallbackResult.response.text();
    }

    // Repair and Parse JSON
    const parsedJson = repairJSON(resultText);
    if (!parsedJson) {
      console.error("Failed to parse JSON from AI response:", resultText);
      return NextResponse.json({ error: "Failed to generate valid deep report JSON" }, { status: 500 });
    }

    // 4. Save to DeepReport cache
    await prisma.deepReport.create({
      data: {
        compatId,
        content: parsedJson as any
      }
    });

    return NextResponse.json(parsedJson, { status: 200 });

  } catch (error) {
    console.error("[deep-report] Error:", error);
    return NextResponse.json({ error: "Failed to generate deep report" }, { status: 500 });
  }
}
