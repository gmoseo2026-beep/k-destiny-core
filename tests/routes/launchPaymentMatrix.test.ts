// 출시 결제 매트릭스: 판매 중인 모든 상품에 대해
//   ① 주문 금액(게스트 / 회원 첫 결제 / 회원 재구매) ② 결제 검증(complete) ③ 권한 부여(Unlock) ④ 열람 판정
// 을 한 번에 확인한다. 새 상품을 추가하면 자동으로 이 매트릭스에 들어온다.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  order: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  unlock: { findFirst: vi.fn(), create: vi.fn() },
  user: { findUnique: vi.fn() },
  compatibility: { findUnique: vi.fn() },
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
import { CATALOG, FIRST_PURCHASE_PRICE, type CatalogItem } from "@/lib/catalog";
import { invalidateVisibilityCache } from "@/lib/catalogVisibility";
import { toStorageKey } from "@/lib/productIdentity";
import { orderGrants } from "@/lib/entitlementRules";

const post = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }) as never;

// 출시 후 상태(전 상품 공개)에서 판매 대상인 상품
const SELLABLE = CATALOG.filter((p) => !p.isFree && p.price > 0);

function expectedMemberFirst(p: CatalogItem) {
  return p.tier === "standard" && p.type !== "SET" ? Math.min(p.price, FIRST_PURCHASE_PRICE) : p.price;
}

beforeEach(() => {
  vi.clearAllMocks();
  invalidateVisibilityCache();
  session.current = null;
  db.productVisibility.findMany.mockResolvedValue(CATALOG.map((c) => ({ catalogId: c.id, visible: true })));
  db.compatibility.findUnique.mockResolvedValue({ id: "compat_1" });
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
