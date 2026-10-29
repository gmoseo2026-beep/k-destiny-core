import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/routing", () => ({
  Link: "a",
  usePathname: () => "/",
}));

import {
  CATALOG,
  SEASON_PROMO_ENDS_AT,
  SEASON_PROMO_LABEL,
  SEASON_PROMO_UNTIL,
} from "@/lib/catalog";
import {
  SEASON_2027_CORE_IDS,
  SEASON_2027_STARTS_AT,
  SEASON_2027_YEAR,
  getSeasonFirstRecommendations,
  getSeasonHeroSlideOrder,
  isSeason2027Active,
  sortSeasonSets,
} from "@/lib/season";
import { computeHomeRanking } from "@/lib/home/ranking";
import { getHeroPosterSlides, getHeroSlideMeta } from "@/components/home/HomeHeroCompact";

describe("02. 2027 신년 시즌 자동 전환 (lib/season.ts — KST 2026-11-01 00:00)", () => {
  const oct31_2359 = Date.parse("2026-10-31T23:59:00+09:00");
  const nov01_0000 = Date.parse("2026-11-01T00:00:00+09:00");

  it("단일 설정 시각(2026-11-01 00:00 KST)을 기준으로 10/31 23:59에는 비활성, 11/01 00:00에는 활성이다", () => {
    expect(SEASON_2027_YEAR).toBe(2027);
    expect(nov01_0000).toBe(SEASON_2027_STARTS_AT);
    expect(isSeason2027Active(oct31_2359)).toBe(false);
    expect(isSeason2027Active(nov01_0000)).toBe(true);
  });

  it("홈 히어로 슬라이드가 10/31 23:59에는 inner_mind 우선, 11/01 00:00부터는 annual_2027 · premium_2027_daeun 우선으로 전환된다", () => {
    expect(getSeasonHeroSlideOrder(oct31_2359)).toEqual([
      "inner_mind",
      "annual_2027",
      "premium_2027_daeun",
      "compat_basic",
    ]);
    expect(getHeroPosterSlides(oct31_2359).map((s) => s.id)).toEqual([
      "inner_mind",
      "annual_2027",
      "premium_2027_daeun",
      "compat_basic",
    ]);

    expect(getSeasonHeroSlideOrder(nov01_0000)).toEqual([
      "annual_2027",
      "premium_2027_daeun",
      "inner_mind",
      "compat_basic",
    ]);
    expect(getHeroPosterSlides(nov01_0000).map((s) => s.id)).toEqual([
      "annual_2027",
      "premium_2027_daeun",
      "inner_mind",
      "compat_basic",
    ]);
  });

  it("홈 첫 추천과 세트 정렬, 폴백 추천이 10/31 23:59과 11/01 00:00 경계에서 annual_2027 · premium_2027_daeun · set_2027 중심으로 전환된다", () => {
    const visible = CATALOG.filter((p) => !p.isHidden);
    const sets = visible.filter((p) => p.type === "SET");

    // 10/31 23:59 KST: 신년 첫 추천 미노출, 세트는 기존 featuredOrder(set_heart 우선), 폴백 추천도 기존 순서
    expect(getSeasonFirstRecommendations(visible, oct31_2359)).toEqual([]);
    expect(sortSeasonSets(sets, oct31_2359)[0]?.id).toBe("set_heart");
    const preFallback = computeHomeRanking([], visible, 20, oct31_2359);
    expect(preFallback.isRealRanking).toBe(false);
    expect(preFallback.items[0]?.product.id).toBe("compat_basic");

    // 11/01 00:00 KST: 첫 추천 = annual_2027 / premium_2027_daeun / set_2027, 세트 1번 = set_2027, 폴백 추천 앞 3개 = 2027 대표 3종
    const postFirst = getSeasonFirstRecommendations(visible, nov01_0000);
    expect(postFirst.map((p) => p.id)).toEqual([...SEASON_2027_CORE_IDS]);
    expect(sortSeasonSets(sets, nov01_0000)[0]?.id).toBe("set_2027");

    const postFallback = computeHomeRanking([], visible, 20, nov01_0000);
    expect(postFallback.isRealRanking).toBe(false);
    expect(postFallback.items.slice(0, 3).map((x) => x.product.id)).toEqual([
      "annual_2027",
      "premium_2027_daeun",
      "set_2027",
    ]);

    // 어드민에서 숨김 처리된 상품은 첫 추천에서도 제외된다
    const withHiddenDaeun = visible.map((p) =>
      p.id === "premium_2027_daeun" ? { ...p, isHidden: true } : p,
    );
    expect(getSeasonFirstRecommendations(withHiddenDaeun, nov01_0000).map((p) => p.id)).toEqual([
      "annual_2027",
      "set_2027",
    ]);
  });

  it("기존 기간 한정 가격 문구(12/31까지)는 카탈로그 값과 일치하고 2027-01-01 00:00 KST에 종료된다", () => {
    const metaInSeason = getHeroSlideMeta("premium_2027_daeun", nov01_0000);
    expect(metaInSeason.promoBadge).toBe(`${SEASON_PROMO_LABEL} · ${SEASON_PROMO_UNTIL}`);
    expect(metaInSeason.promoBadge).toBe("연말 특가 · 12/31까지");
    expect(metaInSeason.priceText).toBe("9,900원");
    expect(metaInSeason.strikePriceText).toBe("19,900원");

    const metaAfterPromo = getHeroSlideMeta("premium_2027_daeun", SEASON_PROMO_ENDS_AT);
    expect(metaAfterPromo.promoBadge).toBeNull();
    expect(metaAfterPromo.priceText).toBe("19,900원");
    expect(metaAfterPromo.strikePriceText).toBeNull();
  });
});
