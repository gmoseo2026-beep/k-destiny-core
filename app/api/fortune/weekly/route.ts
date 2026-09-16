import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { 
  genAI, 
  PREMIUM_MODELS, 
  LOCALE_CONFIG, 
  sajuContextBlock, 
  compatContextBlock, 
  buildWeeklyFortunePrompt, 
  repairJSON 
} from "@/lib/destinyGen";

function getCurrentMondayStr() {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Check entitlement (using PREMIUM or active subscription bypass for MVP)
    // We will bypass entitlement check strictly for Admin, or assume they have access 
    // since we're in the MVP testing phase. We could check isEntitled here.

    const body = await req.json();
    const { targetCompatId, locale = "ko" } = body;

    const weekStartDate = getCurrentMondayStr();

    // 1. Check if we already generated it
    const existing = await prisma.weeklyFortune.findFirst({
      where: {
        userId,
        weekStartDate,
        targetCompatId: targetCompatId || null
      }
    });

    if (existing) {
      console.log(`[weekly-timing] cache=hit genMs=0 dbMs=0 model=cache`);
      return NextResponse.json({ success: true, data: existing.content });
    }

    // 2. Fetch User Profile
    const userProfile = await prisma.userSajuProfile.findUnique({
      where: { userId }
    });

    if (!userProfile) {
      return NextResponse.json({ error: "사주 프로필이 없습니다. 온보딩을 먼저 완료해주세요." }, { status: 400 });
    }

    let contextBlock = "";
    let isCouple = false;

    // 3. Build Context Block
    if (targetCompatId) {
      // Couple fortune
      const compat = await prisma.compatibility.findUnique({
        where: { id: targetCompatId }
      });
      if (!compat) {
        return NextResponse.json({ error: "궁합 정보를 찾을 수 없습니다." }, { status: 404 });
      }

      const pA = compat.personA as any;
      const pB = compat.personB as any;
      
      const compatResult = {
        score: compat.score,
        keywords: (compat.breakdown as any)?.coreKeywords || [],
        breakdown: compat.breakdown as Record<string, number>
      };

      contextBlock = compatContextBlock({
        personA: { name: pA.name, gender: pA.gender, dayMaster: pA.dayMaster, elementsScore: pA.elementsScore },
        personB: { name: pB.name, gender: pB.gender, dayMaster: pB.dayMaster, elementsScore: pB.elementsScore },
        relation: compat.relation,
        compatResult
      });
      isCouple = true;

    } else {
      // Personal fortune
      let dictionaryContext = "";
      if (userProfile.dayMaster) {
        const dictRow = await prisma.sajuContentDictionary.findFirst({
          where: { signKey: userProfile.dayMaster }
        });
        if (dictRow) {
          dictionaryContext = dictRow.englishContent;
        }
      }
      
      contextBlock = sajuContextBlock({
        name: userProfile.name || "사용자",
        gender: userProfile.gender,
        dayMaster: userProfile.dayMaster,
        fourPillars: userProfile.fourPillars as any,
        elementsScore: userProfile.elementsScore as any,
        dictionaryContext
      });
    }

    // Add week context
    contextBlock += `\nCURRENT WEEK: ${weekStartDate} (Monday) ~ +6 days\n`;

    // 4. Generate with Gemini
    const t0 = Date.now();
    const toneGuide = LOCALE_CONFIG[locale]?.toneGuide || LOCALE_CONFIG["ko"].toneGuide;
    const prompt = buildWeeklyFortunePrompt(contextBlock, isCouple, toneGuide);

    const model = genAI.getGenerativeModel({ model: PREMIUM_MODELS[0] });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 2048 }
    });

    const tGen = Date.now();
    const text = result.response.text();
    const jsonResult = repairJSON(text);

    if (!jsonResult) {
      throw new Error("Failed to parse AI response as JSON");
    }

    // 5. Save to DB
    const tDb0 = Date.now();
    const weeklyFortune = await prisma.weeklyFortune.create({
      data: {
        userId,
        weekStartDate,
        targetCompatId: targetCompatId || null,
        content: jsonResult as any
      }
    });
    const tDone = Date.now();
    console.log(`[weekly-timing] cache=miss genMs=${tGen - t0} dbMs=${tDone - tDb0} model=${PREMIUM_MODELS[0]}`);

    return NextResponse.json({ success: true, data: weeklyFortune.content });
  } catch (error: any) {
    console.error("Weekly Fortune API Error:", error);
    return NextResponse.json(
      { error: "이번주 운세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
