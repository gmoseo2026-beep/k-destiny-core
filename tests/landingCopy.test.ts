import { describe, it, expect } from "vitest";
import { CATALOG, basePriceLabel, getProduct } from "@/lib/catalog";
import { LANDING_POINT_LIMIT, landingCopyFor } from "@/lib/landingCopy";
import { containsHanjaDeep } from "@/lib/gen/hanjaGuard";

const couples = CATALOG.filter((p) => p.inputKind === "couple" && !p.isFree && p.type !== "SET");

describe("상품 입력 화면 머리말", () => {
  it("커플 상품마다 제목과 1~3줄 안내가 있다", () => {
    expect(couples.length).toBeGreaterThan(0);
    for (const p of couples) {
      const copy = landingCopyFor(p);
      expect(copy.headline.trim().length, p.id).toBeGreaterThan(5);
      expect(copy.points.length, p.id).toBeGreaterThan(0);
      expect(copy.points.length, p.id).toBeLessThanOrEqual(LANDING_POINT_LIMIT);
      for (const point of copy.points) expect(point.trim().length, p.id).toBeGreaterThan(5);
    }
  });

  it("한자·전문용어·단정적 표현이 없다", () => {
    const banned = /오행|일간|천간|지지|사주팔자|반드시|무조건|100%|확실히 알/;
    for (const p of couples) {
      const copy = landingCopyFor(p);
      expect(containsHanjaDeep(copy), p.id).toBe(false);
      expect(banned.test([copy.headline, ...copy.points].join(" ")), p.id).toBe(false);
    }
  });

  it("속마음은 광고 영상의 약속과 같은 문장으로 시작한다", () => {
    const copy = landingCopyFor(getProduct("inner_mind")!);
    expect(copy.headline).toBe("그 사람, 지금 나를 어떻게 생각할까?");
    expect(copy.points).toContain("그 사람이 아직 말하지 않은 것 하나");
  });

  it("같은 상품은 항상 같은 문구", () => {
    for (const p of couples) expect(landingCopyFor(p)).toEqual(landingCopyFor(p));
  });
});

describe("버튼에 붙이는 가격", () => {
  it("유료 상품은 실제 결제 금액, 무료 상품은 '무료'", () => {
    for (const p of CATALOG) {
      const label = basePriceLabel(p);
      if (p.isFree) expect(label).toBe("무료");
      else expect(label).toBe(`${p.price.toLocaleString("ko-KR")}원`);
    }
    expect(basePriceLabel(getProduct("inner_mind")!)).toBe("4,900원");
  });
});
