import { generateJson } from "@/lib/gen/generateJson";
import { STYLE_GUIDE, STRICT_NO_HANJA_RULE } from "@/lib/destinyGen";
import { PREMIUM_MODELS } from "@/lib/premium/models";
import { buildNamingEngine, type NamingEngineResult } from "@/lib/premium/naming/engine";
import type { ChildNamingInput } from "@/lib/validation/inputs";
import { ELEMENT_WORD, type Element } from "@/lib/premium/ganzhi";

// 프롬프트에 한자·영문 오행 키를 넣으면 AI가 그대로 옮겨 적어 한자 검증에 걸린다 → 쉬운 말로만 전달한다.
const elementWords = (els: Element[]) => els.map((e) => `${ELEMENT_WORD[e]} 기운`).join(", ");
// 후보 글자의 기운: 오행 미상(null) 글자는 빼고, 모두 미상이면 "글자의 기운" 항목 자체를 생략한다.
const elementPart = (els: (Element | null)[]) => {
  const known = els.filter((e): e is Element => e !== null);
  return known.length ? `, 글자의 기운: ${known.map((e) => `${ELEMENT_WORD[e]} 기운`).join(", ")}` : "";
};

export interface NameStoryItem {
  hangul: string;
  oneLine: string;
  meaning: string;
  harmony: string;
  sound: string;
}

export interface SectionANames {
  names: NameStoryItem[];
}

export interface SectionBLetter {
  intro: string;
  letter: string;
  notice: string;
}

export interface PremiumNamingReportContent {
  version: 1;
  engine: NamingEngineResult;
  sections: {
    names: SectionANames;
    letter: SectionBLetter;
  };
}

const COMMON_PREMIUM_RULES = `
${STYLE_GUIDE}

${STRICT_NO_HANJA_RULE}

⚠️ 절대 원칙:
1. 작명 리포트의 본문 설명에는 어떠한 한자(漢字)도 직접 쓰지 마세요. 글자의 뜻은 오직 순우리말 훈(예: '상서로울', '빛날')으로만 다정하게 풀어 쓰세요. 한자 표기는 시스템이 엔진 데이터에서 직접 렌더합니다.
2. 엔진이 추천한 이름 5개의 한글 이름과 순서를 정확히 지켜야 합니다.
3. 단정적 예언은 금지하며, 부모님의 마음에 따뜻한 축복이 닿도록 다정하고 격조 있는 어조(해요체)로 쓰세요.
4. JSON 형식만 출력해야 합니다.
`;

const REQUIRED_NOTICE_SUBSTRING = "출생신고 전 대법원 전자가족관계등록시스템에서 인명용 한자 여부를 한 번 더 확인해 주세요.";

