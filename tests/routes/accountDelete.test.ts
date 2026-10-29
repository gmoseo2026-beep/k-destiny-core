import fs from "fs";
import path from "path";
import { describe, it, expect, vi, beforeEach } from "vitest";

const txMock = vi.hoisted(() => ({
  adminAuditLog: { create: vi.fn() },
  order: {
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  unlock: { updateMany: vi.fn() },
  compatibility: { updateMany: vi.fn() },
  telegramAccount: { updateMany: vi.fn() },
  pushSubscription: { deleteMany: vi.fn() },
  annualFortune: { deleteMany: vi.fn() },
  generatedReport: { updateMany: vi.fn() },
  reportCache: { updateMany: vi.fn() },
  compatInvite: { updateMany: vi.fn() },
  coupon: { deleteMany: vi.fn() },
  user: { delete: vi.fn() },
}));

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  order: { count: vi.fn() },
  $transaction: vi.fn(async (cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock)),
}));

const session = vi.hoisted(() => ({
  current: null as null | { user: { id: string; role?: string } },
}));

vi.mock("@/lib/prisma", () => ({ default: db, prisma: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

import { DELETE } from "@/app/api/user/account/route";

function makeDeleteReq(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/user/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("DELETE /api/user/account — 셀프 회원 탈퇴", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.current = null;
  });

  it("비로그인이면 401을 반환하고 삭제를 실행하지 않는다", async () => {
    const res = await DELETE(makeDeleteReq());
    expect(res.status).toBe(401);
    expect(txMock.user.delete).not.toHaveBeenCalled();
  });

  it("타인 userId를 지정하면 403으로 거부하고 본인 계정만 삭제할 수 있다", async () => {
    session.current = { user: { id: "user_me", role: "USER" } };

    // 타인 계정 ID 전달 시 403 거부
    const forbidden = await DELETE(makeDeleteReq({ userId: "user_other" }));
    expect(forbidden.status).toBe(403);
    expect(txMock.user.delete).not.toHaveBeenCalled();

    // 본인 세션으로 정상 요청 시 본인 계정만 삭제
    db.user.findUnique.mockResolvedValueOnce({
      id: "user_me",
      email: "member@example.com",
      role: "USER",
    });
    db.order.count.mockResolvedValueOnce(2);

    const ok = await DELETE(makeDeleteReq());
    expect(ok.status).toBe(200);
    const json = await ok.json();
    expect(json.success).toBe(true);
    expect(json.ordersKept).toBe(2);
    expect(txMock.user.delete).toHaveBeenCalledTimes(1);
    expect(txMock.user.delete).toHaveBeenCalledWith({ where: { id: "user_me" } });
  });

  it("전자상거래법 보관 대상인 주문(Order) 행은 삭제하지 않고 남기며 스키마가 onDelete: SetNull이다", async () => {
    session.current = { user: { id: "user_buyer", role: "USER" } };
    db.user.findUnique.mockResolvedValueOnce({
      id: "user_buyer",
      email: "buyer@example.com",
      role: "USER",
    });
    db.order.count.mockResolvedValueOnce(3);

    // 주문 시뮬레이션: Order 행 배열이 삭제 호출 없이 그대로 보존되는지 확인
    const simulatedOrders = [
      { id: "ord_1", userId: "user_buyer", status: "PAID" },
      { id: "ord_2", userId: "user_buyer", status: "PAID" },
      { id: "ord_3", userId: "user_buyer", status: "CANCELED" },
    ];
    txMock.user.delete.mockImplementationOnce(async ({ where }: { where: { id: string } }) => {
      // Prisma schema onDelete: SetNull 동작 시뮬레이션
      for (const ord of simulatedOrders) {
        if (ord.userId === where.id) {
          (ord as { userId: string | null }).userId = null;
        }
      }
    });

    const res = await DELETE(makeDeleteReq());
    expect(res.status).toBe(200);

    // Order 삭제는 절대 호출되지 않음
    expect(txMock.order.delete).not.toHaveBeenCalled();
    expect(txMock.order.deleteMany).not.toHaveBeenCalled();
    // claimToken 만 소각
    expect(txMock.order.updateMany).toHaveBeenCalledWith({
      where: { userId: "user_buyer" },
      data: { claimToken: null, claimTokenExpiresAt: null },
    });
    // Unlock 은 userId/email 파기 및 즉시 만료
    expect(txMock.unlock.updateMany).toHaveBeenCalledWith({
      where: { userId: "user_buyer" },
      data: expect.objectContaining({
        userId: null,
        email: null,
        expiresAt: expect.any(Date),
      }),
    });
    // 주문 행 3건 모두 남아 있고 userId 만 null 로 보존
    expect(simulatedOrders).toHaveLength(3);
    expect(simulatedOrders.every((o) => o.userId === null)).toBe(true);

    // 실제 prisma/schema.prisma 의 Order -> User 관계가 onDelete: SetNull 인지 정적 검증
    const schemaText = fs.readFileSync(
      path.join(process.cwd(), "prisma", "schema.prisma"),
      "utf8",
    );
    const orderBlockMatch = schemaText.match(/model Order \{[\s\S]*?\n\}/);
    expect(orderBlockMatch).not.toBeNull();
    expect(orderBlockMatch![0]).toMatch(/user\s+User\?\s+@relation\([^)]*onDelete:\s*SetNull\)/);
  });

  it("관리자 계정(ADMIN)은 오삭제 방지를 위해 400으로 거부한다", async () => {
    session.current = { user: { id: "admin_1", role: "ADMIN" } };
    db.user.findUnique.mockResolvedValueOnce({
      id: "admin_1",
      email: "admin@kongdak.kr",
      role: "ADMIN",
    });

    const res = await DELETE(makeDeleteReq());
    expect(res.status).toBe(400);
    expect(txMock.user.delete).not.toHaveBeenCalled();
  });
});
