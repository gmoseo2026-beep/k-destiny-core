import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import {
  genAI,
  PREMIUM_MODELS,
  LOCALE_CONFIG,
  sajuContextBlock,
  buildAnnualFortunePrompt,
  repairJSON,
  AnnualFortuneContent
} from "@/lib/destinyGen";
import { isEntitled } from "@/lib/entitlement";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Body parsing with default locale
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const locale = body.locale || "ko";

    // Enforce target year as 2026
    const year = 2026;

    // 1. Fetch User Saju Profile
    const userProfile = await prisma.userSajuProfile.findUnique({
      where: { userId }
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: "사주 프로필이 없습니다. 온보딩을 먼저 완료해주세요." },
        { status: 400 }
      );
    }

    // 2. Check entitlement (콩닥 플러스 패스: SUBSCRIPTION / ADMIN)
    const entitlement = await isEntitled({
      userId,
      role: session.user.role,
      tier: session.user.tier,
    });
    const isUnlocked = entitlement.entitled;

    // 3. Check Cache
    const existing = await prisma.annualFortune.findUnique({
      where: {
        userId_year: {
          userId,
          year,
        }
      }
    });

    if (existing) {
      const fullContent = existing.content as unknown as AnnualFortuneContent;
      if (isUnlocked) {
        return NextResponse.json({
          success: true,
          data: { ...fullContent, locked: false },
          locked: false,
        });
      } else {
        // Redact paid sections on server to prevent content leakage
        return NextResponse.json({
          success: true,
          data: {
            yearScore: fullContent.yearScore,
            headline: fullContent.headline,
            summary: fullContent.summary,
            locked: true,
          },
          locked: true,
        });
      }
    }

    // 4. Build Context Block
    let dictionaryContext = "";
    if (userProfile.dayMaster) {
      const dictRow = await prisma.sajuContentDictionary.findFirst({
        where: { signKey: userProfile.dayMaster }
      });
      if (dictRow) {
        dictionaryContext = dictRow.englishContent;
      }
    }

    let contextBlock = sajuContextBlock({
      name: userProfile.name || "사용자",
      gender: userProfile.gender,
      dayMaster: userProfile.dayMaster,
      fourPillars: userProfile.fourPillars as any,
      elementsScore: userProfile.elementsScore as any,
      dictionaryContext,
    });
    contextBlock += `\nTARGET YEAR: ${year} (2026년 병오년 - 붉은 말의 해)\n`;

    // 5. Generate with Gemini
    const toneGuide = LOCALE_CONFIG[locale]?.toneGuide || LOCALE_CONFIG["ko"].toneGuide;
    const prompt = buildAnnualFortunePrompt(contextBlock, year, toneGuide);

    let modelName = PREMIUM_MODELS[0];
    let resultText = "";
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, topP: 0.9, topK: 40 }
      });
      resultText = result.response.text();
    } catch (primaryErr) {
      console.warn(`[annual-fortune] Primary model ${modelName} failed, falling back to ${PREMIUM_MODELS[1]}:`, primaryErr);
      modelName = PREMIUM_MODELS[1];
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, topP: 0.9, topK: 40 }
      });
      resultText = result.response.text();
    }

    const jsonResult = repairJSON(resultText) as AnnualFortuneContent | null;
    if (!jsonResult || typeof jsonResult.yearScore !== "number") {
      throw new Error("Failed to parse AI response as valid AnnualFortuneContent JSON");
    }

    // 6. Save to DB (Full content cached)
    const annualFortune = await prisma.annualFortune.create({
      data: {
        userId,
        year,
        content: jsonResult as any,
      }
    });

    const savedContent = annualFortune.content as unknown as AnnualFortuneContent;

    // 7. Return according to entitlement
    if (isUnlocked) {
      return NextResponse.json({
        success: true,
        data: { ...savedContent, locked: false },
        locked: false,
      });
    } else {
      return NextResponse.json({
        success: true,
        data: {
          yearScore: savedContent.yearScore,
          headline: savedContent.headline,
          summary: savedContent.summary,
          locked: true,
        },
        locked: true,
      });
    }
  } catch (error: any) {
    console.error("[annual-fortune POST] Error:", error);
    return NextResponse.json(
      { error: error?.message || "2026년 총운을 생성하는 중 문제가 발생했습니다." },
      { status: 500 }
    );
  }
}
