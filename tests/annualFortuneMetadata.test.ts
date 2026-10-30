import { describe, expect, it } from "vitest";
import { buildAnnualFortuneMetadata } from "@/lib/seo";

describe("총운 화면 제목은 연도를 따른다", () => {
  it("2027 은 2027 제목·설명과 자기 주소를 canonical 로 쓴다", () => {
    const m = buildAnnualFortuneMetadata("ko", 2027);
    expect(m.title).toEqual({ absolute: expect.stringContaining("2027년") });
    expect(JSON.stringify(m)).not.toContain("2026");
    expect(JSON.stringify(m)).not.toContain("붉은 말");
    expect(m.alternates?.canonical).toMatch(/\/ko\/fortune\/annual\?year=2027$/);
    expect(m.openGraph?.url).toBe(m.alternates?.canonical);
  });

  it("2026 은 지금 그대로다", () => {
    const m = buildAnnualFortuneMetadata("ko", 2026);
    expect(m.title).toEqual({ absolute: expect.stringContaining("2026년") });
    expect(m.alternates?.canonical).toMatch(/\/ko\/fortune\/annual$/);
  });
});
