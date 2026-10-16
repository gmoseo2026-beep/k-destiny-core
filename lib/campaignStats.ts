/**
 * 제휴 배너 성과 집계(순수 함수 — 같은 입력이면 같은 결과). 관리자 > 배너 유입 화면이 쓴다.
 * 클릭 → 가입 → 결제 시작 → 결제 완료 → 매출을 배너별·날짜별로 묶는다.
 */
import {
  type CampaignLink,
  CAMPAIGN_COOKIE_DAYS,
  campaignTag,
  kstDateKey,
  linksForPartner,
  partnerDisplayName,
  partnerRsRate,
} from "@/lib/campaignLinks";

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
export { rateLabel } from "@/lib/rateLabel";

/**
 * 주문을 어느 제휴 덕으로 칠지. 결제 때 남은 표시(쿠키, 마지막 클릭 30일)가 먼저다.
 * 없으면 그 회원이 제휴로 가입한 경우(가입은 클릭 뒤에만 인정) **가입 후 30일 안의 결제만** 센다 —
 * 제휴사와 합의한 "클릭 후 30일"보다 넓게 세지 않으려고(다른 기기·나중 결제가 끝없이 잡히지 않게).
 */
export function attributedCampaign(o: {
  campaign: string | null;
  createdAt: Date;
  user: { campaign: string | null; createdAt: Date } | null;
}): string | null {
  if (o.campaign) return o.campaign;
  if (!o.user?.campaign) return null;
  const windowMs = CAMPAIGN_COOKIE_DAYS * 24 * 60 * 60 * 1000;
  const sinceSignup = o.createdAt.getTime() - o.user.createdAt.getTime();
  return sinceSignup >= 0 && sinceSignup <= windowMs ? o.user.campaign : null;
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

/**
 * 정산 기준 금액 = 결제 완료 금액(환불·취소 제외)에서 부가세(10%)를 뺀 공급가액(금액 / 1.1 반올림).
 * PG 수수료는 계약마다 달라 여기서는 빼지 않고 화면에 "PG 수수료 차감 전"으로 안내한다.
 */
export function settlementBaseAmount(revenue: number): number {
  if (revenue <= 0) return 0;
  return Math.round(revenue / 1.1);
}

/** rsRate 가 설정된 제휴사의 예상 정산액(PG 수수료 차감 전). rsRate 가 없으면 null. */
export function estimatedPartnerPayout(revenue: number, rsRate?: number): number | null {
  if (typeof rsRate !== "number" || rsRate <= 0) return null;
  return Math.round(settlementBaseAmount(revenue) * rsRate);
}

export type PartnerPeriodKey = "this_month" | "last_month" | "all";

export interface PartnerPeriodMeta {
  key: PartnerPeriodKey;
  label: string;
  rangeLabel: string;
  report: CampaignReport;
}

export interface PartnerSummaryMetrics {
  clicks: number;
  signups: number;
  paid: number;
  revenue: number;
  settlementBase: number;
  estimatedPayout: number | null;
}

export interface PartnerCodeRowView extends PartnerSummaryMetrics {
  code: string;
  label: string;
}

export interface PartnerDayRowView extends PartnerSummaryMetrics {
  date: string;
  clicksByCode: Record<string, number>;
}

export interface PartnerPeriodView {
  key: PartnerPeriodKey;
  label: string;
  rangeLabel: string;
  summary: PartnerSummaryMetrics;
  rows: PartnerCodeRowView[];
  days: PartnerDayRowView[];
}

export interface PartnerReportViewData {
  partner: string;
  partnerName: string;
  rsRate: number | null;
  codes: Array<{ code: string; label: string }>;
  periods: Record<PartnerPeriodKey, PartnerPeriodView>;
}

/** 한국 날짜 기준 이번 달·지난달 달력 정보 */
export function kstMonthBounds(now: Date = new Date()): {
  thisMonthPrefix: string;
  thisMonthDaysElapsed: number;
  lastMonthPrefix: string;
  lastMonthTotalDays: number;
  lastMonthEndDate: Date;
} {
  const todayKst = kstDateKey(now);
  const year = Number(todayKst.slice(0, 4));
  const month = Number(todayKst.slice(5, 7));
  const day = Number(todayKst.slice(8, 10));
  const thisMonthPrefix = todayKst.slice(0, 7);

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const lastMonthPrefix = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  const lastMonthTotalDays = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
  const lastMonthEndDate = new Date(`${lastMonthPrefix}-${String(lastMonthTotalDays).padStart(2, "0")}T12:00:00+09:00`);

  return {
    thisMonthPrefix,
    thisMonthDaysElapsed: day,
    lastMonthPrefix,
    lastMonthTotalDays,
    lastMonthEndDate,
  };
}

/**
 * 제휴사 화면용 기간별(이번 달 / 지난달 / 전체) 성과 집계.
 * buildCampaignReport 를 그대로 재사용해 관리자 화면과 숫자가 어긋나지 않게 한다.
 */
export function buildPartnerPeriodReports(
  partnerLinks: readonly CampaignLink[],
  clicks: ClickRow[],
  signups: SignupRow[],
  orders: OrderRow[],
  now: Date = new Date()
): Record<PartnerPeriodKey, PartnerPeriodMeta> {
  const {
    thisMonthPrefix,
    thisMonthDaysElapsed,
    lastMonthPrefix,
    lastMonthTotalDays,
    lastMonthEndDate,
  } = kstMonthBounds(now);
  const todayKst = kstDateKey(now);

  const filterByMonth = (prefix: string) => ({
    clicks: clicks.filter((c) => c.date.startsWith(prefix)),
    signups: signups.filter((s) => kstDateKey(s.createdAt).startsWith(prefix)),
    orders: orders.filter((o) => kstDateKey(o.createdAt).startsWith(prefix)),
  });

  const thisM = filterByMonth(thisMonthPrefix);
  const lastM = filterByMonth(lastMonthPrefix);

  return {
    this_month: {
      key: "this_month",
      label: "이번 달",
      rangeLabel: `${thisMonthPrefix}-01 ~ ${todayKst}`,
      report: buildCampaignReport(partnerLinks, thisM.clicks, thisM.signups, thisM.orders, thisMonthDaysElapsed, now),
    },
    last_month: {
      key: "last_month",
      label: "지난달",
      rangeLabel: `${lastMonthPrefix}-01 ~ ${lastMonthPrefix}-${String(lastMonthTotalDays).padStart(2, "0")}`,
      report: buildCampaignReport(
        partnerLinks,
        lastM.clicks,
        lastM.signups,
        lastM.orders,
        lastMonthTotalDays,
        lastMonthEndDate
      ),
    },
    all: {
      key: "all",
      label: "전체",
      rangeLabel: "누적 전체 (일별 표는 최근 30일)",
      report: buildCampaignReport(partnerLinks, clicks, signups, orders, 30, now),
    },
  };
}

/**
 * 제휴사 화면에 내려 줄 순수 숫자·날짜 묶음.
 * - 해당 partner 의 코드만 포함하며, 주문번호·이메일·이름·생년월일·궁합 id·개별 주문 시각은 일절 담지 않는다.
 */
export function buildPartnerReportViewData(
  partner: string,
  clicks: ClickRow[],
  signups: SignupRow[],
  orders: OrderRow[],
  now: Date = new Date()
): PartnerReportViewData | null {
  const partnerLinks = linksForPartner(partner);
  if (partnerLinks.length === 0) return null;

  const rsRate = partnerRsRate(partner);
  const rawPeriods = buildPartnerPeriodReports(partnerLinks, clicks, signups, orders, now);

  const toMetrics = (t: CampaignTotals): PartnerSummaryMetrics => ({
    clicks: t.clicks,
    signups: t.signups,
    paid: t.paid,
    revenue: t.revenue,
    settlementBase: settlementBaseAmount(t.revenue),
    estimatedPayout: estimatedPartnerPayout(t.revenue, rsRate),
  });

  const toPeriodView = (meta: PartnerPeriodMeta): PartnerPeriodView => ({
    key: meta.key,
    label: meta.label,
    rangeLabel: meta.rangeLabel,
    summary: toMetrics(meta.report.sum.total),
    rows: meta.report.rows.map((r) => ({
      code: r.link.code,
      label: r.link.label,
      ...toMetrics(r.total),
    })),
    days: meta.report.days.map((d) => ({
      date: d.date,
      clicksByCode: { ...d.clicksByCode },
      ...toMetrics(d.total),
    })),
  });

  return {
    partner,
    partnerName: partnerDisplayName(partner),
    rsRate: rsRate ?? null,
    codes: partnerLinks.map((l) => ({ code: l.code, label: l.label })),
    periods: {
      this_month: toPeriodView(rawPeriods.this_month),
      last_month: toPeriodView(rawPeriods.last_month),
      all: toPeriodView(rawPeriods.all),
    },
  };
}
