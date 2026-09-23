import { generateJson } from "@/lib/gen/generateJson";
import { STYLE_GUIDE, STRICT_NO_HANJA_RULE } from "@/lib/destinyGen";
import { PREMIUM_MODELS } from "@/lib/premium/models";
import { buildPremium2027Engine, type Premium2027Engine } from "@/lib/premium/daeun";
import { selectTopDates } from "@/lib/premium/dateSelection";
import { calculateFourPillars } from "@/lib/saju";
import type { PersonInput } from "@/lib/validation/inputs";

export interface Daeun2027GenerationInput {
  name: string;
  dob: string;
  time?: string | null;
  gender: "M" | "F";
}

export interface SectionAOverview {
  headline: string;
  keywords: [string, string, string];
  cycleStory: string;
  position: string;
  yearSummary: string;
}

export type DomainKey = "love" | "money" | "career" | "health" | "relationships" | "family";

export interface DomainItem {
  key: DomainKey;
  body: string;
  do: [string, string];
  dont: [string, string];
}

export interface SectionBDomains {
  domains: DomainItem[];
}

export interface MonthItem {
  month: number;
  theme: string;
  body: string;
  do: string;
  dont: string;
}

export interface SectionCMonths {
  months: MonthItem[];
}

export interface QuarterPlanItem {
  quarter: 1 | 2 | 3 | 4;
  focus: string;
  actions: [string, string, string];
}

export interface SectionDClosing {
  quarterPlan: QuarterPlanItem[];
  letter: string;
}

export interface Premium2027EngineData extends Premium2027Engine {
  monthlyGoodDates: Record<number, Array<{ date: string; title: string; score: number }>>;
}

export interface Premium2027ReportContent {
  version: 1;
  engine: Premium2027EngineData;
  sections: {
    overview: SectionAOverview;
    domains: SectionBDomains;
    months: SectionCMonths;
    closing: SectionDClosing;
  };
}

const DOMAIN_KEYS: DomainKey[] = ["love", "money", "career", "health", "relationships", "family"];

function validateOverview(v: unknown): v is SectionAOverview {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<SectionAOverview>;
  if (typeof o.headline !== "string" || !o.headline.trim()) return false;
  if (!Array.isArray(o.keywords) || o.keywords.length !== 3 || o.keywords.some((k) => typeof k !== "string" || !k.trim())) return false;
  if (typeof o.cycleStory !== "string" || !o.cycleStory.trim()) return false;
  if (typeof o.position !== "string" || !o.position.trim()) return false;
  if (typeof o.yearSummary !== "string" || !o.yearSummary.trim()) return false;
  return true;
}

function validateDomains(v: unknown): v is SectionBDomains {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<SectionBDomains>;
  if (!Array.isArray(o.domains) || o.domains.length !== 6) return false;
  for (let i = 0; i < 6; i++) {
    const d = o.domains[i];
    if (!d || d.key !== DOMAIN_KEYS[i]) return false;
    if (typeof d.body !== "string" || !d.body.trim()) return false;
    if (!Array.isArray(d.do) || d.do.length !== 2 || d.do.some((x) => typeof x !== "string" || !x.trim())) return false;
    if (!Array.isArray(d.dont) || d.dont.length !== 2 || d.dont.some((x) => typeof x !== "string" || !x.trim())) return false;
  }
  return true;
}

function validateMonths(v: unknown): v is SectionCMonths {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<SectionCMonths>;
  if (!Array.isArray(o.months) || o.months.length !== 12) return false;
  for (let m = 1; m <= 12; m++) {
    const item = o.months[m - 1];
    if (!item || item.month !== m) return false;
    if (typeof item.theme !== "string" || !item.theme.trim() || item.theme.length > 15) return false;
    if (typeof item.body !== "string" || !item.body.trim()) return false;
    if (typeof item.do !== "string" || !item.do.trim()) return false;
    if (typeof item.dont !== "string" || !item.dont.trim()) return false;
  }
  return true;
}

