import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const LOCALE_CONFIG: Record<string, string> = {
  ko: "Korean", en: "English", ja: "Japanese",
  es: "Spanish", de: "German", fr: "French",
};

export async function GET(req: NextRequest) {
  try {
    const dayMasterKey = req.nextUrl.searchParams.get("dayMasterKey") || "WOOD_YANG";
    const locale = req.nextUrl.searchParams.get("locale") || "en";
    const today = new Date().toISOString().slice(0, 10);

    const cached = await prisma.dailyFortune.findUnique({
      where: { dayMasterKey_locale_date: { dayMasterKey, locale, date: today } },
    });

    if (cached) {
      return NextResponse.json({
        summary: cached.summary, fullContent: cached.fullContent,
        luckyColor: cached.luckyColor, luckyNumber: cached.luckyNumber,
        luckyDir: cached.luckyDir, date: today, cached: true,
      });
    }

    if (!apiKey) return NextResponse.json({ error: "AI config error" }, { status: 500 });

    const lang = LOCALE_CONFIG[locale] || "English";
    const prompt = `You are a mystical Saju fortune-teller. Write in ${lang}. Today: ${today}. Day Master: ${dayMasterKey}.
Return JSON: {"summary":"one sentence","fullContent":"3 paragraphs","luckyColor":"color","luckyNumber":"number","luckyDir":"direction"}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0.7, maxOutputTokens: 2048 },
    });

    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());

    if (!data.summary || !data.fullContent) throw new Error("Invalid fortune data");

    await prisma.dailyFortune.create({
      data: { dayMasterKey, locale, date: today, summary: data.summary, fullContent: data.fullContent,
        luckyColor: data.luckyColor || null, luckyNumber: data.luckyNumber || null, luckyDir: data.luckyDir || null },
    });

    return NextResponse.json({ ...data, date: today, cached: false });
  } catch (error: any) {
    console.error("[Daily Fortune]", error);
    return NextResponse.json({ error: "Failed to generate daily fortune" }, { status: 500 });
  }
}
