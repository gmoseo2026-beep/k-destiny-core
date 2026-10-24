// 출시 결제 매트릭스: 판매 중인 모든 상품에 대해
//   ① 주문 금액(게스트 / 회원 — 회원 첫 결제 할인은 2026-10-15 폐지) ② 결제 검증(complete) ③ 권한 부여(Unlock) ④ 열람 판정
// 을 한 번에 확인한다. 새 상품을 추가하면 자동으로 이 매트릭스에 들어온다.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  order: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  unlock: { findFirst: vi.fn(), create: vi.fn() },
  user: { findUnique: vi.fn() },
  compatibility: { findUnique: vi.fn() },
  coupon: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
  productVisibility: { findMany: vi.fn(async () => [] as Array<{ catalogId: string; visible: boolean }>) },
  $transaction: vi.fn(),
}));
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; email?: string } } }));
const pg = vi.hoisted(() => ({ getPayment: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: db, prisma: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
vi.mock("@/lib/payments", () => ({ payments: pg }));

import { POST as ORDER } from "@/app/api/payments/order/route";
import { POST as COMPLETE } from "@/app/api/payments/complete/route";
import { CATALOG, type CatalogItem } from "@/lib/catalog";
import { invalidateVisibilityCache } from "@/lib/catalogVisibility";
import { toStorageKey } from "@/lib/productIdentity";
import { orderGrants } from "@/lib/entitlementRules";
import { hashGuestOrderToken } from "@/lib/reviews";

const post = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }) as never;

// 출시 후 상태(전 상품 공개)에서 판매 대상인 상품
const SELLABLE = CATALOG.filter((p) => !p.isFree && p.price > 0);

function expectedMemberFirst(p: CatalogItem) {
  return p.price; // 결제한 적 없는 회원도 판매가 그대로
}

beforeEach(() => {
  vi.clearAllMocks();
  invalidateVisibilityCache();
  session.current = null;
  db.productVisibility.findMany.mockResolvedValue(CATALOG.map((c) => ({ catalogId: c.id, visible: true })));
  db.compatibility.findUnique.mockResolvedValue({ id: "compat_1" });
  db.coupon.findUnique.mockResolvedValue(null);
  db.coupon.findFirst.mockResolvedValue(null);
  db.coupon.updateMany.mockResolvedValue({ count: 1 });
  db.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...data, id: "db_" + String(data.orderId) }));
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
});

describe("출시 결제 매트릭스 — 주문 금액", () => {
  for (const p of SELLABLE) {
    const compatId = p.target === "couple" ? "compat_1" : undefined;

    it(`${p.id} 게스트: ${p.requiresLogin ? "로그인 필요(401)" : `${p.price}원`}`, async () => {
      const res = await ORDER(post("/api/payments/order", { productId: p.id, compatId, email: "guest@example.com" }));
      if (p.requiresLogin) {
        expect(res.status).toBe(401);
        return;
      }
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.amount).toBe(p.price);
      expect(body.orderName).toBe(p.name);
    });

    it(`${p.id} 회원 첫 결제 ${expectedMemberFirst(p)}원 / 재구매 ${p.price}원, 저장 키·궁합 id 가 맞다`, async () => {
      session.current = { user: { id: "user_1", email: "member@example.com" } };
      db.order.findFirst.mockResolvedValueOnce(null);
      const first = await (await ORDER(post("/api/payments/order", { productId: p.id, compatId }))).json();
      expect(first.amount).toBe(expectedMemberFirst(p));

      db.order.findFirst.mockResolvedValue({ id: "paid_before" });
      const again = await (await ORDER(post("/api/payments/order", { productId: p.id, compatId }))).json();
      expect(again.amount).toBe(p.price);

      const created = db.order.create.mock.calls.at(-1)![0].data;
      expect({ productType: created.productType, productKey: created.productKey }).toEqual(toStorageKey(p.id));
      expect(created.compatId).toBe(compatId ?? null);
      expect(created.status).toBe("PENDING");
    });

    if (p.target === "couple") {
      it(`${p.id} 궁합 id 없이는 주문 불가(400)`, async () => {
        const res = await ORDER(post("/api/payments/order", { productId: p.id, email: "guest@example.com" }));
        expect(res.status).toBe(400);
      });
    }
  }

  it("숨긴 상품은 주문 불가(400) — 어드민 숨김이 즉시 판매를 멈춘다", async () => {
    db.productVisibility.findMany.mockResolvedValue([{ catalogId: "wealth", visible: false }]);
    const res = await ORDER(post("/api/payments/order", { productId: "wealth", email: "guest@example.com" }));
    expect(res.status).toBe(400);
  });
});

