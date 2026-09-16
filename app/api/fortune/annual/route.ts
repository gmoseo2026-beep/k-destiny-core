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
import { calculateFourPillars } from "@/lib/saju";
import { getClientIp, checkChatRateLimit } from "@/lib/rateLimiter";

// 생년월일(YYYY-MM-DD) 유효성 및 미래 날짜 검증
function isValidDateString(dob: unknown): boolean {
  if (typeof dob !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const [yearStr, monthStr, dayStr] = dob.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (date > todayUTC) {
    return false; // 미래 날짜 거부
  }

  return true;
}

// 시간(HH:mm) 유효성 검증 (선택값)
function isValidTimeString(time: unknown): boolean {
  if (time === null || time === undefined || time === "") return true;
  if (typeof time !== "string") return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
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

    // ─────────────────────────────────────────────────────────────
    // A. 비회원 (Guest) 경로: 생년월일만으로 즉석 무료 맛보기(점수+연애운 1개)
    //    - DB 저장 및 계정 귀속 금지 (인메모리 계산)
    //    - 유료 4개 영역, 12개월 타임라인, 행운포인트 서버 원천 삭제
    // ─────────────────────────────────────────────────────────────
    if (!userId) {
      const clientIp = getClientIp(req);
      const rateCheck = await checkChatRateLimit(clientIp);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
          { status: 429 }
        );
      }

      let dob = body.dob;
      if (!dob && body.birthYear && body.birthMonth && body.birthDay) {
        dob = `${String(body.birthYear).padStart(4, "0")}-${String(body.birthMonth).padStart(2, "0")}-${String(body.birthDay).padStart(2, "0")}`;
      }
      const gender = body.gender;
      const time = body.time || body.birthTime || null;
      const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 20) : "나";

      if (!isValidDateString(dob)) {
        return NextResponse.json(
          { error: "올바른 생년월일(1900년 이후 및 현재 이전의 유효한 날짜)을 입력해주세요." },
          { status: 400 }
        );
      }

      if (gender !== "M" && gender !== "F") {
        return NextResponse.json(
          { error: "성별은 'M' 또는 'F'여야 합니다." },
          { status: 400 }
        );
      }

      if (!isValidTimeString(time)) {
        return NextResponse.json(
          { error: "출생 시간은 HH:mm 형식이어야 합니다." },
          { status: 400 }
        );
      }

      // 1) 결정론적 1인 사주 명식 계산 (궁합에서 검증된 lib/saju.ts 재사용)
      const saju = calculateFourPillars(dob, time || null, gender, "Seoul, KR");

      // 2) SajuContentDictionary 컨텍스트 조회
      let dictionaryContext = "";
      if (saju.dayMasterSignKey) {
        try {
          const dictRow = await prisma.sajuContentDictionary.findFirst({
            where: { signKey: saju.dayMasterSignKey },
          });
          if (dictRow) {
            dictionaryContext = dictRow.englishContent;
          }
        } catch {
          // DB 미연결 또는 장애 시 sajuContextBlock 기본 폴백 적용
        }
      }

      // 3) 프롬프트 컨텍스트 구성
      let contextBlock = sajuContextBlock({
        name,
        gender,
        dayMaster: saju.dayMasterSignKey,
        fourPillars: saju.fourPillars as any,
        elementsScore: saju.elementsScore as any,
        dictionaryContext,
      });
      contextBlock += `\nTARGET YEAR: ${year} (2026년 병오년 - 붉은 말의 해)\n`;

      // 4) Gemini 모델 생성
      const toneGuide = LOCALE_CONFIG[locale]?.toneGuide || LOCALE_CONFIG["ko"].toneGuide;
      const prompt = buildAnnualFortunePrompt(contextBlock, year, toneGuide);

      let modelName = PREMIUM_MODELS[0];
      let resultText = "";
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, topP: 0.9, topK: 40 },
        });
        resultText = result.response.text();
      } catch (primaryErr) {
        console.warn(`[annual-fortune guest] Primary model ${modelName} failed, falling back to ${PREMIUM_MODELS[1]}:`, primaryErr);
        modelName = PREMIUM_MODELS[1];
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, topP: 0.9, topK: 40 },
        });
        resultText = result.response.text();
      }

      const jsonResult = repairJSON(resultText) as AnnualFortuneContent | null;
      if (!jsonResult || typeof jsonResult.yearScore !== "number") {
        throw new Error("Failed to parse AI response as valid AnnualFortuneContent JSON");
      }

      // 5) 엄격한 서버 리댁션 (맛보기: yearScore, headline, summary, sections.love 만 반환)
      //    나머지 4개 영역(money, career, health, relationship), 12개월, 행운포인트 원천 미포함
      //    DB 저장 일체 없음 (비회원 PII 미저장)
      return NextResponse.json({
        success: true,
        data: {
          yearScore: jsonResult.yearScore,
          headline: jsonResult.headline,
          summary: jsonResult.summary,
          sections: jsonResult.sections?.love
            ? { love: jsonResult.sections.love }
            : undefined,
          locked: true,
        },
        locked: true,
        isGuest: true,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // B. 회원 경로 (기존 로그인 플로우 100% 보존)
    // ─────────────────────────────────────────────────────────────
    // 1. Fetch User Saju Profile
    let userProfile = await prisma.userSajuProfile.findUnique({
      where: { userId }
    });

    if (!userProfile) {
      // 바디에 생년월일 정보가 포함되어 있는 경우 온보딩 프로필 즉시 생성 연동
      let dob = body.dob;
      if (!dob && body.birthYear && body.birthMonth && body.birthDay) {
        dob = `${String(body.birthYear).padStart(4, "0")}-${String(body.birthMonth).padStart(2, "0")}-${String(body.birthDay).padStart(2, "0")}`;
      }
      const gender = body.gender;
      const time = body.time || body.birthTime || null;
      const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 20) : "사용자";

      if (isValidDateString(dob) && (gender === "M" || gender === "F") && isValidTimeString(time)) {
        const [bY, bM, bD] = dob.split("-").map(Number);
        const sajuResult = calculateFourPillars(dob, time, gender, "Seoul, KR");
        userProfile = await prisma.userSajuProfile.create({
          data: {
            userId,
            name,
            gender,
            birthYear: bY,
            birthMonth: bM,
            birthDay: bD,
            birthTime: time,
            unknownTime: !time,
            country: "Korea",
            city: "Seoul",
            fourPillars: sajuResult.fourPillars,
            dayMaster: sajuResult.dayMasterSignKey,
            elementsScore: sajuResult.elementsScore,
            birthHash: Buffer.from(`${dob}-${time}-${gender}`).toString("base64"),
          }
        });
      } else {
        return NextResponse.json(
          { error: "사주 프로필이 없습니다. 온보딩을 먼저 완료해주세요." },
          { status: 400 }
        );
      }
    }

    // 2. Check entitlement (콩닥 플러스 패스: SUBSCRIPTION / ADMIN, 또는 2026 총운 단건 Unlock)
    const entitlement = await isEntitled({
      userId,
      role: session?.user?.role,
      tier: session?.user?.tier,
      productKey: "ANNUAL:2026",
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
        // Redact paid sections on server: reveal love section as high-converting quality sample (3-A pattern)
        return NextResponse.json({
          success: true,
          data: {
            yearScore: fullContent.yearScore,
            headline: fullContent.headline,
            summary: fullContent.summary,
            sections: fullContent.sections?.love
              ? { love: fullContent.sections.love }
              : undefined,
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
          sections: savedContent.sections?.love
            ? { love: savedContent.sections.love }
            : undefined,
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
