import { describe, it, expect } from "vitest";
import {
  NEXT_READING_TABLE,
  extractOwnedForCompat,
  getNextReadings,
  nextReadingHref,
} from "@/lib/recommendations/nextReadings";

describe("P-007 nextReadings — 두 사람 상품 고정 매핑 및 보유·노출 필터링", () => {
  it("표에는 승인된 두 사람(couple) 상품 7종만 들어 있고 개인/프리미엄 상품은 추천하지 않는다", () => {
    expect(Object.keys(NEXT_READING_TABLE).sort()).toEqual(
      ["cheating", "compat_basic", "conflict", "inner_mind", "marriage", "reunion", "secret_love"].sort(),
    );
    expect(getNextReadings({ currentCatalogId: "wealth" })).toEqual({
      singles: [],
      set: null,
    });
    expect(getNextReadings({ currentCatalogId: "annual_2026" })).toEqual({
      singles: [],
      set: null,
    });
    expect(getNextReadings({ currentCatalogId: "premium_2027_daeun" })).toEqual({
      singles: [],
      set: null,
    });
  });

  it("세트 구성품이 아닌 단품(secret_love, cheating)을 읽었고 추가 보유가 없으면 단품 2개 + 세트 1줄을 반환한다", () => {
    const res = getNextReadings({ currentCatalogId: "secret_love" });
    expect(res.singles.map((s) => s.id)).toEqual(["inner_mind", "compat_basic"]);
    expect(res.set?.id).toBe("set_this_person");

    const cheatingRes = getNextReadings({ currentCatalogId: "cheating" });
    expect(cheatingRes.singles.map((s) => s.id)).toEqual(["inner_mind", "conflict"]);
    expect(cheatingRes.set?.id).toBe("set_this_person");
  });

  it("방금 읽은 상품 자체가 세트 구성품(compat_basic, inner_mind, reunion 등)이면 세트 줄을 숨긴다", () => {
    const basicRes = getNextReadings({ currentCatalogId: "compat_basic" });
    expect(basicRes.singles.map((s) => s.id)).toEqual(["inner_mind", "secret_love"]);
    expect(basicRes.set).toBeNull();

    const reunionRes = getNextReadings({ currentCatalogId: "reunion" });
    expect(reunionRes.singles.map((s) => s.id)).toEqual(["inner_mind", "conflict"]);
    expect(reunionRes.set).toBeNull();
  });

  it("이미 같은 궁합으로 보유한 단품이 있으면 추천 단품과 해당 단품이 든 세트 줄을 모두 제외한다", () => {
    const res = getNextReadings({
      currentCatalogId: "secret_love",
      ownedCatalogIds: ["inner_mind"],
    });
    expect(res.singles.map((s) => s.id)).toEqual(["compat_basic"]);
    expect(res.set).toBeNull();
  });

  it("세트를 보유한 경우 세트에 포함된 모든 구성 단품을 추천 목록에서 제외한다 (grantingCatalogIds)", () => {
    // set_this_person = ["compat_basic", "inner_mind", "marriage"]
    const res = getNextReadings({
      currentCatalogId: "inner_mind",
      ownedCatalogIds: ["set_this_person"],
    });
    // compat_basic은 set_this_person에 포함되므로 제외되고 secret_love만 남는다
    expect(res.singles.map((s) => s.id)).toEqual(["secret_love"]);
    expect(res.set).toBeNull();
  });

  it("다른 두 사람(다른 compatId)으로 산 상품은 현재 궁합의 보유 목록에 섞이지 않는다", () => {
    const owned = extractOwnedForCompat("cmp_current", {
      currentCatalogId: "compat_basic",
      deviceOrders: [
        { catalogId: "inner_mind", compatId: "cmp_other", orderId: "ord_1" },
        { catalogId: "secret_love", compatId: "cmp_current", orderId: "ord_2" },
        { catalogId: "reunion", compatId: "cmp_current", orderId: "ord_refunded" },
      ],
      validOrderIds: ["ord_1", "ord_2"],
      mineRows: [
        {
          catalogId: "set_this_person",
          compatId: "cmp_other",
          reports: [{ catalogId: "inner_mind", compatId: "cmp_other" }],
        },
      ],
    });
    expect(owned.sort()).toEqual(["compat_basic", "secret_love"].sort());

    const res = getNextReadings({
      currentCatalogId: "compat_basic",
      ownedCatalogIds: owned,
    });
    // 다른 궁합(cmp_other)의 inner_mind는 제외되지 않고 그대로 권유된다
    expect(res.singles.map((s) => s.id)).toEqual(["inner_mind"]);
  });

  it("visibleIds에 없는(숨긴) 상품이나 숨긴 구성품이 든 세트는 권유 목록에서 제외한다", () => {
    const res = getNextReadings({
      currentCatalogId: "secret_love",
      visibleIds: ["secret_love", "compat_basic", "set_this_person", "marriage"], // inner_mind 숨김
    });
    expect(res.singles.map((s) => s.id)).toEqual(["compat_basic"]);
    // set_this_person의 구성품 중 inner_mind가 숨김이므로 세트 줄도 숨김
    expect(res.set).toBeNull();
  });

  it("이동 주소 생성: 정통 궁합은 /compat/<compatId>, 그 외 상품·세트는 /compat/new?productId=<id>&from=<compatId>&via=<via>", () => {
    expect(nextReadingHref("compat_basic", "cmp_abc", "ko")).toBe("/ko/compat/cmp_abc");
    expect(nextReadingHref("compat_basic", "cmp_abc", "ko", "free_result")).toBe("/ko/compat/cmp_abc");
    expect(nextReadingHref("inner_mind", "cmp_abc", "ko")).toBe(
      "/ko/compat/new?productId=inner_mind&from=cmp_abc&via=next",
    );
    expect(nextReadingHref("inner_mind", "cmp_abc", "ko", "free_result")).toBe(
      "/ko/compat/new?productId=inner_mind&from=cmp_abc&via=free_result",
    );
    expect(nextReadingHref("secret_love", "cmp_abc", "ko", "free_result")).toBe(
      "/ko/compat/new?productId=secret_love&from=cmp_abc&via=free_result",
    );
    expect(nextReadingHref("set_this_person", "cmp_abc", "ko")).toBe(
      "/ko/compat/new?productId=set_this_person&from=cmp_abc&via=next",
    );
  });
});
