import { describe, it, expect } from "vitest";
import { CATALOG, getProduct, priceLabel, isSellable } from "@/lib/catalog";

describe("catalog 불변식", () => {
  it("id 유일", () => {
    expect(new Set(CATALOG.map((c) => c.id)).size).toBe(CATALOG.length);
  });
  it("세트 구성품은 모두 존재", () => {
    for (const s of CATALOG.filter((c) => c.type === "SET")) {
      for (const id of s.items ?? []) expect(getProduct(id), `${s.id}→${id}`).toBeDefined();
    }
  });
  it("couple 상품은 couple 입력, 프리미엄은 365일·로그인", () => {
    for (const c of CATALOG) {
      if (c.target === "couple") expect(c.inputKind).toBe("couple");
      if (c.tier === "premium") {
        expect(c.accessDays).toBe(365);
        expect(c.requiresLogin).toBe(true);
      }
    }
  });
  it("취소선 가격 없음(D6)", () => {
    for (const c of CATALOG) expect(c.originalPrice).toBe(c.price);
  });
  it("가격 라벨", () => {
    expect(priceLabel(getProduct("wealth")!)).toBe("6,900원 · 회원 첫 결제 4,900원");
    expect(priceLabel(getProduct("set_love")!)).toBe("12,900원");
    expect(priceLabel(getProduct("free_personality")!)).toBe("무료");
  });
  it("무료 상품은 판매 불가", () => {
    expect(isSellable(getProduct("free_personality"))).toBe(false);
  });
});
