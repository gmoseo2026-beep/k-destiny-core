import { describe, it, expect } from "vitest";
import {
  BROWSER_CACHE_CONTROL,
  EDGE_CACHE_CONTROL,
  EDGE_CACHE_SKIP_REQUEST_HEADERS,
  EDGE_CACHE_SOURCES,
  edgeCacheHeaderRules,
} from "@/lib/seo/edgeCache";
import nextConfig from "../next.config";

describe("검색용 페이지 보관 헤더", () => {
  const rules = edgeCacheHeaderRules();

  it("띠 궁합·출생연도 운세 4개 경로에만 붙는다", () => {
    expect(rules.map((r) => r.source)).toEqual([...EDGE_CACHE_SOURCES]);
    for (const source of EDGE_CACHE_SOURCES) {
      expect(source.startsWith("/ko/zodiac") || source.startsWith("/ko/fortune/2027")).toBe(true);
      // 하위 전체(:path*)를 잡지 않는다 — 개인 결과 화면이 섞여 들어올 여지를 없앤다
      expect(source).not.toContain("*");
    }
  });

  it("브라우저에는 매번 확인하게 하고, 보관 시간은 Cloudflare 전용 헤더로만 알린다", () => {
    for (const rule of rules) {
      const byKey = Object.fromEntries(rule.headers.map((h) => [h.key, h.value]));
      expect(byKey["Cache-Control"]).toBe(BROWSER_CACHE_CONTROL);
      expect(byKey["Cache-Control"]).toContain("max-age=0");
      expect(byKey["Cache-Control"]).not.toContain("stale-while-revalidate");
      expect(byKey["Cloudflare-CDN-Cache-Control"]).toBe(EDGE_CACHE_CONTROL);
      expect(byKey["Cloudflare-CDN-Cache-Control"]).not.toContain("s-maxage");
    }
  });

  it("화면 전환용 데이터 요청에는 붙지 않는다(페이지 주소로 보관되면 깨진 화면이 나간다)", () => {
    expect(EDGE_CACHE_SKIP_REQUEST_HEADERS).toContain("rsc");
    for (const rule of rules) {
      expect(rule.missing.map((m) => m.key)).toEqual([...EDGE_CACHE_SKIP_REQUEST_HEADERS]);
      expect(rule.missing.every((m) => m.type === "header")).toBe(true);
    }
  });

  it("next.config 에서 맨 뒤에 놓여 기본값(no-store)을 덮어쓴다", async () => {
    const all = await nextConfig.headers!();
    const tail = all.slice(-rules.length);
    expect(tail.map((r) => r.source)).toEqual([...EDGE_CACHE_SOURCES]);
    const first = all[0];
    expect(first.headers.find((h) => h.key === "Cache-Control")?.value).toContain("no-store");
  });
});
