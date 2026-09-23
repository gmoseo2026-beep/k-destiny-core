import { describe, it, expect } from "vitest";
import {
  buildDaeun2027Teaser,
  buildNamingTeaser,
  buildDateSelectionTeaser,
} from "@/lib/premium/teasers";
import type { PersonInput, ChildNamingInput, DateSelectionInput } from "@/lib/validation/inputs";

describe("premium teasers 화이트리스트 검증", () => {
  it("2027 대운 티저: 허용된 키만 포함하고 유료 세부사항(월별 점수, 분야 점수, 대운 전체 목록) 제외", () => {
    const person: PersonInput = {
      name: "홍길동",
      dob: "1995-03-15",
      time: "10:30",
      gender: "F",
    };

    const teaser = buildDaeun2027Teaser(person);
    const keys = Object.keys(teaser).sort();
    expect(keys).toEqual(["bestMonthMasked", "cycleLabel", "domainNames", "yearScore"]);

    // Excluded check
    expect((teaser as unknown as Record<string, unknown>).months).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).domains).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).cycles).toBeUndefined();
    expect(teaser.yearScore).toBeGreaterThanOrEqual(55);
    expect(teaser.bestMonthMasked).toBe("가장 좋은 달: ●월");
  });

  it("작명 티저: 후보 수, 필요 기운 설명만 포함하고 유료 정보(이름, 한자, 획수) 제외", () => {
    const input: ChildNamingInput = {
      surnameHangul: "김",
      surnameHanja: "金",
      gender: "M",
      dob: "2024-05-15",
      time: "14:30",
      dollim: null,
      tags: ["지혜", "밝음"],
      avoidSyllables: [],
    };

    const teaser = buildNamingTeaser(input);
    const keys = Object.keys(teaser).sort();
    expect(keys).toEqual(["candidateCount", "insufficient", "neededElementDescription"]);

    // Excluded check
    expect((teaser as unknown as Record<string, unknown>).names).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).hanja).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).strokes).toBeUndefined();
    expect(teaser.candidateCount).toBeGreaterThan(0);
    expect(typeof teaser.neededElementDescription).toBe("string");
  });

  it("택일 티저: 찾은 길일 개수, 월별 분포만 포함하고 유료 정보(날짜, 점수, 시간) 제외", () => {
    const input: DateSelectionInput = {
      purpose: "WEDDING",
      start: "2027-04-01",
      end: "2027-06-30",
      people: [
        { name: "여성", dob: "1995-03-15", time: "10:30", gender: "F" },
        { name: "남성", dob: "1993-08-20", time: "15:00", gender: "M" },
      ],
      weekdays: [0, 6],
      excludeDates: [],
    };

    const teaser = buildDateSelectionTeaser(input);
    const keys = Object.keys(teaser).sort();
    expect(keys).toEqual(["insufficient", "monthlyDistribution", "totalFound"]);

    // Excluded check
    expect((teaser as unknown as Record<string, unknown>).picks).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).dates).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).scores).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).goodHours).toBeUndefined();
    expect(teaser.totalFound).toBeGreaterThan(0);
  });
});
