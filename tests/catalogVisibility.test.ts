import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveHidden, getEffectiveCatalog, getEffectiveProduct, invalidateVisibilityCache } from "@/lib/catalogVisibility";
import { CATALOG, CatalogItem } from "@/lib/catalog";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  default: {
    productVisibility: {
      findMany: vi.fn(),
    },
  },
}));

describe("catalogVisibility resolver 테스트 (A11-2, A11-5)", () => {
  beforeEach(() => {
    invalidateVisibilityCache();
    vi.clearAllMocks();
  });

  const sampleHiddenItem: CatalogItem = {
    ...CATALOG[0],
    id: "test_hidden",
    isHidden: true,
  };

  const sampleVisibleItem: CatalogItem = {
    ...CATALOG[0],
    id: "test_visible",
    isHidden: false,
  };

  describe("resolveHidden (순수 함수)", () => {
    it("오버라이드가 없으면 item.isHidden 코드 기본값을 반환한다", () => {
      expect(resolveHidden(sampleHiddenItem)).toBe(true);
      expect(resolveHidden(sampleVisibleItem)).toBe(false);
      expect(resolveHidden(sampleHiddenItem, null)).toBe(true);
    });

    it("오버라이드 visible=true 이면 isHidden=false(공개)가 된다", () => {
      const overrides = new Map([["test_hidden", true]]);
      expect(resolveHidden(sampleHiddenItem, overrides)).toBe(false);
    });

    it("오버라이드 visible=false 이면 isHidden=true(숨김)가 된다", () => {
      const overrides = new Map([["test_visible", false]]);
      expect(resolveHidden(sampleVisibleItem, overrides)).toBe(true);
    });

    it("오버라이드 객체(Record) 전달도 정상 지원한다", () => {
      expect(resolveHidden(sampleHiddenItem, { test_hidden: true })).toBe(false);
      expect(resolveHidden(sampleVisibleItem, { test_visible: false })).toBe(true);
    });
  });

  describe("getEffectiveCatalog 및 getEffectiveProduct", () => {
    it("행이 없을 때 코드 기본값과 동일하게 동작한다", async () => {
      vi.mocked(prisma.productVisibility.findMany).mockResolvedValueOnce([]);

      const catalog = await getEffectiveCatalog();
      expect(catalog.length).toBe(CATALOG.length);
      const freeItem = catalog.find((p) => p.id === "free_personality");
      expect(freeItem?.isHidden).toBeFalsy();
    });

    it("오버라이드가 적용되어 특정 상품의 isHidden 상태가 즉시 변경된다", async () => {
      // free_personality(기본 false)를 visible=false로 숨김
      vi.mocked(prisma.productVisibility.findMany).mockResolvedValueOnce([
        { catalogId: "free_personality", visible: false, updatedBy: "admin", reason: "점검", updatedAt: new Date() },
      ]);

      const item = await getEffectiveProduct("free_personality");
      expect(item?.isHidden).toBe(true);
    });

    it("DB 에러 발생 시 코드 기본값으로 안전하게 폴백한다", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(prisma.productVisibility.findMany).mockRejectedValueOnce(new Error("DB connection failure"));

      const catalog = await getEffectiveCatalog();
      expect(catalog.length).toBe(CATALOG.length);
      const freeItem = catalog.find((p) => p.id === "free_personality");
      expect(freeItem?.isHidden).toBeFalsy();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("캐시가 유효한 동안 추가 DB 조회를 하지 않고, 무효화 후 새 값을 읽는다", async () => {
      vi.mocked(prisma.productVisibility.findMany).mockResolvedValueOnce([]);
      await getEffectiveCatalog();
      expect(prisma.productVisibility.findMany).toHaveBeenCalledTimes(1);

      // 캐시 유효 시간 내 재호출 -> findMany 안 불림
      await getEffectiveCatalog();
      expect(prisma.productVisibility.findMany).toHaveBeenCalledTimes(1);

      // 캐시 무효화 후 재호출 -> findMany 다시 불림
      invalidateVisibilityCache();
      vi.mocked(prisma.productVisibility.findMany).mockResolvedValueOnce([
        { catalogId: "compat_basic", visible: false, updatedBy: "admin", reason: "임시 중단", updatedAt: new Date() },
      ]);
      const refreshedItem = await getEffectiveProduct("compat_basic");
      expect(refreshedItem?.isHidden).toBe(true);
      expect(prisma.productVisibility.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
