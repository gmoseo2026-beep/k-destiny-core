/**
 * 제휴 배너 성과 집계(순수 함수 — 같은 입력이면 같은 결과). 관리자 > 배너 유입 화면이 쓴다.
 * 클릭 → 가입 → 결제 시작 → 결제 완료 → 매출을 배너별·날짜별로 묶는다.
 */
import { type CampaignLink, campaignTag, kstDateKey } from "@/lib/campaignLinks";

export interface ClickRow {
  code: string;
  /** 한국 날짜 YYYY-MM-DD */
  date: string;
  count: number;
}
export interface SignupRow {
  campaign: string;
  createdAt: Date;
}
export interface OrderRow {
  campaign: string;
  status: string;
  amount: number;
  createdAt: Date;
}

export interface CampaignTotals {
  clicks: number;
  signups: number;
  /** 결제창을 연 횟수(결제 완료 포함) */
  checkouts: number;
  paid: number;
  /** 결제 완료 금액 합(환불·취소된 건은 빠진다) */
  revenue: number;
}

export interface CampaignRow {
  link: CampaignLink;
  total: CampaignTotals;
  last7: CampaignTotals;
  today: CampaignTotals;
}

export interface CampaignDay {
  date: string;
  clicksByCode: Record<string, number>;
  total: CampaignTotals;
}

export interface CampaignReport {
  rows: CampaignRow[];
  sum: { total: CampaignTotals; last7: CampaignTotals; today: CampaignTotals };
  days: CampaignDay[];
}

const empty = (): CampaignTotals => ({ clicks: 0, signups: 0, checkouts: 0, paid: 0, revenue: 0 });

function add(t: CampaignTotals, part: Partial<CampaignTotals>): void {
  t.clicks += part.clicks ?? 0;
  t.signups += part.signups ?? 0;
  t.checkouts += part.checkouts ?? 0;
  t.paid += part.paid ?? 0;
  t.revenue += part.revenue ?? 0;
}

/** 최근 n 일의 한국 날짜(오늘부터 거꾸로) */
export function recentKstDates(n: number, now: Date = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => kstDateKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
}

/** 비율 표기("12.5%"). 분모가 0이면 "—". */
export function rateLabel(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

export function buildCampaignReport(
  links: readonly CampaignLink[],
  clicks: ClickRow[],
  signups: SignupRow[],
  orders: OrderRow[],
  daysShown: number,
  now: Date = new Date()
): CampaignReport {
  const dates = recentKstDates(daysShown, now);
  const today = dates[0];
  const week = new Set(recentKstDates(7, now));

  const rows: CampaignRow[] = links.map((link) => ({ link, total: empty(), last7: empty(), today: empty() }));
  const byCode = new Map(rows.map((r) => [r.link.code, r]));
  const byTag = new Map(rows.map((r) => [campaignTag(r.link), r]));
  const days = new Map<string, CampaignDay>(
    dates.map((d) => [d, { date: d, clicksByCode: Object.fromEntries(links.map((l) => [l.code, 0])), total: empty() }])
  );

  const put = (row: CampaignRow | undefined, date: string, part: Partial<CampaignTotals>) => {
    if (!row) return;
    add(row.total, part);
    if (week.has(date)) add(row.last7, part);
    if (date === today) add(row.today, part);
    const day = days.get(date);
    if (day) add(day.total, part);
  };

  for (const c of clicks) {
    const row = byCode.get(c.code);
    put(row, c.date, { clicks: c.count });
    const day = days.get(c.date);
    if (row && day) day.clicksByCode[c.code] += c.count;
  }
  for (const s of signups) put(byTag.get(s.campaign), kstDateKey(s.createdAt), { signups: 1 });
  for (const o of orders) {
    const paid = o.status === "PAID";
    put(byTag.get(o.campaign), kstDateKey(o.createdAt), {
      checkouts: 1,
      paid: paid ? 1 : 0,
      revenue: paid ? o.amount : 0,
    });
  }

  const sum = { total: empty(), last7: empty(), today: empty() };
  for (const r of rows) {
    add(sum.total, r.total);
    add(sum.last7, r.last7);
    add(sum.today, r.today);
  }
  return { rows, sum, days: dates.map((d) => days.get(d)!) };
}
