import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  const SYNC_MODEL_CHAIN = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
  ];

  const prompt = `You are a mystical Eastern Saju (Cosmic Energy) matchmaker. 
Analyze the compatibility between two individuals based on their 5 Elements energy.
Write ENTIRELY in English. Keep the tone extremely engaging, slightly dramatic, and witty (perfect for sharing on Instagram/TikTok).

User 1: Alice (DOB: 1990-01-01)
User 2: Bob (DOB: 1990-01-01)

Return a JSON object containing compatibility score, dynamic vibe title, and a short compatibility analysis.`;

  for (const modelName of SYNC_MODEL_CHAIN) {
    try {
      console.log(`[Sync] Trying ${modelName}...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              score: {
                type: SchemaType.INTEGER,
                description: "Compatibility score between 0 and 100",
              },
              vibe: {
                type: SchemaType.STRING,
                description: "A 2-4 word punchy title for their dynamic",
              },
              analysis: {
                type: SchemaType.STRING,
                description: "A 2-3 sentence highly entertaining analysis of how their energies interact",
              },
            },
            required: ["score", "vibe", "analysis"],
          },
        },
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      console.log("[Sync] Raw response text:", responseText);
      const data = JSON.parse(responseText);
      console.log(`[Sync] ✅ Success with ${modelName}`);
      break;
    } catch (err: any) {
      console.error(`[Sync] ${modelName} failed: ${err.message}`);
    }
  }
}

run();