describe("출시 결제 매트릭스 — 결제 검증 → 권한 → 열람", () => {
  for (const p of SELLABLE) {
    const compatId = p.target === "couple" ? "compat_1" : null;
    const { productType, productKey } = toStorageKey(p.id);
    const orderRow = {
      id: "db_ord", orderId: "kd_ord_x", status: "PENDING", type: "SINGLE", amount: p.price,
      productType, productKey, compatId, userId: "user_1", email: "member@example.com",
      claimToken: null, tossPaymentKey: null,
    };

    it(`${p.id}: PG 금액 일치 → PAID + Unlock 1건 → ${p.type === "SET" ? "구성 상품 전부" : "본 상품"} 열람 가능`, async () => {
      session.current = { user: { id: "user_1" } };
      db.order.findUnique.mockResolvedValue(orderRow);
      db.order.updateMany.mockResolvedValue({ count: 1 });
      db.unlock.findFirst.mockResolvedValue(null);
      pg.getPayment.mockResolvedValue({ status: "PAID", amount: { total: p.price }, id: "pg_tx" });

      const res = await COMPLETE(post("/api/payments/complete", { paymentId: "kd_ord_x" }));
      expect(res.status).toBe(200);
      expect((await res.json()).catalogId).toBe(p.id);

      expect(db.unlock.create).toHaveBeenCalledTimes(1);
      const u = db.unlock.create.mock.calls[0][0].data;
      expect({ productType: u.productType, productKey: u.productKey, compatId: u.compatId }).toEqual({ productType, productKey, compatId });
      const days = Math.round((u.expiresAt.getTime() - Date.now()) / 86400000);
      expect(days).toBe(p.accessDays ?? 90);

      const paid = { orderId: "kd_ord_x", userId: "user_1", status: "PAID", unlocks: [u] };
      for (const target of p.type === "SET" ? p.items ?? [] : [p.id]) {
        const g = orderGrants(paid, { catalogId: target, compatId, now: new Date(), sessionUserId: "user_1", presentedOrderId: null });
        expect(g.ok, `${p.id} → ${target}`).toBe(true);
      }
      // 다른 상품은 열리지 않는다(B1)
      const other = SELLABLE.find((x) => x.type !== "SET" && x.id !== p.id && !(p.items ?? []).includes(x.id))!;
      const g2 = orderGrants(paid, { catalogId: other.id, compatId: other.target === "couple" ? "compat_1" : null, now: new Date(), sessionUserId: "user_1", presentedOrderId: null });
      expect(g2.ok, `${p.id} ↛ ${other.id}`).toBe(false);
    });
  }

  it("PG 금액이 주문과 다르면 400, 권한 부여 없음", async () => {
    db.order.findUnique.mockResolvedValue({ id: "db", orderId: "kd_ord_y", status: "PENDING", amount: 6900, userId: null, claimToken: null });
    pg.getPayment.mockResolvedValue({ status: "PAID", amount: { total: 100 } });
    const res = await COMPLETE(post("/api/payments/complete", { paymentId: "kd_ord_y" }));
    expect(res.status).toBe(400);
    expect(db.unlock.create).not.toHaveBeenCalled();
  });

  it("PG 가 결제 완료가 아니면 402, 권한 부여 없음", async () => {
    db.order.findUnique.mockResolvedValue({ id: "db", orderId: "kd_ord_z", status: "PENDING", amount: 6900, userId: null, claimToken: null });
    pg.getPayment.mockResolvedValue({ status: "READY", amount: { total: 6900 } });
    const res = await COMPLETE(post("/api/payments/complete", { paymentId: "kd_ord_z" }));
    expect(res.status).toBe(402);
    expect(db.unlock.create).not.toHaveBeenCalled();
  });

  it("다른 회원의 주문은 완료 처리할 수 없다(403)", async () => {
    session.current = { user: { id: "someone_else" } };
    db.order.findUnique.mockResolvedValue({ id: "db", orderId: "kd_ord_w", status: "PENDING", amount: 6900, userId: "user_1" });
    const res = await COMPLETE(post("/api/payments/complete", { paymentId: "kd_ord_w" }));
    expect(res.status).toBe(403);
    expect(pg.getPayment).not.toHaveBeenCalled();
  });
});

