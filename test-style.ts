import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import { STYLE_GUIDE } from './lib/destinyGen';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const modelName = "gemini-2.5-flash"; // testing the priority model
const config = { name: "Korean (한국어)", toneGuide: "자연스러운 한국어 존댓말로, 친한 사람에게 조용히 이야기하듯 쉽고 또렷하게 쓰세요. 신비롭되 과하지 않게 — 시적 미사여구보다 구체적인 장면과 진심이 느껴지도록." };
const displayName = "서민오";

async function run() {
  console.log("=== 1. CHAT TEST (5 TIMES) ===");
  const chatPrompt = `You are "Master Karma", a deeply insightful and slightly edgy Eastern Saju master.
${STYLE_GUIDE}
RULES:
- Language: MUST reply entirely in ${config.name}.
- Tone: ${config.toneGuide}
- Persona: Sharp, witty, and grounded. No warm-up, no robotic "Hello, I am an AI." Start immediately with a vivid insight.
- Length: Keep it conversational and punchy (1-3 short paragraphs max).
- If the user asks about their destiny, reference their Saju Data to give a concrete, specific answer.
CLIENT SAJU DATA: Name=${displayName}, Day Master=WOOD_YANG, Score={"wood": 20, "fire": 30, "earth": 20, "metal": 10, "water": 20}
USER MESSAGE: 오늘 운세 말해줘`;

  const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.85, maxOutputTokens: 8192 } });
  
  for (let i = 1; i <= 5; i++) {
    try {
      const res = await model.generateContent(chatPrompt);
      const text = res.response.text();
      console.log(`[Chat ${i}] OK. Length: ${text.length}. Content: ${text.slice(0, 100).replace(/\n/g, " ")}...`);
      if (text.includes("우주의 기운") || text.match(/[一-龥]/)) {
         console.warn(`[Chat ${i}] WARNING: Found hanja or banned phrase!`);
      }
    } catch(e: any) {
      console.error(`[Chat ${i}] FAILED:`, e.message);
    }
  }

  console.log("\n=== 2. FREE '타고난 기운' TEST ===");
  const freeTask = "Analyze the user's Core Essence (Day Master). Who are they at their core? What is their hidden strength and fatal flaw?";
  const freePrompt = `You are a premium Eastern Saju master.
${STYLE_GUIDE}
RULES:
- Write ENTIRELY in ${config.name}. ${config.toneGuide}
- Write exactly 4 short paragraphs.
- Keep it under 600 characters but DO NOT end mid-sentence.
CLIENT SAJU DATA: Name=${displayName}, Day Master=WOOD_YANG, Score={"wood": 20, "fire": 30, "earth": 20, "metal": 10, "water": 20}, Gender=Male
TASK: ${freeTask}`;
  
  const freeRes = await model.generateContent(freePrompt);
  const freeText = freeRes.response.text();
  console.log(freeText);
  console.log(`(Length: ${freeText.length})`);
  if (freeText.includes("우주의 기운") || freeText.match(/[一-龥]/)) console.warn("WARNING: Found hanja or banned phrase!");

  console.log("\n=== 3. PREMIUM KARMA REPORT TEST ===");
  const premiumPrompt = `You are a premium Eastern Saju master specializing in monthly karmic energy analysis.
${STYLE_GUIDE}
RULES:
- Write ENTIRELY in ${config.name}. ${config.toneGuide}
- Write 5 to 6 RICH paragraphs, each 3-4 sentences. This is a paid premium report — it must feel deep, specific, and complete, never thin or cut off.
- MANDATORY LENGTH: at least 1200 Korean characters. Fully complete every paragraph; the final paragraph must reach a clear, satisfying conclusion. NEVER end mid-sentence.
CLIENT SAJU DATA: Name=${displayName}, Day Master=WOOD_YANG, Score={"wood": 20, "fire": 30, "earth": 20, "metal": 10, "water": 20}, Gender=Male
TASK: Generate a deeply personalized Monthly Karma Report.`;
  
  const premiumRes = await model.generateContent(premiumPrompt);
  const premiumText = premiumRes.response.text();
  console.log(premiumText.slice(0, 300) + "...\n...");
  console.log(premiumText.slice(-300));
  console.log(`(Length: ${premiumText.length})`);
  if (premiumText.includes("우주의 기운") || premiumText.match(/[一-龥]/)) console.warn("WARNING: Found hanja or banned phrase!");
  if (premiumText.includes("서민오 님") || premiumText.includes("서민오님")) console.log("Greeting Check: PASS");
}

run();
