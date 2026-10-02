import { STYLE_GUIDE, STRICT_NO_HANJA_RULE } from "@/lib/destinyGen";

export interface ProductPromptSpec {
  promptKey: string;
  title: string;
  angle: string;
  /**
   * 이 상품만의 목소리(2026-10-02). 예전에는 상품마다 지시가 한 줄뿐이라 무엇을 사도
   * "든든한 산, 다정한 짝꿍" 같은 비슷한 덕담이 나왔다. 상품 주제에 맞는 말투와 금지 표현을 여기서 정한다.
   */
  voice?: string;
  /**
   * sections[].guide 는 상품 상세 화면에도 그대로 보인다(짧은 소개 문구).
   * sections[].brief 는 AI 에게만 주는 지시다(화면에 노출되지 않는다).
   */
  sections: Array<{ key: string; title: string; guide: string; brief?: string }>; // 정확히 4개
  guardrails: string[];
}

export const PRODUCT_SPECS: Record<string, ProductPromptSpec> = {
  personality_basic: {
    promptKey: "personality_basic",
    title: "성향 분석",
    angle: "타고난 기질을, 본인도 뜨끔할 만큼 정확하게",
    voice: "눈치 빠른 오랜 친구가 웃으면서 정곡을 찌르는 말투. 칭찬 반, 뜨끔한 말 반.",
    sections: [
      { key: "first_impression", title: "첫인상과 진짜 나", guide: "남이 보는 나 vs 실제 나", brief: "사람들이 처음 보고 오해하는 지점 하나와, 친해져야만 보이는 모습 하나를 대비시킨다" },
      { key: "motivation", title: "나를 움직이는 힘", guide: "동기·에너지원", brief: "이 사람이 유독 불타오르는 조건과, 반대로 순식간에 식어 버리는 조건" },
      { key: "relationship", title: "관계에서의 나", guide: "친구·연인·동료 앞에서", brief: "가까운 사람들이 말은 안 하지만 서운해하는 이 사람의 버릇 하나" },
      { key: "recovery", title: "나를 지치게 하는 것과 회복법", guide: "구체 루틴", brief: "스스로 지치게 만드는 습관을 이름 붙여 짚고, 바로 해 볼 수 있는 회복 행동" },
    ],
    guardrails: ["무료 상품. 결제 유도 문구는 closing 한 줄로만"],
  },
  wealth_analysis: {
    promptKey: "wealth_analysis",
    title: "재물운 분석",
    angle: "돈을 버는 방식과 새는 구멍. 듣기 좋은 말보다 통장에 도움 되는 말",
    voice: "돈 얘기는 돌려 말하지 않는 현실적인 선배. 숫자 감각이 있고 냉정하지만 편은 들어 준다.",
    sections: [
      { key: "wealth_capacity", title: "타고난 재물 그릇", guide: "", brief: "크게 버는 타입인지 꾸준히 모으는 타입인지 분명히 가른다. 그릇을 스스로 줄이는 습관 하나" },
      { key: "income_path", title: "돈이 들어오는 길", guide: "월급·부업·투자 성향", brief: "이 사람에게 맞는 길과, 손대면 손해 보기 쉬운 길을 하나씩" },
      { key: "spending_habit", title: "돈이 새는 구멍", guide: "반복 지출 패턴", brief: "유독 지갑이 열리는 순간(기분·사람·체면 중 무엇인지)을 콕 집는다" },
      { key: "yearly_flow", title: "앞으로 1년 돈 흐름", guide: "분기별", brief: "분기별로 벌 때와 지킬 때를 나눈다. 조심할 분기를 숨기지 않는다" },
    ],
    guardrails: ["특정 종목·투자상품 추천 금지. 수익 보장 표현 금지"],
  },
  career_analysis: {
    promptKey: "career_analysis",
    title: "직업/적성 분석",
    angle: "맞는 일의 방식과 환경. 지금 자리에서 버틸지 옮길지",
    voice: "사람을 많이 본 헤드헌터의 말투. 장점은 구체적으로, 안 맞는 자리는 안 맞는다고 말한다.",
    sections: [
      { key: "work_style", title: "나에게 맞는 일의 방식", guide: "", brief: "이 사람이 일을 잘하는 조건과, 능력이 죽는 조건을 대비시킨다" },
      { key: "best_environment", title: "잘 맞는 직무·환경 3가지", guide: "", brief: "맞는 환경 3가지와, 들어가면 고생하는 환경 하나" },
      { key: "timing", title: "이동·이직 타이밍", guide: "앞으로 1년", brief: "움직이기 좋은 때와 버티는 게 나은 때. 충동적으로 옮기기 쉬운 순간을 짚는다" },
      { key: "weapon", title: "면접·협상에서 내 무기", guide: "", brief: "실제로 써먹을 한마디·태도와, 이 사람이 면접에서 자주 하는 실수" },
    ],
    guardrails: ["특정 회사 언급 금지"],
  },
  love_single_analysis: {
    promptKey: "love_single_analysis",
    title: "연애운 (솔로) 분석",
    angle: "왜 늘 비슷하게 시작하고 비슷하게 끝나는지",
    voice: "연애 상담을 잘해 주는 친구. 편들어 주다가도 뜨끔한 말을 한다. 위로만 하지 않는다.",
    sections: [
      { key: "love_style", title: "나의 연애 스타일", guide: "", brief: "사랑에 빠지면 나오는, 본인도 모르는 버릇. 상대가 부담스러워하는 순간 하나" },
      { key: "attraction", title: "끌리는 사람 vs 잘 맞는 사람", guide: "", brief: "늘 끌리는 유형을 구체적으로 그리고, 그 유형과 왜 오래 못 가는지 말한다" },
      { key: "timing", title: "인연이 들어오는 시기와 장소", guide: "", brief: "인연이 생기기 쉬운 상황과, 이 사람이 그 기회를 스스로 놓치는 방식" },
      { key: "break_pattern", title: "반복되는 패턴 끊기", guide: "", brief: "연애가 끝날 때마다 반복된 장면을 짚고, 다음엔 다르게 할 행동 하나" },
    ],
    guardrails: ["'곧 만난다' 단정 금지"],
  },
  charm_analysis: {
    promptKey: "charm_analysis",
    title: "매력 분석",
    angle: "사람들이 이 사람에게 끌리는 진짜 이유",
    voice: "살짝 유혹적이고 장난기 있는 말투. 본인도 모르는 매력을 귀에 대고 알려 주듯.",
    sections: [
      { key: "others_view", title: "사람들이 느끼는 나의 매력", guide: "", brief: "사람들이 처음 끌리는 지점. 본인은 단점이라 여기는데 남들은 매력으로 보는 것" },
      { key: "hidden_charm", title: "나도 모르는 치명적인 한 끗", guide: "", brief: "가까워져야 드러나는 반전. 상대가 빠져드는 순간을 장면으로" },
      { key: "best_moment", title: "매력이 가장 빛나는 순간", guide: "", brief: "어떤 자리·어떤 행동을 할 때 시선이 모이는지 구체적으로" },
      { key: "bad_habit", title: "매력을 깎아 먹는 습관", guide: "", brief: "호감을 식게 만드는 버릇을 돌려 말하지 않고 짚는다" },
    ],
    guardrails: ["외모 평가 금지"],
  },
  health_analysis: {
    promptKey: "health_analysis",
    title: "건강 분석",
    angle: "체력의 결과 생활 리듬",
    voice: "꼼꼼한 트레이너의 말투. 겁주지 않되, 무리하는 버릇은 분명히 짚는다.",
    sections: [
      { key: "stamina", title: "타고난 체력의 결", guide: "", brief: "몰아서 쓰는 타입인지 꾸준한 타입인지. 체력을 깎는 생활 습관 하나" },
      { key: "warning_sign", title: "신경 써야 할 몸의 신호", guide: "", brief: "지쳤을 때 먼저 나타나는 신호와, 이 사람이 그걸 무시하는 방식" },
      { key: "recovery_routine", title: "나에게 맞는 회복 루틴", guide: "", brief: "오늘부터 할 수 있는 구체적인 루틴" },
      { key: "seasonal_care", title: "계절별 컨디션 관리", guide: "", brief: "유독 처지는 계절과 그때 챙길 것" },
    ],
    guardrails: ["질병 진단·치료·약 권유 금지. 마지막에 '불편한 증상이 있으면 전문의 상담' 문장 필수"],
  },
  spicy_annual: {
    promptKey: "spicy_annual",
    title: "매운맛 총운",
    angle: "앞으로 12개월, 돌려 말하지 않는 현실 조언",
    voice: "봐주지 않는 팩폭. 존댓말이지만 달래지 않는다. 위로와 응원은 마지막 섹션에만 쓴다. 변명을 미리 막아 버리는 말투.",
    sections: [
      { key: "summary", title: "돌려 말하지 않는 총평", guide: "", brief: "첫 문장부터 아픈 곳을 찌른다. 올해 이 사람이 스스로를 속이고 있는 것 하나" },
      { key: "weakness", title: "스스로 발목 잡는 지점", guide: "", brief: "늘 대는 핑계에 이름을 붙여 준다. 그 핑계가 통하지 않는 이유" },
      { key: "drop_it", title: "지금 당장 버려야 할 것", guide: "", brief: "버릴 습관·관계·생각을 하나로 좁혀서 말한다. 미룰수록 생기는 손해" },
      { key: "weapon", title: "그래도 믿어도 되는 무기", guide: "", brief: "여기서만 따뜻해진다. 실제로 가진 무기 하나와 그걸 쓰는 법" },
    ],
    guardrails: ["직설은 허용, 모욕·비하·외모 지적 금지"],
  },
  inner_mind: {
    promptKey: "inner_mind",
    title: "속마음 분석",
    angle: "말하지 않는 그 사람의 머릿속",
    voice: "그 사람 머릿속을 옆에서 중계해 주는 독심술사의 말투. 조용하고 확신에 차 있다. 듣기 좋은 해석만 고르지 않는다.",
    sections: [
      { key: "view_on_me", title: "그 사람 눈에 비친 나", guide: "", brief: "그 사람이 나를 볼 때 끌리는 점 하나와, 부담스러워하는 점 하나" },
      { key: "hidden_mind", title: "말하지 않는 속마음", guide: "", brief: "겉으로 하는 말과 속으로 하는 생각이 다른 지점을 대비시킨다" },
      { key: "anxiety", title: "그 사람이 숨기는 불안", guide: "", brief: "그 사람이 관계에서 물러서게 되는 순간. 나의 어떤 행동이 그걸 건드리는지" },
      { key: "open_mind", title: "마음을 여는 한마디", guide: "", brief: "실제로 건넬 수 있는 말과, 반대로 닫아 버리게 만드는 말" },
    ],
    guardrails: ["상대 마음을 사실처럼 단정하지 않는다. 타고난 기질에서 읽히는 경향으로 말한다('~쪽에 가까워요')"],
  },
  reunion: {
    promptKey: "reunion",
    title: "재회 분석",
    angle: "멀어진 이유와 현실적인 가능성. 희망 고문은 하지 않는다",
    voice: "희망 고문 없이 현실을 말해 주는 사람. 아픈 말도 차분하게 한다. 미련을 부추기지 않는다.",
    sections: [
      { key: "real_reason", title: "우리가 멀어진 진짜 이유", guide: "", brief: "겉으로 댄 이유 말고 속에서 쌓인 이유. 내 쪽의 몫도 숨기지 않는다" },
      { key: "possibility", title: "다시 이어질 여지, 냉정하게", guide: "", brief: "여지가 있는 부분과 없는 부분을 나눠서 말한다. 좋은 쪽으로만 기울지 않는다" },
      { key: "timing", title: "연락해도 되는 때와 안 되는 때", guide: "", brief: "연락이 역효과 나는 상황을 먼저 말하고, 해 볼 만한 때와 첫마디의 결" },
      { key: "important", title: "재회보다 먼저 정리할 것", guide: "", brief: "다시 만나도 똑같이 끝나게 만드는 한 가지. 혼자서도 괜찮아지는 길" },
    ],
    guardrails: ["집착·반복연락·스토킹 조장 금지. 상대 의사 존중 문장 필수"],
  },
  cheating_tendency: {
    promptKey: "cheating_tendency",
    title: "바람기 분석",
    angle: "그 사람이 흔들리기 쉬운 조건과, 관계를 지키는 선",
    voice: "감정 없이 관찰한 것을 말해 주는 탐정의 말투. 좋게 포장하지 않지만 의심을 키우지도 않는다.",
    sections: [
      { key: "tendency", title: "그 사람의 연애 본색", guide: "", brief: "사귈 때 나오는 원래 성향. 한 사람에게 머무는 힘이 강한지 약한지 분명히 말한다" },
      { key: "weak_moment", title: "마음이 흔들리는 순간", guide: "", brief: "어떤 상황·어떤 유형 앞에서 틈이 생기는지 구체적으로. 미리 보이는 신호" },
      { key: "strengthen", title: "유혹이 통하지 않게 하는 법", guide: "", brief: "이 사람에게 통하는 방식(자유인지 확신인지)과, 오히려 멀어지게 하는 대응" },
      { key: "my_rule", title: "내가 지켜야 할 선", guide: "", brief: "불안에 끌려다니지 않는 기준. 넘어가면 안 되는 선을 스스로 정하게 한다" },
    ],
    guardrails: ["외도 단정·의심 조장·감시 권유 금지. 타고난 성향과 상황의 이야기로만 쓴다"],
  },
  marriage_compat: {
    promptKey: "marriage_compat",
    title: "결혼 궁합",
    angle: "연애가 아니라 같이 사는 궁합",
    voice: "결혼 10년 차 선배의 현실 조언. 로맨스보다 생활 얘기. 좋은 말만 하지 않는다.",
    sections: [
      { key: "basic", title: "같이 살면 드러나는 궁합", guide: "", brief: "연애 때는 안 보이다가 한집에 살면 드러나는 차이 하나" },
      { key: "practical", title: "돈·집안일·가족, 부딪히는 곳", guide: "", brief: "셋 중 이 두 사람이 가장 크게 부딪힐 곳을 골라 구체적으로" },
      { key: "crisis", title: "위기가 오는 지점", guide: "", brief: "위기가 오는 시기나 상황, 그때 각자 하는 최악의 대응" },
      { key: "promise", title: "오래 가는 부부의 약속", guide: "", brief: "이 두 사람에게만 필요한 약속. 일반론 금지" },
    ],
    guardrails: ["결혼 여부 단정 금지"],
  },
  conflict_resolution: {
    promptKey: "conflict_resolution",
    title: "갈등 해결 궁합",
    angle: "싸움의 구조와 멈추는 법",
    voice: "남의 싸움을 여러 번 말려 본 사람의 말투. 누구 편도 들지 않고 각자의 몫을 공평하게 짚는다.",
    sections: [
      { key: "reason", title: "우리가 자주 부딪히는 진짜 이유", guide: "", brief: "겉으로 싸우는 주제 말고 그 밑에 깔린 것" },
      { key: "style", title: "각자의 싸움 방식", guide: "", brief: "한 사람은 쏟아 내고 한 사람은 닫는지 등, 서로를 더 화나게 만드는 방식" },
      { key: "stop_word", title: "싸움을 멈추는 한마디", guide: "", brief: "실제 문장으로 제시한다. 반대로 불을 붙이는 금지어도 하나" },
      { key: "reconnect", title: "화해 후 다시 가까워지는 법", guide: "", brief: "누가 먼저 손 내미는 게 맞는지, 어떤 행동이 통하는지" },
    ],
    guardrails: ["폭력·위협 상황이면 전문기관 도움 안내 문장"],
  },
  secret_love: {
    promptKey: "secret_love",
    title: "은밀한 속궁합",
    angle: "둘만 있을 때의 끌림. 누가 먼저 불붙고 누가 오래 타는지, 몸의 거리와 속도, 주도권, 분위기",
    voice:
      "밤늦게 친한 언니가 낮은 목소리로 솔직하게 해 주는 이야기. 살짝 도발적이고 눈을 피하지 않는다. " +
      '"포근한", "안식처", "든든한 버팀목", "다정한 짝꿍" 같은 포근·덕담 말투는 쓰지 않는다.',
    sections: [
      { key: "temperature", title: "둘 사이의 끌림 온도", guide: "", brief: "닿기 직전의 긴장부터 시작한다. 누가 먼저 달아오르고 누가 늦게 불붙는지, 온도 차를 숨기지 않는다" },
      { key: "expression", title: "스킨십 속도와 주도권", guide: "", brief: "누가 리드하는 쪽인지, 각자 좋아하는 속도와 분위기(말·손길·눈빛), 원하는 것이 어긋나는 지점 하나" },
      { key: "fulfill", title: "둘만 있을 때 드러나는 모습", guide: "", brief: "낮과 다른 밤의 얼굴. 각자 입 밖에 내지 못한 바람 하나씩, 상대가 유독 약해지는 순간" },
      { key: "keep_flutter", title: "식지 않게 불을 지피는 법", guide: "", brief: "이 두 사람에게 권태가 오는 지점과, 다시 달아오르게 하는 구체적인 행동" },
    ],
    guardrails: [
      "수위: 암시와 분위기까지. 성행위·신체 부위를 직접 묘사하지 않는다(성인 인증 없이 누구나 보는 화면)",
      "서로의 동의와 존중을 전제로 쓴다. 강요·집착을 부추기지 않는다",
    ],
  },
};

