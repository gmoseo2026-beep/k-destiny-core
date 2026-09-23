import { describe, it, expect } from "vitest";
import { toCatalogId, toStorageKey, grantingCatalogIds, normalizeProductKey } from "@/lib/productIdentity";

describe("productIdentity", () => {
  it("레거시 ANNUAL 저장키 → 카탈로그 id", () => {
    expect(toCatalogId("ANNUAL", "2026", null)).toBe("annual_2026");
    expect(toCatalogId("ANNUAL", "2027", null)).toBe("annual_2027");
  });
  it("초기 궁합 주문(productType null) → compat_basic", () => {
    expect(toCatalogId(null, null, "cmp1")).toBe("compat_basic");
    expect(toCatalogId("COMPAT", null, "cmp1")).toBe("compat_basic");
  });
  it("일반 키는 그대로", () => {
    expect(toCatalogId("FORTUNE", "wealth", null)).toBe("wealth");
    expect(toCatalogId("SET", "set_me", null)).toBe("set_me");
  });
  it("저장키 변환은 annual 레거시 형식 유지", () => {
    expect(toStorageKey("annual_2026")).toEqual({ productType: "ANNUAL", productKey: "2026" });
    expect(toStorageKey("wealth")).toEqual({ productType: "FORTUNE", productKey: "wealth" });
    expect(toStorageKey("set_me")).toEqual({ productType: "SET", productKey: "set_me" });
  });
  it("총운은 자신 + 총운 포함 세트가 연다 (H1)", () => {
    expect(grantingCatalogIds("annual_2026").sort()).toEqual(["annual_2026", "set_career", "set_me"].sort());
  });
  it("정규화", () => {
    expect(normalizeProductKey("ANNUAL:2027")).toBe("annual_2027");
    expect(normalizeProductKey("wealth")).toBe("wealth");
  });
});
