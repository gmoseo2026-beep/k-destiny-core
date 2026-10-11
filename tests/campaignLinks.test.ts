import { describe, it, expect } from "vitest";
import {
  CAMPAIGN_LINKS,
  CAMPAIGN_TAG_RE,
  campaignCounterKey,
  campaignFromCookieHeader,
  campaignTag,
  campaignTargetPath,
  findCampaignLink,
  kstDateKey,
  parseCampaignCounterKey,
} from "@/lib/campaignLinks";

describe("제휴 배너 전용 주소", () => {
  it("코드와 유입 표시가 서로 겹치지 않는다", () => {
    expect(new Set(CAMPAIGN_LINKS.map((l) => l.code)).size).toBe(CAMPAIGN_LINKS.length);
    expect(new Set(CAMPAIGN_LINKS.map(campaignTag)).size).toBe(CAMPAIGN_LINKS.length);
  });

  it("모든 유입 표시가 주문에 저장할 수 있는 형식이다", () => {
    for (const l of CAMPAIGN_LINKS) {
      expect(l.code).toMatch(/^[a-z0-9-]{2,20}$/);
      expect(campaignTag(l)).toMatch(CAMPAIGN_TAG_RE);
    }
  });

  it("도착 주소에 utm 네 가지가 붙고, 사이트 안의 경로다", () => {
    const link = findCampaignLink("cd1")!;
    const path = campaignTargetPath(link, "ko");
    expect(path.startsWith("/ko/compat/new?")).toBe(true);
    const q = new URLSearchParams(path.split("?")[1]);
    expect(q.get("utm_source")).toBe("couplediary");
    expect(q.get("utm_medium")).toBe("app_banner");
    expect(q.get("utm_campaign")).toBe("couplediary_2026");
    expect(q.get("utm_content")).toBe("b02_score");
  });

  it("광고 소재 주소는 상품 입력 화면으로 가고, 광고 클릭 표시만 넘긴다", () => {
    const link = findCampaignLink("ig-b1")!;
    const incoming = new URLSearchParams("fbclid=IwAR0abc_DEF-123&evil=%3Cscript%3E&productId=wealth&utm_source=fake");
    const path = campaignTargetPath(link, "ko", incoming);
    const q = new URLSearchParams(path.split("?")[1]);
    expect(path.startsWith("/ko/compat/new?")).toBe(true);
    expect(q.get("productId")).toBe("inner_mind");
    expect(q.get("utm_source")).toBe("instagram");
    expect(q.get("utm_medium")).toBe("paid_social");
    expect(q.get("utm_content")).toBe("vb_hook1");
    expect(q.get("fbclid")).toBe("IwAR0abc_DEF-123");
    expect(q.has("evil")).toBe(false);
    // 이상한 클릭 표시는 버린다
    const bad = campaignTargetPath(link, "ko", new URLSearchParams("fbclid=%3Cscript%3E&gclid=" + "x".repeat(700)));
    expect(bad.includes("fbclid")).toBe(false);
    expect(bad.includes("gclid")).toBe(false);
    // A안은 상품 지정 없이 무료 궁합 입력으로
    const a = new URLSearchParams(campaignTargetPath(findCampaignLink("ig-a2")!, "ko").split("?")[1]);
    expect(a.has("productId")).toBe(false);
    expect(a.get("utm_campaign")).toBe("video_a_score");
  });

  it("모르는 코드는 찾지 못한다", () => {
    expect(findCampaignLink("nope")).toBeUndefined();
    expect(findCampaignLink("")).toBeUndefined();
  });

  it("이상한 유입 표시는 받지 않는다", () => {
    expect(CAMPAIGN_TAG_RE.test("couplediary:b02_score")).toBe(true);
    expect(CAMPAIGN_TAG_RE.test("couplediary")).toBe(false);
    expect(CAMPAIGN_TAG_RE.test("a:b")).toBe(false);
    expect(CAMPAIGN_TAG_RE.test("Couple:B02")).toBe(false);
    expect(CAMPAIGN_TAG_RE.test("x".repeat(30) + ":b02")).toBe(false);
    expect(CAMPAIGN_TAG_RE.test("couplediary:<script>")).toBe(false);
  });

  it("쿠키 헤더에서 유입 표시를 꺼낸다", () => {
    expect(campaignFromCookieHeader("a=1; kd_src=couplediary%3Ab07_fight; b=2")).toBe("couplediary:b07_fight");
    expect(campaignFromCookieHeader("kd_src=couplediary:b07_fight")).toBe("couplediary:b07_fight");
    expect(campaignFromCookieHeader("xkd_src=couplediary:b07_fight")).toBeNull();
    expect(campaignFromCookieHeader("kd_src=%E0%A4%A")).toBeNull();
    expect(campaignFromCookieHeader("")).toBeNull();
    expect(campaignFromCookieHeader(null)).toBeNull();
  });

  it("클릭 수는 한국 날짜로 나뉜다(자정 경계)", () => {
    // 한국 10월 6일 00:30 = UTC 10월 5일 15:30
    expect(kstDateKey(new Date("2026-10-05T15:30:00Z"))).toBe("2026-10-06");
    // 한국 10월 5일 23:30 = UTC 10월 5일 14:30
    expect(kstDateKey(new Date("2026-10-05T14:30:00Z"))).toBe("2026-10-05");
  });

  it("집계 키를 만들고 다시 읽을 수 있다", () => {
    const key = campaignCounterKey("cd1", "2026-10-05");
    expect(key).toBe("go:cd1:2026-10-05");
    expect(parseCampaignCounterKey(key)).toEqual({ code: "cd1", date: "2026-10-05" });
    expect(parseCampaignCounterKey("visitors")).toBeNull();
    expect(parseCampaignCounterKey("go:cd1:20261005")).toBeNull();
  });
});
