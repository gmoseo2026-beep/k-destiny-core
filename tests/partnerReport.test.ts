import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  CAMPAIGN_LINKS,
  campaignTag,
  findCampaignLink,
  linksForPartner,
} from "@/lib/campaignLinks";
import {
  buildCampaignReport,
  buildPartnerReportViewData,
  estimatedPartnerPayout,
  settlementBaseAmount,
  type ClickRow,
  type OrderRow,
  type SignupRow,
} from "@/lib/campaignStats";
import {
  computePartnerReportKey,
  partnerShareUrl,
  verifyPartnerReportKey,
} from "@/lib/partnerReport";

// Next.js notFound() 호출 검증용 모킹
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

const findManyCounterMock = vi.fn(async () => []);
const findManyUserMock = vi.fn(async () => []);
const findManyOrderMock = vi.fn(async () => []);

vi.mock("@/lib/prisma", () => ({
  default: {
    siteCounter: { findMany: () => findManyCounterMock() },
    user: { findMany: () => findManyUserMock() },
    order: { findMany: () => findManyOrderMock() },
  },
}));

import PartnerReportPage from "@/app/[locale]/partner/[partner]/[key]/page";

const NOW = new Date("2026-10-16T03:00:00Z"); // 한국 2026-10-16 12:00
const cd1 = findCampaignLink("cd1")!;
const cd2 = findCampaignLink("cd2")!;
const igB1 = findCampaignLink("ig-b1")!;

