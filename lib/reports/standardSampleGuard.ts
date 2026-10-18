import { containsHanjaDeep } from "@/lib/gen/hanjaGuard";

/**
 * P-012 단품 샘플 저장 전 품질·규칙 검사
 * 1) 한자(containsHanjaDeep) 0건
 * 2) 사주 전문용어(오행·일간·천간·지지·용신·십신·편재·정재·편관·정관·식신·상관·비견·겁재·도화살·역마살) 0건
 *    - 일상어 활용("무너지지 않-", "지지해 주-", "상관없이", "며칠간")은 오탐에서 제외하고 사주 명사로 쓰인 경우만 잡는다.
 * 3) 단정 표현(반드시·무조건·100%·틀림없이) 0건
 * 4) 가상 인물(한 사람: 지민 / 두 사람: 지민·서준) 외 다른 실명 호칭(○○님) 0건
 */

const SAJU_JARGON_PATTERNS: Array<{ term: string; regex: RegExp }> = [
  { term: "오행", regex: /오행/ },
  { term: "일간", regex: /(?<![며수십백천\d])일간/ },
  { term: "천간", regex: /천간/ },
  {
    term: "지지",
    // 앞에 한글 어간(무너-, 사라-, 꺼-, 멀어- 등)이 붙지 않고 뒤에 '않/마/해/하/받/보/율/도/자/층/대'가 오지 않는 독립 명사 '지지'
    regex: /(?<![가-힣])지지(?![\s]*(?:않|마|해|하|받|보|율|도|자|층|대|력|기반))/,
  },
  { term: "용신", regex: /용신/ },
  { term: "십신", regex: /십신/ },
  { term: "편재", regex: /편재/ },
  { term: "정재", regex: /정재/ },
  { term: "편관", regex: /편관/ },
  { term: "정관", regex: /정관/ },
  { term: "식신", regex: /식신/ },
  {
    term: "상관",
    // 일상어 '상관없이/상관없다/상관하다/상관있다/상관치/상관마' 제외
    regex: /상관(?![\s]*(?:없|하|있|치|마|관계))/,
  },
  { term: "비견", regex: /비견/ },
  { term: "겁재", regex: /겁재/ },
  { term: "도화살", regex: /도화살/ },
  { term: "역마살", regex: /역마살/ },
];

const CERTAIN_EXPRESSIONS = ["반드시", "무조건", "100%", "틀림없이"] as const;

const COMMON_HONORIFIC_NOUNS = new Set([
  "지민",
  "서준",
  "두근",
  "두근이",
  "부모",
  "선배",
  "후배",
  "상사",
  "동료",
  "고객",
  "사장",
  "대표",
  "선생",
  "상대",
  "상대방",
  "연인",
  "배우자",
  "파트너",
  "친구",
  "본인",
  "질문자",
  "내담자",
  "독자",
  "사용자",
  "회원",
  "팀장",
  "부장",
  "과장",
  "원장",
  "교수",
  "작가",
  "의사",
  "약사",
  "변호사",
  "상담사",
  "전문가",
  "조상",
  "하늘",
  "신령",
]);

function collectStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") {
    out.push(v);
  } else if (Array.isArray(v)) {
    for (const item of v) collectStrings(item, out);
  } else if (v && typeof v === "object") {
    for (const val of Object.values(v)) collectStrings(val, out);
  }
  return out;
}

export interface SampleValidationResult {
  ok: boolean;
  hasHanja: boolean;
  jargonHits: string[];
  certainHits: string[];
  otherNameHits: string[];
}

export function validateStandardSampleReport(
  report: unknown,
  target: "individual" | "couple",
): SampleValidationResult {
  const hasHanja = containsHanjaDeep(report);
  const fullText = collectStrings(report).join("\n");

  const jargonHits: string[] = [];
  for (const { term, regex } of SAJU_JARGON_PATTERNS) {
    if (regex.test(fullText)) {
      jargonHits.push(term);
    }
  }

  const certainHits: string[] = [];
  for (const expr of CERTAIN_EXPRESSIONS) {
    if (fullText.includes(expr)) {
      certainHits.push(expr);
    }
  }

  const allowedNames = target === "couple" ? new Set(["지민", "서준"]) : new Set(["지민"]);
  const otherNameHits: string[] = [];
  const honorificRe = /([가-힣]{2,4})\s*님/g;
  let m: RegExpExecArray | null;
  while ((m = honorificRe.exec(fullText)) !== null) {
    const candidate = m[1];
    if (allowedNames.has(candidate) || COMMON_HONORIFIC_NOUNS.has(candidate)) continue;
    // 조사/어미 오탐 제외 (예: '아님', '수님', '스님', '손님', '주님', '하나님', '하느님')
    if (["아", "스", "손", "주", "하나", "하느", "산신", "달", "별", "해"].includes(candidate)) continue;
    if (!otherNameHits.includes(candidate)) {
      otherNameHits.push(candidate);
    }
  }

  const ok =
    !hasHanja &&
    jargonHits.length === 0 &&
    certainHits.length === 0 &&
    otherNameHits.length === 0;

  return {
    ok,
    hasHanja,
    jargonHits,
    certainHits,
    otherNameHits,
  };
}
