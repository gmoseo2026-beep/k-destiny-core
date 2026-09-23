import { describe, it, expect } from "vitest";
import { calculateDaeun, buildPremium2027Engine } from "@/lib/premium/daeun";

describe("daeun", () => {
  it("1995-03-15 10:30 여성 — 대운 실측값", () => {
    const r = calculateDaeun({ dob: "1995-03-15", time: "10:30", gender: "F" }, 2027);
    expect(r.cycles[0]).toMatchObject({ startYear: 2002, endYear: 2011, startAge: 8, ganZhi: "庚辰" });
    expect(r.current).toMatchObject({ startYear: 2022, endYear: 2031, startAge: 28, ganZhi: "壬午" });
  });
  it("2027 월 간지 실측", () => {
    const e = buildPremium2027Engine({ name: "나", dob: "1995-03-15", time: "10:30", gender: "F" });
    expect(e.months.map((m) => m.ganZhi)).toEqual(
      ["辛丑", "壬寅", "癸卯", "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子"],
    );
  });
  it("결정론·범위", () => {
    const p = { name: "나", dob: "1990-07-01", time: null, gender: "M" as const };
    const a = buildPremium2027Engine(p);
    const b = buildPremium2027Engine(p);
    expect(a).toEqual(b);
    expect(a.yearScore).toBeGreaterThanOrEqual(55);
    expect(a.yearScore).toBeLessThanOrEqual(97);
    for (const m of a.months) {
      expect(m.score).toBeGreaterThanOrEqual(50);
      expect(m.score).toBeLessThanOrEqual(99);
    }
  });
  it("스냅샷(보고서에 값 기재 → Claude 수기 검산)", () => {
    expect(buildPremium2027Engine({ name: "나", dob: "1995-03-15", time: "10:30", gender: "F" })).toMatchSnapshot();
  });
});
