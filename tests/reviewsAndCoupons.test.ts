import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  generatedReport: { findUnique: vi.fn() },
  review: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  coupon: { create: vi.fn() },
  order: { findUnique: vi.fn(), findMany: vi.fn() },
  compatibility: { findMany: vi.fn() },
  userSajuProfile: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; email?: string } } }));

vi.mock("@/lib/prisma", () => ({ default: db, prisma: db }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => session.current) }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
vi.mock("@/components/cards/KongdakCards", () => ({ ListRowCard: () => null }));

import { POST as CREATE_REVIEW, GET as GET_REVIEWS } from "@/app/api/reviews/route";
import {
  validateReviewInput,
  deriveZodiacBadge,
  calculateDiscountedAmount,
  hashGuestOrderToken,
} from "@/lib/reviews";
import { CATALOG } from "@/lib/catalog";
import ProductReviewsSection, { REVIEW_INCENTIVE_NOTE } from "@/components/product/ProductReviewsSection";
import { rememberDeviceCoupon, recallDeviceCoupon, clearDeviceCoupon } from "@/lib/couponsClient";

const post = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;

const get = (url: string) => new Request(`http://localhost${url}`, { method: "GET" }) as never;

describe("P-016-4 후기·쿠폰·N번째 구매 배지 단위 테스트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.current = null;
    db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  });

  it("후기 입력값 검증: 별점 1~5 정수, 후기 2~200자", () => {
    expect(validateReviewInput({ rating: 5, text: "소름 돋게 잘 맞아요!" })).toEqual({
      ok: true,
      rating: 5,
      text: "소름 돋게 잘 맞아요!",
    });
    expect(validateReviewInput({ rating: 0, text: "별점 0점" })).toEqual({
      ok: false,
      error: "별점은 1점부터 5점까지 선택해 주세요.",
    });
    expect(validateReviewInput({ rating: 5, text: "   " })).toEqual({
      ok: false,
      error: "후기를 두 글자 이상 입력해 주세요.",
    });
    expect(validateReviewInput({ rating: 5, text: "가".repeat(201) })).toEqual({
      ok: false,
      error: "후기는 200자 이내로 작성해 주세요.",
    });
  });

  it("띠 배지 추출: 사주 연주(예: 甲辰) 또는 출생 연도에서 띠 이모지·라벨 반환", () => {
    const dragon = deriveZodiacBadge({ yearPillar: "甲辰" });
    expect(dragon.emoji).toBe("🐲");
    expect(dragon.label).toBe("용띠");

    const tiger = deriveZodiacBadge({ birthYear: 1998 });
    expect(tiger.emoji).toBe("🐯");
    expect(tiger.label).toBe("호랑이띠");
  });

  it("할인 금액 계산: 유효 쿠폰 시 정가 - 1,000원", () => {
    expect(calculateDiscountedAmount(9900, 1000)).toEqual({ amount: 8900, discount: 1000 });
    expect(calculateDiscountedAmount(2900, 1000)).toEqual({ amount: 1900, discount: 1000 });
    expect(calculateDiscountedAmount(9900, 0)).toEqual({ amount: 9900, discount: 0 });
  });

  it("리포트를 아직 열지 않은 주문(firstViewedAt === null)은 후기를 작성할 수 없다(403)", async () => {
    session.current = { user: { id: "user_1" } };
    db.generatedReport.findUnique.mockResolvedValue({
      id: "rep_1",
      orderId: "ord_db_1",
      catalogId: "inner_mind",
      compatId: "compat_1",
      kind: "FULL",
      firstViewedAt: null,
    });

    const res = await CREATE_REVIEW(
      post("/api/reviews", {
        reportId: "rep_1",
        rating: 5,
        text: "아직 안 열었지만 후기 쓰기 시도",
      }),
    );
    expect(res.status).toBe(403);
    expect(db.review.create).not.toHaveBeenCalled();
    expect(db.coupon.create).not.toHaveBeenCalled();
  });

  it("실제 열람한 구매자(firstViewedAt != null)는 주문당 후기 1개 + 1,000원 쿠폰 1장을 발급받고, 재작성 시 409", async () => {
    db.generatedReport.findUnique.mockResolvedValue({
      id: "rep_1",
      orderId: "ord_db_1",
      catalogId: "inner_mind",
      compatId: "compat_1",
      kind: "FULL",
      firstViewedAt: new Date(),
    });
    db.order.findUnique.mockResolvedValue({
      id: "ord_db_1",
      orderId: "kd_ord_guest_1",
      userId: null,
      status: "PAID",
      unlocks: [
        {
          productType: "STANDARD",
          productKey: "inner_mind",
          compatId: "compat_1",
          expiresAt: new Date(Date.now() + 86400000),
        },
      ],
    });
    db.review.findUnique.mockResolvedValueOnce(null);
    db.review.create.mockResolvedValue({ id: "rev_1" });
    db.coupon.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "cp_1",
      ...data,
    }));

    const res = await CREATE_REVIEW(
      post("/api/reviews", {
        reportId: "rep_1",
        orderId: "kd_ord_guest_1",
        rating: 5,
        text: "그 사람 속마음이 진짜 정확했어요",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.coupon.amount).toBe(1000);
    expect(body.coupon.code).toMatch(/^KD1000-/);
    expect(body.coupon.ownerToken).toBe("kd_ord_guest_1");

    const createdCoupon = db.coupon.create.mock.calls[0][0].data;
    expect(createdCoupon.ownerKey).toBe(hashGuestOrderToken("kd_ord_guest_1"));
    expect(createdCoupon.amount).toBe(1000);

    // 같은 주문으로 두 번째 후기 작성 시도 → 409
    db.review.findUnique.mockResolvedValueOnce({ id: "rev_1" });
    const dupRes = await CREATE_REVIEW(
      post("/api/reviews", {
        reportId: "rep_1",
        orderId: "kd_ord_guest_1",
        rating: 4,
        text: "두 번째 후기 시도",
      }),
    );
    expect(dupRes.status).toBe(409);
  });

  it("후기 목록 조회 시 실제 누적 결제 수로 'N번째 구매' 배지를 계산하고, 0개면 빈 배열을 반환한다", async () => {
    db.review.findMany.mockResolvedValueOnce([]);
    const emptyRes = await GET_REVIEWS(get("/api/reviews?catalogId=inner_mind"));
    const emptyBody = await emptyRes.json();
    expect(emptyBody.reviews).toEqual([]);

    const t3 = new Date("2026-10-20T10:00:00Z");

    db.review.findMany.mockResolvedValueOnce([
      {
        id: "rev_a",
        orderId: "ord_3",
        catalogId: "inner_mind",
        rating: 5,
        text: "세 번째 구매인데 늘 만족해요",
        displayOk: true,
        createdAt: t3,
      },
    ]);
    db.order.findMany
      // 1) orders corresponding to reviews
      .mockResolvedValueOnce([
        {
          id: "ord_3",
          orderId: "kd_ord_3",
          userId: "user_repeat",
          email: "repeat@example.com",
          compatId: "compat_3",
        },
      ])
      // 2) paidOrdersForUsers
      .mockResolvedValueOnce([
        { userId: "user_repeat" },
        { userId: "user_repeat" },
        { userId: "user_repeat" },
      ])
      // 3) paidOrdersForCompats
      .mockResolvedValueOnce([{ compatId: "compat_3" }]);
    db.compatibility.findMany.mockResolvedValueOnce([
      {
        id: "compat_3",
        personA: { fourPillars: { year: "甲辰" } },
      },
    ]);
    db.userSajuProfile.findMany.mockResolvedValueOnce([]);

    const listRes = await GET_REVIEWS(get("/api/reviews?catalogId=inner_mind"));
    const listBody = await listRes.json();
    expect(listBody.reviews).toHaveLength(1);
    expect(listBody.reviews[0].purchaseCount).toBe(3);
    expect(listBody.reviews[0].zodiacEmoji).toBe("🐲");
    expect(listBody.reviews[0].zodiacLabel).toBe("용띠");
  });

  it("기기 쿠폰 저장·조회·삭제 헬퍼가 만료 여부를 검사한다", () => {
    const store = new Map<string, string>();
    const origWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => store.set(k, v),
          removeItem: (k: string) => store.delete(k),
          key: (i: number) => Array.from(store.keys())[i] ?? null,
          get length() {
            return store.size;
          },
        },
      },
      configurable: true,
    });

    try {
      const future = new Date(Date.now() + 86400000).toISOString();
      rememberDeviceCoupon({ code: "KD1000-ABCD", amount: 1000, expiresAt: future });
      expect(recallDeviceCoupon()?.code).toBe("KD1000-ABCD");

      clearDeviceCoupon();
      expect(recallDeviceCoupon()).toBeNull();
    } finally {
      Object.defineProperty(globalThis, "window", { value: origWindow, configurable: true });
    }
  });

  it("Argon-03: 직접 후기가 0개인 결제창 조회(fallback=1)는 같은 target(커플/개인) 상품의 최근 실제 후기만 최대 2개 반환한다", async () => {
    const t1 = new Date("2026-10-28T10:00:00Z");
    const t2 = new Date("2026-10-27T10:00:00Z");

    // 1) 커플 상품(marriage) 직접 후기 0건 → 커플 상품 풀에서만 최대 2건 조회
    db.review.findMany
      .mockResolvedValueOnce([]) // direct marriage reviews = 0
      .mockResolvedValueOnce([
        {
          id: "rev_c1",
          orderId: "ord_c1",
          catalogId: "inner_mind",
          rating: 5,
          text: "속마음 리포트 너무 정확해요",
          displayOk: true,
          createdAt: t1,
        },
        {
          id: "rev_c2",
          orderId: "ord_c2",
          catalogId: "reunion",
          rating: 4,
          text: "재회 타이밍 정리에 도움 됐어요",
          displayOk: true,
          createdAt: t2,
        },
      ]);
    db.order.findMany
      .mockResolvedValueOnce([
        { id: "ord_c1", orderId: "kd_c1", userId: null, email: null, compatId: "cmp_1" },
        { id: "ord_c2", orderId: "kd_c2", userId: null, email: null, compatId: "cmp_2" },
      ])
      .mockResolvedValueOnce([{ compatId: "cmp_1" }, { compatId: "cmp_2" }]);
    db.compatibility.findMany.mockResolvedValueOnce([]);

    const coupleRes = await GET_REVIEWS(get("/api/reviews?catalogId=marriage&fallback=1"));
    const coupleBody = await coupleRes.json();

    expect(coupleBody.reviews).toEqual([]);
    expect(coupleBody.fallbackReviews).toHaveLength(2);
    expect(coupleBody.fallbackReviews.map((r: { catalogId: string }) => r.catalogId)).toEqual([
      "inner_mind",
      "reunion",
    ]);

    const fallbackWhereIds: string[] = db.review.findMany.mock.calls[1][0].where.catalogId.in;
    const targetById = new Map(CATALOG.map((item) => [item.id, item.target]));
    expect(fallbackWhereIds.length).toBeGreaterThan(0);
    expect(fallbackWhereIds).not.toContain("marriage");
    for (const id of fallbackWhereIds) {
      expect(targetById.get(id)).toBe("couple");
    }

    // 2) 개인 상품(health) 직접 후기 0건 → 개인 상품 풀에서만 조회
    vi.clearAllMocks();
    db.review.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await GET_REVIEWS(get("/api/reviews?catalogId=health&fallback=1"));
    const indivWhereIds: string[] = db.review.findMany.mock.calls[1][0].where.catalogId.in;
    expect(indivWhereIds.length).toBeGreaterThan(0);
    expect(indivWhereIds).not.toContain("health");
    for (const id of indivWhereIds) {
      expect(targetById.get(id)).toBe("individual");
    }
  });

  it("Argon-03: 결제창 폴백 렌더링 시 '다른 리포트 구매자 후기', 각 후기 상품명, REVIEW_INCENTIVE_NOTE가 모두 표시된다", () => {
    const html = renderToStaticMarkup(
      React.createElement(ProductReviewsSection, {
        variant: "checkout",
        productId: "marriage",
        reviews: [],
        fallbackReviews: [
          {
            id: "rev_c1",
            catalogId: "inner_mind",
            rating: 5,
            text: "속마음이 소름 돋게 맞았어요",
            zodiacEmoji: "🐯",
            zodiacLabel: "호랑이띠",
            purchaseCount: 2,
            createdAt: "2026-10-28T10:00:00.000Z",
          },
          {
            id: "rev_c2",
            catalogId: "reunion",
            rating: 5,
            text: "재회 연락 전에 읽길 잘했어요",
            zodiacEmoji: "🐰",
            zodiacLabel: "토끼띠",
            purchaseCount: 1,
            createdAt: "2026-10-27T10:00:00.000Z",
          },
          {
            id: "rev_c3_ignored",
            catalogId: "compat_basic",
            rating: 4,
            text: "세 번째는 노출되지 않아야 함",
            zodiacEmoji: "🐲",
            zodiacLabel: "용띠",
            purchaseCount: 1,
            createdAt: "2026-10-26T10:00:00.000Z",
          },
        ],
      }),
    );

    expect(html).toContain("다른 리포트 구매자 후기");
    expect(html).toContain(REVIEW_INCENTIVE_NOTE);
    expect(html).toContain("그 사람의 속마음");
    expect(html).toContain("재회운");
    expect(html).not.toContain("세 번째는 노출되지 않아야 함");
  });
});
