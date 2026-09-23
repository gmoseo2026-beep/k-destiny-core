import { describe, it, expect } from "vitest";
import { computeHomeRanking, OrderRowForRanking } from "@/lib/home/ranking";
import { getProduct } from "@/lib/catalog";

describe("computeHomeRanking", () => {
  const visible = [
    getProduct("compat_basic")!,
    getProduct("annual_2026")!,
    getProduct("free_personality")!,
    getProduct("love_single")!,
  ];

  it("20건 미만일 때는 '콩닥 추천 콘텐츠'로 전환되고 순위 숫자가 없다", () => {
    const orders: OrderRowForRanking[] = [
      { productType: "COMPAT", productKey: "compat_basic", compatId: "c1", status: "PAID", amount: 6900, provider: "toss" },
      { productType: "ANNUAL", productKey: "2026", compatId: null, status: "PAID", amount: 6900, provider: "toss" },
    ];

    const result = computeHomeRanking(orders, visible, 20);
    expect(result.title).toBe("콩닥 추천 콘텐츠");
    expect(result.isRealRanking).toBe(false);
    expect(result.items.length).toBe(4);
    for (const item of result.items) {
      expect(item.rank).toBeUndefined();
    }
  });

  it("20건 이상이고 유효 상품 4개 이상이면 '지금 많이 보는 콘텐츠'와 1~4위 순위가 부여된다", () => {
    const orders: OrderRowForRanking[] = [];
    // compat_basic 10건
    for (let i = 0; i < 10; i++) {
      orders.push({ productType: "COMPAT", productKey: "compat_basic", compatId: `c_${i}`, status: "PAID", amount: 6900, provider: "toss" });
    }
    // annual_2026 8건
    for (let i = 0; i < 8; i++) {
      orders.push({ productType: "ANNUAL", productKey: "2026", compatId: null, status: "PAID", amount: 6900, provider: "toss" });
    }
    // love_single 4건
    for (let i = 0; i < 4; i++) {
      orders.push({ productType: "FORTUNE", productKey: "love_single", compatId: null, status: "PAID", amount: 6900, provider: "toss" });
    }
    // free_personality 2건
    for (let i = 0; i < 2; i++) {
      orders.push({ productType: "FORTUNE", productKey: "free_personality", compatId: null, status: "PAID", amount: 100, provider: "toss" });
    }

    const result = computeHomeRanking(orders, visible, 20);
    expect(result.title).toBe("지금 많이 보는 콘텐츠");
    expect(result.isRealRanking).toBe(true);
    expect(result.items.length).toBe(4);
    expect(result.items[0].product.id).toBe("compat_basic");
    expect(result.items[0].rank).toBe(1);
    expect(result.items[1].product.id).toBe("annual_2026");
    expect(result.items[1].rank).toBe(2);
    expect(result.items[2].product.id).toBe("love_single");
    expect(result.items[2].rank).toBe(3);
    expect(result.items[3].product.id).toBe("free_personality");
    expect(result.items[3].rank).toBe(4);
  });

  it("admin_manual, amount <= 0, FAILED 주문은 집계에서 제외된다", () => {
    const orders: OrderRowForRanking[] = [];
    // 30건의 무효 주문
    for (let i = 0; i < 15; i++) {
      orders.push({ productType: "COMPAT", productKey: "compat_basic", compatId: `c_${i}`, status: "FAILED", amount: 6900, provider: "toss" });
      orders.push({ productType: "COMPAT", productKey: "compat_basic", compatId: `c_${i}`, status: "PAID", amount: 6900, provider: "admin_manual" });
    }

    const result = computeHomeRanking(orders, visible, 20);
    expect(result.title).toBe("콩닥 추천 콘텐츠");
    expect(result.isRealRanking).toBe(false);
  });
});
