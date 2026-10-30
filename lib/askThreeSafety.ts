/**
 * 두근이에게 묻기 (ask_three) — 결제 전 안전장치 및 질문 입력 검증.
 * 클라이언트 컴포넌트와 서버 API 양쪽에서 사용할 수 있는 순수 모듈이다(프롬프트 모듈 import 금지).
 */

export const ASK_THREE_COUNT = 3;
export const ASK_THREE_MIN_LEN = 2;
export const ASK_THREE_MAX_LEN = 120;

export const ASK_THREE_CHIPS = [
  "내가 먼저 연락하면 어떨까?",
  "이번 달 안에 만나자고 해도 될까?",
  "그 사람이 원하는 연락 속도는?",
  "읽씹 3일째인데 먼저 연락해도 될까?",
  "이번 주말 약속 잡으려면 어떻게 말하면 좋을까?",
  "다툰 뒤에 먼저 사과하는 게 나을까?",
  "고백하기 좋은 분위기는 어떤 때일까?",
] as const;

export const ASK_THREE_ENTERTAINMENT_NOTICE =
  "이 답장 리포트는 두 사람의 사주 궁합을 바탕으로 한 오락·자기이해 목적의 풀이예요. 미래를 단정하지 않으며 건강·법률·금전 등 전문 상담을 대신하지 않아요.";

export type AskThreeBlockCategory =
  | "format"
  | "self_harm"
  | "violence"
  | "health"
  | "legal"
  | "money"
  | "pregnancy"
  | "contact_pii"
  | "third_party_real_name";

export type AskThreeValidationResult =
  | {
      ok: true;
      questions: [string, string, string];
    }
  | {
      ok: false;
      index: 0 | 1 | 2 | null;
      category: AskThreeBlockCategory;
      message: string;
    };

interface SafetyRule {
  category: Exclude<AskThreeBlockCategory, "format">;
  test: (q: string) => boolean;
  message: string;
}

const COMMON_REL_NOUNS = new Set([
  "그사람",
  "상대방",
  "전남친",
  "전여친",
  "현남친",
  "현여친",
  "남사친",
  "여사친",
  "썸남이",
  "썸녀가",
  "남친이",
  "여친이",
  "짝사랑",
  "선배님",
  "후배님",
  "부모님",
  "선생님",
  "교수님",
  "사장님",
  "팀장님",
  "과장님",
  "대리님",
  "부장님",
]);

const KOREAN_SURNAME_CLASS =
  "[김이박최정강조윤장임한오서신권황안송전홍유고문양손배백허노남심하주구성차우민진나변원천방공현함염여추도소석선설마길]";

const HONORIFIC_NAME_RE = new RegExp(
  `(?:^|\\s)(${KOREAN_SURNAME_CLASS}[가-힣]{2})\\s*(?:씨|님|대리|과장|팀장|부장|차장|실장|선배|후배|교수)(?=\\s|[?.!,]|$|랑|이랑|하고|한테|에게|이|가|은|는|도)`,
);

const ROLE_PREFIX_NAME_RE = new RegExp(
  `(?:제3자|제삼자|친구|동료|직장\\s*동료|여사친|남사친|아는\\s*언니|아는\\s*오빠|아는\\s*형|아는\\s*누나|아는\\s*동생)\\s*(${KOREAN_SURNAME_CLASS}[가-힣]{2})(?=\\s|[?.!,]|$|랑|이랑|하고|한테|에게|이|가|은|는|도)`,
);

const PARTICLE_NAME_RE = new RegExp(
  `(?:^|\\s)(${KOREAN_SURNAME_CLASS}[가-힣]{2})(?:이랑|랑|하고|한테|에게)(?=\\s|[?.!,]|$)`,
);

const CELEBRITY_RE =
  /(연예인|아이돌|배우\s*[가-힣]{2,3}|가수\s*[가-힣]{2,3}|유튜버|인플루언서|방탄소년단|블랙핑크|뉴진스|에스파|아이브|세븐틴|르세라핌|스트레이키즈|투모로우바이투게더|차은우|변우석|카리나|장원영|실명|본명)/i;

function hasThirdPartyRealName(q: string): boolean {
  if (CELEBRITY_RE.test(q)) return true;

  for (const re of [HONORIFIC_NAME_RE, ROLE_PREFIX_NAME_RE, PARTICLE_NAME_RE]) {
    const match = re.exec(q);
    if (match && match[1] && !COMMON_REL_NOUNS.has(match[1])) {
      return true;
    }
  }
  return false;
}

const CONTACT_PII_RE_LIST: readonly RegExp[] = [
  // 휴대폰·일반 전화번호
  /\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b/,
  /\b0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}\b/,
  // 주민등록번호 형태 또는 8자리 이상 연속 숫자(계좌·전화번호)
  /\b\d{6}[-\s]?[1-4]\d{6}\b/,
  /\d{8,}/,
  // 이메일 주소
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  // 웹 주소
  /https?:\/\/\S+/i,
  /\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
  // SNS 아이디 핸들 또는 메신저 아이디 언급
  /(?:^|\s)@[a-zA-Z0-9_.]{3,}/,
  /(카톡\s*아이디|카카오톡\s*ID|인스타\s*아이디|인스타\s*계정|전화번호|휴대폰\s*번호|집\s*주소|도로명\s*주소)/i,
];

