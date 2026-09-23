import { describe, it, expect } from "vitest";
import { pickTeaser } from "@/lib/reports/teaser";

describe("pickTeaser — 유료 본문 0바이트", () => {
  it("sections/advice/closing 은 결과에 존재하지 않는다", () => {
    const t = pickTeaser({
      headline: "h", summary: "s",
      freeSection: { key: "k", title: "t", body: "b" },
      hooks: ["a", "b"],
      sections: [{ key: "x", title: "y", body: "유료" }],
      advice: { do: ["유료"], dont: [] },
      closing: "유료",
    });
    expect(t).not.toBeNull();
    expect(Object.keys(t!).sort()).toEqual(["freeSection", "headline", "hooks", "summary"]);
    expect(JSON.stringify(t)).not.toContain("유료");
  });
});
