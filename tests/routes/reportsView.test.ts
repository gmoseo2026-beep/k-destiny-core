import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  generatedReport: { findUnique: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })) },
  order: { findUnique: vi.fn() },
}));
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; email?: string } } }));

vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

import { POST } from "@/app/api/reports/view/route";

const req = (body: unknown) =>
  new Request("http://localhost/api/reports/view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;

const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);

const mockReport = {
  id: "rep_1",
  kind: "FULL",
  orderId: "order_db_1",
  catalogId: "wealth",
  compatId: null,
  status: "READY",
  content: {
    version: 1,
    score: 88,
    data: {
      headline: "재물운 대길",
      summary: "올해 재물운 요약",
      sections: [],
      advice: { do: [], dont: [] },
      closing: "맺음말",
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  session.current = null;
});

describe("POST /api/reports/view route contract tests", () => {
  // 1. 타인 세션이고 orderId도 없음 → 403
  it("case 1: stranger session without orderId token returns 403", async () => {
    session.current = { user: { id: "user_stranger", email: "stranger@example.com" } };
    db.generatedReport.findUnique.mockResolvedValueOnce(mockReport);
    db.order.findUnique.mockResolvedValueOnce({
      id: "order_db_1",
      orderId: "ord_owner_only",
      userId: "user_owner",
      status: "PAID",
      productType: "FORTUNE",
      productKey: "wealth",
      type: "SINGLE",
      compatId: null,
      unlocks: [{ id: "u1", productType: "FORTUNE", productKey: "wealth", compatId: null, expiresAt: future }],
    });

    const res = await POST(req({ reportId: "rep_1" }));
    expect(res.status).toBe(403);
  });

  // 2. 주문 CANCELED(환불됨) → 402. 환불 후 열람이 막히는 것을 보증한다.
  it("case 2: refunded CANCELED order returns 402 (access blocked after refund)", async () => {
    session.current = { user: { id: "user_owner", email: "owner@example.com" } };
    db.generatedReport.findUnique.mockResolvedValueOnce(mockReport);
    db.order.findUnique.mockResolvedValueOnce({
      id: "order_db_1",
      orderId: "ord_refunded",
      userId: "user_owner",
      status: "CANCELED",
      productType: "FORTUNE",
      productKey: "wealth",
      type: "SINGLE",
      compatId: null,
      unlocks: [{ id: "u1", productType: "FORTUNE", productKey: "wealth", compatId: null, expiresAt: future }],
    });

    const res = await POST(req({ reportId: "rep_1" }));
    expect(res.status).toBe(402);
  });

  // 3. Unlock 만료 → 403
  it("case 3: expired unlock returns 403", async () => {
    session.current = { user: { id: "user_owner", email: "owner@example.com" } };
    db.generatedReport.findUnique.mockResolvedValueOnce(mockReport);
    db.order.findUnique.mockResolvedValueOnce({
      id: "order_db_1",
      orderId: "ord_expired",
      userId: "user_owner",
      status: "PAID",
      productType: "FORTUNE",
      productKey: "wealth",
      type: "SINGLE",
      compatId: null,
      unlocks: [{ id: "u1", productType: "FORTUNE", productKey: "wealth", compatId: null, expiresAt: past }],
    });

    const res = await POST(req({ reportId: "rep_1" }));
    expect(res.status).toBe(403);
  });

  // 4. status GENERATING → 202
  it("case 4: status GENERATING returns 202", async () => {
    session.current = { user: { id: "user_owner", email: "owner@example.com" } };
    db.generatedReport.findUnique.mockResolvedValueOnce({
      ...mockReport,
      status: "GENERATING",
    });
    db.order.findUnique.mockResolvedValueOnce({
      id: "order_db_1",
      orderId: "ord_generating",
      userId: "user_owner",
      status: "PAID",
      productType: "FORTUNE",
      productKey: "wealth",
      type: "SINGLE",
      compatId: null,
      unlocks: [{ id: "u1", productType: "FORTUNE", productKey: "wealth", compatId: null, expiresAt: future }],
    });

    const res = await POST(req({ reportId: "rep_1" }));
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.status).toBe("GENERATING");
  });

  // 5. 정상 → 200과 firstViewedAt updateMany 호출
  it("case 5: valid request returns 200 and records firstViewedAt via updateMany", async () => {
    session.current = { user: { id: "user_owner", email: "owner@example.com" } };
    db.generatedReport.findUnique.mockResolvedValueOnce(mockReport);
    db.order.findUnique.mockResolvedValueOnce({
      id: "order_db_1",
      orderId: "ord_valid",
      userId: "user_owner",
      status: "PAID",
      productType: "FORTUNE",
      productKey: "wealth",
      type: "SINGLE",
      compatId: null,
      unlocks: [{ id: "u1", productType: "FORTUNE", productKey: "wealth", compatId: null, expiresAt: future }],
    });

    const res = await POST(req({ reportId: "rep_1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reportId).toBe("rep_1");
    expect(body.score).toBe(88);
    expect(body.data.headline).toBe("재물운 대길");

    expect(db.generatedReport.updateMany).toHaveBeenCalledWith({
      where: { id: "rep_1", firstViewedAt: null },
      data: { firstViewedAt: expect.any(Date) },
    });
  });
});