describe("P-009 B · 제휴사별 성과 보기 (열쇠 검증·정산·개인정보 배제)", () => {
  const originalEnv = process.env.PARTNER_REPORT_SECRET;

  beforeEach(() => {
    delete process.env.PARTNER_REPORT_SECRET;
    notFoundMock.mockClear();
    findManyCounterMock.mockClear();
    findManyUserMock.mockClear();
    findManyOrderMock.mockClear();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PARTNER_REPORT_SECRET;
    } else {
      process.env.PARTNER_REPORT_SECRET = originalEnv;
    }
  });

  it("PARTNER_REPORT_SECRET 환경변수가 없거나 비어 있으면 404(fail-closed, 대체값 없음)", async () => {
    expect(computePartnerReportKey("couplediary")).toBeNull();
    expect(computePartnerReportKey("couplediary", "")).toBeNull();
    expect(computePartnerReportKey("couplediary", "   ")).toBeNull();
    expect(verifyPartnerReportKey("couplediary", "a".repeat(32))).toBe(false);
    expect(partnerShareUrl("couplediary", "https://kongdak.kr", "ko")).toBeNull();

    await expect(
      PartnerReportPage({
        params: Promise.resolve({ locale: "ko", partner: "couplediary", key: "a".repeat(32) }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(findManyOrderMock).not.toHaveBeenCalled();
  });

  it("틀린 열쇠나 등록되지 않은 partner 로 요청하면 404", async () => {
    // 테스트 안에서만 쓰는 임시값
    process.env.PARTNER_REPORT_SECRET = "unit-test-only-temp-key-for-hmac";
    const validKey = computePartnerReportKey("couplediary")!;
    expect(validKey).toMatch(/^[0-9a-f]{32}$/);
    expect(verifyPartnerReportKey("couplediary", validKey)).toBe(true);

    // 한 글자라도 틀리면 false → 404
    const wrongKey = (validKey[0] === "a" ? "b" : "a") + validKey.slice(1);
    expect(verifyPartnerReportKey("couplediary", wrongKey)).toBe(false);
    await expect(
      PartnerReportPage({
        params: Promise.resolve({ locale: "ko", partner: "couplediary", key: wrongKey }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    // 다른 partner 의 열쇠를 넣어도 404
    const igKey = computePartnerReportKey("instagram")!;
    expect(verifyPartnerReportKey("couplediary", igKey)).toBe(false);

    // 등록되지 않은 partner 는 404
    expect(computePartnerReportKey("unknown_partner")).toBeNull();
    expect(verifyPartnerReportKey("unknown_partner", validKey)).toBe(false);
    await expect(
      PartnerReportPage({
        params: Promise.resolve({ locale: "ko", partner: "unknown_partner", key: validKey }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("부가세(금액/1.1) 및 환불·취소 제외 계산이 정확하고 rsRate 가 있으면 예상 정산액을 계산한다", () => {
    expect(settlementBaseAmount(0)).toBe(0);
    expect(settlementBaseAmount(9900)).toBe(9000); // 9900 / 1.1 = 9000
    expect(settlementBaseAmount(4900)).toBe(4455); // Math.round(4900 / 1.1) = 4455
    expect(estimatedPartnerPayout(9900, 0.3)).toBe(2700); // 9000 * 0.3 = 2700
    expect(estimatedPartnerPayout(9900, undefined)).toBeNull();

    const orders: OrderRow[] = [
      { campaign: campaignTag(cd1), status: "PAID", amount: 9900, createdAt: new Date("2026-10-10T03:00:00Z") },
      { campaign: campaignTag(cd1), status: "CANCELED", amount: 9900, createdAt: new Date("2026-10-11T03:00:00Z") },
      { campaign: campaignTag(cd1), status: "REFUNDED", amount: 4900, createdAt: new Date("2026-10-12T03:00:00Z") },
      { campaign: campaignTag(cd1), status: "PENDING", amount: 4900, createdAt: new Date("2026-10-13T03:00:00Z") },
    ];
    const view = buildPartnerReportViewData("couplediary", [], [], orders, NOW)!;
    expect(view.periods.this_month.summary.paid).toBe(1);
    expect(view.periods.this_month.summary.revenue).toBe(9900);
    expect(view.periods.this_month.summary.settlementBase).toBe(9000);
    expect(view.periods.this_month.summary.estimatedPayout).toBe(2700);
  });

  it("다른 partner 의 코드가 섞이지 않으며 관리자 화면 숫자와 제휴사 화면 숫자가 일치한다", () => {
    const clicks: ClickRow[] = [
      { code: "cd1", date: "2026-10-15", count: 35 },
      { code: "cd2", date: "2026-09-20", count: 15 },
      { code: "ig-b1", date: "2026-10-15", count: 120 },
      { code: "gg-compat", date: "2026-10-15", count: 40 },
    ];
    const signups: SignupRow[] = [
      { campaign: campaignTag(cd1), createdAt: new Date("2026-10-15T04:00:00Z") },
      { campaign: campaignTag(cd2), createdAt: new Date("2026-09-20T04:00:00Z") },
      { campaign: campaignTag(igB1), createdAt: new Date("2026-10-15T05:00:00Z") },
    ];
    const orders: OrderRow[] = [
      { campaign: campaignTag(cd1), status: "PAID", amount: 9900, createdAt: new Date("2026-10-15T06:00:00Z") },
      { campaign: campaignTag(cd2), status: "PAID", amount: 4900, createdAt: new Date("2026-09-20T06:00:00Z") },
      { campaign: campaignTag(igB1), status: "PAID", amount: 9900, createdAt: new Date("2026-10-15T07:00:00Z") },
    ];

    const adminReport = buildCampaignReport(CAMPAIGN_LINKS, clicks, signups, orders, 14, NOW);
    const partnerView = buildPartnerReportViewData("couplediary", clicks, signups, orders, NOW)!;

    // 1) couplediary 코드(cd1~cd4)만 들어 있고 다른 partner(ig-b1, gg-compat 등)는 절대 섞이지 않는다
    expect(partnerView.codes.map((c) => c.code)).toEqual(["cd1", "cd2", "cd3", "cd4"]);
    expect(partnerView.periods.all.rows.map((r) => r.code)).toEqual(["cd1", "cd2", "cd3", "cd4"]);

    // 2) 관리자 화면의 couplediary 행 누적 숫자와 제휴사 화면 전체(all) 숫자가 똑같다
    for (const link of linksForPartner("couplediary")) {
      const adminRow = adminReport.rows.find((r) => r.link.code === link.code)!;
      const partnerRow = partnerView.periods.all.rows.find((r) => r.code === link.code)!;
      expect(partnerRow.clicks).toBe(adminRow.total.clicks);
      expect(partnerRow.signups).toBe(adminRow.total.signups);
      expect(partnerRow.paid).toBe(adminRow.total.paid);
      expect(partnerRow.revenue).toBe(adminRow.total.revenue);
    }
    expect(partnerView.periods.all.summary.clicks).toBe(50);
    expect(partnerView.periods.all.summary.signups).toBe(2);
    expect(partnerView.periods.all.summary.paid).toBe(2);
    expect(partnerView.periods.all.summary.revenue).toBe(14800);

    // 3) 이번 달(2026-10)과 지난달(2026-09)이 정확히 나뉜다
    expect(partnerView.periods.this_month.summary.clicks).toBe(35);
    expect(partnerView.periods.this_month.summary.revenue).toBe(9900);
    expect(partnerView.periods.last_month.summary.clicks).toBe(15);
    expect(partnerView.periods.last_month.summary.revenue).toBe(4900);
  });

  it("제휴사 화면 데이터에는 개인정보(주문번호·이메일·이름·생년월일·궁합 id·개별 주문 시각) 필드가 없다", () => {
    const view = buildPartnerReportViewData(
      "couplediary",
      [{ code: "cd1", date: "2026-10-15", count: 10 }],
      [{ campaign: campaignTag(cd1), createdAt: new Date("2026-10-15T04:12:34Z") }],
      [{ campaign: campaignTag(cd1), status: "PAID", amount: 9900, createdAt: new Date("2026-10-15T05:56:12Z") }],
      NOW
    )!;
    const serialized = JSON.stringify(view);
    for (const forbidden of [
      "orderId",
      "paymentId",
      "email",
      "birthDate",
      "personA",
      "personB",
      "compatId",
      "createdAt",
      "04:12:34",
      "05:56:12",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("'use client' 파일은 crypto·lib/partnerReport·lib/saju 같은 서버 전용 모듈을 가져오지 않는다", () => {
    const serverOnlyModules = ["crypto", "@/lib/partnerReport", "@/lib/saju"];
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) {
          if (name === "node_modules" || name.startsWith(".")) continue;
          walk(p, out);
        } else if (/\.(tsx?|jsx?)$/.test(name)) {
          out.push(p);
        }
      }
      return out;
    };

    const offenders: string[] = [];
    for (const dir of ["app", "components", "lib"]) {
      for (const file of walk(path.join(process.cwd(), dir))) {
        const src = fs.readFileSync(file, "utf-8");
        if (!/^\s*["']use client["']/.test(src)) continue;
        const imports = src.match(/^import\s[^;]*?from\s+["'][^"']+["'];?/gm) ?? [];
        for (const line of imports) {
          if (/^import\s+type\s/.test(line)) continue;
          if (serverOnlyModules.some((m) => line.includes(`"${m}"`) || line.includes(`'${m}'`))) {
            offenders.push(`${path.relative(process.cwd(), file)}: ${line.replace(/\s+/g, " ")}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
