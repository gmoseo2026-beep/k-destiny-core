import type { GenerationConfig } from "@google/generative-ai";
import { genAI, repairJSON } from "@/lib/destinyGen";
import { containsHanjaDeep } from "@/lib/gen/hanjaGuard";

type GenConfig = GenerationConfig & { thinkingConfig?: { thinkingBudget: number } };

export interface GenerateJsonOptions<T> {
  label: string;
  prompt: string;
  models: string[];            // 순서대로 시도
  maxOutputTokens: number;
  thinkingBudget: number;      // flash: 0, pro: 1024 이상
  validate: (v: unknown) => v is T;
  temperature?: number;
}

/** 모델별 최대 2회 시도. JSON 파싱 실패·스키마 불일치·한자 포함이면 재시도. finishReason 을 항상 로그로 남긴다. */
export async function generateJson<T>(o: GenerateJsonOptions<T>): Promise<{ data: T; model: string }> {
  for (const modelName of o.models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const t0 = Date.now();
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const config: GenConfig = {
          temperature: o.temperature ?? 0.7,
          topP: 0.9,
          maxOutputTokens: o.maxOutputTokens,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: o.thinkingBudget },
        };
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: o.prompt }] }],
          generationConfig: config as any,
        });
        const text = result.response.text();
        const fr = result.response.candidates?.[0]?.finishReason;
        const parsed: unknown = repairJSON(text);
        
        if (parsed && o.validate(parsed) && !containsHanjaDeep(parsed)) {
          console.log(`[gen:${o.label}] ok model=${modelName} attempt=${attempt} ms=${Date.now() - t0} fr=${fr}`);
          return { data: parsed, model: modelName };
        }
        
        console.error(`[gen:${o.label}] invalid model=${modelName} attempt=${attempt} fr=${fr} len=${text.length} hanja=${parsed ? containsHanjaDeep(parsed) : "n/a"}`);
      } catch (e) {
        console.warn(`[gen:${o.label}] error model=${modelName} attempt=${attempt}`, e);
      }
    }
  }
  throw new Error(`[gen:${o.label}] all attempts failed`);
}
