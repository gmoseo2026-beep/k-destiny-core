import { Solar } from "lunar-javascript";
import { BRANCH_CLASH, BRANCH_SIX_COMBO, BRANCH_THREE_COMBO, BRANCH_PUNISH, BRANCH_HARM_ENMITY } from "@/lib/compatibility";

export type Purpose = "WEDDING" | "MOVING" | "OPENING" | "CONTRACT" | "GENERAL";
export const PURPOSE_YI_KEYS: Record<Purpose, string[]> = {
  WEDDING: ["嫁娶"],
  MOVING: ["入宅", "移徙", "搬家"],
  OPENING: ["开市"],
  CONTRACT: ["立券", "交易"],
  GENERAL: [],
};
const GOOD_OFFICERS = new Set(["除", "危", "定", "执", "成", "开"]); // 건제12신 중 길한 날
// 한국 관례: 표준시 대비 30분 늦은 시진
const HOUR_RANGE: Record<string, string> = {
  辰: "07:30~09:30",
  巳: "09:30~11:30",
  午: "11:30~13:30",
  未: "13:30~15:30",
  申: "15:30~17:30",
  酉: "17:30~19:30",
};

export interface PersonBranches {
  dayBranch: string;
  yearBranch: string;
}

export interface DateScore {
  date: string;
  score: number;
  lunarMonth: number;
  lunarDay: number;
  isLeapMonth: boolean;
  dayGanZhi: string;
  officer: string;
  yellowPath: boolean;
  yiHit: boolean;
  sonEomneun: boolean;
  goodHours: string[];
}

export function scoreDate(date: string, purpose: Purpose, people: PersonBranches[]): DateScore | null {
  const [y, m, d] = date.split("-").map(Number);
  const lunar = Solar.fromYmd(y, m, d).getLunar();
  const keys = PURPOSE_YI_KEYS[purpose];
  const ji: string[] = lunar.getDayJi();
  const yi: string[] = lunar.getDayYi();
  if (keys.some((k) => ji.includes(k))) return null; // 그 일을 꺼리는 날
  const dayBranch: string = lunar.getDayZhi();
  for (const p of people) {
    // 본인 일지·띠와 충돌하는 날
    if (BRANCH_CLASH.has(dayBranch + p.dayBranch) || BRANCH_CLASH.has(dayBranch + p.yearBranch)) return null;
  }
  const yiHit = keys.some((k) => yi.includes(k));
  const yellowPath = lunar.getDayTianShenLuck() === "吉";
  const officer: string = lunar.getZhiXing();
  const lunarDay: number = lunar.getDay();
  const sonEomneun = lunarDay % 10 === 9 || lunarDay % 10 === 0; // 손 없는 날(음력 9·10·19·20·29·30)
  let score = 50 + (yiHit ? 20 : 0) + (yellowPath ? 10 : -10) + (GOOD_OFFICERS.has(officer) ? 8 : -4);
  for (const p of people) {
    const k = dayBranch + p.dayBranch;
    if (BRANCH_SIX_COMBO.has(k)) score += 6;
    else if (BRANCH_THREE_COMBO.has(k)) score += 4;
    else if (BRANCH_PUNISH.has(k)) score -= 4;
    else if (BRANCH_HARM_ENMITY.has(k)) score -= 3;
  }
  if (purpose === "MOVING" && sonEomneun) score += 15;
  const seen = new Set<string>();
  const goodHours: string[] = [];
  for (const t of lunar.getTimes()) {
    const z: string = t.getZhi();
    if (seen.has(z)) continue;
    seen.add(z);
    if (HOUR_RANGE[z] && t.getTianShenLuck() === "吉" && goodHours.length < 2) goodHours.push(HOUR_RANGE[z]);
  }
  const lm: number = lunar.getMonth();
  return {
    date,
    score,
    lunarMonth: Math.abs(lm),
    lunarDay,
    isLeapMonth: lm < 0,
    dayGanZhi: lunar.getDayInGanZhi(),
    officer,
    yellowPath,
    yiHit,
    sonEomneun,
    goodHours,
  };
}

export interface SelectionResult {
  picks: DateScore[];
  insufficient: boolean;
  scanned: number;
}

/** 범위 전체를 채점해 60점 이상 중 상위 5개. 동점이면 이른 날짜 우선(결정론). */
export function selectTopDates(
  o: { purpose: Purpose; start: string; end: string; weekdays: number[]; excludeDates: string[] },
  people: PersonBranches[],
): SelectionResult {
  const out: DateScore[] = [];
  let scanned = 0;
  for (let t = Date.parse(o.start + "T00:00:00Z"); t <= Date.parse(o.end + "T00:00:00Z"); t += 86400000) {
    const dt = new Date(t);
    const date = dt.toISOString().slice(0, 10);
    scanned++;
    if (o.weekdays.length && !o.weekdays.includes(dt.getUTCDay())) continue;
    if (o.excludeDates.includes(date)) continue;
    const s = scoreDate(date, o.purpose, people);
    if (s && s.score >= 60) out.push(s);
  }
  out.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  const picks = out.slice(0, 5);
  return { picks, insufficient: picks.length < 3, scanned };
}
