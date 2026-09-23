import { describe, it, expect } from "vitest";
import { expandOrderReports, type OrderLike } from "@/lib/reports/mine";

describe("expandOrderReports", () => {
  it("set_love 주문이면 love_single, charm 2행으로 펼쳐진다", () => {
    const order: OrderLike = {
      id: "db_ord_1",
      orderId: "kd_ord_1",
      compatId: null,
      createdAt: new Date(),
      unlocks: [
        {
          productType: "SET",
          productKey: "set_love",
          compatId: null,
          expiresAt: null,
        },
      ],
    };

    const rows = expandOrderReports(order);
    expect(rows).toEqual([
      { catalogId: "love_single", compatId: null, cacheKey: "FULL:db_ord_1:love_single" },
      { catalogId: "charm", compatId: null, cacheKey: "FULL:db_ord_1:charm" },
    ]);
  });

  it("ANNUAL/2026 이면 annual_2026 1행", () => {
    const order: OrderLike = {
      id: "db_ord_2",
      orderId: "kd_ord_2",
      compatId: null,
      createdAt: new Date(),
      unlocks: [
        {
          productType: "ANNUAL",
          productKey: "2026",
          compatId: null,
          expiresAt: null,
        },
      ],
    };

    const rows = expandOrderReports(order);
    expect(rows).toEqual([
      { catalogId: "annual_2026", compatId: null, cacheKey: "FULL:db_ord_2:annual_2026" },
    ]);
  });

  it("레거시 궁합(productType null, compatId cmp123)이면 compat_basic 1행", () => {
    const order: OrderLike = {
      id: "db_ord_3",
      orderId: "kd_ord_3",
      compatId: "cmp123",
      createdAt: new Date(),
      unlocks: [
        {
          productType: null,
          productKey: null,
          compatId: "cmp123",
          expiresAt: null,
        },
      ],
    };

    const rows = expandOrderReports(order);
    expect(rows).toEqual([
      { catalogId: "compat_basic", compatId: "cmp123", cacheKey: "FULL:db_ord_3:compat_basic" },
    ]);
  });
});
