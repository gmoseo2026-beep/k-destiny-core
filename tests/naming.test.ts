import { describe, it, expect } from "vitest";
import { radicalFullStrokes, originalStrokes } from "@/lib/premium/naming/strokes";
import { reduce81, fourGrids, allLucky, parityBalanced, soundElement, soundFlowScore } from "@/lib/premium/naming/rules";
import { buildNamingEngine } from "@/lib/premium/naming/engine";
import type { ChildNamingInput } from "@/lib/validation/inputs";

describe("원획", () => {
  it("부수 획수 경계", () => {
    expect([1, 7, 30, 61, 85, 96, 130, 162, 167, 170, 178, 187, 195, 201, 214].map(radicalFullStrokes))
      .toEqual([1, 2, 3, 4, 4, 5, 6, 7, 8, 8, 9, 10, 11, 12, 17]);
  });
  it("표준 성씨 원획", () => {
    expect(originalStrokes("167.0")).toBe(8);   // 金
    expect(originalStrokes("75.3")).toBe(7);    // 李
    expect(originalStrokes("75.2")).toBe(6);    // 朴
    expect(originalStrokes("46.8")).toBe(11);   // 崔
    expect(originalStrokes("163.12")).toBe(19); // 鄭 (阝=邑 7획)
    expect(originalStrokes("156.7")).toBe(14);  // 趙
    expect(originalStrokes("85.6")).toBe(10);   // 洪 (氵=水 4획)
  });
});

describe("수리·음양·발음", () => {
  it("81 환원", () => {
    expect(reduce81(81)).toBe(81);
    expect(reduce81(82)).toBe(2);
    expect(reduce81(161)).toBe(1);
  });
  it("4격", () => {
    expect(fourGrids(8, 7, 10)).toEqual({ won: 17, hyeong: 15, i: 18, jeong: 25 });
    expect(allLucky(fourGrids(8, 7, 10))).toBe(true);
    expect(allLucky(fourGrids(8, 13, 4))).toBe(false); // 이격 12
  });
  it("음양", () => {
    expect(parityBalanced([8, 7, 10])).toBe(true);
    expect(parityBalanced([8, 10, 6])).toBe(false);
  });
  it("발음오행", () => {
    expect(soundElement("김")).toBe("wood");
    expect(soundElement("서")).toBe("metal");
    expect(soundElement("윤")).toBe("earth");
    expect(soundFlowScore(["wood", "metal", "earth"])).toBe(0); // 쇠가 나무를 이김(-10), 흙이 쇠를 낳음(+10)
  });
});

