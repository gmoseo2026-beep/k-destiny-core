import { describe, it, expect } from "vitest";
import {
  COMPAT_DISTRIBUTION_META,
  getCompatTopPercent,
  formatCompatTopPercentBadge,
} from "@/lib/compatPercentile";
import { cutCompatFreeEnding } from "@/lib/compatFreeText";
import {
  COMPAT_CURIOSITY_OPTIONS,
  isCompatCuriosityKey,
  appendCuriosityToneGuide,
} from "@/lib/compatCuriosity";
import { maskKeyWordForPreview, getTeaserMaskedLines } from "@/lib/teaserBlurCopy";
import { clipTeaserForView } from "@/lib/reports/teaser";
import { loadStandardSamplePreview } from "@/lib/reports/standardSamplePreview";

describe("P-016-2 궁합 상위 퍼센트 계산 (lib/compatPercentile.ts)", () => {
  it("점수 분포 기준 메타데이터(1,177쌍, 중앙값 86, 상위 25%=91, 상위 10%=94)를 유지한다", () => {
    expect(COMPAT_DISTRIBUTION_META).toEqual({
      totalPairs: 1177,
      median: 86,
      top30Score: 91,
      top25Score: 92,
      top10Score: 94,
    });
  });

  it("같은 입력에는 항상 같은 결과를 반환한다 (결정론)", () => {
    for (let s = 50; s <= 100; s++) {
      expect(getCompatTopPercent(s)).toBe(getCompatTopPercent(s));
      expect(formatCompatTopPercentBadge(s)).toBe(formatCompatTopPercentBadge(s));
    }
  });

  it("상위 30% 미만(점수 < 90, 중앙값 86 포함)일 때는 null 을 반환해 표시하지 않는다", () => {
    expect(getCompatTopPercent(90)).toBeNull(); // 실제 34% — 30% 밖
    expect(getCompatTopPercent(89)).toBeNull();
    expect(getCompatTopPercent(86)).toBeNull();
    expect(getCompatTopPercent(70)).toBeNull();
    expect(getCompatTopPercent(0)).toBeNull();
    expect(formatCompatTopPercentBadge(89)).toBeNull();
    expect(formatCompatTopPercentBadge(86)).toBeNull();
  });

  it("경계값 및 주요 분위수(90점=30%, 91점=25%, 94점=10%)를 정확히 반환한다", () => {
    expect(getCompatTopPercent(91)).toBe(27);
    expect(getCompatTopPercent(92)).toBe(21);
    expect(getCompatTopPercent(94)).toBe(11);
    expect(getCompatTopPercent(100)).toBe(1);

    expect(formatCompatTopPercentBadge(91)).toBe("상위 27% 궁합");
    expect(formatCompatTopPercentBadge(94)).toBe("상위 11% 궁합");
  });

  it("90점 이상 구간에서 점수가 높아질수록 상위 퍼센트 숫자는 단조 감소한다", () => {
    let prev = 30;
    for (let s = 91; s <= 100; s++) {
      const pct = getCompatTopPercent(s);
      expect(pct).not.toBeNull();
      expect(pct!).toBeLessThanOrEqual(prev);
      expect(pct!).toBeGreaterThanOrEqual(1);
      prev = pct!;
    }
  });

  it("비정상 숫자(NaN, Infinity)에는 null 을 반환한다", () => {
    expect(getCompatTopPercent(Number.NaN)).toBeNull();
    expect(getCompatTopPercent(Number.POSITIVE_INFINITY)).toBeNull();
    expect(getCompatTopPercent(Number.NEGATIVE_INFINITY)).toBeNull();
  });
});

describe("P-016-2 무료 요약 끊긴 문장 및 핵심 단어 마스킹", () => {
  it("cutCompatFreeEnding 은 마지막 문장을 중간에서 끊고 이어지는 꼬리를 붙인다", () => {
    const out = cutCompatFreeEnding(
      "답장이 늦어도 재촉하지 않고 기다려 주는 편이에요.",
      "민수 님",
    );
    expect(out).toBe("답장이 늦어도 재촉하지 않고… 그런데 민수 님은…");
  });

  it("maskKeyWordForPreview 는 서버에서 핵심 단어를 ●●● 로 가려 원문이 남지 않게 한다", () => {
    const raw = "두 사람 사이에서 먼저 서운함을 삼키는 쪽은 다정한 배려와 연락 템포입니다.";
    const masked = maskKeyWordForPreview(raw);
    expect(masked).toContain("●●●");
    expect(masked).not.toBe(raw);
  });

  it("getTeaserMaskedLines 는 모든 상품에 대해 ●●● 가 포함된 2줄을 반환한다", () => {
    for (const id of ["inner_mind", "reunion", "love_single", "annual_2027", "unknown_id"]) {
      const lines = getTeaserMaskedLines(id);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain("●●●");
      expect(lines[1]).toContain("●●●");
    }
  });

  it("clipTeaserForView 와 loadStandardSamplePreview 는 잠긴 훅/문장을 서버에서 ●●● 로 가려 내려보낸다", () => {
    const sampleTeaser = {
      headline: "헤드라인",
      summary: "요약",
      freeSection: {
        key: "s1",
        title: "1장",
        body: "첫 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다. 네 번째 문장입니다.",
      },
      hooks: [
        "그 사람은 당신의 다정한 말투에 가장 깊이 끌려요.",
        "연락이 늦어질 때 먼저 서운함을 삼키는 쪽은 상대방이에요.",
      ],
    };
    const clipped = clipTeaserForView(sampleTeaser);
    expect(clipped.hooks[0]).toContain("●●●");
    expect(clipped.hooks[1]).toContain("●●●");

    const samplePreview = loadStandardSamplePreview("inner_mind");
    expect(samplePreview).not.toBeNull();
    expect(samplePreview?.lockedSections?.length).toBeGreaterThanOrEqual(1);
    expect(samplePreview?.lockedSections?.[0]?.firstSentence).toContain("●●●");
  });
});

describe("P-016-2 대화형 입력 궁금증 말투 가이드 (lib/compatCuriosity.ts)", () => {
  it("4가지 선택지(그 사람 마음 / 다시 만날 수 있을지 / 오래 갈지 / 다툼 이유)를 제공한다", () => {
    expect(COMPAT_CURIOSITY_OPTIONS.map((o) => o.label)).toEqual([
      "그 사람 마음",
      "다시 만날 수 있을지",
      "오래 갈지",
      "다툼 이유",
    ]);
  });

  it("선택값이 없거나 잘못된 값이면 기존 toneGuide 를 한 글자도 바꾸지 않는다", () => {
    const base = "기본 말투 가이드입니다.";
    expect(appendCuriosityToneGuide(base, undefined)).toBe(base);
    expect(appendCuriosityToneGuide(base, null)).toBe(base);
    expect(appendCuriosityToneGuide(base, "invalid")).toBe(base);
  });

  it("유효한 선택값이면 말투 가이드를 덧붙인다", () => {
    const base = "기본 말투 가이드입니다.";
    for (const opt of COMPAT_CURIOSITY_OPTIONS) {
      expect(isCompatCuriosityKey(opt.key)).toBe(true);
      const out = appendCuriosityToneGuide(base, opt.key);
      expect(out.startsWith(base)).toBe(true);
      expect(out.length).toBeGreaterThan(base.length);
    }
  });
});
