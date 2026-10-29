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
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  giftCode: {
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
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
  current: null as null | { user: { id: string; email?: string; name?: string } },
}));
const pg = vi.hoisted(() => ({ getPayment: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: db, prisma: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
vi.mock("@/lib/payments", () => ({ payments: pg }));
vi.mock("@/lib/telegram", () => ({ sendTelegramMessage: vi.fn(async () => {}) }));

import { POST as CREATE_ORDER } from "@/app/api/payments/order/route";
import { POST as COMPLETE_ORDER } from "@/app/api/payments/complete/route";
import { POST as REDEEM_GIFT } from "@/app/api/gift/[code]/redeem/route";
import { CATALOG, getProduct } from "@/lib/catalog";
import { invalidateVisibilityCache } from "@/lib/catalogVisibility";
import { formatGiftHeadline, GIFT_EXPIRY_MS } from "@/lib/giftCopy";
import { redeemGiftCode } from "@/lib/payments/gift";

const postReq = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;

describe("운세 선물하기 (argon/13-gift)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateVisibilityCache();
    session.current = null;
    db.productVisibility.findMany.mockResolvedValue(
      CATALOG.map((c) => ({ catalogId: c.id, visible: true }))
    );
    db.order.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        id: "db_" + String(data.orderId),
      })
    );
    db.giftCode.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "gift_db_1",
        used: false,
        redeemedOrderId: null,
        redeemedAt: null,
        createdAt: new Date(),
        ...data,
      })
    );
    db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  });

  it("문구 포맷: '○○님이 2027 신년운세를 선물했어요' 및 받침 조사를 정확히 생성한다", () => {
    expect(formatGiftHeadline("민지", "annual_2027", "2027년 신년운")).toBe(
      "민지님이 2027 신년운세를 선물했어요"
    );
    expect(formatGiftHeadline("수현", "inner_mind", "그 사람 속마음")).toBe(
      "수현님이 그 사람 속마음을 선물했어요"
    );
    expect(formatGiftHeadline(null, "set_heart", "설렘 세트")).toBe(
      "소중한 분님이 설렘 세트를 선물했어요"
    );
  });

  it("선물 주문: 정가 그대로 결제(쿠폰 미적용), 커플 상품도 compatId 없이 생성되며 결제 시 보낸 사람 Unlock 없이 90일 기한이 설정된다", async () => {
    const coupleProd = getProduct("inner_mind")!;
    session.current = { user: { id: "sender_1", email: "sender@example.com", name: "민지" } };
    // 회원이 쿠폰을 보유하고 있어도 선물하기에는 차감되지 않아야 한다
    db.coupon.findFirst.mockResolvedValue({
      id: "cp_1",
      code: "KD1000-TEST",
      amount: 1000,
      ownerKey: "sender_1",
      usedOrderId: null,
      expiresAt: new Date(Date.now() + 86400_000),
    });

    const res = await CREATE_ORDER(
      postReq("/api/payments/order", {
        productId: "inner_mind",
        isGift: true,
        recipientNickname: "수현",
        senderNickname: "민지",
        giftMessage: "궁금해하던 그 사람 마음 선물할게!",
        couponCode: "KD1000-TEST",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.amount).toBe(coupleProd.price);
    expect(body.isGift).toBe(true);
    expect(db.coupon.findFirst).not.toHaveBeenCalled();

    expect(db.giftCode.create).toHaveBeenCalledTimes(1);
    const createdGift = db.giftCode.create.mock.calls[0][0].data;
    expect(createdGift.code).toMatch(/^[a-f0-9]{32}$/);
    expect(createdGift.catalogId).toBe("inner_mind");
    expect(createdGift.recipientNickname).toBe("수현");

    // 결제 완료 시 보낸 사람에게는 Unlock이 발급되지 않고 선물 만료일(90일)이 갱신된다
    db.order.findUnique.mockResolvedValue({
      id: "db_ord_1",
      orderId: body.orderId,
      userId: "sender_1",
      email: "sender@example.com",
      compatId: null,
      productType: "COMPAT",
      productKey: "inner_mind",
      type: "SINGLE",
      amount: coupleProd.price,
      status: "PENDING",
      claimToken: null,
      tossPaymentKey: null,
      createdAt: new Date(),
    });
    db.order.updateMany.mockResolvedValue({ count: 1 });
    db.giftCode.findUnique.mockResolvedValue({
      id: "gift_db_1",
      code: createdGift.code,
      catalogId: "inner_mind",
      purchaseOrderId: body.orderId,
      senderNickname: "민지",
      recipientNickname: "수현",
      message: "궁금해하던 그 사람 마음 선물할게!",
      used: false,
      expiresAt: createdGift.expiresAt,
    });
    db.giftCode.updateMany.mockResolvedValue({ count: 1 });
    pg.getPayment.mockResolvedValue({
      status: "PAID",
      amount: { total: coupleProd.price },
      id: "pg_gift_1",
    });

    const completeRes = await COMPLETE_ORDER(
      postReq("/api/payments/complete", { paymentId: body.orderId })
    );
    expect(completeRes.status).toBe(200);
    const completeJson = await completeRes.json();
    expect(completeJson.isGift).toBe(true);
    expect(completeJson.gift.code).toBe(createdGift.code);
    expect(db.unlock.create).not.toHaveBeenCalled();
    expect(db.giftCode.updateMany).toHaveBeenCalledTimes(1);
  });

  it("결제 안 된 코드(PENDING) 및 환불된 코드(CANCELED)는 사용을 거부한다", async () => {
    const code = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
    db.giftCode.findUnique.mockResolvedValue({
      id: "g_unpaid",
      code,
      catalogId: "annual_2027",
      purchaseOrderId: "kd_ord_pending",
      used: false,
      expiresAt: new Date(Date.now() + GIFT_EXPIRY_MS),
    });

    for (const badStatus of ["PENDING", "CANCELED"] as const) {
      db.order.findUnique.mockResolvedValue({
        id: "ord_1",
        orderId: "kd_ord_pending",
        status: badStatus,
      });

      const res = await REDEEM_GIFT(
        postReq(`/api/gift/${code}/redeem`, { catalogId: "annual_2027" }),
        { params: Promise.resolve({ code }) }
      );
      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.reason).toBe("UNPAID");
      expect(db.unlock.create).not.toHaveBeenCalled();
    }
  });

  it("다른 상품으로 사용하려는 요청을 거부한다", async () => {
    const code = "11223344556677889900aabbccddeeff";
    db.giftCode.findUnique.mockResolvedValue({
      id: "g_1",
      code,
      catalogId: "annual_2027",
      purchaseOrderId: "kd_ord_paid",
      used: false,
      expiresAt: new Date(Date.now() + GIFT_EXPIRY_MS),
    });
    db.order.findUnique.mockResolvedValue({
      id: "ord_paid",
      orderId: "kd_ord_paid",
      status: "PAID",
    });

    const res = await REDEEM_GIFT(
      postReq(`/api/gift/${code}/redeem`, { catalogId: "wealth" }),
      { params: Promise.resolve({ code }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.reason).toBe("CATALOG_MISMATCH");
    expect(db.giftCode.updateMany).not.toHaveBeenCalled();
    expect(db.unlock.create).not.toHaveBeenCalled();
  });

  it("결제일부터 90일이 지난 만료 코드는 사용을 거부한다", async () => {
    const code = "ffeeddccbbaa00998877665544332211";
    const now = new Date("2027-02-15T00:00:00Z");
    const expiredAt = new Date(now.getTime() - 1000);

    db.giftCode.findUnique.mockResolvedValue({
      id: "g_exp",
      code,
      catalogId: "annual_2027",
      purchaseOrderId: "kd_ord_paid",
      used: false,
      expiresAt: expiredAt,
    });
    db.order.findUnique.mockResolvedValue({
      id: "ord_paid",
      orderId: "kd_ord_paid",
      status: "PAID",
    });

    const result = await redeemGiftCode({
      code,
      catalogId: "annual_2027",
      now,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(410);
      expect(result.reason).toBe("EXPIRED");
    }
    expect(db.giftCode.updateMany).not.toHaveBeenCalled();
    expect(db.unlock.create).not.toHaveBeenCalled();
  });

  it("두 번 사용 거부: 첫 수령은 성공하고, 두 번째 수령 및 동시 요청(updateMany count=0)은 409로 거부된다", async () => {
    const code = "0123456789abcdef0123456789abcdef";
    const expiresAt = new Date(Date.now() + GIFT_EXPIRY_MS);

    db.order.findUnique.mockResolvedValue({
      id: "ord_paid",
      orderId: "kd_ord_paid",
      userId: "sender_user",
      status: "PAID",
    });

    // 1) 첫 번째 수령 (수령자는 비회원)
    db.giftCode.findUnique.mockResolvedValueOnce({
      id: "g_once",
      code,
      catalogId: "annual_2027",
      purchaseOrderId: "kd_ord_paid",
      used: false,
      expiresAt,
    });
    db.giftCode.updateMany.mockResolvedValueOnce({ count: 1 });

    const firstRes = await REDEEM_GIFT(
      postReq(`/api/gift/${code}/redeem`, { catalogId: "annual_2027" }),
      { params: Promise.resolve({ code }) }
    );
    expect(firstRes.status).toBe(200);
    const firstJson = await firstRes.json();
    expect(firstJson.ok).toBe(true);
    expect(firstJson.orderId).toMatch(/^kd_gift_/);
    expect(db.order.create).toHaveBeenCalledTimes(1);
    // 수령자 주문은 보낸 사람(sender_user)과 연결되지 않아야 한다
    expect(db.order.create.mock.calls[0][0].data.userId).toBeNull();
    expect(db.unlock.create).toHaveBeenCalledTimes(1);

    // 2) 이미 used=true 인 상태에서 두 번째 수령 시도
    db.giftCode.findUnique.mockResolvedValueOnce({
      id: "g_once",
      code,
      catalogId: "annual_2027",
      purchaseOrderId: "kd_ord_paid",
      used: true,
      expiresAt,
    });

    const secondRes = await REDEEM_GIFT(
      postReq(`/api/gift/${code}/redeem`, { catalogId: "annual_2027" }),
      { params: Promise.resolve({ code }) }
    );
    expect(secondRes.status).toBe(409);
    expect((await secondRes.json()).reason).toBe("ALREADY_USED");
    expect(db.unlock.create).toHaveBeenCalledTimes(1);

    // 3) 동시 요청 경합: findUnique 시점엔 used=false였지만 updateMany가 count=0을 반환한 경우
    db.giftCode.findUnique.mockResolvedValueOnce({
      id: "g_once",
      code,
      catalogId: "annual_2027",
      purchaseOrderId: "kd_ord_paid",
      used: false,
      expiresAt,
    });
    db.giftCode.updateMany.mockResolvedValueOnce({ count: 0 });

    const raceRes = await REDEEM_GIFT(
      postReq(`/api/gift/${code}/redeem`, { catalogId: "annual_2027" }),
      { params: Promise.resolve({ code }) }
    );
    expect(raceRes.status).toBe(409);
    expect((await raceRes.json()).reason).toBe("ALREADY_USED");
    expect(db.unlock.create).toHaveBeenCalledTimes(1);
  });
});
