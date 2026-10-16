import { describe, it, expect, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next-intl/middleware", () => ({
  default: () => () => NextResponse.next(),
}));
vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["ko", "en", "es", "de", "fr", "ja"],
    defaultLocale: "ko",
  },
}));

import middleware from "@/middleware";
import { externalBrowserUrl } from "@/lib/inAppBrowser";
import {
  CAMPAIGN_COOKIE,
  CAMPAIGN_COOKIE_DAYS,
  CAMPAIGN_LINKS,
  CAMPAIGN_REF_COOKIE,
  CAMPAIGN_TAG_RE,
  CAMPAIGN_TIME_COOKIE,
  appendCampaignHandoffParams,
  campaignCounterKey,
  campaignFromCookieHeader,
  campaignTag,
  campaignTargetPath,
  findCampaignLink,
  formatCampaignRef,
  kstDateKey,
  parseCampaignCounterKey,
  resolveCampaignHandoff,
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

describe("P-009 A · 외부 브라우저 전환 시 제휴 표시 유지", () => {
  const nowSec = 1792112400; // 2026-10-16 기준 예시 초
  const nowMs = nowSec * 1000;
  const windowSec = CAMPAIGN_COOKIE_DAYS * 24 * 60 * 60;

  it("kd_ref 쿠키가 있을 때만 외부 열기 주소에 ksrc·ksrct 두 값이 붙는다", () => {
    const target = "https://kongdak.kr/ko/compat/new?productId=inner_mind&from=cmp123";
    // kd_ref 가 있을 때
    const withRef = externalBrowserUrl(target, `a=1; ${CAMPAIGN_REF_COOKIE}=${formatCampaignRef("cd1", nowSec - 120)}`);
    const u = new URL(withRef);
    expect(u.searchParams.get("productId")).toBe("inner_mind");
    expect(u.searchParams.get("from")).toBe("cmp123");
    expect(u.searchParams.get("ksrc")).toBe("cd1");
    expect(u.searchParams.get("ksrct")).toBe(String(nowSec - 120));

    // kd_ref 가 없을 때
    expect(externalBrowserUrl(target, "a=1; b=2")).toBe(target);
    expect(appendCampaignHandoffParams(target, null, nowMs)).toBe(target);

    // 등록 안 된 코드가 든 kd_ref 는 무시
    expect(externalBrowserUrl(target, `${CAMPAIGN_REF_COOKIE}=not-a-code.${nowSec}`)).toBe(target);
  });

  it("등록 안 된 ksrc 코드는 무시한다", () => {
    const q = new URLSearchParams(`ksrc=unknown_code&ksrct=${nowSec}&paymentId=ord_1`);
    expect(resolveCampaignHandoff(q, null, nowMs)).toBeNull();

    const req = new NextRequest(`https://kongdak.kr/ko/compat/new?ksrc=unknown_code&ksrct=${nowSec}`, {
      headers: { host: "kongdak.kr" },
    });
    const res = middleware(req);
    expect(res.cookies.get(CAMPAIGN_COOKIE)).toBeUndefined();
    expect(res.cookies.get(CAMPAIGN_REF_COOKIE)).toBeUndefined();
  });

  it("30일 넘은 시각이나 미래 시각·잘못된 시각은 지금 시각으로 바꾼다", () => {
    const tooOld = nowSec - windowSec - 10;
    const rOld = resolveCampaignHandoff(new URLSearchParams(`ksrc=cd1&ksrct=${tooOld}`), null, nowMs)!;
    expect(rOld.cookies.srcT).toBe(String(nowSec));
    expect(rOld.cookies.maxAge).toBe(windowSec);

    const future = nowSec + 600;
    const rFuture = resolveCampaignHandoff(new URLSearchParams(`ksrc=cd1&ksrct=${future}`), null, nowMs)!;
    expect(rFuture.cookies.srcT).toBe(String(nowSec));

    const bad = resolveCampaignHandoff(new URLSearchParams("ksrc=cd1&ksrct=notanumber"), null, nowMs)!;
    expect(bad.cookies.srcT).toBe(String(nowSec));

    // 30일 안의 유효한 시각이면 그대로 쓰고 남은 기간으로 maxAge 계산
    const tenDaysAgo = nowSec - 10 * 86400;
    const rValid = resolveCampaignHandoff(new URLSearchParams(`ksrc=cd1&ksrct=${tenDaysAgo}`), null, nowMs)!;
    expect(rValid.cookies.srcT).toBe(String(tenDaysAgo));
    expect(rValid.cookies.maxAge).toBe(20 * 86400);
  });

  it("이미 더 최근 쿠키(kd_src_t)가 있으면 덮어쓰지 않고 유지한다", () => {
    const olderClick = nowSec - 3600;
    const newerClick = nowSec - 600;
    const existingCookie = `${CAMPAIGN_COOKIE}=couplediary:b06_anniversary; ${CAMPAIGN_TIME_COOKIE}=${newerClick}`;
    const r = resolveCampaignHandoff(
      new URLSearchParams(`ksrc=cd1&ksrct=${olderClick}&from=cmp_1`),
      existingCookie,
      nowMs
    )!;
    expect(r.shouldSetCookies).toBe(false);
    expect(r.cleanedSearch).toBe("?from=cmp_1");

    // middleware 에서도 Set-Cookie 없이 302 로 ksrc·ksrct 만 지운다
    const curSec = Math.floor(Date.now() / 1000);
    const req = new NextRequest(
      `https://kongdak.kr/ko/compat/new?ksrc=cd1&ksrct=${curSec - 3600}&from=cmp_1`,
      {
        headers: {
          host: "kongdak.kr",
          cookie: `${CAMPAIGN_COOKIE}=couplediary:b06_anniversary; ${CAMPAIGN_TIME_COOKIE}=${curSec - 60}`,
        },
      }
    );
    const res = middleware(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://kongdak.kr/ko/compat/new?from=cmp_1");
    expect(res.cookies.get(CAMPAIGN_COOKIE)).toBeUndefined();
  });

  it("쿠키를 심고 302로 ksrc·ksrct 두 값만 지우며 paymentId 등 다른 값은 그대로 둔다", () => {
    const curSec = Math.floor(Date.now() / 1000) - 300;
    const req = new NextRequest(
      `https://kongdak.kr/ko/pay/complete?paymentId=kd_ord_123&ksrc=cd2&ksrct=${curSec}&catalog=inner_mind`,
      { headers: { host: "kongdak.kr" } }
    );
    const res = middleware(req);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      "https://kongdak.kr/ko/pay/complete?paymentId=kd_ord_123&catalog=inner_mind"
    );
    expect(res.cookies.get(CAMPAIGN_COOKIE)?.value).toBe("couplediary:b06_anniversary");
    expect(res.cookies.get(CAMPAIGN_TIME_COOKIE)?.value).toBe(String(curSec));
    expect(res.cookies.get(CAMPAIGN_REF_COOKIE)?.value).toBe(`cd2.${curSec}`);
  });
});

