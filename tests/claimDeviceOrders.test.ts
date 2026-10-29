import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockSession = vi.fn();
vi.mock("next-auth", () => ({ getServerSession: () => mockSession() }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

const orderFindMany = vi.fn();
const orderUpdateMany = vi.fn();
const orderFindFirst = vi.fn();
const unlockUpdateMany = vi.fn();
const reportUpdateMany = vi.fn();
const compatUpdateMany = vi.fn();
const tx = {
  order: { updateMany: orderUpdateMany, findFirst: orderFindFirst },
  unlock: { updateMany: unlockUpdateMany },
  generatedReport: { updateMany: reportUpdateMany },
  compatibility: { updateMany: compatUpdateMany },
};
vi.mock("@/lib/prisma", () => ({
  default: {
    order: { findMany: (...a: unknown[]) => orderFindMany(...a) },
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}));

import { POST } from "@/app/api/user/claim-device-orders/route";

const TOKEN_A = "kd_ord_" + "a".repeat(32);
const TOKEN_B = "kd_ord_" + "b".repeat(32);
const req = (body: unknown) =>
  new NextRequest("https://kongdak.kr/api/user/claim-device-orders", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/user/claim-device-orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.mockResolvedValue({ user: { id: "u1" } });
    orderUpdateMany.mockResolvedValue({ count: 1 });
    orderFindFirst.mockResolvedValue({ id: "o1" });
  });

  it("로그인하지 않으면 401", async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(req({ orderIds: [TOKEN_A] }));
    expect(res.status).toBe(401);
    expect(orderFindMany).not.toHaveBeenCalled();
  });

  it("형식이 맞지 않는 토큰은 버리고, 맞는 게 없으면 DB 를 보지 않는다", async () => {
    const res = await POST(req({ orderIds: ["kd_ord_x", "' or 1=1", 42] }));
    expect(await res.json()).toEqual({ linked: 0 });
    expect(orderFindMany).not.toHaveBeenCalled();
  });

  it("미연동 PAID 주문만, 7일 안의 것만 찾는다", async () => {
    orderFindMany.mockResolvedValue([]);
    await POST(req({ orderIds: [TOKEN_A, TOKEN_A, TOKEN_B] }));
    const where = orderFindMany.mock.calls[0][0].where;
    expect(where.orderId.in).toEqual([TOKEN_A, TOKEN_B]);
    expect(where.status).toBe("PAID");
    expect(where.userId).toBeNull();
    const ageMs = Date.now() - where.createdAt.gt.getTime();
    expect(ageMs).toBeGreaterThan(6.9 * 864e5);
    expect(ageMs).toBeLessThan(7.1 * 864e5);
  });

  it("주문·열람권·리포트를 귀속하고, 최초 결제 주문이면 궁합도 귀속한다", async () => {
    orderFindMany.mockResolvedValue([{ id: "o1", compatId: "c1" }]);
    const res = await POST(req({ orderIds: [TOKEN_A] }));
    expect(await res.json()).toEqual({ linked: 1 });
    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "o1", userId: null, status: "PAID" },
      data: { userId: "u1", claimToken: null, claimTokenExpiresAt: null },
    });
    expect(unlockUpdateMany).toHaveBeenCalledWith({ where: { orderId: "o1", userId: null }, data: { userId: "u1" } });
    expect(reportUpdateMany).toHaveBeenCalledWith({ where: { orderId: "o1", userId: null }, data: { userId: "u1" } });
    expect(compatUpdateMany).toHaveBeenCalledWith({ where: { id: "c1", userId: null }, data: { userId: "u1" } });
  });

  it("다른 사람이 먼저 가져간 주문(경쟁에서 짐)은 아무것도 쓰지 않는다", async () => {
    orderFindMany.mockResolvedValue([{ id: "o1", compatId: "c1" }]);
    orderUpdateMany.mockResolvedValue({ count: 0 });
    const res = await POST(req({ orderIds: [TOKEN_A] }));
    expect(await res.json()).toEqual({ linked: 0 });
    expect(unlockUpdateMany).not.toHaveBeenCalled();
    expect(reportUpdateMany).not.toHaveBeenCalled();
    expect(compatUpdateMany).not.toHaveBeenCalled();
  });

  it("그 궁합의 최초 결제가 아니면 궁합 작성자는 바꾸지 않는다", async () => {
    orderFindMany.mockResolvedValue([{ id: "o2", compatId: "c1" }]);
    orderFindFirst.mockResolvedValue({ id: "o1" });
    await POST(req({ orderIds: [TOKEN_A] }));
    expect(compatUpdateMany).not.toHaveBeenCalled();
  });
});
