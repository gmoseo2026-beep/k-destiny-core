import { describe, it, expect } from "vitest";
import { ILJU_LIST } from "@/lib/seo/ilju";

function pageTexts(d: (typeof ILJU_LIST)[number]): string[] {
  const t: string[] = [d.headline, d.summary];
  const s = d.sections;
  for (const sec of [s.loveStyle, s.innerMind, s.breakupReunion]) t.push(...sec.subheadings.map((x) => x.body));
  t.push(s.bestMatches.intro, ...s.bestMatches.matches.map((m) => m.reason));
  t.push(...d.faq.map((f) => f.a));
  return t;
}
const sentences = (t: string) =>
  t.split(/(?<=[.!?요다])\s+/).map((x) => x.trim()).filter((x) => x.length > 15);

describe("일주 페이지 고유성", () => {
  const perPage = ILJU_LIST.map((d) => pageTexts(d).flatMap(sentences));
  const count = new Map<string, number>();
  for (const page of perPage) for (const s of new Set(page)) count.set(s, (count.get(s) ?? 0) + 1);

  it("60장이다", () => expect(ILJU_LIST).toHaveLength(60));

  it("페이지마다 본문 3,500자 이상", () => {
    for (const [i, d] of ILJU_LIST.entries()) {
      const chars = pageTexts(d).join("").length;
      expect(chars, d.name).toBeGreaterThanOrEqual(3500);
      void i;
    }
  });

  it("다른 페이지와 겹치는 문장이 전체의 15% 이하", () => {
    const total = perPage.reduce((n, p) => n + p.length, 0);
    const shared = perPage.reduce((n, p) => n + p.filter((s) => (count.get(s) ?? 0) > 1).length, 0);
    expect(shared / total).toBeLessThanOrEqual(0.15);
  });

  it("한 페이지 안에 같은 문장이 두 번 나오지 않는다", () => {
    for (const [i, page] of perPage.entries()) {
      expect(new Set(page).size, ILJU_LIST[i].name).toBe(page.length);
    }
  });

  it("잘 맞는 일주 이유 문장은 모두 다르다", () => {
    const reasons = ILJU_LIST.flatMap((d) => d.sections.bestMatches.matches.map((m) => m.reason));
    expect(new Set(reasons).size).toBe(reasons.length);
  });
});
