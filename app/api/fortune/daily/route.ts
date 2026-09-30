import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { logGeneration, errorCode } from "@/lib/reports/genLog";
import {
  genAI,
  PREMIUM_MODELS,
  LOCALE_CONFIG,
  sajuContextBlock,
  buildDailyFortunePrompt,
  calculateDailyScore,
  repairJSON,
  DailyFortuneContent,
} from "@/lib/destinyGen";
import { Prisma } from "@prisma/client";

type GenResult = { response?: { candidates?: Array<{ finishReason?: string }> } };

function getTodayKSTStr(): string {
  const now = new Date();
  // 한국 표준시 (UTC+9) 기준 날짜 문자열 산출
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0]; // YYYY-MM-DD
}

export async function POST(req: Request) {
  const tStart = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다.", locked: true },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    // 1. 오늘의 운세는 로그인 회원 누구나(사주 정보 저장 필요). 예전에는 30일 패스 전용이었다.
    //    비용: 회원·날짜별 1회 생성 후 userDailyFortune 에 저장해 재사용한다.

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const locale = body.locale || "ko";
    const todayStr = body.date || getTodayKSTStr();

    // 2. 1일 1회 캐시 확인 (userId, date)
    const existing = await prisma.userDailyFortune.findUnique({
      where: {
        userId_date: {
          userId,
          date: todayStr,
        },
      },
    });

    if (existing) {
      console.log(`[daily-timing] cache=hit userId=${userId} date=${todayStr}`);
      void logGeneration({ catalogId: "daily", kind: "DAILY", ok: true, cached: true });
      return NextResponse.json({
        success: true,
        data: existing.content,
      });
    }

    // 3. 유저 사주 프로필 확인
    const userProfile = await prisma.userSajuProfile.findUnique({
      where: { userId },
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: "사주 프로필이 없습니다. 프로필을 먼저 등록해주세요.", needProfile: true },
        { status: 400 }
      );
    }

    // 4. 컨텍스트 구성
    let dictionaryContext = "";
    if (userProfile.dayMaster) {
      try {
        const dictRow = await prisma.sajuContentDictionary.findFirst({
          where: { signKey: userProfile.dayMaster },
        });
        if (dictRow) {
          dictionaryContext = dictRow.englishContent;
        }
      } catch {
        // fallback
      }
    }

    const contextBlock = sajuContextBlock({
      name: userProfile.name || "사용자",
      gender: userProfile.gender,
      dayMaster: userProfile.dayMaster,
      fourPillars: userProfile.fourPillars as any,
      elementsScore: userProfile.elementsScore as any,
      dictionaryContext,
    });

    // 5. 결정론적 데일리 점수 산출
    const fixedScore = calculateDailyScore({
      date: todayStr,
      dayMaster: userProfile.dayMaster,
      elementsScore: userProfile.elementsScore as Record<string, number>,
    });

    // 6. Gemini 초경량 조언 생성 (thinkingBudget: 0, maxOutputTokens: 768)
    const toneGuide = LOCALE_CONFIG[locale]?.toneGuide || LOCALE_CONFIG["ko"].toneGuide;
    const prompt = buildDailyFortunePrompt(contextBlock, todayStr, toneGuide);

    const t0 = Date.now();
    let modelName = PREMIUM_MODELS[0];
    let resultText = "";
    let lastResult: GenResult | null = null;
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        } as any,
      });
      lastResult = result;
      resultText = result.response.text();
    } catch (primaryErr) {
      console.warn(`[daily-fortune] Model ${modelName} failed, fallback to ${PREMIUM_MODELS[1]}:`, primaryErr);
      modelName = PREMIUM_MODELS[1] || PREMIUM_MODELS[0];
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        } as any,
      });
      lastResult = result;
      resultText = result.response.text();
    }

    const tGen = Date.now();
    console.log(`[daily-timing] cache=miss genMs=${tGen - t0} model=${modelName}`);

    const jsonResult = repairJSON(resultText) as DailyFortuneContent | null;
    if (!jsonResult) {
      const fr = lastResult?.response?.candidates?.[0]?.finishReason;
      console.error(`[daily parse-fail] finishReason=${fr} textLen=${resultText?.length ?? 0}`);
      throw new Error("Failed to parse DailyFortuneContent JSON");
    }

    // 결정론적 점수 주입
    jsonResult.dayScore = fixedScore;

    // 7. DB 캐시 저장 — 같은 회원의 동시 요청이면 먼저 저장된 것을 돌려준다
    try {
      const saved = await prisma.userDailyFortune.create({
        data: {
          userId,
          date: todayStr,
          content: jsonResult as any,
        },
      });
      void logGeneration({ catalogId: "daily", kind: "DAILY", ok: true, ms: Date.now() - tStart });
      return NextResponse.json({ success: true, data: saved.content });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      const row = await prisma.userDailyFortune.findUnique({
        where: { userId_date: { userId, date: todayStr } },
      });
      return NextResponse.json({ success: true, data: row?.content ?? jsonResult });
    }
  } catch (error: any) {
    console.error("[daily-fortune POST] Error:", error);
    void logGeneration({ catalogId: "daily", kind: "DAILY", ok: false, ms: Date.now() - tStart, error: errorCode(error) });
    return NextResponse.json(
      { error: "오늘의 데일리 운세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
