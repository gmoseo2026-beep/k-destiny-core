import { describe, it, expect, vi, beforeEach } from "vitest";

// 2026-10-03: 총운도 비회원이 결제하고, 주문번호(orderId)로 전체 총운을 연다.
const db = vi.hoisted(() => ({
  order: { findUnique: vi.fn(), findMany: vi.fn(async () => [] as unknown[]) },
  sajuContentDictionary: { findFirst: vi.fn(async () => null) },
  productVisibility: { findMany: vi.fn(async () => [] as unknown[]) },
  reportGenLog: { create: vi.fn(async () => ({})) },
  generatedReport: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(async () => ({})), updateMany: vi.fn() },
}));
const ai = vi.hoisted(() => ({ text: "" , calls: 0 }));
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string } } }));

vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
vi.mock("@/lib/rateLimiter", () => ({
  checkChatRateLimit: vi.fn(async () => ({ allowed: true })),
  getClientIp: () => "1.1.1.1",
}));
vi.mock("@/lib/destinyGen", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/destinyGen")>();
  return {
    ...real,
    genAI: {
      getGenerativeModel: () => ({
        generateContent: async () => {
          ai.calls++;
          return { response: { text: () => ai.text } };
        },
      }),
    },
  };
});

import { POST } from "@/app/api/fortune/annual/route";
import { invalidateVisibilityCache } from "@/lib/catalogVisibility";

const future = new Date(Date.now() + 86400000);
const input = { dob: "1995-03-15", time: "10:30", gender: "F", name: "테스트" };
const req = (body: unknown) =>
  new Request("http://localhost/api/fortune/annual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const FULL = {
  yearScore: 1,
  headline: "전체 헤드라인",
  summary: "전체 요약",
  sections: {
    love: { score: 80, text: "연애" }, money: { score: 70, text: "돈" }, career: { score: 75, text: "일" },
    health: { score: 60, text: "건강" }, relationship: { score: 72, text: "관계" },
  },
  monthlyHighlights: [{ month: 1, note: "1월" }],
  luckyPoints: { color: "빨강", item: "반지", month: 5 },
};

const paidOrder = (unlock: { productType: string; productKey: string }) => ({
  id: "db_order_1",
  orderId: "ord_guest_annual",
  status: "PAID",
  userId: null,
  unlocks: [{ ...unlock, compatId: null, expiresAt: future }],
});

beforeEach(() => {
  invalidateVisibilityCache();
  vi.clearAllMocks();
  db.generatedReport.findUnique.mockReset();
  db.generatedReport.create.mockReset();
  session.current = null;
  db.productVisibility.findMany.mockResolvedValue([]);
  ai.calls = 0;
  ai.text = JSON.stringify(FULL);
  process.env.SUBJECT_HASH_SECRET = "x".repeat(32);
});

