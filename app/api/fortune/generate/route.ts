import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { getProduct } from "@/lib/catalog";
import {
  genAI,
  PREMIUM_MODELS,
  LOCALE_CONFIG,
  sajuContextBlock,
  compatContextBlock,
  buildGenericFortunePrompt,
  buildGenericCompatPrompt,
  calculateGenericScore,
  calculateGenericCompatScore,
  repairJSON
} from "@/lib/destinyGen";
import { isEntitled } from "@/lib/entitlement";
import { calculateFourPillars } from "@/lib/saju";
import { getClientIp, checkChatRateLimit } from "@/lib/rateLimiter";
import crypto from "crypto";

type GenResult = { response?: { candidates?: Array<{ finishReason?: string }> } };

function hashObject(obj: any): string {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 16);
}

export async function POST(req: Request) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      session = null;
    }
    const userId = session?.user?.id;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { productId, compatId, orderId, locale = "ko" } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId가 필요합니다." }, { status: 400 });
    }

    const product = getProduct(productId);
    if (!product) {
      return NextResponse.json({ error: "유효하지 않은 상품입니다." }, { status: 400 });
    }

    // Rate Limiting
    const clientIp = getClientIp(req);
    const rateCheck = await checkChatRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }

    // 1. Entitlement Verification
    let entitlementProductKey = productId;
    if (productId.startsWith("annual_")) {
      const yearStr = productId.split("_")[1];
      entitlementProductKey = `ANNUAL:${yearStr}`;
    }

    const entitlement = await isEntitled({
      userId: userId || null,
      orderId: orderId || null,
      productKey: entitlementProductKey,
      compatId: compatId || null,
    });

    const isTeaser = !entitlement.entitled;

    // 2. Data Preparation & Hash Calculation
    let inputHash = "";
    let contextBlock = "";
    let score = 0;
    
    // For single products
    if (product.type === "FORTUNE") {
      let dob = body.dob;
      if (!dob && body.birthYear && body.birthMonth && body.birthDay) {
        dob = `${String(body.birthYear).padStart(4, "0")}-${String(body.birthMonth).padStart(2, "0")}-${String(body.birthDay).padStart(2, "0")}`;
      }
      const gender = body.gender;
      const time = body.time || body.birthTime || null;
      const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 20) : "나";

      if (!dob || !gender) {
        if (userId) {
          const profile = await prisma.userSajuProfile.findUnique({ where: { userId } });
          if (!profile) return NextResponse.json({ error: "생년월일 및 성별 정보가 필요합니다." }, { status: 400 });
          return NextResponse.json({ error: "사주 정보(dob, gender)를 요청에 포함해야 합니다." }, { status: 400 });
        } else {
          return NextResponse.json({ error: "생년월일 및 성별 정보가 필요합니다." }, { status: 400 });
        }
      }

      inputHash = hashObject({ dob, time, gender });
      const saju = calculateFourPillars(dob, time, gender, "Seoul, KR");

      let dictionaryContext = "";
      if (saju.dayMasterSignKey) {
        try {
          const dictRow = await prisma.sajuContentDictionary.findFirst({
            where: { signKey: saju.dayMasterSignKey },
          });
          if (dictRow) dictionaryContext = dictRow.englishContent;
        } catch {}
      }

      contextBlock = sajuContextBlock({
        name,
        gender,
        dayMaster: saju.dayMasterSignKey,
        fourPillars: saju.fourPillars as any,
        elementsScore: saju.elementsScore as any,
        dictionaryContext,
      });

      if (productId.startsWith("annual_")) {
        const year = parseInt(productId.split("_")[1], 10);
        contextBlock += `\nTARGET YEAR: ${year}\n`;
      }

      score = calculateGenericScore({
        productKey: productId,
        dayMaster: saju.dayMasterSignKey,
        fourPillars: saju.fourPillars as any,
        elementsScore: saju.elementsScore as any,
      });

    } else if (product.type === "COMPAT") {
      if (!compatId) {
        return NextResponse.json({ error: "compatId가 필요합니다." }, { status: 400 });
      }

      const compatRow = await prisma.compatibility.findUnique({ where: { id: compatId } });
      if (!compatRow) {
        return NextResponse.json({ error: "존재하지 않는 궁합 정보입니다." }, { status: 404 });
      }

      const personA = compatRow.personA as any;
      const personB = compatRow.personB as any;
      inputHash = hashObject({ compatId, personA: personA.dob, personB: personB.dob });

      contextBlock = compatContextBlock({
        personA,
        personB,
        relation: compatRow.relation,
        compatResult: {
          score: compatRow.score,
          keywords: compatRow.keywords,
          breakdown: compatRow.breakdown as Record<string, number>
        }
      });

      score = calculateGenericCompatScore({
        productKey: productId,
        personADayMaster: personA.dayMaster,
        personBDayMaster: personB.dayMaster,
      });

    } else {
      // SET 상품은 단일 엔드포인트에서 생성하지 않거나, 프론트에서 개별 호출함
      return NextResponse.json({ error: "세트 상품은 개별 단품 API를 호출해야 합니다." }, { status: 400 });
    }

    // 3. Cache Check
    const cached = await prisma.reportCache.findFirst({
      where: {
        productKey: productId,
        inputHash,
        isTeaser
      }
    });

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached.content,
        locked: isTeaser,
        isGuest: !userId,
        cached: true,
      });
    }

    // 4. Prompt Generation & AI Call
    const toneGuide = LOCALE_CONFIG[locale]?.toneGuide || LOCALE_CONFIG["ko"].toneGuide;
    let prompt = "";

    if (product.type === "FORTUNE") {
      prompt = buildGenericFortunePrompt(contextBlock, product.promptKey, isTeaser, toneGuide);
    } else {
      prompt = buildGenericCompatPrompt(contextBlock, product.promptKey, isTeaser, toneGuide);
    }

    let modelName = PREMIUM_MODELS[0];
    let resultText = "";
    let lastResult: GenResult | null = null;
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 1536, thinkingConfig: { thinkingBudget: 0 } } as any,
      });
      lastResult = result;
      resultText = result.response.text();
    } catch (primaryErr) {
      console.warn(`[generic-gen] Primary model ${modelName} failed, falling back:`, primaryErr);
      modelName = PREMIUM_MODELS[1];
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 1536, thinkingConfig: { thinkingBudget: 0 } } as any,
      });
      lastResult = result;
      resultText = result.response.text();
    }

    const jsonResult = repairJSON(resultText) as any;
    if (!jsonResult) {
      throw new Error("Failed to parse AI response as valid JSON");
    }

    // 덮어쓰기: 생성된 JSON에 우리가 계산한 결정론적 점수를 강제 주입
    jsonResult.score = score;

    // 5. Store Cache
    await prisma.reportCache.create({
      data: {
        userId: userId || null,
        orderId: orderId || null,
        productKey: productId,
        compatId: compatId || null,
        inputHash,
        content: jsonResult,
        isTeaser
      }
    });

    return NextResponse.json({
      success: true,
      data: jsonResult,
      locked: isTeaser,
      isGuest: !userId,
      cached: false,
    });

  } catch (error: any) {
    console.error("[generate-route error]", error);
    return NextResponse.json(
      { error: "결과 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
