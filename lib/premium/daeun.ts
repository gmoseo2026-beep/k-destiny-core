import { Solar } from "lunar-javascript";
import { calculateFourPillars } from "@/lib/saju";
import type { PersonInput } from "@/lib/validation/inputs";
import {
  STEM_ELEMENT,
  relation,
  isStrong,
  charPoints,
  branchAdj,
  clamp,
  cycleLabel,
  elementOf,
  type Relation,
} from "@/lib/premium/ganzhi";

export interface DaeunCycle {
  index: number;
  startYear: number;
  endYear: number;
  startAge: number;
  ganZhi: string;
  label: string;
}

export interface Premium2027Engine {
  strong: boolean;
  cycles: DaeunCycle[];          // 최대 8개(빈 간지인 0번 제외)
  current: DaeunCycle | null;    // 2027 이 속한 10년
  yearScore: number;             // 55~97
  domains: Record<"love" | "money" | "career" | "health" | "relationships" | "family", number>; // 50~99
  months: Array<{ month: number; ganZhi: string; score: number }>; // 양력 1~12월, 50~99
}

export function calculateDaeun(
  p: { dob: string; time: string | null; gender: "M" | "F" },
  targetYear: number,
): { cycles: DaeunCycle[]; current: DaeunCycle | null } {
  const [y, m, d] = p.dob.split("-").map(Number);
  const [hh, mm] = (p.time ?? "12:00").split(":").map(Number); // saju.ts 와 동일한 시간 미상 처리
  const yun = Solar.fromYmdHms(y, m, d, hh, mm, 0).getLunar().getEightChar().getYun(p.gender === "M" ? 1 : 0);
  const cycles = yun.getDaYun()
    .filter((dy) => dy.getGanZhi())
    .slice(0, 8)
    .map((dy) => ({
      index: dy.getIndex(),
      startYear: dy.getStartYear(),
      endYear: dy.getEndYear(),
      startAge: dy.getStartAge(),
      ganZhi: dy.getGanZhi(),
      label: cycleLabel(dy.getGanZhi()),
    }));
  const current = cycles.find((c) => c.startYear <= targetYear && targetYear <= c.endYear) ?? null;
  return { cycles, current };
}

export function buildPremium2027Engine(p: PersonInput): Premium2027Engine {
  const fourPillarsResult = calculateFourPillars(p.dob, p.time, p.gender === "M" ? "male" : "female", "Seoul, KR");
  const dayStem = fourPillarsResult.fourPillars.day[0];
  const dayBranch = fourPillarsResult.fourPillars.day[1];
  const dm = STEM_ELEMENT[dayStem];
  const strong = isStrong(dm, fourPillarsResult.elementsScore);

  const { cycles, current } = calculateDaeun(p, 2027);

  const s = 70 + 1.5 * (charPoints(dm, "丁", strong) + charPoints(dm, "未", strong)) + branchAdj("未", dayBranch)
    + (current ? charPoints(dm, current.ganZhi[0], strong) + charPoints(dm, current.ganZhi[1], strong) : 0);
  const yearScore = clamp(Math.round(s), 55, 97);

  const active = ["丁", "未", current?.ganZhi[0], current?.ganZhi[1]].filter(Boolean) as string[];
  const relMaps: Record<"love" | "money" | "career" | "relationships" | "family", Relation[]> = {
    love: p.gender === "M" ? ["wealth"] : ["pressure"],
    money: ["wealth"],
    career: ["pressure", "output"],
    relationships: ["peer"],
    family: ["support"],
  };

  const domains = {} as Record<"love" | "money" | "career" | "health" | "relationships" | "family", number>;
  for (const [dom, targetRels] of Object.entries(relMaps) as Array<[keyof typeof relMaps, Relation[]]>) {
    const hits = active.filter((ch) => {
      const e = elementOf(ch);
      return e && targetRels.includes(relation(dm, e));
    }).length;
    domains[dom] = clamp(yearScore - 4 + hits * 5, 50, 99);
  }

  const minPct = Math.min(...Object.values(fourPillarsResult.elementsScore));
  domains.health = clamp(yearScore - Math.round((20 - minPct) / 2), 50, 99);

  const months: Array<{ month: number; ganZhi: string; score: number }> = [];
  for (let mon = 1; mon <= 12; mon++) {
    const gz = Solar.fromYmd(2027, mon, 20).getLunar().getMonthInGanZhiExact();
    const score = clamp(
      Math.round(yearScore + 1.2 * (charPoints(dm, gz[0], strong) + charPoints(dm, gz[1], strong)) + branchAdj(gz[1], dayBranch)),
      50,
      99,
    );
    months.push({ month: mon, ganZhi: gz, score });
  }

  return {
    strong,
    cycles,
    current,
    yearScore,
    domains,
    months,
  };
}
