import { STYLE_GUIDE, STRICT_NO_HANJA_RULE } from "@/lib/destinyGen";

export interface ProductPromptSpec {
  promptKey: string;
  title: string;
  angle: string;
  sections: Array<{ key: string; title: string; guide: string }>; // 정확히 4개
  guardrails: string[];
}

export const PRODUCT_SPECS: Record<string, ProductPromptSpec> = {
  personality_basic: {
    promptKey: "personality_basic",
    title: "성향 분석",
    angle: "타고난 기질을 장점 중심으로, 자기이해용",
    sections: [
      { key: "first_impression", title: "첫인상과 진짜 나", guide: "남이 보는 나 vs 실제 나" },
      { key: "motivation", title: "나를 움직이는 힘", guide: "동기·에너지원" },
      { key: "relationship", title: "관계에서의 나", guide: "친구·연인·동료 앞에서" },
      { key: "recovery", title: "나를 지치게 하는 것과 회복법", guide: "구체 루틴" },
    ],
    guardrails: ["무료 상품. 결제 유도 문구는 closing 한 줄로만"],
  },
  wealth_analysis: {
    promptKey: "wealth_analysis",
    title: "재물운 분석",
    angle: "돈을 '버는 방식·지키는 방식'의 결",
    sections: [
      { key: "wealth_capacity", title: "타고난 재물 그릇", guide: "" },
      { key: "income_path", title: "돈이 들어오는 길", guide: "월급·부업·투자 성향" },
      { key: "spending_habit", title: "새는 돈 막기", guide: "반복 지출 패턴" },
      { key: "yearly_flow", title: "앞으로 1년 돈 흐름", guide: "분기별" },
    ],
    guardrails: ["특정 종목·투자상품 추천 금지. 수익 보장 표현 금지"],
  },
  career_analysis: {
    promptKey: "career_analysis",
    title: "직업/적성 분석",
    angle: "맞는 일의 '방식과 환경'",
    sections: [
      { key: "work_style", title: "나에게 맞는 일의 방식", guide: "" },
      { key: "best_environment", title: "잘 맞는 직무·환경 3가지", guide: "" },
      { key: "timing", title: "이동·이직 타이밍", guide: "앞으로 1년" },
      { key: "weapon", title: "면접·협상에서 내 무기", guide: "" },
    ],
    guardrails: ["특정 회사 언급 금지"],
  },
  love_single_analysis: {
    promptKey: "love_single_analysis",
    title: "연애운 (솔로) 분석",
    angle: "솔로의 연애 패턴과 인연의 결",
    sections: [
      { key: "love_style", title: "나의 연애 스타일", guide: "" },
      { key: "attraction", title: "끌리는 사람 vs 잘 맞는 사람", guide: "" },
      { key: "timing", title: "인연이 들어오는 시기와 장소", guide: "" },
      { key: "break_pattern", title: "반복되는 패턴 끊기", guide: "" },
    ],
    guardrails: ["'곧 만난다' 단정 금지"],
  },
  charm_analysis: {
    promptKey: "charm_analysis",
    title: "매력 분석",
    angle: "남들이 느끼는 매력의 정체",
    sections: [
      { key: "others_view", title: "사람들이 느끼는 나의 매력", guide: "" },
      { key: "hidden_charm", title: "숨은 매력 포인트", guide: "" },
      { key: "best_moment", title: "매력이 가장 빛나는 상황", guide: "" },
      { key: "bad_habit", title: "매력을 깎는 습관", guide: "" },
    ],
    guardrails: ["외모 평가 금지"],
  },
  health_analysis: {
    promptKey: "health_analysis",
    title: "건강 분석",
    angle: "체력의 결과 생활 리듬",
    sections: [
      { key: "stamina", title: "타고난 체력의 결", guide: "" },
      { key: "warning_sign", title: "신경 써야 할 몸의 신호", guide: "" },
      { key: "recovery_routine", title: "나에게 맞는 회복 루틴", guide: "" },
      { key: "seasonal_care", title: "계절별 컨디션 관리", guide: "" },
    ],
    guardrails: ["질병 진단·치료·약 권유 금지. 마지막에 '불편한 증상이 있으면 전문의 상담' 문장 필수"],
  },
  spicy_annual: {
    promptKey: "spicy_annual",
    title: "매운맛 총운",
    angle: "앞으로 12개월, 돌려 말하지 않는 현실 조언",
    sections: [
      { key: "summary", title: "돌려 말하지 않는 총평", guide: "" },
      { key: "weakness", title: "스스로 발목 잡는 지점", guide: "" },
      { key: "drop_it", title: "지금 당장 버려야 할 것", guide: "" },
      { key: "weapon", title: "그래도 믿어도 되는 무기", guide: "" },
    ],
    guardrails: ["직설은 허용, 모욕·비하·외모 지적 금지"],
  },
  inner_mind: {
    promptKey: "inner_mind",
    title: "속마음 분석",
    angle: "상대의 마음을 '가능성'으로 읽기",
    sections: [
      { key: "view_on_me", title: "그 사람이 나를 보는 시선", guide: "" },
      { key: "hidden_mind", title: "말하지 않는 속마음", guide: "" },
      { key: "anxiety", title: "그 사람이 불안해하는 것", guide: "" },
      { key: "open_mind", title: "마음을 여는 대화법", guide: "" },
    ],
    guardrails: ["상대 마음 단정 금지('~일 가능성이 커요')"],
  },
  reunion: {
    promptKey: "reunion",
    title: "재회 분석",
    angle: "멀어진 이유와 현실적 가능성",
    sections: [
      { key: "real_reason", title: "우리가 멀어진 진짜 이유", guide: "" },
      { key: "possibility", title: "다시 이어질 여지", guide: "" },
      { key: "timing", title: "연락 타이밍과 방법", guide: "" },
      { key: "important", title: "재회보다 중요한 것", guide: "" },
    ],
    guardrails: ["집착·반복연락·스토킹 조장 금지. 상대 의사 존중 문장 필수"],
  },
  cheating_tendency: {
    promptKey: "cheating_tendency",
    title: "바람기 분석",
    angle: "흔들리기 쉬운 '상황'과 관계를 단단히 하는 법",
    sections: [
      { key: "tendency", title: "그 사람의 연애 성향", guide: "" },
      { key: "weak_moment", title: "마음이 흔들리기 쉬운 상황", guide: "" },
      { key: "strengthen", title: "관계를 단단하게 하는 방법", guide: "" },
      { key: "my_rule", title: "내가 지켜야 할 기준", guide: "" },
    ],
    guardrails: ["외도 단정·의심 조장·감시 권유 금지"],
  },
  marriage_compat: {
    promptKey: "marriage_compat",
    title: "결혼 궁합",
    angle: "연애 궁합이 아닌 '생활' 궁합",
    sections: [
      { key: "basic", title: "결혼 생활의 기본 궁합", guide: "" },
      { key: "practical", title: "돈·집안일·가족 관계", guide: "" },
      { key: "crisis", title: "위기가 오기 쉬운 지점", guide: "" },
      { key: "promise", title: "함께 오래 가는 약속", guide: "" },
    ],
    guardrails: ["결혼 여부 단정 금지"],
  },
  conflict_resolution: {
    promptKey: "conflict_resolution",
    title: "갈등 해결 궁합",
    angle: "싸움의 구조와 멈추는 법",
    sections: [
      { key: "reason", title: "우리가 자주 부딪히는 진짜 이유", guide: "" },
      { key: "style", title: "각자의 싸움 방식", guide: "" },
      { key: "stop_word", title: "싸움을 멈추는 한마디", guide: "" },
      { key: "reconnect", title: "화해 후 다시 가까워지는 법", guide: "" },
    ],
    guardrails: ["폭력·위협 상황이면 전문기관 도움 안내 문장"],
  },
  secret_love: {
    promptKey: "secret_love",
    title: "은밀한 궁합",
    angle: "정서적·신체적 친밀감의 온도",
    sections: [
      { key: "temperature", title: "두 사람의 친밀감 온도", guide: "" },
      { key: "expression", title: "스킨십과 표현 방식", guide: "" },
      { key: "fulfill", title: "서로 채워주는 부분", guide: "" },
      { key: "keep_flutter", title: "설렘을 오래 지키는 법", guide: "" },
    ],
    guardrails: ["노골적 성 묘사 금지. 은유·정서 중심"],
  },
};

