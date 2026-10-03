import { describe, it, expect } from "vitest";
import { parseOrderTokenKey, ownedOrdersFor, deviceOrderHref, type DeviceOrder } from "@/lib/payments/deviceOrders";

// 2026-10-03: 결제한 비회원이 상품 화면으로 다시 들어오면 재결제 안내만 나왔다 → 기기의 결제 내역을 읽어 길을 열어 준다
describe("기기에 남은 결제 내역 읽기", () => {
  it("키에서 상품 id 와 궁합 id 를 되돌린다(밑줄이 든 상품 id 포함)", () => {
    expect(parseOrderTokenKey("kongdak_order_annual_2026")).toEqual({ catalogId: "annual_2026", compatId: null });
    expect(parseOrderTokenKey("kongdak_order_inner_mind_cmabc123")).toEqual({ catalogId: "inner_mind", compatId: "cmabc123" });
    expect(parseOrderTokenKey("kongdak_order_set_me")).toEqual({ catalogId: "set_me", compatId: null });
    expect(parseOrderTokenKey("kongdak_order_compat_basic_cm_x_1")).toEqual({ catalogId: "compat_basic", compatId: "cm_x_1" });
  });

  it("모르는 상품·다른 종류의 키는 무시한다", () => {
    expect(parseOrderTokenKey("kongdak_order_unknown_product")).toBeNull();
    expect(parseOrderTokenKey("kongdak_unlock_cmabc")).toBeNull();
    expect(parseOrderTokenKey("kongdak_order_")).toBeNull();
  });

  const orders: DeviceOrder[] = [
    { catalogId: "annual_2026", compatId: null, orderId: "o1" },
    { catalogId: "set_me", compatId: null, orderId: "o2" },
    { catalogId: "inner_mind", compatId: "c9", orderId: "o3" },
    { catalogId: "set_this_person", compatId: "c7", orderId: "o4" },
  ];

  it("그 상품을 직접 샀거나, 그 상품이 든 세트를 산 결제만 고른다", () => {
    expect(ownedOrdersFor("annual_2026", orders).map((o) => o.orderId)).toEqual(["o1", "o2"]);
    expect(ownedOrdersFor("wealth", orders).map((o) => o.orderId)).toEqual(["o2"]);
    expect(ownedOrdersFor("inner_mind", orders).map((o) => o.orderId)).toEqual(["o3", "o4"]);
    expect(ownedOrdersFor("reunion", orders)).toEqual([]);
  });

  it("여는 주소: 총운·정통 궁합은 전용 화면, 나머지는 결제한 상품의 리포트 화면", () => {
    expect(deviceOrderHref("ko", orders[0])).toBe("/ko/fortune/annual?year=2026");
    // 세트로 산 총운도 총운 화면으로
    expect(deviceOrderHref("ko", orders[1], "annual_2026")).toBe("/ko/fortune/annual?year=2026");
    // 세트로 산 재물운은 세트 화면에서 연다
    expect(deviceOrderHref("ko", orders[1], "wealth")).toBe("/ko/report/new?c=set_me");
    expect(deviceOrderHref("ko", orders[2])).toBe("/ko/report/new?c=inner_mind&compat=c9");
    expect(deviceOrderHref("ko", orders[3], "compat_basic")).toBe("/ko/compat/c7");
    expect(deviceOrderHref("ko", orders[3], "marriage")).toBe("/ko/report/new?c=set_this_person&compat=c7");
  });
});