function validateClosing(v: unknown): v is SectionDClosing {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<SectionDClosing>;
  if (!Array.isArray(o.quarterPlan) || o.quarterPlan.length !== 4) return false;
  for (let q = 1; q <= 4; q++) {
    const item = o.quarterPlan[q - 1];
    if (!item || item.quarter !== q) return false;
    if (typeof item.focus !== "string" || !item.focus.trim()) return false;
    if (!Array.isArray(item.actions) || item.actions.length !== 3 || item.actions.some((a) => typeof a !== "string" || !a.trim())) return false;
  }
  if (typeof o.letter !== "string" || !o.letter.trim()) return false;
  return true;
}

const COMMON_PREMIUM_RULES = `
${STYLE_GUIDE}

${STRICT_NO_HANJA_RULE}

⚠️ 절대 원칙:
1. 엔진이 제공한 수치(점수, 순위, 대운 간지, 날짜 등)는 불변의 사실로만 기술하고 절대 새로운 수치를 임의로 계산하거나 변조하지 마세요.
2. 단정적 예언("반드시 ~된다", "망한다" 등)은 금지합니다.
3. 본 서비스는 오락 및 자기이해 목적이며, 다정하고 친근한 톤(해요체)으로 쓰세요.
4. JSON 형식만 출력해야 합니다.
`;

