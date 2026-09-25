import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  order: { findFirst: vi.fn() },
  adminAuditLog: { create: vi.fn() },
}));
const pg = vi.hoisted(() => ({ cancelPayment: vi.fn() }));
const grant = vi.hoisted(() => ({ revokePaidOrder: vi.fn(async () => ({ ok: true })) }));
const session = vi.hoisted(() => ({
  current: null as null | { user: { id: string; email?: string; role?: string } },
}));

vi.mock("@/lib/prisma", () => ({ default: db, prisma: db }));
vi.mock("@/lib/payments", () => ({ payments: pg }));
vi.mock("@/lib/payments/grant", () => grant);
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

import { POST } from "@/app/api/admin/orders/refund/route";
import { buildRefundRequestBody } from "@/lib/admin/refundRequest";

const req = (body: unknown) =>
  new Request("http://localhost/api/admin/orders/refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;

const paidOrder = { id: "db_1", orderId: "kd_ord_1", status: "PAID", amount: 4900, provider: "portone", email: "buyer@example.com", userId: "u1" };

beforeEach(() => {
  vi.clearAllMocks();
  session.current = { user: { id: "admin_1", email: "admin@kongdak.kr", role: "ADMIN" } };
  db.order.findFirst.mockResolvedValue(paidOrder);
  db.adminAuditLog.create.mockResolvedValue({ id: "log" });
  pg.cancelPayment.mockResolvedValue({ status: "CANCELLED" });
  grant.revokePaidOrder.mockResolvedValue({ ok: true });
});

describe("POST /api/admin/orders/refund — 어드민 환불 창과의 계약", () => {
  it("환불 창이 보내는 본문(buildRefundRequestBody) 그대로 환불된다 — 사유가 서버에 전달된다", async () => {
    const res = await POST(req(buildRefundRequestBody("kd_ord_1", "  테스트 결제 환불  ")));
    expect(res.status).toBe(200);
    expect(pg.cancelPayment).toHaveBeenCalledWith("kd_ord_1", "테스트 결제 환불");
    expect(grant.revokePaidOrder).toHaveBeenCalledWith("kd_ord_1");
    expect(db.adminAuditLog.create.mock.calls[0][0].data.detail.reason).toBe("테스트 결제 환불");
  });

  it("금액 칸을 채우면 전액과 같을 때만 허용된다", async () => {
    expect((await POST(req(buildRefundRequestBody("kd_ord_1", "사유", 4900)))).status).toBe(200);
    expect((await POST(req(buildRefundRequestBody("kd_ord_1", "사유", 1000)))).status).toBe(400);
  });

  it("사유가 비어 있으면 400, PG 취소를 부르지 않는다", async () => {
    const res = await POST(req(buildRefundRequestBody("kd_ord_1", "   ")));
    expect(res.status).toBe(400);
    expect(pg.cancelPayment).not.toHaveBeenCalled();
  });

  it("관리자가 아니면 PG 취소를 부르지 않는다", async () => {
    session.current = { user: { id: "u1", role: "USER" } };
    const res = await POST(req(buildRefundRequestBody("kd_ord_1", "사유")));
    expect(res.status).toBeGreaterThanOrEqual(401);
    expect(pg.cancelPayment).not.toHaveBeenCalled();
  });
});
