import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { radicalFullStrokes, originalStrokes } from "@/lib/premium/naming/strokes";
import { reduce81, fourGrids, allLucky, parityBalanced, soundElement, soundFlowScore } from "@/lib/premium/naming/rules";
import { buildNamingEngine, isNameWorthy, dueumSourceSyllables } from "@/lib/premium/naming/engine";
import type { ChildNamingInput } from "@/lib/validation/inputs";
import nameHanjaDataRaw from "@/data/naming/name-hanja.json";

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
    avoidSyllables: [], guardianConsent: true,
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

  describe("N1: 작명 한자 성별 태그 검증", () => {
    const charMap = new Map(nameHanjaDataRaw.map((h) => [h.char, h]));

    it("지정 한자의 성별 태그 일치 (娟·婷·媛·娥는 ['F'], 雄은 ['M'], 始·如는 ['M','F'])", () => {
      expect(charMap.get("娟")?.genders).toEqual(["F"]);
      expect(charMap.get("婷")?.genders).toEqual(["F"]);
      expect(charMap.get("媛")?.genders).toEqual(["F"]);
      expect(charMap.get("娥")?.genders).toEqual(["F"]);
      expect(charMap.get("雄")?.genders).toEqual(["M"]);
      expect(charMap.get("始")?.genders).toEqual(["M", "F"]);
      expect(charMap.get("如")?.genders).toEqual(["M", "F"]);
    });

    it("실데이터 buildNamingEngine 남아(M) 3종 실행 시 모든 한자가 genders에 M 포함", () => {
      const maleCases: ChildNamingInput[] = [
        { surnameHangul: "김", surnameHanja: "金", gender: "M", dob: "2024-05-15", time: "14:30", dollim: null, tags: ["지혜", "밝음"], avoidSyllables: [], guardianConsent: true },
        { surnameHangul: "이", surnameHanja: "李", gender: "M", dob: "2025-01-10", time: "09:15", dollim: null, tags: ["강인함", "지혜"], avoidSyllables: [], guardianConsent: true },
        { surnameHangul: "박", surnameHanja: "朴", gender: "M", dob: "2026-08-20", time: "18:00", dollim: null, tags: ["귀함", "밝음"], avoidSyllables: [], guardianConsent: true },
      ];

      for (const mc of maleCases) {
        const result = buildNamingEngine(mc);
        expect(result.names.length).toBeGreaterThan(0);
        for (const cand of result.names) {
          const h1 = charMap.get(cand.hanja[0]);
          const h2 = charMap.get(cand.hanja[1]);
          expect(h1).toBeDefined();
          expect(h2).toBeDefined();
          expect(h1?.genders).toContain("M");
          expect(h2?.genders).toContain("M");
        }
      }
    });

    it("실데이터 buildNamingEngine 여아(F) 3종 실행 시 모든 한자가 genders에 F 포함", () => {
      const femaleCases: ChildNamingInput[] = [
        { surnameHangul: "김", surnameHanja: "金", gender: "F", dob: "2024-05-15", time: "14:30", dollim: null, tags: ["지혜", "따뜻함"], avoidSyllables: [], guardianConsent: true },
        { surnameHangul: "최", surnameHanja: "崔", gender: "F", dob: "2025-03-22", time: "11:20", dollim: null, tags: ["따뜻함", "밝음"], avoidSyllables: [], guardianConsent: true },
        { surnameHangul: "정", surnameHanja: "鄭", gender: "F", dob: "2026-11-05", time: "08:45", dollim: null, tags: ["자연", "귀함"], avoidSyllables: [], guardianConsent: true },
      ];

      for (const fc of femaleCases) {
        const result = buildNamingEngine(fc);
        expect(result.names.length).toBeGreaterThan(0);
        for (const cand of result.names) {
          const h1 = charMap.get(cand.hanja[0]);
          const h2 = charMap.get(cand.hanja[1]);
          expect(h1).toBeDefined();
          expect(h2).toBeDefined();
          expect(h1?.genders).toContain("F");
          expect(h2?.genders).toContain("F");
        }
      }
    });
  });

  describe("두음법칙 대응 음(dueumSourceSyllables)", () => {
    it("ㅇ+이중모음 계열은 ㄹ·ㄴ 사전 음도 찾는다", () => {
      expect(dueumSourceSyllables("율")).toEqual(["률", "뉼"]);
      expect(dueumSourceSyllables("연")).toEqual(["련", "년"]);
      expect(dueumSourceSyllables("린")).toEqual([]);
    });
    it("ㄴ+기타 모음은 ㄹ 사전 음도 찾는다, 그 외는 없음", () => {
      expect(dueumSourceSyllables("나")).toEqual(["라"]);
      expect(dueumSourceSyllables("노")).toEqual(["로"]);
      expect(dueumSourceSyllables("서")).toEqual([]);
      expect(dueumSourceSyllables("윤")).toEqual(["륜", "뉸"]);
    });
    it("사전 음이 '률'인 글자(律)도 '서율'의 후보가 되고, 이름 음은 '율'로 표기된다", () => {
      // 수리·음양 조건을 확실히 통과하는 획수로 픽스처를 만들어, 두음법칙 조회 경로만 검증한다.
      const fixtureHanja = [
        { char: "序", eum: "서", hun: "차례", strokes: 7, element: "wood" as const, genders: ["M", "F"] as ("M" | "F")[], tags: ["귀함"] },
        { char: "律", eum: "률", hun: "법칙", strokes: 9, element: "wood" as const, genders: ["M", "F"] as ("M" | "F")[], tags: ["귀함"] },
      ];
      // s=8(金): 원 7+9=16, 형 8+7=15, 이 8+9=17, 정 24 → 모두 길수, 획수 홀짝 혼합
      const r = buildNamingEngine(
        { surnameHangul: "김", surnameHanja: "金", gender: "F", dob: "2025-03-01", time: null, dollim: null, tags: [], avoidSyllables: [], guardianConsent: true },
        { givenNames: { M: [], F: [{ name: "서율", rank: 1 }] }, nameHanja: fixtureHanja },
      );
      expect(r.names).toHaveLength(1);
      expect(r.names[0].hanja).toEqual(["序", "律"]);
      expect(r.names[0].eum).toEqual(["서", "율"]);
    });
  });

  describe("ㄹ음 인명 한자 복구(두음 원음 포함 재구축)", () => {
    const hanjaByChar = new Map(nameHanjaDataRaw.map((h) => [h.char, h]));
    const inmyong = new Set(
      readFileSync(path.join(process.cwd(), "data/naming/inmyong-hanja.txt"), "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#")),
    );

    // 利(훈: 날카로울)는 출시 전 글자 검수에서 이름 후보 제외로 정했다
    it("律·麟·蓮·倫·林·璃·玲 중 인명용 글자는 데이터에 있고 이름으로 쓸 수 있다", () => {
      for (const ch of ["律", "麟", "蓮", "倫", "林", "璃", "玲"]) {
        if (!inmyong.has(ch)) continue;
        const h = hanjaByChar.get(ch);
        expect(h, ch).toBeDefined();
        expect(isNameWorthy(h!), ch).toBe(true);
      }
    });

    it("사전 음(률·린 등)을 그대로 저장한다", () => {
      expect(hanjaByChar.get("律")?.eum).toBe("률");
      expect(hanjaByChar.get("麟")?.eum).toBe("린");
      expect(hanjaByChar.get("蓮")?.eum).toBe("련");
    });

    it("사전 음이 ㄹ로 시작하는 항목이 150개 이상이다", () => {
      const cho = (s: string) => Math.floor((s.charCodeAt(0) - 0xac00) / 588);
      const rCount = nameHanjaDataRaw.filter((h) => cho(h.eum) === 5).length;
      expect(rCount).toBeGreaterThanOrEqual(150);
    });

    it("실데이터로 '서율'(여)·'시율'(남)을 만들면 이름 음은 '율'로 표기된다", () => {
      const base = { surnameHangul: "김", surnameHanja: "金", time: null, dollim: null, tags: [], avoidSyllables: [], guardianConsent: true as const };
      const f = buildNamingEngine({ ...base, gender: "F", dob: "2025-03-01" }, { givenNames: { M: [], F: [{ name: "서율", rank: 1 }] } });
      const m = buildNamingEngine({ ...base, gender: "M", dob: "2025-03-01" }, { givenNames: { M: [{ name: "시율", rank: 1 }], F: [] } });
      for (const r of [f, m]) {
        expect(r.names.length).toBeGreaterThan(0);
        for (const n of r.names) expect(n.eum[1]).toBe("율");
      }
    });
  });

  describe("오행 미상 글자(element: null) 유지", () => {
    const hanjaByChar = new Map(nameHanjaDataRaw.map((h) => [h.char, h]));

    it("부수로 오행을 정하지 못한 인기 글자(夏·世·勳·韓·多)도 데이터에 있다", () => {
      for (const ch of ["夏", "世", "勳", "韓", "多"]) {
        expect(hanjaByChar.get(ch), ch).toBeDefined();
        expect(hanjaByChar.get(ch)?.element, ch).toBeNull();
      }
    });

    it("element: null 글자로만 된 픽스처에서도 후보를 내고, 오행 보완 점수는 0이다", () => {
      const nullHanja = [
        { char: "序", eum: "서", hun: "차례", strokes: 7, element: null, genders: ["M", "F"] as ("M" | "F")[], tags: [] },
        { char: "律", eum: "률", hun: "법칙", strokes: 9, element: null, genders: ["M", "F"] as ("M" | "F")[], tags: [] },
      ];
      const r = buildNamingEngine(
        { surnameHangul: "김", surnameHanja: "金", gender: "F", dob: "2025-03-01", time: null, dollim: null, tags: [], avoidSyllables: [], guardianConsent: true },
        { givenNames: { M: [], F: [{ name: "서율", rank: 1 }] }, nameHanja: nullHanja },
      );
      expect(r.names).toHaveLength(1);
      expect(r.names[0].elements).toEqual([null, null]);
      // 50(기본) + 발음 흐름 + 자연스러움 10(1순위) + 태그 0 — 오행 보완 가감이 없어야 한다
      const withElements = buildNamingEngine(
        { surnameHangul: "김", surnameHanja: "金", gender: "F", dob: "2025-03-01", time: null, dollim: null, tags: [], avoidSyllables: [], guardianConsent: true },
        { givenNames: { M: [], F: [{ name: "서율", rank: 1 }] }, nameHanja: nullHanja.map((h) => ({ ...h, element: r.child.weakest[0] })) },
      );
      // 부족 오행 2글자 × 12 = 내부 24점 → 고객용 환산(×0.43) 후 10~11점 차이
      const diff = withElements.names[0].score - r.names[0].score;
      expect(diff).toBeGreaterThanOrEqual(10);
      expect(diff).toBeLessThanOrEqual(11);
    });
  });

  describe("부적합 글자 제외(isNameWorthy)", () => {
    const hanjaByChar = new Map(nameHanjaDataRaw.map((h) => [h.char, h]));

    it("K2 검수로 뺀 글자(吝 인색할·胯 사타구니·獸 짐승)는 이름에 쓸 수 없다", () => {
      for (const ch of ["吝", "胯", "獸"]) {
        const h = hanjaByChar.get(ch) ?? { char: ch, hun: "" };
        expect(isNameWorthy(h), ch).toBe(false);
      }
    });

    it("실데이터 하린·서율·지유(여), 도윤·시우·하준(남) 결과 글자는 모두 이름에 쓸 수 있다", () => {
      const base = { surnameHangul: "김", surnameHanja: "金", dob: "2025-03-01", time: null, dollim: null, tags: [], avoidSyllables: [], guardianConsent: true as const };
      const cases: [string, "M" | "F"][] = [["하린", "F"], ["서율", "F"], ["지유", "F"], ["도윤", "M"], ["시우", "M"], ["하준", "M"]];
      for (const [name, gender] of cases) {
        const r = buildNamingEngine(
          { ...base, gender },
          { givenNames: { M: gender === "M" ? [{ name, rank: 1 }] : [], F: gender === "F" ? [{ name, rank: 1 }] : [] } },
        );
        expect(r.names.length, name).toBeGreaterThan(0);
        for (const n of r.names) {
          for (const ch of n.hanja) {
            const h = hanjaByChar.get(ch);
            expect(h && isNameWorthy(h), `${name} ${ch}`).toBe(true);
          }
        }
      }
    });

    it("뜻이 나쁘거나 이름에 부적합한 글자는 후보가 될 수 없다", () => {
      for (const ch of ["汰", "殆", "怠", "妓", "娼", "妖", "孀", "憂", "愚", "邪", "淫", "怨"]) {
        const h = hanjaByChar.get(ch) ?? { char: ch, hun: "" };
        expect(isNameWorthy(h), ch).toBe(false);
      }
    });

    it("확장 영역 한자는 제외, 흔한 이름 한자는 허용", () => {
      expect(isNameWorthy({ char: "㥥", hun: "기쁠" })).toBe(false);
      for (const ch of ["泰", "瑞", "賢", "智", "喜", "潤", "娟"]) {
        const h = hanjaByChar.get(ch);
        expect(h, ch).toBeDefined();
        expect(isNameWorthy(h!), ch).toBe(true);
      }
    });

    it("실데이터 결과(남·여 각 3건)에 부적합 글자가 없다", () => {
      const base = { surnameHangul: "김", surnameHanja: "金", time: null, dollim: null, tags: [], avoidSyllables: [], guardianConsent: true as const };
      const cases: ChildNamingInput[] = [
        { ...base, gender: "M", dob: "2025-03-01" },
        { ...base, gender: "M", dob: "2024-11-20", time: "08:15" },
        { ...base, gender: "M", dob: "2023-07-07" },
        { ...base, gender: "F", dob: "2025-01-15" },
        { ...base, gender: "F", dob: "2024-06-30", time: "22:40" },
        { ...base, gender: "F", dob: "2023-12-24" },
      ];
      for (const c of cases) {
        const r = buildNamingEngine(c);
        expect(r.names.length).toBeGreaterThan(0);
        for (const n of r.names) {
          for (const ch of n.hanja) {
            const h = hanjaByChar.get(ch);
            expect(h && isNameWorthy(h), `${n.hangul} ${ch}`).toBe(true);
          }
        }
      }
    });
  });

  describe("N2: 훈(뜻) 표기 검증", () => {
    it("모든 항목의 hun에 '/'가 없다", () => {
      const withSlash = nameHanjaDataRaw.filter((h) => h.hun.includes("/"));
      expect(withSlash).toHaveLength(0);
    });

    it("모든 항목의 hun에 음이 따로 붙어 있지 않다('은혜 혜' 금지, '은혜'는 정상 낱말)", () => {
      const endsWithEum = nameHanjaDataRaw.filter((h) => h.hun === h.eum || h.hun.endsWith(" " + h.eum));
      expect(endsWithEum).toHaveLength(0);
    });

    it("낱말 끝 글자를 음으로 착각해 잘라내지 않는다(惠 은혜, 麟 기린, 倫 인륜)", () => {
      const byChar = new Map(nameHanjaDataRaw.map((h) => [h.char, h.hun]));
      expect(byChar.get("惠")).toBe("은혜");
      expect(byChar.get("麟")).toBe("기린");
      expect(byChar.get("倫")).toBe("인륜");
    });
  });
});