export async function generate2027Report(input: Daeun2027GenerationInput): Promise<Premium2027ReportContent> {
  const person: PersonInput = {
    name: input.name,
    dob: input.dob,
    time: input.time ?? null,
    gender: input.gender,
  };

  // 1. Deterministic engine
  const daeunResult = buildPremium2027Engine(person);

  // Compute monthly top 2 good dates for each month in 2027
  const monthlyGoodDates: Record<number, Array<{ date: string; title: string; score: number }>> = {};
  const fp = calculateFourPillars(person.dob, person.time, person.gender === "M" ? "male" : "female", "Seoul, KR");
  const branches = [{
    dayBranch: fp.fourPillars.day[1],
    yearBranch: fp.fourPillars.year[1],
  }];

  for (let m = 1; m <= 12; m++) {
    const monthStr = String(m).padStart(2, "0");
    const lastDay = new Date(Date.UTC(2027, m, 0)).getUTCDate();
    const start = `2027-${monthStr}-01`;
    const end = `2027-${monthStr}-${String(lastDay).padStart(2, "0")}`;
    const datesRes = selectTopDates(
      {
        purpose: "GENERAL",
        start,
        end,
        weekdays: [],
        excludeDates: [],
      },
      branches,
    );
    monthlyGoodDates[m] = datesRes.picks.slice(0, 2).map((d) => ({
      date: d.date,
      title: d.officer,
      score: d.score,
    }));
  }

  const engine: Premium2027EngineData = {
    ...daeunResult,
    monthlyGoodDates,
  };

  // 2. Parallel AI section generation
  const promptContext = `
[사용자 정보]
- 이름: ${input.name}
- 생년월일: ${input.dob} ${input.time ?? "시간 모름"} (${input.gender === "M" ? "남성" : "여성"})

[엔진 데이터 - 10년 대운 및 2027 정미년 흐름]
- 현재 대운 주기: ${engine.current ? `${engine.current.startAge}세~ (${engine.current.ganZhi} 대운, ${engine.current.label})` : "기운 교체기"}
- 2027년 점수: 총 ${engine.yearScore}점
- 2027년 분야별 점수:
  - 사랑/애정(love): ${engine.domains.love}점
  - 재물/금전(money): ${engine.domains.money}점
  - 직업/커리어(career): ${engine.domains.career}점
  - 건강/활력(health): ${engine.domains.health}점
  - 인간관계(relationships): ${engine.domains.relationships}점
  - 가정/안정(family): ${engine.domains.family}점
- 2027년 월별 흐름 (1~12월 점수 및 간지):
${engine.months.map((mo) => `  ${mo.month}월: ${mo.score}점 (${mo.ganZhi})`).join("\n")}
`;

  // A. Overview
  const promptA = `${COMMON_PREMIUM_RULES}
${promptContext}

[요청: 2027 총평 및 10년 지도 개요 섹션 작성]
다음 JSON 스키마를 만족하는 JSON만 반환하세요:
{
  "headline": "2027년 한 해를 관통하는 핵심 한 줄 (20자 이내)",
  "keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3"],
  "cycleStory": "현재 10년 대운 주기가 이 사람의 인생에서 갖는 깊은 의미 풀이 (3문단, 600~900자)",
  "position": "10년의 긴 흐름 속에서 2027 정미년이 차지하는 위치와 의미 (1문단, 200~300자)",
  "yearSummary": "2027년 한 해 동안 펼쳐질 전반적인 삶의 파도와 마음가짐 (2문단, 400~600자)"
}
`;

  // B. Domains
  const promptB = `${COMMON_PREMIUM_RULES}
${promptContext}

[요청: 6개 핵심 분야별 심층 분석]
정확히 아래 6개 key 순서대로 배열을 작성하세요: "love", "money", "career", "health", "relationships", "family".
다음 JSON 스키마를 만족하는 JSON만 반환하세요:
{
  "domains": [
    {
      "key": "love",
      "body": "애정운과 사랑 흐름 풀이 (2문단, 400~600자)",
      "do": ["구체적인 추천 행동 1", "구체적인 추천 행동 2"],
      "dont": ["피해야 할 행동 1", "피해야 할 행동 2"]
    },
    ... (나머지 5개 분야: money, career, health, relationships, family)
  ]
}
`;

  // C. Months
  const promptC = `${COMMON_PREMIUM_RULES}
${promptContext}

[요청: 1월부터 12월까지 12개월 월별 운세 및 실천 가이드]
정확히 1월부터 12월까지 순서대로 12개의 객체를 작성하세요.
각 월의 점수와 기운에 어울리는 테마와 가이드를 제시하세요.
다음 JSON 스키마를 만족하는 JSON만 반환하세요:
{
  "months": [
    {
      "month": 1,
      "theme": "월의 테마 (8자 이내, 예: 새로운 결심의 씨앗)",
      "body": "이달의 기운과 주요 흐름 풀이 (250~350자)",
      "do": "이달에 꼭 실천하면 좋은 일 한 가지",
      "dont": "이달에 조심하고 피해야 할 일 한 가지"
    },
    ... (2월부터 12월까지 총 12개)
  ]
}
`;

  // D. Closing
  const promptD = `${COMMON_PREMIUM_RULES}
${promptContext}

[요청: 분기별 실행 로드맵 및 두근이의 응원 편지]
1~4분기별 집중 목표(focus)와 3가지 액션 플랜, 그리고 콩닥의 마스코트 두근이가 마음을 담아 건네는 따뜻한 편지를 작성하세요.
다음 JSON 스키마를 만족하는 JSON만 반환하세요:
{
  "quarterPlan": [
    {
      "quarter": 1,
      "focus": "1분기 핵심 목표 (15자 이내)",
      "actions": ["실천 항목 1", "실천 항목 2", "실천 항목 3"]
    },
    ... (quarter 2, 3, 4)
  ],
  "letter": "두근이가 당신에게 띄우는 따뜻하고 힘이 되는 진심 어린 편지 (2문단, 400~600자)"
}
`;

  const [resA, resB, resC, resD] = await Promise.all([
    generateJson<SectionAOverview>({
      label: "premium:2027:overview",
      prompt: promptA,
      models: PREMIUM_MODELS,
      maxOutputTokens: 8192,
      thinkingBudget: 1024,
      validate: validateOverview,
    }),
    generateJson<SectionBDomains>({
      label: "premium:2027:domains",
      prompt: promptB,
      models: PREMIUM_MODELS,
      maxOutputTokens: 8192,
      thinkingBudget: 1024,
      validate: validateDomains,
    }),
    generateJson<SectionCMonths>({
      label: "premium:2027:months",
      prompt: promptC,
      models: PREMIUM_MODELS,
      maxOutputTokens: 8192,
      thinkingBudget: 1024,
      validate: validateMonths,
    }),
    generateJson<SectionDClosing>({
      label: "premium:2027:closing",
      prompt: promptD,
      models: PREMIUM_MODELS,
      maxOutputTokens: 8192,
      thinkingBudget: 1024,
      validate: validateClosing,
    }),
  ]);

  return {
    version: 1,
    engine,
    sections: {
      overview: resA.data,
      domains: resB.data,
      months: resC.data,
      closing: resD.data,
    },
  };
}
