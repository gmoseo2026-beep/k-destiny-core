import { describe, it, expect } from "vitest";
import pairsJson from "@/data/seo/zodiac-pairs.json";
import yearsJson from "@/data/seo/fortune-2027.json";
import { allPairs, birthYears, birthYearFacts } from "@/lib/seo/zodiac";
import { isCleanText, isPairContent, isYearContent } from "@/lib/seo/content";

/**
 * 검색용 페이지 본문(data/seo/*.json)은 AI 가 미리 쓴 글이다. 화면에 그대로 나가므로
 * 저장된 글 전부가 규칙(한자·전문용어·단정적 예언 없음, 형식)을 지키는지 매번 검사한다.
 */
const pairs = pairsJson as Record<string, unknown>;
const years = yearsJson as Record<string, unknown>;

describe("검색용 페이지 본문 — 저장된 글 검사", () => {
  it("띠 궁합 78쌍이 모두 있고 형식·말투 규칙을 지킨다", () => {
    const slugs = allPairs().map((p) => p.slug);
    expect(Object.keys(pairs).sort()).toEqual([...slugs].sort());
    const bad = slugs.filter((s) => !isPairContent(pairs[s]));
    expect(bad).toEqual([]);
  });

  it("출생연도 48개가 모두 있고 형식·말투 규칙을 지킨다", () => {
    const ys = birthYears();
    expect(Object.keys(years).map(Number).sort()).toEqual([...ys].sort());
    const bad = ys.filter((y) => !isYearContent(years[String(y)], !!birthYearFacts(y).samjae));
    expect(bad).toEqual([]);
  });

  it("삼재가 아닌 띠의 글에는 '삼재'라는 말이 없다", () => {
    const bad = birthYears().filter((y) => !birthYearFacts(y).samjae && JSON.stringify(years[String(y)]).includes("삼재"));
    expect(bad).toEqual([]);
  });

  it("검사기: 한자·전문용어·단정적 예언을 잡는다", () => {
    expect(isCleanText("서로 잘 맞는 편이에요")).toBe(true);
    expect(isCleanText("子와 丑의 만남")).toBe(false);
    expect(isCleanText("두 사람은 오행이 잘 맞아요")).toBe(false);
    expect(isCleanText("올해 반드시 좋은 일이 생겨요")).toBe(false);
    expect(isCleanText("일주일에 한 번은 쉬어요")).toBe(true);
    expect(isCleanText("삼재의 마지막 해예요")).toBe(false);
    expect(isCleanText("삼재의 마지막 해예요", { allowSamjae: true })).toBe(true);
  });
});
