import fs from "fs";
import path from "path";
import { buildPremium2027Engine } from "../lib/premium/daeun";
import { selectTopDates } from "../lib/premium/dateSelection";
import { officerWord } from "../lib/premium/dateLabels";
import { buildNamingEngine } from "../lib/premium/naming/engine";
import { calculateFourPillars } from "../lib/saju";
import type { PersonInput, ChildNamingInput } from "../lib/validation/inputs";

const SAMPLES_DIR = path.resolve(process.cwd(), "data/samples");
if (!fs.existsSync(SAMPLES_DIR)) {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

// 1. 2027 대운 샘플
const p2027: PersonInput = {
  name: "김서연",
  dob: "1995-03-15",
  time: "10:30",
  gender: "F",
};

const daeunEngine = buildPremium2027Engine(p2027);
const fp = calculateFourPillars(p2027.dob, p2027.time, "female", "Seoul, KR");
const branches = [{
  dayBranch: fp.fourPillars.day[1],
  yearBranch: fp.fourPillars.year[1],
}];

const monthlyGoodDates: Record<number, Array<{ date: string; title: string; score: number }>> = {};
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
    title: officerWord(d.officer),
    score: d.score,
  }));
}

const sample2027 = {
  version: 1,
  meta: {
    targetName: "김서연 (예시 · 가상 인물)",
    isSample: true,
  },
  engine: {
    ...daeunEngine,
    monthlyGoodDates,
  },
  sections: {
    overview: {
      headline: "새로운 10년의 비상, 2027 정미년의 도약",
      keywords: ["도약", "안정", "성취"],
      cycleStory: "샘플 준비 중",
      position: "샘플 준비 중",
      yearSummary: "샘플 준비 중",
    },
    domains: {
      domains: [
        { key: "love", body: "샘플 준비 중", do: ["소통하기", "마음열기"], dont: ["서운함쌓기", "비교하기"] },
        { key: "money", body: "샘플 준비 중", do: ["자산점검", "기록하기"], dont: ["충동지출", "무리한투자"] },
        { key: "career", body: "샘플 준비 중", do: ["역량강화", "집중하기"], dont: ["조급함", "미루기"] },
        { key: "health", body: "샘플 준비 중", do: ["규칙적운동", "수면관리"], dont: ["과로", "야식"] },
        { key: "relationships", body: "샘플 준비 중", do: ["경청하기", "존중하기"], dont: ["일방적주장", "비판"] },
        { key: "family", body: "샘플 준비 중", do: ["안부묻기", "배려하기"], dont: ["무관심", "짜증내기"] },
      ],
    },
    months: {
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        theme: `${i + 1}월 테마`,
        body: "샘플 준비 중",
        do: "추천 행동",
        dont: "주의 행동",
      })),
    },
    closing: {
      quarterPlan: [
        { quarter: 1, focus: "1분기 기초 다지기", actions: ["목표 세우기", "체력 관리", "정리정돈"] },
        { quarter: 2, focus: "2분기 기운 확장", actions: ["새로운 시도", "관계 넓히기", "성장 투자"] },
        { quarter: 3, focus: "3분기 결실 준비", actions: ["내실 다지기", "점검하기", "안정화"] },
        { quarter: 4, focus: "4분기 감사와 수렴", actions: ["한 해 마무리", "나눔 실천", "새해 구상"] },
      ],
      letter: "샘플 준비 중",
    },
  },
};

fs.writeFileSync(
  path.join(SAMPLES_DIR, "premium_2027_daeun.json"),
  JSON.stringify(sample2027, null, 2),
  "utf8"
);
console.log("Wrote premium_2027_daeun.json");

// 2. 작명 샘플
const namingInput: ChildNamingInput = {
  surnameHangul: "김",
  surnameHanja: "金",
  gender: "M",
  dob: "2024-05-15",
  time: "14:30",
  dollim: null,
  tags: ["지혜", "밝음"],
  avoidSyllables: [], guardianConsent: true,
};

const namingEngine = buildNamingEngine(namingInput);
const sampleNaming = {
  version: 1,
  meta: {
    targetName: "김씨 남아 (예시 · 가상 인물)",
    isSample: true,
  },
  engine: namingEngine,
  sections: {
    names: {
      names: namingEngine.names.map((n) => ({
        hangul: n.hangul,
        oneLine: `${n.hangul}, 세상을 밝히는 깊은 지혜의 이름`,
        meaning: "샘플 준비 중",
        harmony: "샘플 준비 중",
        sound: "샘플 준비 중",
      })),
    },
    letter: {
      intro: "샘플 준비 중",
      letter: "샘플 준비 중",
      notice: "출생신고 전 대법원 전자가족관계등록시스템에서 인명용 한자 여부를 한 번 더 확인해 주세요.",
    },
  },
};

fs.writeFileSync(
  path.join(SAMPLES_DIR, "premium_naming.json"),
  JSON.stringify(sampleNaming, null, 2),
  "utf8"
);
console.log("Wrote premium_naming.json");

// 3. 택일 샘플
const couplePeople: PersonInput[] = [
  { name: "신랑", dob: "1993-08-20", time: "11:00", gender: "M" },
  { name: "신부", dob: "1995-03-15", time: "10:30", gender: "F" },
];

const coupleBranches = couplePeople.map((p) => {
  const f = calculateFourPillars(p.dob, p.time, p.gender === "M" ? "male" : "female", "Seoul, KR");
  return {
    dayBranch: f.fourPillars.day[1],
    yearBranch: f.fourPillars.year[1],
  };
});

const dateRes = selectTopDates(
  {
    purpose: "WEDDING",
    start: "2027-04-01",
    end: "2027-06-30",
    weekdays: [0, 6], // 주말
    excludeDates: [],
  },
  coupleBranches,
);

const sampleDates = {
  version: 1,
  meta: {
    targetName: "결혼 택일 (예시 · 가상 인물)",
    isSample: true,
  },
  engine: {
    picks: dateRes.picks.map((p) => ({
      ...p,
      title: officerWord(p.officer),
    })),
    insufficient: dateRes.insufficient,
    purpose: "WEDDING",
    range: { start: "2027-04-01", end: "2027-06-30" },
    peopleCount: 2,
  },
  sections: {
    dates: {
      dates: dateRes.picks.map((p) => ({
        date: p.date,
        title: `${officerWord(p.officer)}, 하늘이 축복하는 아름다운 길일`,
        why: "샘플 준비 중",
        tips: ["예식장 및 시간 예약 확인", "양가 부모님 일정 조율", "편안한 마음가짐"],
      })),
    },
    guide: {
      summary: "샘플 준비 중",
      checklist: [
        "선정된 후보일 중 양가 부모님과 최종 합의",
        "웨딩홀 및 주요 예약 일정 확정",
        "길한 시간대에 맞춘 예식 시간 조율",
        "필수 서류 및 체크리스트 준비",
        "당일 좋은 기운을 맞이하는 마음가짐",
      ],
      notice: "전통 달력 기반 참고용",
    },
  },
};

fs.writeFileSync(
  path.join(SAMPLES_DIR, "premium_date_selection.json"),
  JSON.stringify(sampleDates, null, 2),
  "utf8"
);
console.log("Wrote premium_date_selection.json");
console.log("All sample files created successfully.");
