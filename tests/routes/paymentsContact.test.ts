import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  order: { findUnique: vi.fn(), updateMany: vi.fn() },
  unlock: { updateMany: vi.fn(async () => ({ count: 1 })) },
}));
vi.mock("@/lib/prisma", () => ({ default: db }));

import { POST } from "@/app/api/payments/contact/route";

const req = (body: unknown) =>
  new Request("http://localhost/api/payments/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;

beforeEach(() => vi.clearAllMocks());

// 2026-10-03: 모바일 결제는 이메일 없이 진행하고, 결제 완료 화면에서 선택으로 받는다
describe("POST /api/payments/contact — 결제 후 이메일 남기기(선택)", () => {
  it("이메일이 없는 주문에만 한 번 적는다(소문자·공백 정리)", async () => {
    db.order.findUnique.mockResolvedValueOnce({ id: "db1" });
    db.order.updateMany.mockResolvedValueOnce({ count: 1 });
    const res = await POST(req({ orderId: "kd_ord_x", email: "  Guest@Example.com " }));
    expect(res.status).toBe(200);
    expect(db.order.updateMany).toHaveBeenCalledWith({ where: { id: "db1", email: null }, data: { email: "guest@example.com" } });
    expect(db.unlock.updateMany).toHaveBeenCalledWith({ where: { orderId: "db1", email: null }, data: { email: "guest@example.com" } });
    // 응답에 이메일을 싣지 않는다
    expect(JSON.stringify(await res.json())).not.toContain("guest@example.com");
  });

  it("이미 이메일이 있는 주문은 덮어쓰지 않는다(응답은 같게)", async () => {
    db.order.findUnique.mockResolvedValueOnce({ id: "db1" });
    db.order.updateMany.mockResolvedValueOnce({ count: 0 });
    const res = await POST(req({ orderId: "kd_ord_x", email: "other@example.com" }));
    expect(res.status).toBe(200);
    expect(db.unlock.updateMany).not.toHaveBeenCalled();
  });

  it("형식이 틀린 이메일·없는 주문은 거절", async () => {
    expect((await POST(req({ orderId: "kd_ord_x", email: "nope" }))).status).toBe(400);
    expect((await POST(req({ orderId: "kd_ord_x", email: "a%@b.com" }))).status).toBe(400);
    expect(db.order.findUnique).not.toHaveBeenCalled();
    db.order.findUnique.mockResolvedValueOnce(null);
    expect((await POST(req({ orderId: "missing", email: "a@b.com" }))).status).toBe(404);
  });
});