describe("POST /api/fortune/annual — 비회원 결제 후 전체 총운", () => {
  it("없는 주문번호 → 403, AI 호출 없음", async () => {
    db.order.findUnique.mockResolvedValueOnce(null);
    const res = await POST(req({ ...input, productId: "annual_2026", orderId: "nope" }));
    expect(res.status).toBe(403);
    expect(ai.calls).toBe(0);
  });

  it("결제 대기 주문 → 402, AI 호출 없음", async () => {
    db.order.findUnique.mockResolvedValueOnce({ ...paidOrder({ productType: "ANNUAL", productKey: "2026" }), status: "PENDING" });
    const res = await POST(req({ ...input, productId: "annual_2026", orderId: "ord_guest_annual" }));
    expect(res.status).toBe(402);
    expect(ai.calls).toBe(0);
  });

  it("다른 상품을 산 주문으로는 총운을 열 수 없다 → 403", async () => {
    db.order.findUnique.mockResolvedValueOnce(paidOrder({ productType: "FORTUNE", productKey: "wealth" }));
    const res = await POST(req({ ...input, productId: "annual_2026", orderId: "ord_guest_annual" }));
    expect(res.status).toBe(403);
    expect(ai.calls).toBe(0);
  });

  it("결제한 총운 주문 → 전체 총운(잠금 해제), 주문 단위로 보관하고 점수는 결정론 값", async () => {
    db.order.findUnique.mockResolvedValueOnce(paidOrder({ productType: "ANNUAL", productKey: "2026" }));
    db.generatedReport.create.mockResolvedValueOnce({ id: "rep_1" });
    const res = await POST(req({ ...input, productId: "annual_2026", orderId: "ord_guest_annual" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.locked).toBe(false);
    expect(json.data.sections.money.text).toBe("돈");
    expect(json.data.yearScore).not.toBe(1); // AI 가 준 점수 대신 결정론 점수
    const created = db.generatedReport.create.mock.calls[0][0].data;
    expect(created.cacheKey).toBe("FULL:db_order_1:annual_2026");
    expect(created.userId).toBeNull();
    expect(JSON.stringify(created)).not.toContain("1995-03-15"); // 생년월일 원본 저장 금지
    expect(db.generatedReport.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "rep_1" } }));
  });

  it("총운이 든 세트(나 종합 세트) 주문으로도 열린다", async () => {
    db.order.findUnique.mockResolvedValueOnce(paidOrder({ productType: "SET", productKey: "set_me" }));
    db.generatedReport.create.mockResolvedValueOnce({ id: "rep_2" });
    const res = await POST(req({ ...input, productId: "annual_2026", orderId: "ord_guest_annual" }));
    expect(res.status).toBe(200);
    expect((await res.json()).locked).toBe(false);
  });

  it("다시 들어온 결제 비회원: 생년월일 없이도 저장본을 바로 준다(AI 호출 없음)", async () => {
    db.order.findUnique.mockResolvedValueOnce(paidOrder({ productType: "ANNUAL", productKey: "2026" }));
    db.generatedReport.findUnique.mockResolvedValueOnce({
      id: "rep_saved",
      status: "READY",
      content: { version: 1, score: 88, data: { ...FULL, yearScore: 88 } },
    });
    const res = await POST(req({ productId: "annual_2026", orderId: "ord_guest_annual" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.locked).toBe(false);
    expect(json.data.yearScore).toBe(88);
    expect(db.generatedReport.findUnique).toHaveBeenCalledWith({ where: { cacheKey: "FULL:db_order_1:annual_2026" } });
    expect(ai.calls).toBe(0);
  });

  it("결제했지만 아직 만든 적 없고 생년월일도 없으면 → 400 NEED_INPUT (입력 폼으로)", async () => {
    db.order.findUnique.mockResolvedValueOnce(paidOrder({ productType: "ANNUAL", productKey: "2026" }));
    const res = await POST(req({ productId: "annual_2026", orderId: "ord_guest_annual" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("NEED_INPUT");
    expect(ai.calls).toBe(0);
  });

  it("환불·없는 주문은 code 로 구분해 알려 준다(기기의 결제 증명 정리용)", async () => {
    db.order.findUnique.mockResolvedValueOnce({ ...paidOrder({ productType: "ANNUAL", productKey: "2026" }), status: "CANCELED" });
    const res = await POST(req({ ...input, productId: "annual_2026", orderId: "ord_guest_annual" }));
    expect(res.status).toBe(402);
    expect((await res.json()).code).toBe("NOT_PAID");
  });

  it("비회원으로 결제 후 계정에 연동한 회원: 프로필이 없어도 그때 만든 총운을 그대로 연다", async () => {
    session.current = { user: { id: "user_9" } };
    db.order.findMany.mockResolvedValueOnce([{ ...paidOrder({ productType: "ANNUAL", productKey: "2026" }), userId: "user_9" }]);
    (db.generatedReport as unknown as { findFirst: ReturnType<typeof vi.fn> }).findFirst = vi.fn(async () => ({
      id: "rep_saved",
      status: "READY",
      content: { version: 1, score: 88, data: { ...FULL, yearScore: 88 } },
    }));
    const res = await POST(req({ productId: "annual_2026" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.locked).toBe(false);
    expect(json.data.sections.love.text).toBe("연애");
    expect(ai.calls).toBe(0);
  });

  it("주문번호 없는 비회원은 여전히 미리보기, 무료 본문은 앞 절반만", async () => {
    const long = "첫 문장이에요. 두 번째 문장이에요. 세 번째 문장이에요. 네 번째 문장이에요. 다섯 번째 문장이에요. 여섯 번째 문장이에요.";
    ai.text = JSON.stringify({ headline: "h", summary: "s", freeSection: { type: "love", score: 80, text: long }, hooks: {}, teasers: {} });
    const res = await POST(req({ ...input, productId: "annual_2026" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.locked).toBe(true);
    expect(json.data.freeSection.clipped).toBe(true);
    expect(json.data.freeSection.text.length).toBeLessThan(long.length);
    expect(json.data.sections).toBeUndefined();
  });
});
