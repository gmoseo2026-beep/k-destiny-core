import { generateJson } from "@/lib/gen/generateJson";
import { STYLE_GUIDE, STRICT_NO_HANJA_RULE } from "@/lib/destinyGen";
import { PREMIUM_MODELS } from "@/lib/premium/models";
import { selectTopDates, type DateScore, type PersonBranches } from "@/lib/premium/dateSelection";
import { calculateFourPillars } from "@/lib/saju";
import { officerWord } from "@/lib/premium/dateLabels";
import type { SelectablePurpose, PersonInput } from "@/lib/validation/inputs";

export interface DateSelectionGenerationInput {
  purpose: SelectablePurpose;
  start: string;
  end: string;
  people: PersonInput[];
  weekdays: number[];
  excludeDates: string[];
}

export interface DateStoryItem {
  date: string;
  title: string;
  why: string;
  tips: [string, string, string];
}

export interface SectionADates {
  dates: DateStoryItem[];
}

export interface SectionBGuide {
  summary: string;
  checklist: [string, string, string, string, string];
  notice: string;
}

export interface DateCandidateWithTitle extends DateScore {
  title: string;
}

export interface PremiumDateSelectionEngineData {
  picks: DateCandidateWithTitle[];
  insufficient: boolean;
  purpose: SelectablePurpose;
  range: { start: string; end: string };
  peopleCount: number;
}

export interface PremiumDateSelectionReportContent {
  version: 1;
  engine: PremiumDateSelectionEngineData;
  sections: {
    dates: SectionADates;
    guide: SectionBGuide;
  };
}

const COMMON_PREMIUM_RULES = `
${STYLE_GUIDE}

${STRICT_NO_HANJA_RULE}

⚠️ 절대 원칙:
1. 엔진이 선정한 길일 날짜와 순서를 절대 임의로 변경하지 마세요.
2. 단정적 예언("이날 하지 않으면 큰일 난다" 등)은 금지하며, 전통 달력과 역학 원리에 기반한 친근한 조언(해요체)으로 쓰세요.
3. JSON 형식만 출력해야 합니다.
`;

const PURPOSE_LABEL_MAP: Record<SelectablePurpose, string> = {
  WEDDING: "결혼식·약혼",
  MOVING: "이사·입주",
  OPENING: "개업·사업 오픈",
  CONTRACT: "중요 계약·체결",
};

