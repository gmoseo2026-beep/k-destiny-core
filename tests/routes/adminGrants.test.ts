import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  order: { create: vi.fn() },
  compatibility: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  adminAuditLog: { create: vi.fn() },
}));

const grantMock = vi.hoisted(() => ({
  applyPaidOrder: vi.fn(async () => ({ ok: true })),
}));

const session = vi.hoisted(() => ({
  current: null as null | { user: { id: string; email?: string; name?: string; role?: string } },
}));

vi.mock("@/lib/prisma", () => ({ default: db, prisma: db }));
vi.mock("@/lib/payments/grant", () => grantMock);
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

import { POST } from "@/app/api/admin/grants/route";

const req = (body: unknown) =>
  new Request("http://localhost/api/admin/grants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  session.current = {
    user: { id: "admin_1", email: "admin@kongdak.kr", name: "관리자", role: "ADMIN" },
  };
  db.order.create.mockImplementation(async ({ data }: { data: any }) => ({ ...data, id: "ord_db_1" }));
  db.adminAuditLog.create.mockResolvedValue({ id: "log_1" });
  db.compatibility.findUnique.mockResolvedValue({ id: "compat_1" });
  db.user.findUnique.mockResolvedValue({ id: "user_1", email: "member@example.com" });
  grantMock.applyPaidOrder.mockResolvedValue({ ok: true });
});

describe("POST /api/admin/grants route contract tests", () => {
  // 1. 관리자 아님 -> 403
  it("returns 403 when user is not ADMIN", async () => {
    session.current = {
      user: { id: "user_1", email: "user@example.com", role: "USER" },
    };
    const res = await POST(
      req({ catalogId: "annual_2026", email: "test@example.com", reason: "CS 보상" })
    );
    expect(res.status).toBe(403);
  });

  // 2. reason 없음 -> 400
  it("returns 400 when reason is missing", async () => {
    const res = await POST(
      req({ catalogId: "annual_2026", email: "test@example.com" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("사유");
  });

  // 3. couple 상품에 compatId 없음 -> 400
  it("returns 400 when couple product has no compatId", async () => {
    const res = await POST(
      req({ catalogId: "compat_basic", email: "test@example.com", reason: "CS 보상" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("compatId가 필수");
  });

  it("returns 400 when compatId does not exist in DB", async () => {
    db.compatibility.findUnique.mockResolvedValueOnce(null);
    const res = await POST(
      req({
        catalogId: "compat_basic",
        compatId: "invalid_compat",
        email: "test@example.com",
        reason: "CS 보상",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("존재하지 않는 궁합");
  });

  // 4. 정상 개인 상품 요청 (회원) -> Order(amount: 0, admin_manual) 생성 및 applyPaidOrder 호출
  it("successfully creates Order with amount 0 and admin_manual, calls applyPaidOrder", async () => {
    const res = await POST(
      req({
        catalogId: "annual_2026",
        userId: "user_1",
        reason: "결제 오류 보상",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.orderId).toMatch(/^kd_ord_/);

    // Order DB 생성 검증
    expect(db.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 0,
          provider: "admin_manual",
          status: "PENDING",
          productType: "ANNUAL",
          productKey: "2026",
          userId: "user_1",
          email: "member@example.com",
        }),
      })
    );

    // applyPaidOrder 호출 검증
    expect(grantMock.applyPaidOrder).toHaveBeenCalledWith(
      expect.stringMatching(/^kd_ord_/),
      "admin_manual"
    );

    // 감사 로그 검증
    expect(db.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminUserId: "admin_1",
          action: "GRANT_MANUAL",
          targetType: "ORDER",
        }),
      })
    );
  });

  // 5. 게스트 수동 발급 시 viewUrl 반환
  it("returns viewUrl when granting to a guest without userId", async () => {
    const res = await POST(
      req({
        catalogId: "annual_2026",
        email: "guest@example.com",
        reason: "게스트 보상",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.viewUrl).toContain("pay/complete?paymentId=kd_ord_");
  });
});