export function scoreBand(score: number): string {
  if (score >= 85) return "아주 좋은 흐름";
  if (score >= 75) return "좋은 흐름, 한두 가지만 조심";
  if (score >= 65) return "무난하지만 신경 쓸 부분이 분명";
  return "조심할 부분이 큰 시기, 그래도 방법은 있음";
}

/**
 * 모든 상품에 공통으로 거는 "밋밋함 방지" 규칙(2026-10-02).
 * 예전 리포트는 칭찬 일색에 같은 비유("든든한 산", "다정한 짝꿍")가 다섯 번씩 반복됐다.
 */
const SHARPNESS_RULES = `SHARPNESS RULES:
- 칭찬만 하지 않는다. 섹션마다 엇갈리는 지점·불편한 진실을 하나씩 짚는다(겁주거나 단정적으로 예언하지 않고).
- 각 섹션의 첫 문장은 이 사람(이 두 사람)에 대한 대담하고 구체적인 관찰 한 줄로 시작한다. 일반론·인사말로 시작하지 않는다.
- 같은 비유·별명·표현을 두 번 쓰지 않는다. 자연물 비유(산·바다·나무, 불꽃·불씨·장작 같은 불 비유 포함)는 리포트 전체를 통틀어 두 번까지만 쓰고, 나머지는 사람의 행동과 장면으로 쓴다.
- "누가 · 언제 · 무엇을" 이 드러나게 쓴다. "~할 수 있어요", "~일 거예요"를 연달아 쓰지 않는다.
- 위 점수 구간을 따른다. 점수가 높지 않은데 "천생연분", "찰떡궁합", "완벽한 조화" 같은 판정을 쓰지 않는다. 점수가 높아도 summary 와 closing 을 판정·덕담으로 끝내지 않는다.
- 입력의 Core Keywords 는 배경 참고일 뿐이다. 그 단어를 그대로 옮기거나 주제로 삼지 않는다. 주제는 PRODUCT 와 ANGLE 이다.
- headline 은 15~28자. 판정이 아니라 이 사람(이 두 사람)의 결을 그린 한 줄.`;

