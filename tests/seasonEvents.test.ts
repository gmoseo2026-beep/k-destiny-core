import { describe, it, expect } from "vitest";
import { CATALOG, getProduct } from "@/lib/catalog";
import {
  SEASON_EVENTS,
  SEASON_EVENT_SLUGS,
  formatSeasonDaysLeftLabel,
  getSeasonEvent,
  getSeasonEventDaysLeft,
  isSeasonEventActive,
  resolveSeasonEventProducts,
} from "@/lib/seasonEvents";
import sitemap from "@/app/sitemap";

describe("10 연말 시즌 기획전 설정 및 종료일 계산 테스트", () => {
  it("1) 3개 기획전이 모두 기존 카탈로그 상품 ID만 지정된 순서로 묶고 새 상품이나 새 할인을 만들지 않는다", () => {
    expect(SEASON_EVENT_SLUGS).toEqual([
      "christmas",
      "before-new-year",
      "single-2027",
    ]);

    expect(SEASON_EVENTS.christmas.title).toBe("크리스마스 전에, 그 사람 마음");
    expect(SEASON_EVENTS.christmas.productIds).toEqual([
      "inner_mind",
      "set_heart",
      "set_sure",
    ]);

    expect(SEASON_EVENTS["before-new-year"].title).toBe(
      "올해 가기 전에 정리하고 싶은 사람"
    );
    expect(SEASON_EVENTS["before-new-year"].productIds).toEqual([
      "set_reunion",
      "reunion",
      "conflict",
    ]);

    expect(SEASON_EVENTS["single-2027"].title).toBe("내년엔 연애할까");
    expect(SEASON_EVENTS["single-2027"].productIds).toEqual([
      "love_single",
      "set_love",
      "annual_2027",
    ]);

    for (const slug of SEASON_EVENT_SLUGS) {
      const event = getSeasonEvent(slug)!;
      const resolved = resolveSeasonEventProducts(event, CATALOG, false);
      expect(resolved.map((p) => p.id)).toEqual([...event.productIds]);
      for (const item of resolved) {
        const original = getProduct(item.id)!;
        expect(item.price).toBe(original.price);
      }
    }

    expect(getSeasonEvent("unknown-season")).toBeNull();
  });

  it("2) 크리스마스 기획전 종료 경계(12/25 23:59 KST) 및 남은 일수 계산", () => {
    const xmas = SEASON_EVENTS.christmas;

    // 12/20 12:00 KST -> 6일 남음 (20~25일 포함 올림)
    const dec20Noon = Date.parse("2026-12-20T12:00:00+09:00");
    expect(isSeasonEventActive(xmas, dec20Noon)).toBe(true);
    expect(getSeasonEventDaysLeft(xmas, dec20Noon)).toBe(6);
    expect(formatSeasonDaysLeftLabel(xmas, dec20Noon)).toBe("6일 남음");

    // 12/25 23:59:00 KST -> 아직 활성, 1일 남음
    const dec25LastMin = Date.parse("2026-12-25T23:59:00+09:00");
    expect(isSeasonEventActive(xmas, dec25LastMin)).toBe(true);
    expect(getSeasonEventDaysLeft(xmas, dec25LastMin)).toBe(1);
    expect(formatSeasonDaysLeftLabel(xmas, dec25LastMin)).toBe("1일 남음");

    // 12/26 00:00:00 KST -> 종료(자동 일반 목록 전환), 남은 일수 0
    const dec26Start = Date.parse("2026-12-26T00:00:00+09:00");
    expect(isSeasonEventActive(xmas, dec26Start)).toBe(false);
    expect(getSeasonEventDaysLeft(xmas, dec26Start)).toBe(0);
    expect(formatSeasonDaysLeftLabel(xmas, dec26Start)).toBeNull();
  });

  it("3) 연말 정리·솔로 2027 기획전 종료 경계(12/31 23:59 KST) 확인", () => {
    const beforeNewYear = SEASON_EVENTS["before-new-year"];
    const single2027 = SEASON_EVENTS["single-2027"];

    const dec31LastMin = Date.parse("2026-12-31T23:59:59+09:00");
    expect(isSeasonEventActive(beforeNewYear, dec31LastMin)).toBe(true);
    expect(isSeasonEventActive(single2027, dec31LastMin)).toBe(true);
    expect(formatSeasonDaysLeftLabel(beforeNewYear, dec31LastMin)).toBe("1일 남음");
    expect(formatSeasonDaysLeftLabel(single2027, dec31LastMin)).toBe("1일 남음");

    const jan1Start = Date.parse("2027-01-01T00:00:00+09:00");
    expect(isSeasonEventActive(beforeNewYear, jan1Start)).toBe(false);
    expect(isSeasonEventActive(single2027, jan1Start)).toBe(false);
    expect(formatSeasonDaysLeftLabel(beforeNewYear, jan1Start)).toBeNull();
  });

  it("4) 기간 한정 기획전 경로(/season/*)는 sitemap에 포함되지 않는다", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.includes("/season/"))).toBe(false);
  });
});
