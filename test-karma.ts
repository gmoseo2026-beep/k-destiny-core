import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  const modelName = "gemini-2.5-flash";
  const promptContext = "You are a premium Eastern Saju master specializing in monthly karmic energy analysis.";
  const promptTask = "Generate a deeply personalized Monthly Karma Report. Analyze the user's elemental energy flow for the current month, identify lucky days aligned with their personal resonance, and provide specific cosmic warnings. Include actionable remedies based on their Day Master and element balance.";
  
  const config = { name: "Korean (한국어)", toneGuide: "자연스러운 한국어 문어체 존댓말을 사용하세요. 어두운 다크 판타지 톤과 시적 표현을 곁들이세요." };
  const displayName = "서민오";
  
  const fullPrompt = `${promptContext}

RULES:
- Write ENTIRELY in ${config.name}. ${config.toneGuide}
- Write 6 to 8 RICH paragraphs, each 5-7 sentences. This is a paid premium report — it must feel deep, specific, and complete, never thin or cut off.
- MANDATORY LENGTH: at least 1200 Korean characters (or 1800 English characters). Fully complete every paragraph; the final paragraph must reach a clear, satisfying conclusion. NEVER end mid-sentence.
- Cover every dimension the task asks for; if it names quarters or periods, give each its own developed paragraph with concrete timing, opportunities, and cautions.
- Make the analysis deeply personal based on the provided Saju data.
- Do NOT mention any technical terms like "Four Pillars" or "Day Master" — just deliver the mystic reading naturally.
- Use vivid, poetic dark-fantasy imagery throughout.

CLIENT SAJU DATA (DO NOT EXPOSE RAW DATA, ONLY USE FOR ANALYSIS):
- Name: ${displayName}
- Day Master (Core Self): WOOD_YANG
- Four Pillars: Year=FIRE_YANG, Month=EARTH_YIN, Day=WOOD_YANG, Time=WATER_YIN
- Five Elements Score: {"wood": 20, "fire": 30, "earth": 20, "metal": 10, "water": 20}
- Gender: Male

TASK: ${promptTask}

Return ONLY the report text as a plain string. No JSON, no markdown headers, no bullet points — just 5-6 beautiful paragraphs separated by double newlines.`;

  console.log("Generating Premium Karma Report...");
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 8192,
    },
  });

  try {
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();
    console.log("================================");
    console.log(text);
    console.log("================================");
    console.log("[Length Check]:", text.length);
    console.log("[Ending punctuation]:", text.slice(-5));
  } catch(e) {
    console.error(e);
  }
}

run();