/**
 * 미리보기(TEASER) 전용 규칙.
 * hooks 는 잠긴 섹션(2~4번째) 카드에 한 줄씩 보이는 문구다. 예전에는 규칙이 없어 AI 가 summary 문장을 그대로
 * 되풀이했고("…완벽하게 맞춰지는 관계입니다"), 미리보기만 읽어도 이야기가 끝난 것처럼 보였다(2026-10-02).
 */
function teaserRules(spec: ProductPromptSpec): string {
  const locked = spec.sections.slice(1).map((s, i) => `  hooks[${i}] ↔ "${s.title}"`).join("\n");
  return `TEASER RULES:
- headline·summary·freeSection 은 첫 섹션까지의 이야기만 한다. 관계나 사람 전체에 대한 최종 평가("천생연분", "찰떡궁합", "잘 맞는 인연이에요" 등)를 쓰지 않는다. headline 은 두 사람(이 사람)의 결을 그린 한 줄이지 판정이 아니다.
- freeSection.body 의 마지막 문장은 다음 섹션에서 이어질 이야기를 궁금하게 남긴다(결론·덕담으로 끝내지 않는다). "섹션", "다음 장", "살펴볼게요" 같은 안내 말투 없이, 아직 풀리지 않은 물음으로 끝낸다.
- hooks 는 잠긴 섹션에 순서대로 하나씩 대응한다:
${locked}
- 각 hook 은 그 섹션에서 밝혀질 "이 사람(이 두 사람)만의 구체적인 발견"이 있다는 것만 알리고, 답은 말하지 않는다.
- 각 hook 은 45~75자 한 문장. 위 사주 데이터에서 나온 구체적인 단서 하나(누가 먼저인지, 어느 순간인지, 무엇이 엇갈리는지 등)를 넣되 결과는 가린다.
- hooks 3개 중 최소 1개는 조심할 지점·엇갈리는 순간을 다룬다(겁주지 않고, 단정적 예언 없이).
- headline·summary·freeSection 에 쓴 문장이나 비유를 hooks 에 다시 쓰지 않는다. 칭찬·결론 문장 금지.
- hooks 는 "~가 있어요 / ~이 따로 있어요"처럼 지금 있는 것을 말한다. "~하게 될 거예요" 같은 앞일 예고는 쓰지 않는다.
- 좋은 예: "둘 중 한 사람이 먼저 서운함을 삼키는 쪽이에요. 그게 쌓이는 순간이 따로 있어요"
- 나쁜 예: "두 분은 서로를 채워 주는 찰떡궁합이에요" (결론을 말해 버림)
`;
}

