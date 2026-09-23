import type { PersonInput, ChildNamingInput, DateSelectionInput } from "@/lib/validation/inputs";
import { buildPremium2027Engine } from "./daeun";
import { buildNamingEngine } from "./naming/engine";
import { selectTopDates, type PersonBranches } from "./dateSelection";
import { calculateFourPillars } from "@/lib/saju";
import { ELEMENT_WORD } from "./ganzhi";

export interface Daeun2027Teaser {
  yearScore: number;
  cycleLabel: string;
  domainNames: string[];
  bestMonthMasked: string;
}

export interface NamingTeaser {
  candidateCount: number;
  neededElementDescription: string;
  insufficient: boolean;
}

export interface DateSelectionTeaser {
  totalFound: number;
  monthlyDistribution: Record<string, number>;
  insufficient: boolean;
}

export function buildDaeun2027Teaser(person: PersonInput): Daeun2027Teaser {
  const engine = buildPremium2027Engine(person);
  return {
    yearScore: engine.yearScore,
    cycleLabel: engine.current?.label ?? "새로운 기운의 10년",
    domainNames: ["연애", "재물", "직업", "건강", "대인관계", "가족"],
    bestMonthMasked: "가장 좋은 달: ●월",
  };
}

export function buildNamingTeaser(input: ChildNamingInput): NamingTeaser {
  const engine = buildNamingEngine(input);
  const weakestWord = engine.child.weakest.map((e) => ELEMENT_WORD[e] ?? "조화로운").join(", ");
  const desc = `${weakestWord}의 기운을 채워주는 이름이 잘 어울려요`;
  return {
    candidateCount: engine.names.length,
    neededElementDescription: desc,
    insufficient: engine.insufficient,
  };
}

export function buildDateSelectionTeaser(input: DateSelectionInput): DateSelectionTeaser {
  const peopleBranches: PersonBranches[] = input.people.map((p) => {
    const fp = calculateFourPillars(p.dob, p.time, p.gender === "M" ? "male" : "female", "Seoul, KR");
    return {
      dayBranch: fp.fourPillars.day[1],
      yearBranch: fp.fourPillars.year[1],
    };
  });

  const result = selectTopDates(
    {
      purpose: input.purpose,
      start: input.start,
      end: input.end,
      weekdays: input.weekdays,
      excludeDates: input.excludeDates,
    },
    peopleBranches,
  );

  const dist: Record<string, number> = {};
  for (const pick of result.picks) {
    const ym = pick.date.slice(0, 7);
    dist[ym] = (dist[ym] ?? 0) + 1;
  }

  return {
    totalFound: result.picks.length,
    monthlyDistribution: dist,
    insufficient: result.insufficient,
  };
}
