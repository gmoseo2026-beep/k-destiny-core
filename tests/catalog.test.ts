import { describe, it, expect } from "vitest";
import { CATALOG, getProduct, priceLabel, isSellable, teaserCatalogIdFor, separatePrice, setsContaining } from "@/lib/catalog";
import { PRODUCT_SPECS } from "@/lib/prompts/productSpecs";

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
    expect(priceLabel(getProduct("set_love")!)).toBe("9,900원");
    expect(priceLabel(getProduct("free_personality")!)).toBe("무료");
  });
  it("무료 상품은 판매 불가", () => {
    expect(isSellable(getProduct("free_personality"))).toBe(false);
  });
  it("T2 필드 불변식 (icon3d, gridLabel, hook, recommendFor 정확히 3개)", () => {
    const hanjaRegex = /[\u4e00-\u9fff]/;
    for (const c of CATALOG) {
      expect(c.icon3d, `${c.id} icon3d`).toMatch(/^\/(icons3d|mascot)\/.+\.webp$/);
      expect(c.gridLabel, `${c.id} gridLabel`).toBeTruthy();
      expect(c.gridLabel.length).toBeLessThanOrEqual(10);
      expect(c.hook, `${c.id} hook`).toBeTruthy();
      expect(c.recommendFor, `${c.id} recommendFor`).toBeDefined();
      expect(c.recommendFor.length, `${c.id} recommendFor length`).toBe(3);

      // 문구 검증: 한자 금지
      expect(hanjaRegex.test(c.hook), `${c.id} hook has hanja`).toBe(false);
      for (const rec of c.recommendFor) {
        expect(hanjaRegex.test(rec), `${c.id} recommendFor has hanja`).toBe(false);
      }
    }
  });
});

describe("세트 맛보기 대표 상품", () => {
  // 서버는 세트 단위 TEASER 를 400 으로 거절한다 → 모든 세트는 생성 가능한 구성 상품으로 맛보기를 만들어야 한다
  it("모든 세트가 프롬프트 스펙이 있는 같은 대상의 구성 상품을 대표로 가진다", () => {
    for (const s of CATALOG.filter((c) => c.type === "SET")) {
      const id = teaserCatalogIdFor(s);
      const item = getProduct(id);
      expect(item?.type, s.id).not.toBe("SET");
      expect(s.items, s.id).toContain(id);
      expect(item?.target, s.id).toBe(s.target);
      expect(PRODUCT_SPECS[item!.promptKey], `${s.id}→${id}`).toBeDefined();
    }
  });
  it("단건 상품은 자기 자신", () => {
    expect(teaserCatalogIdFor(getProduct("wealth")!)).toBe("wealth");
  });
});

describe("세트 추천·가격 비교", () => {
  const allIds = CATALOG.map((c) => c.id);
  it("모든 세트는 따로 사는 것보다 싸다(비교 문구가 거짓이 되지 않게)", () => {
    for (const s of CATALOG.filter((c) => c.type === "SET")) {
      expect(separatePrice(s) - s.price, s.id).toBeGreaterThanOrEqual(3000);
    }
  });
  it("따로 사면 금액은 실제 단건 가격의 합", () => {
    expect(separatePrice(getProduct("set_me")!)).toBe(4 * 6900);
    expect(separatePrice(getProduct("set_love")!)).toBe(2 * 6900);
    expect(getProduct("set_love")!.price).toBe(9900);
    expect(getProduct("set_career")!.price).toBe(9900);
  });
  it("재물운이 든 세트를 아끼는 금액 큰 순으로 찾고, 숨긴 세트는 빼며, 세트 자신은 추천하지 않는다", () => {
    expect(setsContaining("wealth", allIds).map((s) => s.id)).toEqual(["set_me", "set_2027"]);
    expect(setsContaining("wealth", allIds.filter((id) => id !== "set_me")).map((s) => s.id)).toEqual(["set_2027"]);
    expect(setsContaining("set_me", allIds)).toEqual([]);
    expect(setsContaining("compat_basic", allIds).map((s) => s.id)).toEqual(["set_this_person"]);
  });
});
