import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/routing", () => ({
  Link: "a",
  usePathname: () => "/",
}));

import { CATALOG, getProductCover, getSetCoverStack } from "@/lib/catalog";
import { HOME_CATEGORY_CHIPS, filterProductsByCategory } from "@/lib/home/explore";
import { WELCOME_COUPON_AMOUNT, getWelcomeSheetBenefits, issueWelcomeCouponIfEnabled } from "@/lib/welcome";
import { DOCK_TABS, activeMobileTabForPath, shouldShowMobileTabBar } from "@/components/MobileBottomTabBar";

describe("P-017 Kongdak Night Design & Cover System", () => {
  it("assigns a valid .webp cover (<= 300KB) on disk for every single/premium product in CATALOG", () => {
    const publicDir = path.resolve(process.cwd(), "public");
    const nonSets = CATALOG.filter((p) => p.type !== "SET");
    expect(nonSets.length).toBeGreaterThanOrEqual(19);

    for (const item of nonSets) {
      const cover = getProductCover(item);
      expect(cover).toMatch(/^\/covers\/cover_[a-z0-9_]+\.webp$/);
      const diskPath = path.join(publicDir, cover.replace(/^\//, ""));
      expect(fs.existsSync(diskPath), `Missing cover file for ${item.id}: ${diskPath}`).toBe(true);
      const stat = fs.statSync(diskPath);
      expect(stat.size, `Cover ${cover} exceeds 300KB`).toBeLessThanOrEqual(300 * 1024);
      expect(stat.size).toBeGreaterThan(1024);
    }
  });

  it("returns 2 to 3 constituent cover paths for every SET product via getSetCoverStack", () => {
    const sets = CATALOG.filter((p) => p.type === "SET");
    expect(sets.length).toBeGreaterThanOrEqual(4);
    for (const setItem of sets) {
      const stack = getSetCoverStack(setItem);
      expect(stack.length).toBeGreaterThanOrEqual(2);
      expect(stack.length).toBeLessThanOrEqual(3);
      for (const cover of stack) {
        expect(cover).toMatch(/^\/covers\/cover_[a-z0-9_]+\.webp$/);
      }
    }
  });

  it("keeps WELCOME_COUPON_AMOUNT = 0 by default and only issues welcome coupon when amount > 0", async () => {
    expect(WELCOME_COUPON_AMOUNT).toBe(0);

    const benefitsZero = getWelcomeSheetBenefits(0);
    expect(benefitsZero).toEqual([
      "무료 미리보기 하루 3→6개",
      "본 결과는 보관함에 저장",
      "후기 쓰면 1,000원 쿠폰",
    ]);

    const benefitsThousand = getWelcomeSheetBenefits(1000);
    expect(benefitsThousand.some((b) => b.includes("1,000원 쿠폰 즉시 지급"))).toBe(true);

    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "c1", code: "WELCOME-user_1", amount: 1000 });
    const mockDb = { coupon: { findUnique, create } };

    const nop = await issueWelcomeCouponIfEnabled(mockDb, "user_1", 0);
    expect(nop).toEqual({ issued: false, amount: 0 });
    expect(create).not.toHaveBeenCalled();

    const issued = await issueWelcomeCouponIfEnabled(mockDb, "user_1", 1000);
    expect(issued).toEqual({ issued: true, amount: 1000 });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("provides 5 Liquid Glass Dock tabs including /products ('전체')", () => {
    expect(DOCK_TABS.map((t) => t.id)).toEqual(["home", "compat", "fortune", "products", "me"]);
    expect(shouldShowMobileTabBar("/products")).toBe(true);
    expect(activeMobileTabForPath("/products")).toBe("products");
    expect(shouldShowMobileTabBar("/products/love_single")).toBe(false);
  });

  it("filters products across all 6 HOME_CATEGORY_CHIPS", () => {
    expect(HOME_CATEGORY_CHIPS.map((c) => c.id)).toEqual([
      "all",
      "love",
      "compat",
      "reunion",
      "annual",
      "wealth",
    ]);

    const singles = CATALOG.filter((p) => p.type !== "SET" && !p.isFree);
    expect(filterProductsByCategory(singles, "all").length).toBe(singles.length);
    expect(filterProductsByCategory(singles, "reunion").map((p) => p.id)).toEqual(
      expect.arrayContaining(["reunion", "cheating"]),
    );
    expect(filterProductsByCategory(singles, "wealth").map((p) => p.id)).toEqual(
      expect.arrayContaining(["career", "wealth"]),
    );
  });
});
