import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEASER_BLUR_COPY,
  TEASER_BLUR_COPY_BY_ID,
  getTeaserBlurCopy,
} from "@/lib/teaserBlurCopy";

const PAID_SINGLE_IDS = [
  "inner_mind",
  "reunion",
  "cheating",
  "marriage",
  "conflict",
  "secret_love",
  "wealth",
  "career",
  "love_single",
  "charm",
  "health",
  "spicy_annual",
] as const;

describe("lib/teaserBlurCopy — 상품 12종 흐림 안내 문구", () => {
  it("유료 단품 12종 모두 고유한 문구를 가지고 '이 뒤에는'으로 시작한다", () => {
    expect(Object.keys(TEASER_BLUR_COPY_ID_CHECK())).toHaveLength(12);
    for (const id of PAID_SINGLE_IDS) {
      const copy = getTeaserBlurCopy(id);
      expect(copy).not.toBe(DEFAULT_TEASER_BLUR_COPY);
      expect(copy.startsWith("이 뒤에는 ")).toBe(true);
      expect(copy.endsWith("이어져요.")).toBe(true);
    }
  });

  it("세트·모르는 id·빈 값은 기존 기본 문구를 그대로 돌려준다", () => {
    expect(getTeaserBlurCopy(undefined)).toBe(DEFAULT_TEASER_BLUR_COPY);
    expect(getTeaserBlurCopy(null)).toBe(DEFAULT_TEASER_BLUR_COPY);
    expect(getTeaserBlurCopy("")).toBe(DEFAULT_TEASER_BLUR_COPY);
    expect(getTeaserBlurCopy("unknown_id")).toBe(DEFAULT_TEASER_BLUR_COPY);
    expect(getTeaserBlurCopy("set_this_person")).toBe(DEFAULT_TEASER_BLUR_COPY);
    expect(getTeaserBlurCopy("set_reunion")).toBe(DEFAULT_TEASER_BLUR_COPY);
    expect(getTeaserBlurCopy("set_career")).toBe(DEFAULT_TEASER_BLUR_COPY);
  });
});

function TEASER_BLUR_COPY_ID_CHECK() {
  return TEASER_BLUR_COPY_BY_ID;
}
