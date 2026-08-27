import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import * as dotenv from 'dotenv';
import { STYLE_GUIDE } from './lib/destinyGen';
dotenv.config({ path: '.env.local' });

const openAIKey = process.env.OPENAI_API_KEY || "";
const openai = new OpenAI({ apiKey: openAIKey });

const config = { name: "Korean (한국어)", toneGuide: "자연스러운 한국어 존댓말로, 친한 사람에게 조용히 이야기하듯 쉽고 또렷하게 쓰세요." };
const displayName = "서민오";

async function run() {
  console.log("=== 1. CHAT TEST (5 TIMES via OpenAI Failover) ===");
  const chatPrompt = `You are "Master Karma", a deeply insightful and slightly edgy Eastern Saju master.
${STYLE_GUIDE}
RULES:
- Language: MUST reply entirely in ${config.name}.
- Tone: ${config.toneGuide}
- Persona: Sharp, witty, and grounded. No warm-up. Start immediately with a vivid insight.
- Length: Keep it conversational and punchy (1-3 short paragraphs max).
CLIENT SAJU DATA: Name=${displayName}, Day Master=WOOD_YANG, Score={"wood": 20, "fire": 30, "earth": 20, "metal": 10, "water": 20}
USER MESSAGE: 오늘 운세 말해줘`;

  for (let i = 1; i <= 5; i++) {
    try {
      // Simulate Gemini failing and falling back to OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: chatPrompt }],
        max_tokens: 1500,
        temperature: 0.85
      });
      const text = response.choices[0].message?.content || "";
      console.log(`[Chat ${i}] ✅ Served by OpenAI backup provider. Length: ${text.length}. Content: ${text.slice(0, 100).replace(/\n/g, " ")}...`);
      if (text.includes("우주의 기운") || text.match(/[一-龥]/)) console.warn(`[Chat ${i}] WARNING: Found hanja or banned phrase!`);
    } catch(e: any) {
      console.error(`[Chat ${i}] FAILED:`, e.message);
    }
  }
}

run();