describe("buildNamingEngine 소형 픽스처 및 실데이터 테스트", () => {
  const fixtureGivenNames = {
    M: [
      { name: "민준", rank: 1 },
      { name: "서준", rank: 2 },
      { name: "예준", rank: 3 },
      { name: "도윤", rank: 4 },
      { name: "시우", rank: 5 },
    ],
    F: [
      { name: "서연", rank: 1 },
      { name: "서윤", rank: 2 },
      { name: "지우", rank: 3 },
      { name: "서현", rank: 4 },
      { name: "하은", rank: 5 },
    ],
  };

  const fixtureHanja = [
    { char: "旼", eum: "민", hun: "하늘 민", strokes: 8, element: "fire" as const, genders: ["M" as const, "F" as const], tags: ["밝음"] },
    { char: "敏", eum: "민", hun: "민첩할 민", strokes: 11, element: "water" as const, genders: ["M" as const, "F" as const], tags: ["지혜"] },
    { char: "準", eum: "준", hun: "평평할 준", strokes: 14, element: "water" as const, genders: ["M" as const, "F" as const], tags: ["귀함"] },
    { char: "俊", eum: "준", hun: "준걸 준", strokes: 9, element: "fire" as const, genders: ["M" as const, "F" as const], tags: ["강인함"] },
    { char: "畯", eum: "준", hun: "농부 준", strokes: 12, element: "earth" as const, genders: ["M" as const, "F" as const], tags: ["자연"] },
    { char: "敍", eum: "서", hun: "펼 서", strokes: 11, element: "metal" as const, genders: ["M" as const, "F" as const], tags: ["지혜"] },
    { char: "瑞", eum: "서", hun: "상서로울 서", strokes: 14, element: "metal" as const, genders: ["M" as const, "F" as const], tags: ["귀함"] },
    { char: "睿", eum: "예", hun: "밝을 예", strokes: 14, element: "earth" as const, genders: ["M" as const, "F" as const], tags: ["지혜", "밝음"] },
    { char: "譽", eum: "예", hun: "기릴 예", strokes: 21, element: "earth" as const, genders: ["M" as const, "F" as const], tags: ["귀함"] },
    { char: "道", eum: "도", hun: "길 도", strokes: 16, element: "fire" as const, genders: ["M" as const, "F" as const], tags: ["지혜"] },
    { char: "度", eum: "도", hun: "법도 도", strokes: 9, element: "fire" as const, genders: ["M" as const, "F" as const], tags: ["지혜"] },
    { char: "潤", eum: "윤", hun: "윤택할 윤", strokes: 16, element: "water" as const, genders: ["M" as const, "F" as const], tags: ["따뜻함", "귀함"] },
    { char: "玧", eum: "윤", hun: "귀막이옥 윤", strokes: 9, element: "earth" as const, genders: ["M" as const, "F" as const], tags: ["귀함"] },
    { char: "時", eum: "시", hun: "때 시", strokes: 10, element: "fire" as const, genders: ["M" as const, "F" as const], tags: ["밝음"] },
    { char: "始", eum: "시", hun: "비로소 시", strokes: 8, element: "metal" as const, genders: ["M" as const, "F" as const], tags: ["밝음"] },
    { char: "佑", eum: "우", hun: "도울 우", strokes: 7, element: "earth" as const, genders: ["M" as const, "F" as const], tags: ["따뜻함"] },
    { char: "宇", eum: "우", hun: "집 우", strokes: 6, element: "earth" as const, genders: ["M" as const, "F" as const], tags: ["강인함"] },
    { char: "雨", eum: "우", hun: "비 우", strokes: 8, element: "water" as const, genders: ["M" as const, "F" as const], tags: ["자연"] },
    { char: "然", eum: "연", hun: "그러할 연", strokes: 12, element: "fire" as const, genders: ["M" as const, "F" as const], tags: ["자연"] },
    { char: "弦", eum: "현", hun: "활시위 현", strokes: 8, element: "metal" as const, genders: ["M" as const, "F" as const], tags: ["강인함"] },
  ];

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

  it("결정론: 두 번 호출한 결과가 동일함", () => {
    const r1 = buildNamingEngine(input, { givenNames: fixtureGivenNames, nameHanja: fixtureHanja });
    const r2 = buildNamingEngine(input, { givenNames: fixtureGivenNames, nameHanja: fixtureHanja });
    expect(r1).toEqual(r2);
  });

  it("한글 이름 중복 없음", () => {
    const res = buildNamingEngine(input, { givenNames: fixtureGivenNames, nameHanja: fixtureHanja });
    const hangulNames = res.names.map((n) => n.hangul);
    const uniqueHangul = new Set(hangulNames);
    expect(hangulNames.length).toBe(uniqueHangul.size);
  });

  it("모든 후보가 allLucky 및 parityBalanced 만족", () => {
    const res = buildNamingEngine(input, { givenNames: fixtureGivenNames, nameHanja: fixtureHanja });
    for (const n of res.names) {
      expect(allLucky(n.grids)).toBe(true);
      expect(parityBalanced([n.strokes.s, n.strokes.g1, n.strokes.g2])).toBe(true);
    }
  });

  it("돌림자 고정 확인", () => {
    const dollimInput: ChildNamingInput = {
      ...input,
      dollim: { syllable: "준", position: 2, hanja: "俊" },
    };
    const res = buildNamingEngine(dollimInput, { givenNames: fixtureGivenNames, nameHanja: fixtureHanja });
    for (const n of res.names) {
      expect(n.hangul[1]).toBe("준");
      expect(n.hanja[1]).toBe("俊");
    }
  });

  it("실제 데이터셋 실행: 상위 5개 생성 성공", () => {
    const res = buildNamingEngine(input);
    expect(res.names.length).toBe(5);
    expect(res.insufficient).toBe(false);
    expect(res.child.weakest.length).toBeGreaterThan(0);
  });
});