export function scoreBand(score: number): string {
  if (score >= 85) return "아주 좋은 흐름";
  if (score >= 75) return "좋은 흐름, 한두 가지만 조심";
  if (score >= 65) return "무난하지만 신경 쓸 부분이 분명";
  return "조심할 부분이 큰 시기, 그래도 방법은 있음";
}

export function buildStandardPrompt(
  spec: ProductPromptSpec,
  contextBlock: string,
  score: number,
  mode: "TEASER" | "FULL",
  toneGuide: string
): string {
  const sectionsText = spec.sections
    .map((s, i) => `${i + 1}. [${s.key}] ${s.title}${s.guide ? ` — ${s.guide}` : ""}`)
    .join("\n");

  const outputFormat =
    mode === "TEASER"
      ? `OUTPUT(JSON): { "headline": string, "summary": string (2문장, 결론 금지), "freeSection": { "key": "${spec.sections[0].key}", "title": string, "body": string }, "hooks": [string, string, string] }`
      : `OUTPUT(JSON): { "headline": string, "summary": string, "sections": [ { "key": "<아래 key 순서 그대로>", "title": string, "body": string } ×4 ], "advice": { "do": [string×3], "dont": [string×3] }, "closing": string }`;

  return `${STYLE_GUIDE}

${STRICT_NO_HANJA_RULE}

TONE: ${toneGuide}

${contextBlock}

PRODUCT: ${spec.title}
ANGLE: ${spec.angle}
DETERMINISTIC SCORE (사실로 사용하고, 숫자를 본문에 쓰지 마세요): ${score}/100 → ${scoreBand(score)}
SECTIONS (이 순서와 이 제목 그대로):
${sectionsText}
GUARDRAILS:
${spec.guardrails.map((g) => `- ${g}`).join("\n")}
LENGTH: 섹션 body 는 각 350~550자, 2문단. 섹션마다 구체적인 장면이나 행동을 최소 1개 포함. "~할 수 있어요"류의 흐릿한 문장 반복 금지. 상투적 멘토 말투 금지.
${outputFormat}
Output ONLY the JSON object.`.trim();
}