export async function generateDatesReport(input: DateSelectionGenerationInput): Promise<PremiumDateSelectionReportContent> {
  // 1. Deterministic engine
  const branches: PersonBranches[] = input.people.map((p) => {
    const fp = calculateFourPillars(p.dob, p.time, p.gender === "M" ? "male" : "female", "Seoul, KR");
    return {
      dayBranch: fp.fourPillars.day[1],
      yearBranch: fp.fourPillars.year[1],
    };
  });

  const selectionRes = selectTopDates(
    {
      purpose: input.purpose,
      start: input.start,
      end: input.end,
      weekdays: input.weekdays,
      excludeDates: input.excludeDates,
    },
    branches,
  );

  const picks: DateCandidateWithTitle[] = selectionRes.picks.map((p) => ({
    ...p,
    title: officerWord(p.officer),
  }));

  const engine: PremiumDateSelectionEngineData = {
    picks,
    insufficient: selectionRes.insufficient,
    purpose: input.purpose,
    range: { start: input.start, end: input.end },
    peopleCount: input.people.length,
  };

  const purposeKo = PURPOSE_LABEL_MAP[input.purpose] ?? "특별한 날";

  const pickSummary = engine.picks
    .map(
      (p, i) =>
        `${i + 1}순위: ${p.date} (${p.title}, 종합점수 ${p.score}점, 추천 시간: ${p.goodHours.join(", ")})`,
    )
    .join("\n");

  const promptContext = `
[택일 목적 및 조건]
- 목적: ${purposeKo}
- 기간: ${input.start} ~ ${input.end}
- 대상 인원: ${input.people.length}명
- 선호 요일: ${input.weekdays.length > 0 ? input.weekdays.join(", ") : "모든 요일"}

[엔진이 산출한 최적의 추천 길일 목록 (순서 엄수)]
${pickSummary}
`;

  // A. Dates
  const promptA = `${COMMON_PREMIUM_RULES}
${promptContext}

[요청: 추천된 길일들에 대한 친절한 이유 설명 및 팁 작성]
엔진이 추천한 각 날짜의 순서와 date 문자열을 정확히 일치시켜 JSON 배열로 작성하세요.
각 날짜마다:
- title: 날짜에 어울리는 감성적이고 또렷한 제목 (20자 이내, 예: "새로운 시작을 하늘이 축복하는 날")
- why: 왜 이 날이 ${purposeKo}에 최상의 기운을 주는지 쉬운 말로 설명 (1문단, 200~300자)
- tips: 그날 최고의 운을 잡기 위한 구체적이고 실천적인 행동 팁 3가지

다음 JSON 스키마를 만족하는 JSON만 반환하세요:
{
  "dates": [
    {
      "date": "${engine.picks[0]?.date ?? ""}",
      "title": "추천일 제목",
      "why": "추천 이유 풀이...",
      "tips": ["실천 팁 1", "실천 팁 2", "실천 팁 3"]
    }
    ... (총 ${engine.picks.length}개)
  ]
}
`;

  // B. Guide
  const promptB = `${COMMON_PREMIUM_RULES}
${promptContext}

[요청: ${purposeKo} 준비 가이드 및 체크리스트]
다음 세 가지 항목을 작성하세요:
1. summary: 택일 결과를 마음에 품고 ${purposeKo}을(를) 준비하는 자세에 대한 따뜻한 총평 (2문단, 300~450자)
2. checklist: ${purposeKo}을 성공적으로 치르기 위해 당일 전후로 챙겨야 할 핵심 준비 체크리스트 정확히 5가지
3. notice: 법적 및 참고용 고지. "전통 달력과 사주 원리에 기반한 참고용 길일 안내입니다." 취지를 담은 안내 문구

다음 JSON 스키마를 만족하는 JSON만 반환하세요:
{
  "summary": "총평 요약...",
  "checklist": [
    "체크리스트 항목 1",
    "체크리스트 항목 2",
    "체크리스트 항목 3",
    "체크리스트 항목 4",
    "체크리스트 항목 5"
  ],
  "notice": "전통 달력과 사주 원리에 기반한 참고용 길일 안내입니다."
}
`;

  function validateDates(v: unknown): v is SectionADates {
    if (!v || typeof v !== "object") return false;
    const o = v as Partial<SectionADates>;
    if (!Array.isArray(o.dates) || o.dates.length !== engine.picks.length) return false;
    for (let i = 0; i < engine.picks.length; i++) {
      const item = o.dates[i];
      if (!item || item.date !== engine.picks[i].date) return false;
      if (typeof item.title !== "string" || !item.title.trim()) return false;
      if (typeof item.why !== "string" || !item.why.trim()) return false;
      if (!Array.isArray(item.tips) || item.tips.length !== 3 || item.tips.some((t) => typeof t !== "string" || !t.trim())) return false;
    }
    return true;
  }

  function validateGuide(v: unknown): v is SectionBGuide {
    if (!v || typeof v !== "object") return false;
    const o = v as Partial<SectionBGuide>;
    if (typeof o.summary !== "string" || !o.summary.trim()) return false;
    if (!Array.isArray(o.checklist) || o.checklist.length !== 5 || o.checklist.some((c) => typeof c !== "string" || !c.trim())) return false;
    if (typeof o.notice !== "string" || !o.notice.trim()) return false;
    return true;
  }

  const [resA, resB] = await Promise.all([
    generateJson<SectionADates>({
      label: "premium:dates:dates",
      prompt: promptA,
      models: PREMIUM_MODELS,
      maxOutputTokens: 8192,
      thinkingBudget: 1024,
      validate: validateDates,
    }),
    generateJson<SectionBGuide>({
      label: "premium:dates:guide",
      prompt: promptB,
      models: PREMIUM_MODELS,
      maxOutputTokens: 8192,
      thinkingBudget: 1024,
      validate: validateGuide,
    }),
  ]);

  return {
    version: 1,
    engine,
    sections: {
      dates: resA.data,
      guide: resB.data,
    },
  };
}
