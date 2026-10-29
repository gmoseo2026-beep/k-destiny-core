import { STYLE_GUIDE, STRICT_NO_HANJA_RULE } from "@/lib/destinyGen";
import { PRODUCT_SPECS, scoreBand } from "@/lib/prompts/productSpecs";

export interface ExistingCoupleReportSummary {
  productName: string;
  headline: string;
  summary: string;
}

export interface BuildAskThreePromptInput {
  contextBlock: string;
  score: number;
  toneGuide: string;
  questions: [string, string, string];
  compatSummaryKo?: string | null;
  priorReports?: ExistingCoupleReportSummary[];
}

export function buildAskThreePrompt(input: BuildAskThreePromptInput): string {
  const spec = PRODUCT_SPECS.ask_three;
  const [q1, q2, q3] = input.questions;

  const priorSummaryLines: string[] = [];
  if (input.compatSummaryKo && input.compatSummaryKo.trim()) {
    priorSummaryLines.push(
      `- [기본 궁합 요약] ${input.compatSummaryKo.replace(/\s+/g, " ").trim().slice(0, 320)}`,
    );
  }
  for (const r of input.priorReports ?? []) {
    if (!r.headline && !r.summary) continue;
    priorSummaryLines.push(
      `- [${r.productName}] ${r.headline.trim()} — ${r.summary.replace(/\s+/g, " ").trim().slice(0, 240)}`,
    );
  }

  const groundingBlock =
    priorSummaryLines.length > 0
      ? `EXISTING COUPLE READING SUMMARIES FOR THIS PAIR (앞선 풀이와 모순되지 않게 근거로 삼되, 문장을 그대로 베끼지 마세요):\n${priorSummaryLines.join("\n")}\n`
      : "EXISTING COUPLE READING SUMMARIES FOR THIS PAIR: (이전 리포트 없음 — 위 결정론 궁합 결과만을 사실 근거로 삼으세요.)\n";

  return `${STYLE_GUIDE}

${STRICT_NO_HANJA_RULE}

TONE: ${input.toneGuide}

${input.contextBlock}

${groundingBlock}
PRODUCT: ${spec.title}
ANGLE: ${spec.angle}
VOICE: ${spec.voice ?? ""}
DETERMINISTIC SCORE (사실 근거로만 참고하고 숫자는 본문에 절대 쓰지 마세요): ${input.score}/100 → ${scoreBand(input.score)}

USER'S 3 QUESTIONS (사용자가 직접 적은 질문 3가지 — 각 질문에 정면으로 답하세요):
1. Q1: "${q1.replace(/"/g, "'")}"
2. Q2: "${q2.replace(/"/g, "'")}"
3. Q3: "${q3.replace(/"/g, "'")}"

SECTIONS (반드시 아래 4개 key 순서 그대로 작성하세요):
1. [answer_1] title 은 "Q1. ${q1.replace(/"/g, "'")}" 로 쓰고, body 에 첫 번째 질문에 대한 구체적인 답장을 350~520자(2문단)로 작성합니다.
2. [answer_2] title 은 "Q2. ${q2.replace(/"/g, "'")}" 로 쓰고, body 에 두 번째 질문에 대한 구체적인 답장을 350~520자(2문단)로 작성합니다.
3. [answer_3] title 은 "Q3. ${q3.replace(/"/g, "'")}" 로 쓰고, body 에 세 번째 질문에 대한 구체적인 답장을 350~520자(2문단)로 작성합니다.
4. [closing_advice] title 은 "세 가지 답을 잇는 지금의 방향" 으로 쓰고, body 에 세 질문을 관통하는 두 사람의 관계 흐름과 지금 지킬 마음의 중심을 300~480자(2문단)로 정리합니다.

GUARDRAILS (필수 준수):
${spec.guardrails.map((g) => `- ${g}`).join("\n")}
- 한자(漢字)와 사주 전문용어(오행, 일간, 천간, 지지, 상생, 상극, 원국 등) 절대 금지.
- 퍼센트(%)나 점수 숫자를 지어내지 마세요.
- closing 마지막 문장에는 이 답장이 오락과 자기이해를 돕기 위한 다정한 참고 풀이이며 선택은 언제나 당신의 마음에 달려 있다는 뜻을 자연스럽게 담아 주세요.

OUTPUT(JSON): { "headline": string (15~28자, 세 질문을 아우르는 다정한 한 줄), "summary": string (2문장), "sections": [ { "key": "answer_1", "title": string, "body": string }, { "key": "answer_2", "title": string, "body": string }, { "key": "answer_3", "title": string, "body": string }, { "key": "closing_advice", "title": string, "body": string } ], "advice": { "do": [string, string, string], "dont": [string, string, string] }, "closing": string }
Output ONLY the JSON object.`.trim();
}
