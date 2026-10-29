import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  order: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  unlock: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  compatibility: {
    findUnique: vi.fn(),
  },
  coupon: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  productVisibility: {
    findMany: vi.fn(async () => [] as Array<{ catalogId: string; visible: boolean }>),
  },
  $transaction: vi.fn(),
}));

const session = vi.hoisted(() => ({
  current: null as null | { user: { id: string; email?: string } },
}));

const pg = vi.hoisted(() => ({
  getPayment: vi.fn(),
  verifyWebhook: vi.fn(),
  cancelPayment: vi.fn(async () => ({})),
}));

vi.mock("@/lib/prisma", () => ({ default: db, prisma: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
vi.mock("@/lib/payments", () => ({ payments: pg }));

import { POST as ORDER } from "@/app/api/payments/order/route";
import { POST as COMPLETE } from "@/app/api/payments/complete/route";
import { POST as WEBHOOK } from "@/app/api/webhooks/portone/route";
import { CATALOG } from "@/lib/catalog";
import { invalidateVisibilityCache } from "@/lib/catalogVisibility";
import {
  computeSetUpgradeAmount,
  formatSetUpgradeHeadline,
  SET_UPGRADE_WINDOW_MS,
} from "@/lib/payments/setUpgrade";

const postJson = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;

describe("12 차액 세트 업그레이드 (argon/12-set-upgrade)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateVisibilityCache();
    session.current = null;
    db.productVisibility.findMany.mockResolvedValue(
      CATALOG.map((c) => ({ catalogId: c.id, visible: true }))
    );
    db.compatibility.findUnique.mockResolvedValue({ id: "cmp_1" });
    db.coupon.findUnique.mockResolvedValue(null);
    db.coupon.findFirst.mockResolvedValue(null);
    db.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      id: "db_upg_1",
      createdAt: new Date(),
    }));
    db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  });

  it("1) 남의 주문 거부: 다른 회원 주문 및 비로그인 요청은 403으로 거부한다", async () => {
    const memberSourceOrder = {
      id: "src_db_1",
      orderId: "kd_ord_member_a",
      userId: "user_A",
      status: "PAID",
      amount: 4900,
      compatId: "cmp_1",
      productType: "COMPAT_SPECIAL",
      productKey: "inner_mind",
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
      upgradeFromOrderId: null,
    };

    // 1-a) 회원 B가 회원 A의 주문을 업그레이드 시도 -> 403
    session.current = { user: { id: "user_B", email: "b@example.com" } };
    db.order.findUnique.mockResolvedValueOnce(memberSourceOrder);
    db.order.findFirst.mockResolvedValueOnce(null);

    const resOtherMember = await ORDER(
      postJson("/api/payments/order", {
        productId: "set_heart",
        compatId: "cmp_1",
        upgradeFromOrderId: "kd_ord_member_a",
      })
    );
    expect(resOtherMember.status).toBe(403);
    expect(db.order.create).not.toHaveBeenCalled();

    // 1-b) 비로그인 게스트가 회원 A의 주문번호를 알아도 거부 -> 403
    session.current = null;
    db.order.findUnique.mockResolvedValueOnce(memberSourceOrder);
    db.order.findFirst.mockResolvedValueOnce(null);

    const resAnonOnMember = await ORDER(
      postJson("/api/payments/order", {
        productId: "set_heart",
        compatId: "cmp_1",
        upgradeFromOrderId: "kd_ord_member_a",
      })
    );
    expect(resAnonOnMember.status).toBe(403);

    // 1-c) 타 회원(user_B)이 자신의 기기 토큰 없이 남의 게스트 주문을 업그레이드 시도 -> 403
    session.current = { user: { id: "user_B", email: "b@example.com" } };
    db.order.findUnique.mockResolvedValueOnce({
      ...memberSourceOrder,
      userId: null,
      orderId: "kd_ord_guest_victim",
    });
    db.order.findFirst.mockResolvedValueOnce(null);

    const resMemberOnOtherGuest = await ORDER(
      postJson("/api/payments/order", {
        productId: "set_heart",
        compatId: "cmp_1",
        upgradeFromOrderId: "kd_ord_guest_victim",
      })
    );
    expect(resMemberOnOtherGuest.status).toBe(403);
  });

  it("2) 24시간 초과 거부: 단품 결제 후 24시간이 지나면 400(EXPIRED)으로 거부한다", async () => {
    session.current = { user: { id: "user_A" } };
    db.order.findUnique.mockResolvedValueOnce({
      id: "src_db_expired",
      orderId: "kd_ord_expired",
      userId: "user_A",
      status: "PAID",
      amount: 4900,
      compatId: "cmp_1",
      productType: "COMPAT_SPECIAL",
      productKey: "inner_mind",
      createdAt: new Date(Date.now() - SET_UPGRADE_WINDOW_MS - 60_000),
      upgradeFromOrderId: null,
    });
    db.order.findFirst.mockResolvedValueOnce(null);

    const res = await ORDER(
      postJson("/api/payments/order", {
        productId: "set_heart",
        compatId: "cmp_1",
        upgradeFromOrderId: "kd_ord_expired",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("EXPIRED");
    expect(db.order.create).not.toHaveBeenCalled();
  });

  it("3) 서버 금액 계산: 클라이언트 금액을 무시하고 (세트 가격 - 이미 낸 금액, 최소 100원)으로 계산한다", async () => {
    expect(computeSetUpgradeAmount(7900, 4900)).toBe(3000);
    expect(computeSetUpgradeAmount(4900, 4900)).toBe(100);
    expect(computeSetUpgradeAmount(3000, 4900)).toBe(100);
    expect(formatSetUpgradeHeadline(4900, 3000)).toBe(
      "이미 낸 4,900원은 빼고 3,000원만 내면 세트로 바뀌어요"
    );

    session.current = null;
    db.order.findUnique.mockResolvedValueOnce({
      id: "src_guest_1",
      orderId: "kd_ord_guest_1",
      userId: null,
      status: "PAID",
      amount: 4900,
      compatId: "cmp_1",
      productType: "COMPAT_SPECIAL",
      productKey: "inner_mind",
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      upgradeFromOrderId: null,
    });
    db.order.findFirst.mockResolvedValueOnce(null);

    const res = await ORDER(
      postJson("/api/payments/order", {
        productId: "set_heart", // 7,900원
        compatId: "cmp_1",
        upgradeFromOrderId: "kd_ord_guest_1",
        amount: 100, // 클라이언트가 임의로 보낸 금액은 철저히 무시
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.amount).toBe(3000);
    expect(body.upgrade).toBe(true);
    expect(db.order.create).toHaveBeenCalledTimes(1);
    const created = db.order.create.mock.calls[0][0].data;
    expect(created.amount).toBe(3000);
    expect(created.upgradeFromOrderId).toBe("kd_ord_guest_1");
    expect(created.compatId).toBe("cmp_1");
    expect(created.productType).toBe("SET");
    expect(created.productKey).toBe("set_heart");
  });

  it("4) 이중 업그레이드 거부 및 미포함 세트·다른 compatId 거부", async () => {
    session.current = { user: { id: "user_A" } };
    const baseSource = {
      id: "src_db_a",
      orderId: "kd_ord_single_a",
      userId: "user_A",
      status: "PAID",
      amount: 4900,
      compatId: "cmp_1",
      productType: "COMPAT_SPECIAL",
      productKey: "inner_mind",
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
      upgradeFromOrderId: null,
    };

    // 4-a) 이미 PAID 업그레이드 주문이 존재하면 409(ALREADY_UPGRADED)
    db.order.findUnique.mockResolvedValueOnce(baseSource);
    db.order.findFirst.mockResolvedValueOnce({ id: "already_paid_upg" });

    const resDup = await ORDER(
      postJson("/api/payments/order", {
        productId: "set_heart",
        compatId: "cmp_1",
        upgradeFromOrderId: "kd_ord_single_a",
      })
    );
    expect(resDup.status).toBe(409);
    expect((await resDup.json()).code).toBe("ALREADY_UPGRADED");

    // 4-b) 다른 compatId로 업그레이드 시도 -> 400(COMPAT_MISMATCH)
    db.compatibility.findUnique.mockResolvedValueOnce({ id: "cmp_2" });
    db.order.findUnique.mockResolvedValueOnce(baseSource);
    db.order.findFirst.mockResolvedValueOnce(null);

    const resCompatMismatch = await ORDER(
      postJson("/api/payments/order", {
        productId: "set_heart",
        compatId: "cmp_2",
        upgradeFromOrderId: "kd_ord_single_a",
      })
    );
    expect(resCompatMismatch.status).toBe(400);
    expect((await resCompatMismatch.json()).code).toBe("COMPAT_MISMATCH");

    // 4-c) 단품이 포함되지 않은 세트(set_love: love_single + charm) -> 400(NOT_IN_SET)
    db.order.findUnique.mockResolvedValueOnce({
      ...baseSource,
      compatId: null,
      productType: "FORTUNE",
      productKey: "wealth",
    });
    db.order.findFirst.mockResolvedValueOnce(null);

    const resNotInSet = await ORDER(
      postJson("/api/payments/order", {
        productId: "set_love",
        upgradeFromOrderId: "kd_ord_single_a",
      })
    );
    expect(resNotInSet.status).toBe(400);
    expect((await resNotInSet.json()).code).toBe("NOT_IN_SET");
  });

  it("5) 웹훅 및 완료 경로 금액 검증 + PAID 시 같은 compatId로 세트 Unlock 부여(기존 단품 Unlock 유지)", async () => {
    const now = new Date();
    const sourceOrder = {
      id: "src_db_ok",
      orderId: "kd_ord_src_ok",
      userId: "user_A",
      status: "PAID",
      amount: 4900,
      compatId: "cmp_1",
      productType: "COMPAT_SPECIAL",
      productKey: "inner_mind",
      createdAt: new Date(now.getTime() - 20 * 60 * 1000),
      upgradeFromOrderId: null,
    };

    const upgradeOrder = {
      id: "upg_db_ok",
      orderId: "kd_ord_upg_ok",
      userId: "user_A",
      email: "a@example.com",
      status: "PENDING",
      type: "SINGLE",
      amount: 3000, // 7,900 - 4,900
      compatId: "cmp_1",
      productType: "SET",
      productKey: "set_heart",
      createdAt: now,
      upgradeFromOrderId: "kd_ord_src_ok",
      claimToken: null,
      tossPaymentKey: null,
    };

    // 5-a) 웹훅에서 PG 결제 금액이 차액(3,000원)과 불일치(1,000원) -> applyPaidOrder 미실행
    pg.verifyWebhook.mockResolvedValueOnce({
      type: "Transaction.Paid",
      data: { paymentId: "kd_ord_upg_ok" },
    });
    db.order.findUnique.mockResolvedValueOnce(upgradeOrder);
    pg.getPayment.mockResolvedValueOnce({
      status: "PAID",
      amount: { total: 1000 },
      id: "tx_bad_1",
    });

    await WEBHOOK(postJson("/api/webhooks/portone", {}));
    expect(db.order.updateMany).not.toHaveBeenCalled();
    expect(db.unlock.create).not.toHaveBeenCalled();

    // 5-b) DB의 주문 금액이 변조(1,000원)되어 PG(1,000원)와 같더라도 서버 차액 산식(3,000원)과 다르면 권한을 주지 않고 PG 결제를 자동 취소한다
    //      (200 으로 답해 PortOne 이 같은 웹훅을 재시도하지 않게 한다)
    const tamperedUpgradeOrder = { ...upgradeOrder, amount: 1000 };
    pg.verifyWebhook.mockResolvedValueOnce({
      type: "Transaction.Paid",
      data: { paymentId: "kd_ord_upg_ok" },
    });
    db.order.findUnique
      .mockResolvedValueOnce(tamperedUpgradeOrder) // webhook order lookup
      .mockResolvedValueOnce(sourceOrder); // sourceOrder lookup
    db.order.findFirst.mockResolvedValueOnce(null);
    pg.getPayment.mockResolvedValueOnce({
      status: "PAID",
      amount: { total: 1000 },
      id: "tx_tampered",
    });

    const badWebhookRes = await WEBHOOK(postJson("/api/webhooks/portone", {}));
    expect(badWebhookRes.status).toBe(200);
    expect(pg.cancelPayment).toHaveBeenCalledWith("kd_ord_upg_ok", expect.stringContaining("AMOUNT_MISMATCH"));
    expect(db.order.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PAID" }) }),
    );
    expect(db.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "CANCELED" } }),
    );
    expect(db.unlock.create).not.toHaveBeenCalled();
    db.order.updateMany.mockClear();

    // 5-c) 정상 웹훅(3,000원 일치) -> PAID 전환 + 같은 compatId("cmp_1")로 SET Unlock 생성, 기존 단품 Unlock 삭제 없음
    pg.verifyWebhook.mockResolvedValueOnce({
      type: "Transaction.Paid",
      data: { paymentId: "kd_ord_upg_ok" },
    });
    db.order.findUnique
      .mockResolvedValueOnce(upgradeOrder) // webhook order lookup
      .mockResolvedValueOnce(sourceOrder) // verifyUpgradeSettlement sourceOrder
      .mockResolvedValueOnce(upgradeOrder); // applyPaidOrder tx.order.findUnique
    db.order.findFirst
      .mockResolvedValueOnce(null) // webhook existingUpgrade
      .mockResolvedValueOnce(null); // applyPaidOrder tx dupUpgrade
    db.order.updateMany.mockResolvedValueOnce({ count: 1 });
    db.unlock.findFirst.mockResolvedValueOnce(null);
    db.unlock.create.mockResolvedValueOnce({ id: "unlock_set_1" });
    pg.getPayment.mockResolvedValueOnce({
      status: "PAID",
      amount: { total: 3000 },
      id: "tx_ok_3000",
    });

    const okWebhookRes = await WEBHOOK(postJson("/api/webhooks/portone", {}));
    expect(okWebhookRes.status).toBe(200);
    expect(db.unlock.deleteMany).not.toHaveBeenCalled();
    expect(db.unlock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: "upg_db_ok",
        userId: "user_A",
        productType: "SET",
        productKey: "set_heart",
        compatId: "cmp_1",
      }),
    });

    // 5-d) /api/payments/complete 응답에 upgrade: true 포함 확인
    session.current = { user: { id: "user_A" } };
    db.order.findUnique.mockResolvedValueOnce({ ...upgradeOrder, status: "PAID" });
    const completeRes = await COMPLETE(
      postJson("/api/payments/complete", { paymentId: "kd_ord_upg_ok" })
    );
    expect(completeRes.status).toBe(200);
    const completeBody = await completeRes.json();
    expect(completeBody.upgrade).toBe(true);
    expect(completeBody.catalogId).toBe("set_heart");
    expect(completeBody.compatId).toBe("cmp_1");
  });
});
