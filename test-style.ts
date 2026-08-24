import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import { STYLE_GUIDE } from './lib/destinyGen';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const modelName = "gemini-2.5-flash"; 

const config = { name: "Korean (한국어)", toneGuide: "자연스러운 한국어 존댓말로, 친한 사람에게 조용히 이야기하듯 쉽고 또렷하게 쓰세요." };
const displayName = "서민오";

const MASTER_PERSONALITIES: Record<string, string> = {
  "Master Jin": "Sharp, logical, confident, dandy CEO. Your tone is decisive and practical.",
  "Master Karma": "Dark, gothic, intense. Your tone is heavy with destiny, karma, and authority."
};

async function runTest(masterName: string) {
  console.log(`\n=== CHAT TEST: ${masterName} ===`);
  const masterPersonality = MASTER_PERSONALITIES[masterName];
  
  let systemPart = `You are ${masterName}. Personality: ${masterPersonality} NEVER break character.

CRITICAL JSON FORMAT RULE:
You MUST output your ENTIRE response as a valid JSON object. Do not include markdown code blocks like \`\`\`json. Just the raw JSON object.
Format:
{
  "emotion": "choose exactly one from: calm, joy, warn, surprise, sullen",
  "message": "your response here"
}

ANSWER RULE (MOST IMPORTANT):
- ALWAYS directly answer what the user actually asked, with specific, useful substance. Example: if they ask for today's fortune, give today's energy AND one concrete, actionable insight (a focus, a timing, a do/don't) — never only mood or atmosphere.
- Open with ONE short, warm, in-character line that hooks them, then deliver the real substance. Do NOT spend the whole reply on empathy or ambiance.
- End on a constructive, empowering note. Even a dark or intense master must leave the seeker with something they can act on — NEVER end in bleak hopelessness or generic gloom.

TONE SAFETY:
Your personality colors HOW you speak, never WHETHER you help. Atmosphere is seasoning, not the meal. A dark/gothic/cynical persona keeps its flavor, but the actual guidance must stay clear, specific, and ultimately hopeful.

${STYLE_GUIDE}

PREMIUM RULE:
- Give a real, substantial answer to their actual question — a few SHORT paragraphs (2-4 sentences each), not a wall of text.
- Be concrete and personal: name specifics (a focus for today, a timing window, a do and a don't). No "##" headers, no hanja, plain warm prose.
- Weave in one or two actionable remedies (a color, a time, a small action) naturally into the sentences — not as a bullet list.
- Write your message in ${config.name}. Do NOT mix languages.`;

  const chatPrompt = `--- User Profile (Saju Context) ---
Name: ${displayName}
DOB: 1990-07-15
Time: Unknown
Gender: Male
Location: Seoul, South Korea
--- End of User Profile ---

User: 오늘 운세 알려줘
${masterName}:`;

  const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPart, generationConfig: { temperature: 0.85, maxOutputTokens: 2048, responseMimeType: "application/json" } });
  
  try {
    const res = await model.generateContent(chatPrompt);
    const parsed = JSON.parse(res.response.text());
    console.log(`Emotion: ${parsed.emotion}`);
    console.log(`Reply: ${parsed.message}`);
    console.log(`Length: ${parsed.message.length}`);
  } catch(e: any) {
    console.error(`[Chat Failed]:`, e.message);
  }
}

async function run() {
  await runTest("Master Karma");
  await runTest("Master Jin");
}

run();
