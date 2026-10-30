import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateContent, findUnique, update } = vi.hoisted(() => ({
  generateContent: vi.fn(async () => ({ response: { text: () => "해석" } })),
  findUnique: vi.fn(),
  update: vi.fn(async () => ({})),
}));

vi.mock("@/lib/destinyGen", () => ({
  genAI: { getGenerativeModel: () => ({ generateContent }) },
  FREE_MODELS: ["free-a", "free-b"],
  PREMIUM_MODELS: ["premium-a", "premium-b"],
  LOCALE_CONFIG: { ko: { toneGuide: "" } },
  compatContextBlock: () => "ctx",
  buildCompatPrompt: () => "PROMPT",
  validateCompatOutputLanguage: () => ({ ok: true }),
}));
vi.mock("@/lib/compatCuriosity", () => ({ appendCuriosityToneGuide: (t: string) => t }));
vi.mock("@/lib/rateLimiter", () => ({
  getClientIp: () => "1.1.1.1",
  checkChatRateLimit: async () => ({ allowed: true }),
}));
vi.mock("@/lib/prisma", () => ({ default: { compatibility: { findUnique, update } } }));
vi.mock("@/lib/reports/genLog", () => ({ logGeneration: vi.fn(), errorCode: () => "E" }));

import { POST } from "@/app/api/generate-compat/route";
import type { NextRequest } from "next/server";

const call = (body: object) =>
  POST(new Request("http://x/api/generate-compat", { method: "POST", body: JSON.stringify(body) }) as unknown as NextRequest);

const record = { id: "c1", personA: {}, personB: {}, relation: "love", score: 80, keywords: [], breakdown: {}, isPaid: true, locale: null };

describe("generate-compat 생각 예산", () => {
  beforeEach(() => {
    generateContent.mockClear();
    findUnique.mockResolvedValue({ ...record });
  });

  it("무료 해석은 생각 예산을 512 로 제한한다", async () => {
    const res = await call({ compatId: "c1" });
    expect(res.status).toBe(200);
    expect((generateContent.mock.calls as unknown[][])[0][0]).toEqual({
      contents: [{ role: "user", parts: [{ text: "PROMPT" }] }],
      generationConfig: { thinkingConfig: { thinkingBudget: 512 } },
    });
  });

  it("예비 모델로 넘어가도 같은 생각 예산을 쓴다", async () => {
    generateContent.mockRejectedValueOnce(new Error("down"));
    const res = await call({ compatId: "c1" });
    expect(res.status).toBe(200);
    expect((generateContent.mock.calls as unknown[][])[1][0]).toEqual((generateContent.mock.calls as unknown[][])[0][0]);
  });

  it("유료 해석은 기존 설정을 그대로 쓴다", async () => {
    await call({ compatId: "c1", isPremium: true });
    expect((generateContent.mock.calls as unknown[][])[0][0]).toBe("PROMPT");
  });
});
