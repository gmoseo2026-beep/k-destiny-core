import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// 동면 중인 Gumroad 결제 알림 주소: 비밀값이 없거나 틀리면 DB 를 건드리지 않고 거절해야 한다.
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  purchasedReport: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: db, prisma: db }));

import { POST } from "@/app/api/webhooks/gumroad/route";

const forgedSale = (query = "") =>
  new NextRequest(`http://localhost/api/webhooks/gumroad${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: "member@example.com", price: "299", sale_id: "s_1" }).toString(),
  });

const ORIGINAL = process.env.GUMROAD_WEBHOOK_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue({ id: "user_1", email: "member@example.com" });
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.GUMROAD_WEBHOOK_SECRET;
  else process.env.GUMROAD_WEBHOOK_SECRET = ORIGINAL;
});

describe("POST /api/webhooks/gumroad", () => {
  it("비밀값이 설정되지 않았으면 503 으로 거절하고 회원을 건드리지 않는다", async () => {
    delete process.env.GUMROAD_WEBHOOK_SECRET;
    const res = await POST(forgedSale());
    expect(res.status).toBe(503);
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("비밀값이 틀리면 401 로 거절한다", async () => {
    process.env.GUMROAD_WEBHOOK_SECRET = "expected-test-value";
    const res = await POST(forgedSale("?secret=wrong"));
    expect(res.status).toBe(401);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("비밀값이 없는 요청도 401 로 거절한다", async () => {
    process.env.GUMROAD_WEBHOOK_SECRET = "expected-test-value";
    const res = await POST(forgedSale());
    expect(res.status).toBe(401);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});
