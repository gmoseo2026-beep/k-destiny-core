import { beforeEach, describe, expect, it, vi } from "vitest";

const { tx, sendTelegramMessage } = vi.hoisted(() => ({
  tx: {
    order: { findUnique: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() },
    unlock: { deleteMany: vi.fn() },
    giftCode: { findUnique: vi.fn() },
  },
  sendTelegramMessage: vi.fn<(msg: string) => Promise<void>>(async () => undefined),
}));

vi.mock("@/lib/prisma", () => ({
  default: { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) },
}));
vi.mock("@/lib/telegram", () => ({ sendTelegramMessage }));
vi.mock("@/lib/adConversions", () => ({ sendServerPurchaseConversions: vi.fn() }));

import { revokePaidOrder } from "@/lib/payments/grant";

const paid = { id: "o1", orderId: "kd_ord_1", status: "PAID", type: "SINGLE" };

describe("환불 시 연결된 주문 처리", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.order.findUnique.mockReset().mockResolvedValue(paid);
    tx.order.updateMany.mockReset().mockResolvedValue({ count: 1 });
    tx.order.findFirst.mockReset().mockResolvedValue(null);
    tx.giftCode.findUnique.mockReset().mockResolvedValue(null);
  });

  it("일반 단품은 자기 열람만 회수하고 알림이 없다", async () => {
    await expect(revokePaidOrder("kd_ord_1")).resolves.toEqual({ ok: true });
    expect(tx.unlock.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.unlock.deleteMany).toHaveBeenCalledWith({ where: { orderId: "o1" } });
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("사용된 선물을 환불하면 받은 사람의 주문·열람도 회수한다", async () => {
    tx.giftCode.findUnique.mockResolvedValue({ redeemedOrderId: "kd_gift_2" });
    tx.order.findUnique
      .mockResolvedValueOnce(paid)
      .mockResolvedValueOnce({ id: "o2", orderId: "kd_gift_2" });
    await revokePaidOrder("kd_ord_1");
    expect(tx.order.updateMany).toHaveBeenLastCalledWith({ where: { id: "o2" }, data: { status: "CANCELED" } });
    expect(tx.unlock.deleteMany).toHaveBeenCalledWith({ where: { orderId: "o2" } });
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  });

  it("안 쓴 선물은 받은 사람 처리 없이 끝난다", async () => {
    tx.giftCode.findUnique.mockResolvedValue({ redeemedOrderId: null });
    await revokePaidOrder("kd_ord_1");
    expect(tx.unlock.deleteMany).toHaveBeenCalledTimes(1);
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("차액 세트가 있으면 자동 환불하지 않고 주문번호를 알린다", async () => {
    tx.order.findFirst.mockResolvedValue({ orderId: "kd_up_3", amount: 3000 });
    await revokePaidOrder("kd_ord_1");
    expect(tx.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { upgradeFromOrderId: "kd_ord_1", status: "PAID" } }),
    );
    expect(sendTelegramMessage.mock.calls[0]?.[0]).toContain("kd_up_3");
    expect(tx.unlock.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("이미 취소된 주문은 다시 처리하지 않는다", async () => {
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    await expect(revokePaidOrder("kd_ord_1")).resolves.toEqual({ ok: true, already: true });
    expect(tx.unlock.deleteMany).not.toHaveBeenCalled();
  });
});
