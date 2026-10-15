import { describe, it, expect } from "vitest";
import {
  CATALOG, getProduct, priceLabel, isSellable, teaserCatalogIdFor, separatePrice, setsContaining, LAUNCH_PRICE, listPrice,
  SEASON_PROMO_ENDS_AT, SEASON_PROMO_PRICES, seasonPriceAt, isOnSeasonPromo, discountBadge,
} from "@/lib/catalog";
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
  it("couple 상품은 couple 입력, 프리미엄은 365일, 로그인 강제 상품 없음(2026-10-03)", () => {
    for (const c of CATALOG) {
      if (c.target === "couple") expect(c.inputKind).toBe("couple");
      if (c.tier === "premium") {
        expect(c.accessDays).toBe(365);
      }
      expect(c.requiresLogin, c.id).toBeFalsy();
    }
  });
  it("취소선 정가는 오픈 기념가인 표준 단품에만(실제로 받던 6,900원) — D6 를 2026-10-02 결정으로 대체", () => {
    for (const c of CATALOG) {
      // 연말 특가 상품은 날짜에 따라 값이 달라진다 → 아래 "연말 특가" 테스트에서 시각을 정해 따로 본다
      if (c.id in SEASON_PROMO_PRICES) continue;
      const launch = c.tier === "standard" && c.type !== "SET" && !c.isFree;
      if (launch) {
        expect(c.price, c.id).toBe(LAUNCH_PRICE);
        expect(c.originalPrice, c.id).toBe(6900);
        expect(listPrice(c), c.id).toBe(6900);
      } else {
        expect(c.originalPrice, c.id).toBe(c.price);
        expect(listPrice(c), c.id).toBeNull();
      }
    }
  });
  describe("연말 특가(2026-12-31 23:59 KST 까지)", () => {
    const during = Date.parse("2026-10-13T12:00:00+09:00");
    const lastSecond = Date.parse("2026-12-31T23:59:59+09:00");
    const after = Date.parse("2027-01-01T00:00:00+09:00");

    it("대상은 2026년 총운, 취업/이직 세트, 2027 대운 프리미엄 리포트 셋", () => {
      expect(Object.keys(SEASON_PROMO_PRICES).sort()).toEqual(["annual_2026", "premium_2027_daeun", "set_career"]);
      expect(SEASON_PROMO_ENDS_AT).toBe(after);
      expect(seasonPriceAt("wealth", during)).toBeUndefined();
      expect(isOnSeasonPromo("annual_2027", during)).toBe(false);
    });

    it("기간 중: 총운 3,000원(직전 4,900원), 취업/이직 세트 6,900원(직전 7,900원), 대운 9,900원(직전 19,900원)", () => {
      for (const t of [during, lastSecond]) {
        expect(seasonPriceAt("annual_2026", t)).toEqual({ price: 3000, originalPrice: 4900 });
        expect(seasonPriceAt("set_career", t)).toEqual({ price: 6900, originalPrice: 7900 });
        expect(seasonPriceAt("premium_2027_daeun", t)).toEqual({ price: 9900, originalPrice: 19900 });
        expect(isOnSeasonPromo("annual_2026", t)).toBe(true);
        expect(isOnSeasonPromo("set_career", t)).toBe(true);
        expect(discountBadge({ id: "annual_2026" }, t)).toBe("연말 특가 · 12/31까지");
        expect(discountBadge({ id: "set_career" }, t)).toBe("연말 특가 · 12/31까지");
      }
      expect(discountBadge({ id: "wealth" }, during)).toBe("오픈 기념가");
    });

    it("1월 1일 0시부터는 배포 없이 원래 가격으로 돌아간다(취업/이직 세트 7,900원 vs 따로 사면 9,800원)", () => {
      expect(seasonPriceAt("annual_2026", after)).toEqual({ price: LAUNCH_PRICE, originalPrice: 6900 });
      expect(seasonPriceAt("set_career", after)).toEqual({ price: 7900, originalPrice: 7900 });
      expect(seasonPriceAt("premium_2027_daeun", after)).toEqual({ price: 19900, originalPrice: 19900 });
      expect(isOnSeasonPromo("annual_2026", after)).toBe(false);
      expect(isOnSeasonPromo("set_career", after)).toBe(false);
      expect(discountBadge({ id: "annual_2026" }, after)).toBe("오픈 기념가");
      // 특가 종료 후 취업/이직 세트(7,900원) vs 단품 합계(career 4,900원 + annual_2026 4,900원 = 9,800원)
      const careerAfter = getProduct("career")!.price + seasonPriceAt("annual_2026", after)!.price;
      expect(careerAfter).toBe(9800);
      expect(seasonPriceAt("set_career", after)!.price).toBe(7900);
    });

    it("상품 객체의 price 는 읽는 순간의 시각을 따른다(화면·주문 금액이 같은 값을 본다)", () => {
      const annual = getProduct("annual_2026")!;
      const daeun = getProduct("premium_2027_daeun")!;
      const setCareer = getProduct("set_career")!;
      const expected = (id: string) => seasonPriceAt(id, Date.now())!;
      expect(annual.price).toBe(expected("annual_2026").price);
      expect(annual.originalPrice).toBe(expected("annual_2026").originalPrice);
      expect(daeun.price).toBe(expected("premium_2027_daeun").price);
      expect(setCareer.price).toBe(expected("set_career").price);
      expect(setCareer.originalPrice).toBe(expected("set_career").originalPrice);
      // 펼쳐 복사해도(서버가 화면에 넘길 때) 값이 그대로 실린다
      expect({ ...annual }.price).toBe(annual.price);
      expect(JSON.parse(JSON.stringify(daeun)).price).toBe(daeun.price);
      // 특가가 따로 사는 값보다 비싼 세트를 만들지 않는다
      for (const set of setsContaining("annual_2026", CATALOG.map((c) => c.id))) {
        expect(separatePrice(set), set.id).toBeGreaterThan(set.price);
      }
    });
  });

  it("가격 라벨", () => {
    // 회원 첫 결제 할인은 폐지(2026-10-15) — 라벨은 가격 하나뿐이다
    expect(priceLabel(getProduct("wealth")!)).toBe("4,900원");
    for (const p of CATALOG) expect(priceLabel(p)).not.toContain("첫 결제");
    expect(priceLabel(getProduct("set_love")!)).toBe("7,900원");
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
    // 단품 기념가(4,900원)에 맞춰 세트 가격도 다시 정했다(2026-10-02): 2종 7,900 · 3~4종 12,900 · 2027 세트 11,900
    for (const s of CATALOG.filter((c) => c.type === "SET")) {
      // 연말 특가 상품이 든 세트도 따로 사는 값보다 최소 1,000원 이상 싸다(set_career 6,900원 vs 7,900원).
      const hasPromoItem = (s.items ?? []).some((id) => isOnSeasonPromo(id));
      expect(separatePrice(s) - s.price, s.id).toBeGreaterThanOrEqual(hasPromoItem ? 1000 : 1800);
    }
    for (const c of CATALOG) {
      for (const s of setsContaining(c.id, allIds)) expect(separatePrice(s), s.id).toBeGreaterThan(s.price);
    }
  });
  it("따로 사면 금액은 실제 단건 가격의 합", () => {
    expect(separatePrice(getProduct("set_me")!)).toBe(3 * 4900 + getProduct("annual_2026")!.price);
    expect(separatePrice(getProduct("set_love")!)).toBe(2 * 4900);
    expect(separatePrice(getProduct("set_career")!)).toBe(4900 + getProduct("annual_2026")!.price);
    expect(getProduct("set_love")!.price).toBe(7900);
    expect(getProduct("set_career")!.price).toBe(seasonPriceAt("set_career", Date.now())!.price);
    expect(getProduct("set_2027")!.price).toBe(11900);
  });
  it("재물운이 든 세트를 아끼는 금액 큰 순으로 찾고, 숨긴 세트는 빼며, 세트 자신은 추천하지 않는다", () => {
    expect(setsContaining("wealth", allIds).map((s) => s.id)).toEqual(["set_me", "set_2027"]);
    expect(setsContaining("wealth", allIds.filter((id) => id !== "set_me")).map((s) => s.id)).toEqual(["set_2027"]);
    expect(setsContaining("set_me", allIds)).toEqual([]);
    expect(setsContaining("compat_basic", allIds).map((s) => s.id)).toEqual(["set_this_person"]);
    expect(setsContaining("career", allIds).map((s) => s.id)).toContain("set_career");
    expect(setsContaining("annual_2026", allIds).map((s) => s.id)).toContain("set_career");
  });
});