describe("검수 결정 고정(2026-09-23 Claude)", () => {
  const byChar = new Map(nameHanjaDataRaw.map((h) => [h.char, h]));
  it("何·齧·拑은 이름 후보가 될 수 없다", () => {
    for (const ch of ["何", "齧", "拑"]) {
      const h = byChar.get(ch) ?? { char: ch, hun: "" };
      expect(isNameWorthy(h), ch).toBe(false);
    }
  });
  it("台는 '별', 冬은 '겨울'로만 표기한다(태풍·북소리 혼입 제거)", () => {
    expect(byChar.get("台")?.hun).toBe("별");
    expect(byChar.get("冬")?.hun).toBe("겨울");
  });
});

describe("출시 전 글자 검수 고정(2026-09-25 Claude)", () => {
  // 실데이터로 1,200가지 입력을 돌려 실제로 뽑힌 글자를 전수 검수한 결과
  const ksx = new Set<string>(JSON.parse(readFileSync(path.join(process.cwd(), "data/naming/ksx1001-hanja.json"), "utf8")).chars);
  const runs: ChildNamingInput[] = [];
  for (const [sn, sh] of [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"]] as const) {
    for (const gender of ["M", "F"] as const) {
      for (const dob of ["2025-07-02", "2026-05-17"]) {
        runs.push({ surnameHangul: sn, surnameHanja: sh, gender, dob, time: "09:00", dollim: null, tags: ["지혜"], avoidSyllables: [], guardianConsent: true });
      }
    }
  }
  const outputs = runs.map((r) => buildNamingEngine(r));

  it("후보 글자는 모두 표준 완성형(KS X 1001)이다 — 奲 같은 벽자 금지", () => {
    for (const o of outputs) for (const n of o.names) for (const c of n.hanja) expect(ksx.has(c), `${n.hangul} ${c}`).toBe(true);
  });
  it("검수에서 뺀 글자(漬 담글, 寃 원통할, 胴 큰창자, 鄭·李 성씨 등)는 나오지 않는다", () => {
    const banned = ["漬", "寃", "胴", "醯", "牝", "鄭", "李", "餓", "債", "笞", "利"];
    for (const c of banned) expect(isNameWorthy({ char: c, hun: "" }), c).toBe(false);
    for (const o of outputs) for (const n of o.names) for (const c of n.hanja) expect(banned, `${n.hangul}`).not.toContain(c);
  });
  it("고객에게 보이는 이름 점수는 100점을 넘지 않고, 이름 5개를 모두 채운다", () => {
    for (const o of outputs) {
      expect(o.insufficient).toBe(false);
      for (const n of o.names) expect(n.score).toBeLessThanOrEqual(100);
    }
  });
});
