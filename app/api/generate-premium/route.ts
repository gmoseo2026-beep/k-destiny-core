import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const REPORT_PROMPTS: Record<string, { systemContext: string; task: string }> = {
  karma: {
    systemContext: "You are a premium Eastern Saju master specializing in monthly karmic energy analysis.",
    task: "Generate a deeply personalized Monthly Karma Report. Analyze the user's elemental energy flow for the current month, identify lucky days aligned with their personal resonance, and provide specific cosmic warnings. Include actionable remedies based on their Day Master and element balance.",
  },
  remedy: {
    systemContext: "You are a premium Eastern Saju master specializing in daily cosmic alignment and practical life coaching through elemental energy.",
    task: "Generate a personalized Daily Remedy Coaching guide. Provide a cosmic weather analysis for today based on the user's birth chart, a daily priority matrix (career, creative windows, relationships), manifestation rituals aligned with their dominant elements, and specific energies to avoid.",
  },
  "fortune-2027": {
    systemContext: "You are a premium Eastern Saju master specializing in long-term fortune prediction and yearly cosmic cycle analysis.",
    task: "Generate a deeply personalized 2027 Fortune Prediction. Analyze each quarter (Q1-Q4) of 2027 based on the user's birth chart and Day Master. Include the year's overarching theme, turning points, breakthrough opportunities, financial windows, relationship shifts, and health warnings specific to their elemental constitution.",
  },
};

const LOCALE_CONFIG: Record<string, { name: string; toneGuide: string }> = {
  ko: { name: "Korean (한국어)", toneGuide: "자연스러운 한국어 문어체 존댓말을 사용하세요. 어두운 다크 판타지 톤과 시적 표현을 곁들이세요." },
  en: { name: "English", toneGuide: "Write in a dark-fantasy, premium, mystical English tone." },
  es: { name: "Spanish (Español)", toneGuide: "Escribe en un español elegante y místico." },
  de: { name: "German (Deutsch)", toneGuide: "Schreibe in einem eleganten, mystischen Deutsch." },
  fr: { name: "French (Français)", toneGuide: "Écrivez en français élégant et mystique." },
  ja: { name: "Japanese (日本語)", toneGuide: "自然な日本語の丁寧語で書いてください。ダークファンタジーの雰囲気を出してください。" },
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reportType, locale } = body;

    if (!reportType || !REPORT_PROMPTS[reportType]) {
      return NextResponse.json(
        { error: "Invalid reportType. Must be 'karma', 'remedy', or 'fortune-2027'." },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json({ error: "AI configuration error" }, { status: 500 });
    }

    // Fetch user's Saju data from DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { profiles: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify premium access
    if (user.tier !== "PREMIUM" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Premium access required" }, { status: 403 });
    }

    const sajuProfile = user.profiles[0];
    if (!sajuProfile) {
      return NextResponse.json({ error: "Saju profile not found. Please enter your birth data first." }, { status: 404 });
    }

    const fourPillars = sajuProfile.fourPillars as Record<string, string>;
    const elementsScore = sajuProfile.elementsScore as Record<string, number>;
    const localeKey = locale || "ko";
    const config = LOCALE_CONFIG[localeKey] || LOCALE_CONFIG.en;
    const prompt = REPORT_PROMPTS[reportType];

    const fullPrompt = `${prompt.systemContext}

RULES:
- Write ENTIRELY in ${config.name}. ${config.toneGuide}
- Write exactly 3 paragraphs. Each paragraph should be 3-5 sentences.
- Make the analysis deeply personal based on the provided Saju data.
- Do NOT mention any technical terms like "Four Pillars" or "Day Master" — just deliver the mystic reading naturally.
- Use vivid, poetic dark-fantasy imagery throughout.

CLIENT SAJU DATA (DO NOT EXPOSE RAW DATA, ONLY USE FOR ANALYSIS):
- Name: ${user.name || "Seeker"}
- Day Master (Core Self): ${sajuProfile.dayMaster}
- Four Pillars: Year=${fourPillars.year || "Unknown"}, Month=${fourPillars.month || "Unknown"}, Day=${fourPillars.day || "Unknown"}, Time=${fourPillars.time || "Unknown"}
- Five Elements Score: ${JSON.stringify(elementsScore)}
- Gender: ${sajuProfile.gender}

TASK: ${prompt.task}

Return ONLY the 3-paragraph report text as a plain string. No JSON, no markdown headers, no bullet points — just 3 beautiful paragraphs separated by double newlines.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 4096,
      },
    });

    const result = await Promise.race([
      model.generateContent(fullPrompt),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("AI generation timed out (55s)")), 55000)
      ),
    ]);

    const reportText = result.response.text().trim();

    if (!reportText || reportText.length < 100) {
      throw new Error("AI returned insufficient content");
    }

    console.log(`[Premium AI] Generated ${reportType} report for user:${user.id} (${reportText.length} chars)`);

    return NextResponse.json({ report: reportText }, { status: 200 });
  } catch (error: any) {
    console.error("[Premium AI] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate premium report" },
      { status: 500 }
    );
  }
}
