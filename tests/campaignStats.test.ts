import { describe, it, expect } from "vitest";
import {
  CAMPAIGN_LINKS,
  campaignClickTimeFromCookieHeader,
  campaignTag,
  findCampaignLink,
  isSignupAfterClick,
} from "@/lib/campaignLinks";
import { buildCampaignReport, rateLabel, recentKstDates } from "@/lib/campaignStats";

// 한국 2026-10-06 12:00
const NOW = new Date("2026-10-06T03:00:00Z");
const cd1 = findCampaignLink("cd1")!;
const cd2 = findCampaignLink("cd2")!;
const at = (iso: string) => new Date(iso);

describe("제휴 배너 성과 집계", () => {
  it("클릭·가입·결제·매출을 배너별로 묶는다", () => {
    const r = buildCampaignReport(
      CAMPAIGN_LINKS,
      [
        { code: "cd1", date: "2026-10-06", count: 40 },
        { code: "cd1", date: "2026-10-05", count: 10 },
        { code: "cd2", date: "2026-10-06", count: 5 },
      ],
      [
        { campaign: campaignTag(cd1), createdAt: at("2026-10-06T01:00:00Z") },
        { campaign: campaignTag(cd1), createdAt: at("2026-10-05T01:00:00Z") },
      ],
      [
        { campaign: campaignTag(cd1), status: "PAID", amount: 4900, createdAt: at("2026-10-06T01:10:00Z") },
        { campaign: campaignTag(cd1), status: "PENDING", amount: 4900, createdAt: at("2026-10-06T01:20:00Z") },
        { campaign: campaignTag(cd2), status: "PAID", amount: 9900, createdAt: at("2026-10-06T02:00:00Z") },
        { campaign: campaignTag(cd1), status: "CANCELED", amount: 4900, createdAt: at("2026-10-05T02:00:00Z") },
      ],
      14,
      NOW
    );
    const row1 = r.rows.find((x) => x.link.code === "cd1")!;
    expect(row1.total).toEqual({ clicks: 50, signups: 2, checkouts: 3, paid: 1, revenue: 4900 });
    expect(row1.today).toEqual({ clicks: 40, signups: 1, checkouts: 2, paid: 1, revenue: 4900 });
    const row2 = r.rows.find((x) => x.link.code === "cd2")!;
    expect(row2.total).toEqual({ clicks: 5, signups: 0, checkouts: 1, paid: 1, revenue: 9900 });
    expect(r.sum.total).toEqual({ clicks: 55, signups: 2, checkouts: 4, paid: 2, revenue: 14800 });
    expect(r.sum.today.revenue).toBe(14800);
  });

  it("환불·취소·미결제 금액은 매출에 넣지 않는다", () => {
    const r = buildCampaignReport(
      CAMPAIGN_LINKS,
      [],
      [],
      [
        { campaign: campaignTag(cd1), status: "CANCELED", amount: 4900, createdAt: NOW },
        { campaign: campaignTag(cd1), status: "FAILED", amount: 4900, createdAt: NOW },
        { campaign: campaignTag(cd1), status: "PENDING", amount: 4900, createdAt: NOW },
      ],
      14,
      NOW
    );
    expect(r.sum.total).toEqual({ clicks: 0, signups: 0, checkouts: 3, paid: 0, revenue: 0 });
  });

  it("날짜는 한국 시간으로 나누고, 화면에 보이는 기간 밖의 것도 누적에는 들어간다", () => {
    const r = buildCampaignReport(
      CAMPAIGN_LINKS,
      [{ code: "cd1", date: "2026-08-01", count: 7 }],
      // 한국 10월 6일 00:30 = UTC 10월 5일 15:30 → 오늘
      [{ campaign: campaignTag(cd1), createdAt: at("2026-10-05T15:30:00Z") }],
      [],
      14,
      NOW
    );
    expect(r.days).toHaveLength(14);
    expect(r.days[0].date).toBe("2026-10-06");
    expect(r.days[0].total.signups).toBe(1);
    expect(r.sum.total.clicks).toBe(7);
    expect(r.sum.last7.clicks).toBe(0);
    expect(r.days.reduce((a, d) => a + d.total.clicks, 0)).toBe(0);
  });

  it("모르는 배너·모르는 유입 표시는 무시한다", () => {
    const r = buildCampaignReport(
      CAMPAIGN_LINKS,
      [{ code: "zzz", date: "2026-10-06", count: 99 }],
      [{ campaign: "other:x1", createdAt: NOW }],
      [{ campaign: "other:x1", status: "PAID", amount: 4900, createdAt: NOW }],
      14,
      NOW
    );
    expect(r.sum.total).toEqual({ clicks: 0, signups: 0, checkouts: 0, paid: 0, revenue: 0 });
  });

  it("비율 표기와 최근 날짜", () => {
    expect(rateLabel(1, 8)).toBe("12.5%");
    expect(rateLabel(0, 10)).toBe("0%");
    expect(rateLabel(3, 0)).toBe("—");
    expect(recentKstDates(3, NOW)).toEqual(["2026-10-06", "2026-10-05", "2026-10-04"]);
  });
});

describe("배너로 가입했는지 판정", () => {
  const click = at("2026-10-06T01:00:00Z").getTime();

  it("배너를 누른 뒤에 만든 계정만 센다", () => {
    expect(isSignupAfterClick(at("2026-10-06T01:05:00Z"), click, NOW)).toBe(true);
    expect(isSignupAfterClick(at("2026-10-16T01:05:00Z"), click, at("2026-10-16T02:00:00Z"))).toBe(true);
    // 원래 회원이 배너를 누른 경우
    expect(isSignupAfterClick(at("2026-09-20T01:00:00Z"), click, NOW)).toBe(false);
    expect(isSignupAfterClick(at("2026-10-06T00:50:00Z"), click, NOW)).toBe(false);
  });

  it("누른 시각이 미래로 조작돼 있으면 인정하지 않는다", () => {
    const future = at("2026-10-07T00:00:00Z").getTime();
    expect(isSignupAfterClick(at("2026-10-07T00:10:00Z"), future, NOW)).toBe(false);
  });

  it("누른 시각을 모르면 방금(24시간 안) 만든 계정만 인정한다", () => {
    expect(isSignupAfterClick(at("2026-10-06T02:00:00Z"), null, NOW)).toBe(true);
    expect(isSignupAfterClick(at("2026-10-04T02:00:00Z"), null, NOW)).toBe(false);
  });

  it("쿠키에서 누른 시각을 읽는다", () => {
    expect(campaignClickTimeFromCookieHeader("kd_src=couplediary%3Ab02_score; kd_src_t=1791248400")).toBe(1791248400000);
    expect(campaignClickTimeFromCookieHeader("kd_src_t=abc")).toBeNull();
    expect(campaignClickTimeFromCookieHeader("kd_src_t=12")).toBeNull();
    expect(campaignClickTimeFromCookieHeader("kd_src=couplediary%3Ab02_score")).toBeNull();
    expect(campaignClickTimeFromCookieHeader(null)).toBeNull();
  });
});