describe("출시 결제 매트릭스 — 1,000원 후기 쿠폰 서버 계산 및 PortOne 검증", () => {
  const futureDate = new Date(Date.now() + 7 * 86400000);
  const pastDate = new Date(Date.now() - 86400000);

  it("회원 유효 쿠폰(1,000원) 자동 적용: 서버 계산 금액 = catalog.price - 1000 = PortOne 결제 금액", async () => {
    const p = SELLABLE[0];
    const compatId = p.target === "couple" ? "compat_1" : undefined;
    session.current = { user: { id: "user_1", email: "member@example.com" } };
    db.coupon.findFirst.mockResolvedValue({
      id: "cp_1",
      code: "KD1000-MEM1",
      amount: 1000,
      ownerKey: "user_1",
      usedOrderId: null,
      expiresAt: futureDate,
    });

    const orderRes = await ORDER(post("/api/payments/order", { productId: p.id, compatId }));
    expect(orderRes.status).toBe(200);
    const orderBody = await orderRes.json();
    expect(orderBody.amount).toBe(p.price - 1000);
    expect(orderBody.discountAmount).toBe(1000);
    expect(orderBody.couponCode).toBe("KD1000-MEM1");

    const createdOrder = db.order.create.mock.calls.at(-1)![0].data;
    expect(createdOrder.amount).toBe(p.price - 1000);
    expect(db.coupon.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cp_1", usedOrderId: null },
        data: { usedOrderId: orderBody.orderId },
      }),
    );

    // PortOne 결제 금액이 서버 계산 금액(p.price - 1000)과 일치할 때만 COMPLETE 통과
    const { productType, productKey } = toStorageKey(p.id);
    db.order.findUnique.mockResolvedValue({
      id: "db_cp",
      orderId: orderBody.orderId,
      status: "PENDING",
      type: "SINGLE",
      amount: p.price - 1000,
      productType,
      productKey,
      compatId: compatId ?? null,
      userId: "user_1",
      email: "member@example.com",
      claimToken: null,
      tossPaymentKey: null,
    });
    db.order.updateMany.mockResolvedValue({ count: 1 });
    db.unlock.findFirst.mockResolvedValue(null);
    pg.getPayment.mockResolvedValue({ status: "PAID", amount: { total: p.price - 1000 }, id: "pg_cp_tx" });

    const completeRes = await COMPLETE(post("/api/payments/complete", { paymentId: orderBody.orderId }));
    expect(completeRes.status).toBe(200);
  });

  it("비회원 유효 쿠폰(주문 토큰 해시 일치) 적용 시 1,000원 차감, 타인 쿠폰 코드 도용 시 할인 미적용", async () => {
    const p = SELLABLE.find((item) => !item.requiresLogin)!;
    const compatId = p.target === "couple" ? "compat_1" : undefined;
    const guestPrevOrderToken = "kd_ord_guest_prev_123";
    const guestOwnerKey = hashGuestOrderToken(guestPrevOrderToken);

    db.coupon.findUnique.mockResolvedValue({
      id: "cp_guest",
      code: "KD1000-GUEST1",
      amount: 1000,
      ownerKey: guestOwnerKey,
      usedOrderId: null,
      expiresAt: futureDate,
    });

    // 1) 본인 기기 주문 토큰 제시 → 1,000원 할인 적용
    const okRes = await ORDER(
      post("/api/payments/order", {
        productId: p.id,
        compatId,
        couponCode: "KD1000-GUEST1",
        guestOrderTokens: [guestPrevOrderToken],
      }),
    );
    expect(okRes.status).toBe(200);
    const okBody = await okRes.json();
    expect(okBody.amount).toBe(p.price - 1000);
    expect(okBody.discountAmount).toBe(1000);

    // 2) 주문 토큰 없이 쿠폰 코드만 보낸 경우 → 소유자 검증 실패로 정가 결제
    const stolenRes = await ORDER(
      post("/api/payments/order", {
        productId: p.id,
        compatId,
        couponCode: "KD1000-GUEST1",
        guestOrderTokens: ["kd_ord_wrong_token"],
      }),
    );
    expect(stolenRes.status).toBe(200);
    const stolenBody = await stolenRes.json();
    expect(stolenBody.amount).toBe(p.price);
    expect(stolenBody.discountAmount).toBeUndefined();
    expect(stolenBody.couponCode).toBeUndefined();
  });

  it("만료되었거나 이미 PAID 주문에 사용된 쿠폰은 할인되지 않고 정가로 주문된다", async () => {
    const p = SELLABLE.find((item) => !item.requiresLogin)!;
    const compatId = p.target === "couple" ? "compat_1" : undefined;
    session.current = { user: { id: "user_1", email: "member@example.com" } };

    // 만료된 쿠폰
    db.coupon.findUnique.mockResolvedValueOnce({
      id: "cp_exp",
      code: "KD1000-EXP",
      amount: 1000,
      ownerKey: "user_1",
      usedOrderId: null,
      expiresAt: pastDate,
    });
    const expRes = await ORDER(post("/api/payments/order", { productId: p.id, compatId, couponCode: "KD1000-EXP" }));
    const expBody = await expRes.json();
    expect(expBody.amount).toBe(p.price);
    expect(expBody.discountAmount).toBeUndefined();

    // 이미 PAID 된 주문에 묶인 쿠폰
    db.coupon.findUnique.mockResolvedValueOnce({
      id: "cp_used",
      code: "KD1000-USED",
      amount: 1000,
      ownerKey: "user_1",
      usedOrderId: "kd_ord_already_paid",
      expiresAt: futureDate,
    });
    db.order.findUnique.mockResolvedValueOnce({ status: "PAID" });
    const usedRes = await ORDER(post("/api/payments/order", { productId: p.id, compatId, couponCode: "KD1000-USED" }));
    const usedBody = await usedRes.json();
    expect(usedBody.amount).toBe(p.price);
    expect(usedBody.discountAmount).toBeUndefined();
  });
});