export async function generateNamingReport(input: ChildNamingInput): Promise<PremiumNamingReportContent> {
  // 1. Deterministic engine
  const engine = buildNamingEngine(input);

  // 2. Parallel AI section generation
  const candidateSummary = engine.names
    .map(
      (n, i) =>
        `${i + 1}. ${input.surnameHangul}${n.hangul} (글자 뜻: ${n.hun.map((h, j) => `${h} ${n.eum[j]}`).join(" / ")}${elementPart(n.elements)}, 이름 점수: ${n.score}점)`,
    )
    .join("\n");

  const promptContext = `
[아이 정보]
- 성씨: ${input.surnameHangul}
- 성별: ${input.gender === "M" ? "남아" : "여아"}
- 생년월일시: ${input.dob} ${input.time ?? "시간 모름"}
- 타고난 기운: 가장 채워 주면 좋은 기운(${elementWords(engine.child.weakest)}), 그다음으로 채워 주면 좋은 기운(${elementWords(engine.child.second)})
- 부모가 희망하는 느낌/가치관: ${input.tags.join(", ")}

[엔진이 엄선한 최종 추천 이름 5선 (순서 엄수)]
${candidateSummary}
`;

  // A. Names
  const promptA = `${COMMON_PREMIUM_RULES}
${promptContext}

[요청: 5개 이름에 대한 깊이 있는 스토리와 해설 작성]
엔진이 추천한 위 5개 이름의 순서와 한글 이름을 정확히 일치시켜 JSON 배열로 작성하세요.
각 이름마다:
- oneLine: 이름을 한마디로 요약하는 감동적인 문장 (25자 이내)
- meaning: 한자의 깊은 뜻(훈)을 따뜻하게 풀어낸 이야기 (2문단, 300~450자, 한자 금지)
- harmony: 아이의 타고난 기운과 이름이 조화를 이루는 방식 (1문단, 150~250자)
- sound: 이름을 소리 내어 불렀을 때 느껴지는 음감과 첫인상 (1문단, 150~250자)

다음 JSON 스키마를 만족하는 JSON만 반환하세요:
{
  "names": [
    {
      "hangul": "${engine.names[0]?.hangul ?? ""}",
      "oneLine": "한 줄 요약",
      "meaning": "풀이 이야기...",
      "harmony": "기운 조화...",
      "sound": "부름의 울림..."
    }
    ... (총 ${engine.names.length}개)
  ]
}
`;

  // B. Letter
  const promptB = `${COMMON_PREMIUM_RULES}
${promptContext}

[요청: 작명 철학 원칙 해설 및 부모님께 드리는 축복의 편지]
다음 세 가지 항목을 작성하세요:
1. intro: 좋은 이름을 짓기 위해 고려된 4가지 기둥(원획 수리길흉, 음양 조화, 발음오행의 상생, 타고난 기운의 보완)을 부모님이 이해하기 쉽고 편안하게 설명하는 글 (2~3문단, 400~600자)
2. letter: 콩닥 두근이가 새로운 생명을 맞이한 부모님께 띄우는 감동적인 축복 편지 (2문단, 350~500자)
3. notice: 출생신고 관련 법적 유의사항 안내. 반드시 다음 문장을 정확히 포함해야 합니다: "${REQUIRED_NOTICE_SUBSTRING}"

다음 JSON 스키마를 만족하는 JSON만 반환하세요:
{
  "intro": "작명 원칙 설명...",
  "letter": "부모님께 드리는 편지...",
  "notice": "안내 문구 (${REQUIRED_NOTICE_SUBSTRING} 필수 포함)"
}
`;

  function validateNames(v: unknown): v is SectionANames {
    if (!v || typeof v !== "object") return false;
    const o = v as Partial<SectionANames>;
    if (!Array.isArray(o.names) || o.names.length !== engine.names.length) return false;
    for (let i = 0; i < engine.names.length; i++) {
      const item = o.names[i];
      if (!item || item.hangul !== engine.names[i].hangul) return false;
      if (typeof item.oneLine !== "string" || !item.oneLine.trim()) return false;
      if (typeof item.meaning !== "string" || !item.meaning.trim()) return false;
      if (typeof item.harmony !== "string" || !item.harmony.trim()) return false;
      if (typeof item.sound !== "string" || !item.sound.trim()) return false;
    }
    return true;
  }

  function validateLetter(v: unknown): v is SectionBLetter {
    if (!v || typeof v !== "object") return false;
    const o = v as Partial<SectionBLetter>;
    if (typeof o.intro !== "string" || !o.intro.trim()) return false;
    if (typeof o.letter !== "string" || !o.letter.trim()) return false;
    if (typeof o.notice !== "string" || !o.notice.includes(REQUIRED_NOTICE_SUBSTRING)) return false;
    return true;
  }

  const [resA, resB] = await Promise.all([
    generateJson<SectionANames>({
      label: "premium:naming:names",
      prompt: promptA,
      models: PREMIUM_MODELS,
      maxOutputTokens: 8192,
      thinkingBudget: 1024,
      validate: validateNames,
    }),
    generateJson<SectionBLetter>({
      label: "premium:naming:letter",
      prompt: promptB,
      models: PREMIUM_MODELS,
      maxOutputTokens: 8192,
      thinkingBudget: 1024,
      validate: validateLetter,
    }),
  ]);

  return {
    version: 1,
    engine,
    sections: {
      names: resA.data,
      letter: resB.data,
    },
  };
}
