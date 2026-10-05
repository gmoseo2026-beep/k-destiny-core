import { describe, it, expect } from "vitest";
import {
  ZODIAC,
  allPairs,
  pairRelation,
  pairSlug,
  parsePairSlug,
  zodiacBySlug,
  zodiacOfYear,
  colorOfYear,
  birthYearFacts,
  samjaeStage,
  birthYears,
} from "@/lib/seo/zodiac";

const z = (slug: string) => zodiacBySlug(slug)!;

describe("띠 궁합(검색용 페이지) — 결정론", () => {
  it("78쌍이고 주소가 서로 겹치지 않는다", () => {
    const pairs = allPairs();
    expect(pairs).toHaveLength(78);
    expect(new Set(pairs.map((p) => p.slug)).size).toBe(78);
  });

  it("순서를 바꿔도 같은 관계·같은 점수·같은 주소", () => {
    for (const a of ZODIAC) {
      for (const b of ZODIAC) {
        expect(pairRelation(a, b)).toEqual(pairRelation(b, a));
        expect(pairSlug(a, b)).toBe(pairSlug(b, a));
      }
    }
  });

  it("같은 입력은 항상 같은 결과", () => {
    expect(pairRelation(z("rat"), z("ox"))).toEqual(pairRelation(z("rat"), z("ox")));
  });

  it("엔진 표와 같은 판정: 단짝·한 팀·정반대·서운·닮은꼴·무난", () => {
    expect(pairRelation(z("rat"), z("ox")).relation).toBe("six");
    expect(pairRelation(z("horse"), z("sheep")).relation).toBe("six");
    expect(pairRelation(z("pig"), z("rabbit")).relation).toBe("three");
    expect(pairRelation(z("rat"), z("horse")).relation).toBe("clash");
    expect(pairRelation(z("ox"), z("sheep")).relation).toBe("clash");
    expect(pairRelation(z("rat"), z("sheep")).relation).toBe("harm");
    expect(pairRelation(z("rat"), z("rat")).relation).toBe("same");
    expect(pairRelation(z("dragon"), z("dragon")).relation).toBe("punish"); // 같은 띠끼리 날이 서기 쉬운 네 띠
    expect(pairRelation(z("rat"), z("tiger")).relation).toBe("neutral");
  });

  it("점수는 0~100 이고 단짝 > 한 팀 > 무난 > 정반대 순서", () => {
    const s = (a: string, b: string) => pairRelation(z(a), z(b)).score;
    for (const p of allPairs()) {
      const r = pairRelation(p.a, p.b);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.label).not.toMatch(/[一-鿿]/);
    }
    expect(s("rat", "ox")).toBeGreaterThan(s("pig", "rabbit"));
    expect(s("pig", "rabbit")).toBeGreaterThan(s("rat", "tiger"));
    expect(s("rat", "tiger")).toBeGreaterThan(s("rat", "horse"));
  });

  it("주소 해석: 뒤집힌 주소는 정본을 알려 주고, 모르는 띠는 null", () => {
    expect(parsePairSlug("rat-ox")?.canonical).toBe("rat-ox");
    expect(parsePairSlug("ox-rat")?.canonical).toBe("rat-ox");
    expect(parsePairSlug("ox-rat")?.a.slug).toBe("rat");
    expect(parsePairSlug("cat-ox")).toBeNull();
    expect(parsePairSlug("rat")).toBeNull();
  });
});

describe("출생연도별 2027 운세 — 결정론", () => {
  it("연도 → 띠와 해의 색", () => {
    expect(zodiacOfYear(1995).slug).toBe("pig");
    expect(zodiacOfYear(2000).slug).toBe("dragon");
    expect(zodiacOfYear(2027).slug).toBe("sheep");
    expect(colorOfYear(2026)).toBe("붉은"); // 붉은 말의 해
    expect(colorOfYear(2027)).toBe("붉은"); // 붉은 양의 해
    expect(colorOfYear(1995)).toBe("푸른");
    expect(colorOfYear(1988)).toBe("황금");
  });

  it("1995년생: 푸른 돼지띠, 2027년에 만 31~32세, 양의 해와 한 팀, 삼재 3년째", () => {
    const f = birthYearFacts(1995);
    expect(f.nickname).toBe("푸른 돼지띠");
    expect([f.ageFrom, f.ageTo]).toEqual([31, 32]);
    expect(f.yearRelation.relation).toBe("three");
    expect(f.samjae).toBe(3);
    expect(f.targetNickname).toBe("붉은 양");
  });

  it("삼재: 2027년은 돼지·토끼·양띠의 마지막 해, 다른 띠는 해당 없음", () => {
    expect(samjaeStage(z("rabbit"), 2027)).toBe(3);
    expect(samjaeStage(z("sheep"), 2025)).toBe(1);
    expect(samjaeStage(z("rat"), 2027)).toBeNull();
    expect(samjaeStage(z("tiger"), 2028)).toBe(1);
  });

  it("1960~2007년생 48개 페이지", () => {
    expect(birthYears()).toHaveLength(48);
    expect(birthYears()[0]).toBe(2007);
  });
});