const SAFETY_RULES: readonly SafetyRule[] = [
  {
    category: "self_harm",
    test: (q) =>
      /(자해|자살|죽고\s*싶|죽을래|죽어버리|목숨을?\s*끊|극단적\s*선택|뛰어내리|살기\s*싫)/i.test(q),
    message:
      "마음이 많이 힘드신가요? 안전과 관련된 질문은 두근이가 답할 수 없어요. 혼자 감당하지 마시고 자살예방 상담전화(109)나 정신건강 상담전화(1577-0199)에 꼭 도움을 요청해 주세요.",
  },
  {
    category: "violence",
    test: (q) =>
      /(폭력|폭행|구타|때리|죽이|살해|협박|스토킹|미행|몰래\s*카메라|몰카|불법\s*촬영|위치\s*추적|도청|해킹|감금|성폭력|성추행|복수할|해코지)/i.test(
        q,
      ),
    message:
      "폭력·협박·스토킹 등 안전이나 범죄와 관련된 질문은 결제 전에 정중히 제한하고 있어요. 긴급한 상황이라면 112 또는 여성긴급전화(1366)로 도움을 받아 주세요.",
  },
  {
    category: "health",
    test: (q) =>
      /(건강\s*상태|질병|병명|암\s*진단|암에?\s*걸|수술|치료제|약\s*복용|처방전?|병원\s*진단|의사\s*진단|우울증|공황\s*장애|조현병|불치병|수명이?\s*얼마|언제\s*죽)/i.test(
        q,
      ),
    message:
      "건강·질병·의료와 관련된 질문은 사주 풀이로 답해 드릴 수 없어요. 두 사람의 마음이나 대화 방식에 관한 질문으로 바꿔 주세요.",
  },
  {
    category: "pregnancy",
    test: (q) =>
      /(임신|출산|유산|낙태|임테기|배란|피임|태아|난임|시험관\s*시술|아기가?\s*생길까)/i.test(q),
    message:
      "임신·출산과 관련된 질문은 전문 의료 상담이 필요한 영역이라 다루지 않아요. 두 사람의 관계와 감정 흐름에 관한 질문으로 바꿔 주세요.",
  },
  {
    category: "legal",
    test: (q) =>
      /(소송|고소|고발|변호사|재판|판결|위자료|양육권|재산\s*분할|합의금|전과|구속|경찰\s*신고|법적\s*책임|불법\s*행위)/i.test(
        q,
      ),
    message:
      "소송·위자료 등 법률 판단이 필요한 질문은 답해 드릴 수 없어요. 두 사람의 관계나 소통에 관한 질문으로 적어 주세요.",
  },
  {
    category: "money",
    test: (q) =>
      /(주식|코인|비트코인|가상화폐|도박|토토|복권|로또|대출|빚|채무|보증\s*서|사채|투자금|돈\s*빌려|돈을?\s*갚|계좌\s*번호|송금)/i.test(
        q,
      ),
    message:
      "금전 거래·투자·대출 관련 질문은 결제 전에 제한하고 있어요. 그 사람과의 마음·연락·만남에 관한 질문으로 바꿔 주세요.",
  },
  {
    category: "contact_pii",
    test: (q) => CONTACT_PII_RE_LIST.some((re) => re.test(q)),
    message:
      "전화번호·이메일·SNS 아이디 등 연락처나 개인정보는 질문에 적지 말아 주세요. 개인정보를 지운 뒤 다시 눌러 주세요.",
  },
  {
    category: "third_party_real_name",
    test: hasThirdPartyRealName,
    message:
      "제3자의 실명이나 연예인 이름이 들어간 질문은 다룰 수 없어요. 이름은 빼고 '그 사람'이나 관계 표현으로 바꿔 주세요.",
  },
];

export function sanitizeAskQuestionText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function validateSingleAskQuestion(
  raw: string,
  index: 0 | 1 | 2,
): Exclude<AskThreeValidationResult, { ok: true }> | null {
  const cleaned = sanitizeAskQuestionText(raw);
  const label = `${index + 1}번째 질문`;

  if (cleaned.length < ASK_THREE_MIN_LEN) {
    return {
      ok: false,
      index,
      category: "format",
      message: `${label}을 두 글자 이상 적어 주세요.`,
    };
  }

  if (cleaned.length > ASK_THREE_MAX_LEN) {
    return {
      ok: false,
      index,
      category: "format",
      message: `${label}은 ${ASK_THREE_MAX_LEN}자 이내로 짧고 또렷하게 적어 주세요.`,
    };
  }

  for (const rule of SAFETY_RULES) {
    if (rule.test(cleaned)) {
      return {
        ok: false,
        index,
        category: rule.category,
        message: `${label}: ${rule.message}`,
      };
    }
  }

  return null;
}

export function validateAskThreeQuestions(raw: unknown): AskThreeValidationResult {
  if (!Array.isArray(raw) || raw.length !== ASK_THREE_COUNT) {
    return {
      ok: false,
      index: null,
      category: "format",
      message: "궁금한 질문 3가지를 모두 적어 주세요.",
    };
  }

  const cleanedList: string[] = [];

  for (let i = 0; i < ASK_THREE_COUNT; i++) {
    const item = raw[i];
    if (typeof item !== "string") {
      return {
        ok: false,
        index: i as 0 | 1 | 2,
        category: "format",
        message: `${i + 1}번째 질문을 확인해 주세요.`,
      };
    }
    const singleErr = validateSingleAskQuestion(item, i as 0 | 1 | 2);
    if (singleErr) return singleErr;
    cleanedList.push(sanitizeAskQuestionText(item));
  }

  const normalizedSet = new Set(
    cleanedList.map((q) => q.replace(/[?.!,~\s]/g, "").toLowerCase()),
  );
  if (normalizedSet.size < ASK_THREE_COUNT) {
    return {
      ok: false,
      index: null,
      category: "format",
      message: "같은 질문이 중복되었어요. 서로 다른 질문 3가지를 적어 주세요.",
    };
  }

  return {
    ok: true,
    questions: [cleanedList[0], cleanedList[1], cleanedList[2]],
  };
}
