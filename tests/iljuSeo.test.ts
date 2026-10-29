import { describe, it, expect } from "vitest";
import {
  ILJU_LIST,
  allIljuSlugs,
  findIljuByBirthDate,
  getIljuBySlug,
  resolveIljuParam,
} from "@/lib/seo/ilju";
import { isCleanText } from "@/lib/seo/content";
import { POST as iljuCheckPOST } from "@/app/api/ilju/check/route";
import sitemap from "@/app/sitemap";

describe("11 일주 페이지 60장 정적 데이터 · 말투 · 내 일주 확인 테스트", () => {
  it("1) 갑자일주부터 계해일주까지 정확히 60장이며 슬러그가 중복되지 않는다", () => {
    expect(ILJU_LIST).toHaveLength(60);
    expect(ILJU_LIST[0].name).toBe("갑자일주");
    expect(ILJU_LIST[0].slug).toBe("gapja");
    expect(ILJU_LIST[59].name).toBe("계해일주");
    expect(ILJU_LIST[59].slug).toBe("gyehae");
    expect(new Set(allIljuSlugs()).size).toBe(60);
  });

  it("2) 60장 모두 4개 섹션 id 앵커, 필수 신규 소제목(상황 3가지·좋은 말/피할 말), 소제목당 2문단·250자 이상, FAQ 3개, 잘 맞는 일주 3개 두 이름 포함을 갖춘다", () => {
    const slugSet = new Set(allIljuSlugs());

    for (const item of ILJU_LIST) {
      expect(item.title).toBe(`${item.name} 연애 성향과 잘 맞는 사람`);
      expect(item.sections.loveStyle.id).toBe("love-style");
      expect(item.sections.innerMind.id).toBe("inner-mind");
      expect(item.sections.breakupReunion.id).toBe("breakup-reunion");
      expect(item.sections.bestMatches.id).toBe("best-matches");

      for (const sec of [
        item.sections.loveStyle,
        item.sections.innerMind,
        item.sections.breakupReunion,
      ]) {
        expect(sec.subheadings.length, `${item.name} ${sec.id}`).toBeGreaterThanOrEqual(2);
        for (const sub of sec.subheadings) {
          expect(sub.body.length, `${item.name} ${sub.title}`).toBeGreaterThanOrEqual(250);
          const paras = sub.body.split(/\n\n+/).filter((p) => p.trim().length > 0);
          expect(paras.length, `${item.name} ${sub.title} paragraphs`).toBeGreaterThanOrEqual(2);
        }
      }

      const loveSubTitles = item.sections.loveStyle.subheadings.map((s) => s.title);
      expect(loveSubTitles).toContain(`${item.name} 연애에서 자주 생기는 상황 3가지`);

      const innerSubTitles = item.sections.innerMind.subheadings.map((s) => s.title);
      expect(innerSubTitles.some((t) => t.includes(`${item.name} 여자 속마음`))).toBe(true);
      expect(innerSubTitles.some((t) => t.includes(`${item.name} 남자 속마음`))).toBe(true);
      expect(innerSubTitles).toContain(`${item.name}에게 하면 좋은 말 / 피할 말`);

      expect(item.sections.bestMatches.matches).toHaveLength(3);
      for (const m of item.sections.bestMatches.matches) {
        expect(slugSet.has(m.slug)).toBe(true);
        expect(m.slug).not.toBe(item.slug);
        expect(getIljuBySlug(m.slug)?.name).toBe(m.name);
        expect(m.reason.includes(item.name), `${item.name} in match reason`).toBe(true);
        expect(m.reason.includes(m.name), `${m.name} in match reason`).toBe(true);
      }

      expect(item.faq).toHaveLength(3);
    }
  });

  it("3) 60장 전체 문장에 한자·사주 전문용어(일주 예외)·단정적 예언이 일절 없다", () => {
    for (const item of ILJU_LIST) {
      const texts = [
        item.title,
        item.metaphor,
        item.headline,
        item.summary,
        ...item.keywords,
        item.sections.loveStyle.heading,
        ...item.sections.loveStyle.subheadings.flatMap((s) => [s.title, s.body]),
        item.sections.innerMind.heading,
        ...item.sections.innerMind.subheadings.flatMap((s) => [s.title, s.body]),
        item.sections.breakupReunion.heading,
        ...item.sections.breakupReunion.subheadings.flatMap((s) => [s.title, s.body]),
        item.sections.bestMatches.heading,
        item.sections.bestMatches.intro,
        ...item.sections.bestMatches.matches.flatMap((m) => [m.name, m.metaphor, m.tag, m.reason]),
        ...item.faq.flatMap((f) => [f.q, f.a]),
      ];

      for (const raw of texts) {
        const stripped = raw.replace(/[가-힣]{2}일주/g, "이 기질").replace(/일주/g, "기질");
        expect(isCleanText(stripped), `${item.name}: ${raw.slice(0, 60)}`).toBe(true);
      }
    }
  });

  it("4) 슬러그 해석: 정본(gapja)·하이픈(gap-ja)·한글(갑자일주/갑자) 모두 정본 슬러그로 연결된다", () => {
    expect(resolveIljuParam("gapja")?.canonical).toBe("gapja");
    expect(resolveIljuParam("gap-ja")?.canonical).toBe("gapja");
    expect(resolveIljuParam("갑자일주")?.canonical).toBe("gapja");
    expect(resolveIljuParam("갑자")?.canonical).toBe("gapja");
    expect(resolveIljuParam(encodeURIComponent("계해일주"))?.canonical).toBe("gyehae");
    expect(resolveIljuParam("unknown-ilju")).toBeNull();
  });

  it("5) 내 일주 확인하기(lib/saju.ts 읽기 전용 + POST /api/ilju/check): 결정론 계산 및 PII·한자 미노출", async () => {
    const first = findIljuByBirthDate("1995-05-15");
    const second = findIljuByBirthDate("1995-05-15");
    expect(first).not.toBeNull();
    expect(first?.slug).toBe(second?.slug);

    const okRes = await iljuCheckPOST(
      new Request("http://localhost:3000/api/ilju/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dob: "1995-05-15" }),
      })
    );
    expect(okRes.status).toBe(200);
    const okJson = await okRes.json();
    expect(okJson).toEqual({
      slug: first!.slug,
      name: first!.name,
    });
    expect(JSON.stringify(okJson)).not.toContain("1995-05-15");
    expect(JSON.stringify(okJson)).not.toMatch(/[\u3400-\u4DBF\u4E00-\u9FFF]/);

    const badRes = await iljuCheckPOST(
      new Request("http://localhost:3000/api/ilju/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dob: "2025-02-30" }),
      })
    );
    expect(badRes.status).toBe(400);
  });

  it("6) sitemap에 /ko/ilju 허브 1개와 60개 상세 페이지(총 61개)가 등록된다", async () => {
    const entries = await sitemap();
    const iljuUrls = entries.map((e) => e.url).filter((u) => u.includes("/ilju"));
    expect(iljuUrls).toHaveLength(61);
    expect(iljuUrls.some((u) => u.endsWith("/ko/ilju"))).toBe(true);
    expect(iljuUrls.some((u) => u.endsWith("/ko/ilju/gapja"))).toBe(true);
    expect(iljuUrls.some((u) => u.endsWith("/ko/ilju/gyehae"))).toBe(true);
  });
});