export function buildStandardPrompt(
  spec: ProductPromptSpec,
  contextBlock: string,
  score: number,
  mode: "TEASER" | "FULL",
  toneGuide: string
): string {
  const sectionsText = spec.sections
    .map((s, i) => {
      const note = s.brief || s.guide;
      return `${i + 1}. [${s.key}] ${s.title}${note ? ` — ${note}` : ""}`;
    })
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
${spec.voice ? `VOICE (이 상품의 목소리 — TONE 보다 우선한다): ${spec.voice}\n` : ""}DETERMINISTIC SCORE (사실로 사용하고, 숫자를 본문에 쓰지 마세요): ${score}/100 → ${scoreBand(score)}
SECTIONS (이 순서와 이 제목 그대로. 줄표 뒤는 쓸 내용의 지시이며 본문에 옮기지 않는다):
${sectionsText}
GUARDRAILS:
${spec.guardrails.map((g) => `- ${g}`).join("\n")}
- 오락·자기이해를 위한 풀이다. 미래를 단정적으로 예언하지 않는다.
${SHARPNESS_RULES}
LENGTH: 섹션 body 는 각 350~550자, 2문단. 섹션마다 구체적인 장면이나 행동을 최소 1개 포함. "~할 수 있어요"류의 흐릿한 문장 반복 금지. 상투적 멘토 말투 금지.
${mode === "TEASER" ? teaserRules(spec) : ""}${outputFormat}
Output ONLY the JSON object.`.trim();
}
