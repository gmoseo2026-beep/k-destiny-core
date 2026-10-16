import { describe, expect, it } from "vitest";
import {
  COMPAT_GAUGE_SPECS,
  buildCompatGaugeItems,
  mapGaugeStep,
  parseCompatBreakdown,
  pickPublicBreakdown,
} from "@/lib/compatGauge";

describe("lib/compatGauge — 궁합 5대 세부 지표 매핑", () => {
  it("5개 축의 모든 이산값에 대해 단계 이름과 칸수를 정확히 매핑한다", () => {
    // stem (만점 30, 4칸)
    expect(mapGaugeStep("stem", 30)).toEqual({ stepLabel: "찰떡 호흡", filledCells: 4, percent: 100 });
    expect(mapGaugeStep("stem", 25)).toEqual({ stepLabel: "서로 북돋는 흐름", filledCells: 3, percent: 83 });
    expect(mapGaugeStep("stem", 20)).toEqual({ stepLabel: "비슷해 편안한 결", filledCells: 2, percent: 67 });
    expect(mapGaugeStep("stem", 10)).toEqual({ stepLabel: "다름을 맞춰 가는 사이", filledCells: 1, percent: 33 });
    expect(mapGaugeStep("stem", 15)).toBeNull();

    // complement (만점 30, 3칸)
    expect(mapGaugeStep("complement", 30)).toEqual({ stepLabel: "빈틈없이 채워 줌", filledCells: 3, percent: 100 });
    expect(mapGaugeStep("complement", 20)).toEqual({ stepLabel: "부분적으로 채워 줌", filledCells: 2, percent: 67 });
    expect(mapGaugeStep("complement", 10)).toEqual({ stepLabel: "각자 장점이 뚜렷함", filledCells: 1, percent: 33 });
    expect(mapGaugeStep("complement", 25)).toBeNull();

    // branch (만점 20, 4칸)
    expect(mapGaugeStep("branch", 20)).toEqual({ stepLabel: "가까울수록 편안함", filledCells: 4, percent: 100 });
    expect(mapGaugeStep("branch", 15)).toEqual({ stepLabel: "무난하고 안정적", filledCells: 3, percent: 75 });
    expect(mapGaugeStep("branch", 10)).toEqual({ stepLabel: "섬세한 배려가 필요", filledCells: 2, percent: 50 });
    expect(mapGaugeStep("branch", 5)).toEqual({ stepLabel: "속도 조절이 꼭 필요", filledCells: 1, percent: 25 });
    expect(mapGaugeStep("branch", 0)).toBeNull();

    // balance (만점 10, 3칸)
    expect(mapGaugeStep("balance", 10)).toEqual({ stepLabel: "고르고 단단한 균형", filledCells: 3, percent: 100 });
    expect(mapGaugeStep("balance", 7)).toEqual({ stepLabel: "대체로 고른 편", filledCells: 2, percent: 70 });
    expect(mapGaugeStep("balance", 4)).toEqual({ stepLabel: "특정 색깔이 뚜렷함", filledCells: 1, percent: 40 });
    expect(mapGaugeStep("balance", 5)).toBeNull();

    // yinYang (만점 10, 3칸)
    expect(mapGaugeStep("yinYang", 10)).toEqual({ stepLabel: "온도가 딱 맞음", filledCells: 3, percent: 100 });
    expect(mapGaugeStep("yinYang", 7)).toEqual({ stepLabel: "자연스러운 온도 차", filledCells: 2, percent: 70 });
    expect(mapGaugeStep("yinYang", 4)).toEqual({ stepLabel: "한쪽 템포가 뚜렷함", filledCells: 1, percent: 40 });
    expect(mapGaugeStep("yinYang", 1)).toBeNull();
  });

  it("공개 3축에만 한 줄 설명이 있고 잠긴 2축에는 한 줄 설명이 없다", () => {
    const publicSpecs = COMPAT_GAUGE_SPECS.filter((s) => s.isPublic);
    const lockedSpecs = COMPAT_GAUGE_SPECS.filter((s) => !s.isPublic);
    expect(publicSpecs.map((s) => s.key)).toEqual(["stem", "balance", "yinYang"]);
    expect(lockedSpecs.map((s) => s.key)).toEqual(["complement", "branch"]);
    for (const s of publicSpecs) {
      expect(typeof s.description).toBe("string");
      expect(s.description!.length).toBeGreaterThan(0);
    }
    for (const s of lockedSpecs) {
      expect(s.description).toBeUndefined();
    }
  });

  it("pickPublicBreakdown은 공개 3축만 골라 돌려주고 잠긴 2축 값은 포함하지 않는다", () => {
    const raw = { stem: 25, complement: 30, branch: 15, balance: 7, yinYang: 10 };
    const pub = pickPublicBreakdown(raw);
    expect(pub).toEqual({ stem: 25, balance: 7, yinYang: 10 });
    expect(pub).not.toHaveProperty("complement");
    expect(pub).not.toHaveProperty("branch");
  });

  it("잘못된 breakdown 입력에 대해 null을 돌려준다(옛 행 방어)", () => {
    expect(parseCompatBreakdown(null)).toBeNull();
    expect(parseCompatBreakdown(undefined)).toBeNull();
    expect(parseCompatBreakdown("invalid")).toBeNull();
    expect(parseCompatBreakdown([])).toBeNull();
    expect(parseCompatBreakdown({})).toBeNull();
    expect(parseCompatBreakdown({ stem: 25, balance: 7, yinYang: 10 })).toBeNull();
    expect(
      parseCompatBreakdown({ stem: 999, complement: 30, branch: 15, balance: 7, yinYang: 10 })
    ).toBeNull();
    expect(
      parseCompatBreakdown({ stem: NaN, complement: 30, branch: 15, balance: 7, yinYang: 10 })
    ).toBeNull();

    expect(pickPublicBreakdown(null)).toBeNull();
    expect(pickPublicBreakdown({})).toBeNull();
    expect(pickPublicBreakdown({ stem: "25", balance: 7, yinYang: 10 })).toBeNull();
    expect(pickPublicBreakdown({ stem: 12, balance: 7, yinYang: 10 })).toBeNull();

    expect(buildCompatGaugeItems(null, null)).toBeNull();
    expect(buildCompatGaugeItems(undefined, undefined)).toBeNull();
  });

  it("buildCompatGaugeItems는 미결제 시 3공개+2잠금을, 유료 시 5축 전체를 같은 값으로 돌려준다", () => {
    const full = { stem: 25, complement: 20, branch: 15, balance: 7, yinYang: 10 };
    const pub = pickPublicBreakdown(full);

    const freeItems = buildCompatGaugeItems(pub, null);
    expect(freeItems).not.toBeNull();
    expect(freeItems!.map((i) => ({ key: i.key, score: i.score, stepLabel: i.step?.stepLabel ?? null }))).toEqual([
      { key: "stem", score: 25, stepLabel: "서로 북돋는 흐름" },
      { key: "balance", score: 7, stepLabel: "대체로 고른 편" },
      { key: "yinYang", score: 10, stepLabel: "온도가 딱 맞음" },
      { key: "complement", score: null, stepLabel: null },
      { key: "branch", score: null, stepLabel: null },
    ]);

    const paidItems = buildCompatGaugeItems(pub, full);
    expect(paidItems).not.toBeNull();
    expect(paidItems!.map((i) => ({ key: i.key, score: i.score, stepLabel: i.step?.stepLabel ?? null }))).toEqual([
      { key: "stem", score: 25, stepLabel: "서로 북돋는 흐름" },
      { key: "balance", score: 7, stepLabel: "대체로 고른 편" },
      { key: "yinYang", score: 10, stepLabel: "온도가 딱 맞음" },
      { key: "complement", score: 20, stepLabel: "부분적으로 채워 줌" },
      { key: "branch", score: 15, stepLabel: "무난하고 안정적" },
    ]);
  });
});
