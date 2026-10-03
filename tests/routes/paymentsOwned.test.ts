import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ order: { findMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ default: db }));

import { POST } from "@/app/api/payments/owned/route";

const req = (body: unknown) =>
  new Request("http://localhost/api/payments/owned", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);

beforeEach(() => vi.clearAllMocks());

describe("POST /api/payments/owned — 기기의 결제 증명이 아직 유효한지", () => {
  it("결제 완료 + 만료 전 권한이 있는 주문만 valid", async () => {
    db.order.findMany.mockResolvedValueOnce([
      { orderId: "ok", unlocks: [{ expiresAt: future }] },
      { orderId: "expired", unlocks: [{ expiresAt: past }] },
      { orderId: "no_unlock", unlocks: [] },
    ]);
    const res = await POST(req({ orderIds: ["ok", "expired", "no_unlock", "refunded"] }));
    expect(res.status).toBe(200);
    expect((await res.json()).valid).toEqual(["ok"]);
    // 환불(CANCELED)·대기 주문은 조회 조건(status: PAID)에서 빠진다
    expect(db.order.findMany.mock.calls[0][0].where).toEqual({ orderId: { in: ["ok", "expired", "no_unlock", "refunded"] }, status: "PAID" });
  });

  it("id 는 30개까지만 묻고, 문자열이 아닌 값은 버린다", async () => {
    db.order.findMany.mockResolvedValueOnce([]);
    const many = Array.from({ length: 50 }, (_, i) => `id_${i}`);
    await POST(req({ orderIds: [...many, 123, null] }));
    expect(db.order.findMany.mock.calls[0][0].where.orderId.in).toHaveLength(30);
  });

  it("빈 요청은 DB 를 부르지 않는다", async () => {
    const res = await POST(req({ orderIds: [] }));
    expect((await res.json()).valid).toEqual([]);
    expect(db.order.findMany).not.toHaveBeenCalled();
  });

  it("DB 오류면 500 — 클라이언트가 결제 증명을 지우지 않게 한다", async () => {
    db.order.findMany.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(req({ orderIds: ["a"] }));
    expect(res.status).toBe(500);
  });
});
