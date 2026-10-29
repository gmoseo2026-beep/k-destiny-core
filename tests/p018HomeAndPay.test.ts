import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/routing", () => ({
  Link: "a",
  usePathname: () => "/",
}));

import { CATALOG, getProduct } from "@/lib/catalog";
import {
  HOME_GRID_ORDER,
  filterProductsByCategory,
  sortByHomeGridOrder,
} from "@/lib/home/explore";
import {
  HERO_2027_FIRST_FROM,
  HERO_POSTER_SLIDES,
  getHeroPosterSlides,
  getHeroSlideMeta,
} from "@/components/home/HomeHeroCompact";
import { PAY_METHODS, SHOW_NAVERPAY_SHORTCUT } from "@/components/GuestCheckoutModal";

describe("P-018 홈 진열 + 결제 버튼 정리 단위 테스트", () => {
  it("홈 상단 큰 카드는 속마음·2027 신년운·2027 대운·정통 궁합 4장이며 솔로·재회는 제외된다", () => {
    expect(HERO_POSTER_SLIDES.map((s) => s.id)).toEqual([
      "inner_mind",
      "annual_2027",
      "premium_2027_daeun",
      "compat_basic",
    ]);

    const daeunSlide = HERO_POSTER_SLIDES.find((s) => s.id === "premium_2027_daeun")!;
    expect(daeunSlide.situationLabel).toBe("2027 대운 · 프리미엄");
    expect(daeunSlide.coverSrc).toBe("/covers/cover_premium_2027_daeun.webp");
    expect(daeunSlide.getHref("ko")).toBe("/ko/products/premium_2027_daeun");

    const compatSlide = HERO_POSTER_SLIDES.find((s) => s.id === "compat_basic")!;
    expect(compatSlide.situationLabel).toBe("정통 궁합");
    expect(compatSlide.headline).toBe("우리 둘, 오래 갈 수 있을까?");
    expect(compatSlide.subCopy).toBe("성향·연애 방식·다툼 패턴까지 한 번에");
    expect(compatSlide.coverSrc).toBe("/covers/cover_compat_basic.webp");
    expect(compatSlide.getHref("ko")).toBe("/ko/compat/new");
  });

  it("2026-10-31 23:59 KST와 2026-11-01 00:00 KST 경계에서 2027 신년운·2027 대운(②③①④)으로 자동 전환된다", () => {
    const oct31_2359 = Date.parse("2026-10-31T23:59:00+09:00");
    const nov01_0000 = Date.parse("2026-11-01T00:00:00+09:00");

    expect(nov01_0000).toBe(HERO_2027_FIRST_FROM);
    expect(getHeroPosterSlides(oct31_2359).map((s) => s.id)).toEqual([
      "inner_mind",
      "annual_2027",
      "premium_2027_daeun",
      "compat_basic",
    ]);
    expect(getHeroPosterSlides(nov01_0000).map((s) => s.id)).toEqual([
      "annual_2027",
      "premium_2027_daeun",
      "inner_mind",
      "compat_basic",
    ]);
  });

  it("대운 카드는 특가 기간 중 프리미엄+연말 특가 배지 2개와 19,900원 취소선+9,900원을 보여주고, 2027-01-01에는 취소선이 사라진다", () => {
    const inPromo = Date.parse("2026-12-15T12:00:00+09:00");
    const afterPromo = Date.parse("2027-01-01T00:00:00+09:00");

    expect(getHeroSlideMeta("premium_2027_daeun", inPromo)).toEqual({
      isPremium: true,
      promoBadge: "연말 특가 · 12/31까지",
      priceText: "9,900원",
      strikePriceText: "19,900원",
    });

    expect(getHeroSlideMeta("premium_2027_daeun", afterPromo)).toEqual({
      isPremium: true,
      promoBadge: null,
      priceText: "19,900원",
      strikePriceText: null,
    });
  });

  it("HOME_GRID_ORDER: '전체' 정렬 결과 첫 2개는 2027 두 개(annual_2027, premium_2027_daeun), 마지막은 free_personality이며 featuredOrder 값은 그대로 유지된다", () => {
    // featuredOrder 원본 불변 확인
    expect(getProduct("compat_basic")?.featuredOrder).toBe(1);
    expect(getProduct("annual_2026")?.featuredOrder).toBe(2);
    expect(getProduct("free_personality")?.featuredOrder).toBe(3);
    expect(getProduct("annual_2027")?.featuredOrder).toBe(15);
    expect(getProduct("premium_2027_daeun")?.featuredOrder).toBe(30);

    const nonSetVisible = filterProductsByCategory(CATALOG, "all").filter(
      (p) => p.type !== "SET",
    );
    const ids = nonSetVisible.map((p) => p.id);

    expect(ids.slice(0, 2)).toEqual(["annual_2027", "premium_2027_daeun"]);
    expect(ids[ids.length - 1]).toBe("free_personality");
    expect(ids).toEqual([...HOME_GRID_ORDER]);

    // 다른 카테고리 칩도 HOME_GRID_ORDER 상대 순서 유지
    const annualChipIds = filterProductsByCategory(CATALOG, "annual")
      .filter((p) => p.type !== "SET")
      .map((p) => p.id);
    expect(annualChipIds.slice(0, 2)).toEqual(["annual_2027", "premium_2027_daeun"]);
    expect(annualChipIds[annualChipIds.length - 1]).toBe("free_personality");

    // 목록에 없는 임의 상품은 뒤에 featuredOrder 순으로 정렬
    const extraA = { ...getProduct("compat_basic")!, id: "custom_b", featuredOrder: 50 };
    const extraB = { ...getProduct("compat_basic")!, id: "custom_a", featuredOrder: 40 };
    const sortedWithExtra = sortByHomeGridOrder([extraA, nonSetVisible[0], extraB]);
    expect(sortedWithExtra.map((p) => p.id)).toEqual([
      "annual_2027",
      "custom_a",
      "custom_b",
    ]);
  });

  it("결제 창에서 SHOW_NAVERPAY_SHORTCUT은 false이고, 결제 수단 배지 줄에는 네이버페이가 유지된다", () => {
    expect(SHOW_NAVERPAY_SHORTCUT).toBe(false);
    expect(PAY_METHODS.map((m) => m.label)).toContain("네이버페이");
    expect(PAY_METHODS.map((m) => m.label)).toContain("카카오페이");
  });
});
