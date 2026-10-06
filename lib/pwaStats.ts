/**
 * 홈 화면에 설치한 앱(PWA) 집계. 설치·실행을 하루 단위 숫자로만 센다(SiteCounter, 개인정보 없음).
 *
 * 2026-10-06 까지는 설치를 기록하는 장치가 없어서 "몇 명이 설치했는지" 알 수 없었다
 * (서버 기록으로 하루 3~4번 실행된다는 것만 보였다).
 *
 * - install        : 브라우저가 "설치됨"을 알려 준 횟수(안드로이드·PC 크롬 계열만. 아이폰은 이 신호가 없다)
 * - device         : 설치된 앱으로 **처음** 연 기기 수 — 아이폰까지 포함한 "설치한 기기 수"에 가장 가깝다
 * - launch         : 설치된 앱으로 연 횟수(탭 세션당 1회)
 * - launch_member  : 그중 로그인한 회원이 연 횟수
 */
import { kstDateKey } from "@/lib/campaignLinks";

export const PWA_KINDS = ["install", "device", "launch", "launch_member"] as const;
export type PwaKind = (typeof PWA_KINDS)[number];

export const PWA_COUNTER_PREFIX = "pwa:";
export const pwaCounterKey = (kind: PwaKind, dateKey: string): string => `pwa:${kind}:${dateKey}`;

export function parsePwaCounterKey(key: string): { kind: PwaKind; date: string } | null {
  const m = /^pwa:([a-z_]+):(\d{4}-\d{2}-\d{2})$/.exec(key);
  if (!m || !(PWA_KINDS as readonly string[]).includes(m[1])) return null;
  return { kind: m[1] as PwaKind, date: m[2] };
}

export type PwaTotals = Record<PwaKind, number>;
export interface PwaReport {
  today: PwaTotals;
  last7: PwaTotals;
  total: PwaTotals;
  days: Array<{ date: string } & PwaTotals>;
}

const empty = (): PwaTotals => ({ install: 0, device: 0, launch: 0, launch_member: 0 });

function recentDates(n: number, now: Date): string[] {
  return Array.from({ length: n }, (_, i) => kstDateKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
}

export function buildPwaReport(
  rows: Array<{ kind: PwaKind; date: string; count: number }>,
  daysShown: number,
  now: Date = new Date()
): PwaReport {
  const dates = recentDates(daysShown, now);
  const week = new Set(recentDates(7, now));
  const byDate = new Map(dates.map((d) => [d, { date: d, ...empty() }]));
  const report: PwaReport = { today: empty(), last7: empty(), total: empty(), days: [] };
  for (const r of rows) {
    report.total[r.kind] += r.count;
    if (week.has(r.date)) report.last7[r.kind] += r.count;
    if (r.date === dates[0]) report.today[r.kind] += r.count;
    const day = byDate.get(r.date);
    if (day) day[r.kind] += r.count;
  }
  report.days = dates.map((d) => byDate.get(d)!);
  return report;
}
