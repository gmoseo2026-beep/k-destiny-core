// lib/teaserBlurCopy.ts
// 유료 단품(맛보기 12종)의 첫 섹션 끝 흐림(blur) 안내 문구 및 핵심 단어 가림(●●●) 문구.
// 클라이언트 컴포넌트("use client")에서 안전하게 쓰도록 lib/prompts/* 및 Node 전용 모듈을 import 하지 않는다(B1 6-6).

export const DEFAULT_TEASER_BLUR_COPY =
  "이 뒤에는 왜 그런지, 그리고 그 장면이 언제 다시 돌아오는지가 이어져요. 마지막 문단에는 그때 무엇을 하면 되는지까지 적혀 있어요. 여기까지 읽고 고개를 끄덕였다면, 다음 문단이 바로 그 답이에요.";

export const TEASER_BLUR_COPY_BY_ID: Readonly<Record<string, string>> = {
  inner_mind:
    "이 뒤에는 말하지 않는 속마음과 그 사람이 숨기는 불안, 그리고 마음을 여는 한마디가 이어져요.",
  reunion:
    "이 뒤에는 다시 이어질 여지와 연락해도 되는 때·안 되는 때, 그리고 재회보다 먼저 정리할 것이 이어져요.",
  cheating:
    "이 뒤에는 마음이 흔들리는 순간과 유혹이 통하지 않게 하는 법, 그리고 내가 지켜야 할 선이 이어져요.",
  marriage:
    "이 뒤에는 돈·집안일·가족 문제에서 부딪히는 곳과 위기가 오는 지점, 그리고 오래 가는 부부의 약속이 이어져요.",
  conflict:
    "이 뒤에는 각자의 싸움 방식과 싸움을 멈추는 한마디, 그리고 화해 후 다시 가까워지는 법이 이어져요.",
  secret_love:
    "이 뒤에는 스킨십 속도와 주도권, 둘만 있을 때 드러나는 모습, 그리고 식지 않게 불을 지피는 법이 이어져요.",
  wealth:
    "이 뒤에는 돈이 들어오는 길과 돈이 새는 구멍, 그리고 앞으로 1년의 돈 흐름이 이어져요.",
  career:
    "이 뒤에는 잘 맞는 직무·환경 3가지와 이동·이직 타이밍, 그리고 면접·협상에서 내 무기가 이어져요.",
  love_single:
    "이 뒤에는 끌리는 사람과 잘 맞는 사람의 차이, 인연이 들어오는 시기와 장소, 그리고 반복되는 패턴을 끊는 법이 이어져요.",
  charm:
    "이 뒤에는 나도 모르는 치명적인 한 끗과 매력이 가장 빛나는 순간, 그리고 매력을 깎아 먹는 습관이 이어져요.",
  health:
    "이 뒤에는 신경 써야 할 몸의 신호와 나에게 맞는 회복 루틴, 그리고 계절별 컨디션 관리가 이어져요.",
  spicy_annual:
    "이 뒤에는 스스로 발목 잡는 지점과 지금 당장 버려야 할 것, 그리고 그래도 믿어도 되는 무기가 이어져요.",
};

export function getTeaserBlurCopy(catalogId?: string | null): string {
  if (!catalogId) return DEFAULT_TEASER_BLUR_COPY;
  return TEASER_BLUR_COPY_BY_ID[catalogId] ?? DEFAULT_TEASER_BLUR_COPY;
}

/**
 * 미리보기 결제 안내 패널(TeaserUnlockPanel)에 노출할 핵심 단어 가림(●●●) 2줄 문구 (P-016-2 §3).
 * 원문 단어는 애초에 포함하지 않고 ●●●로 가려진 문장만 제공한다.
 */
export const DEFAULT_MASKED_PREVIEW_LINES: readonly [string, string] = [
  "이 관계에서 가장 먼저 마음이 움직이는 순간은 ●●●할 때예요.",
  "서운함이 쌓이지 않게 꼭 피해야 할 한 가지는 ●●●이에요.",
];

export const TEASER_MASKED_LINES_BY_ID: Readonly<Record<string, readonly [string, string]>> = {
  inner_mind: [
    "그 사람은 당신의 ●●●에 가장 강하게 끌리고 있어요.",
    "겉으로는 태연한 척하지만 속으로는 ●●●할까 봐 망설이고 있어요.",
  ],
  reunion: [
    "그 사람이 밤마다 문득 떠올리는 장면은 ●●●하던 순간이에요.",
    "먼저 연락이 닿기 가장 좋은 흐름은 ●●● 무렵에 열려요.",
  ],
  cheating: [
    "그 사람의 마음이 가장 쉽게 흔들리는 순간은 ●●●할 때예요.",
    "한눈팔지 못하게 붙잡아 두는 결정적 한 끗은 ●●●이에요.",
  ],
  marriage: [
    "두 사람이 함께 살면 가장 먼저 맞춰야 할 현실 문제는 ●●●이에요.",
    "오래 갈수록 서로에게 가장 큰 버팀목이 되는 건 ●●●할 때예요.",
  ],
  conflict: [
    "두 사람이 싸울 때 진짜 불씨가 되는 건 ●●● 때문이에요.",
    "다툼을 단번에 가라앉히는 한마디는 ●●●이에요.",
  ],
  secret_love: [
    "둘만 있을 때 그 사람의 온도가 확 올라가는 스위치는 ●●●이에요.",
    "스킨십에서 은근히 바라고 있지만 말 못 한 건 ●●●이에요.",
  ],
  wealth: [
    "내 사주에서 가장 크게 돈이 모이는 통로는 ●●● 쪽이에요.",
    "모은 돈이 새어 나가지 않게 막아야 할 구멍은 ●●●이에요.",
  ],
  career: [
    "내 능력을 가장 비싸게 인정받는 일터의 조건은 ●●●이에요.",
    "자리를 옮기거나 새 제안을 잡기 좋은 시기는 ●●● 무렵이에요.",
  ],
  love_single: [
    "다가올 새 인연은 당신의 ●●●에 가장 먼저 반하게 돼요.",
    "새로운 인연과 자연스럽게 눈이 마주치는 곳은 ●●●이에요.",
  ],
  charm: [
    "사람들이 나도 모르게 빠져드는 내 결정적 매력은 ●●●이에요.",
    "내 매력이 가장 강하게 빛나는 순간은 ●●●할 때예요.",
  ],
  health: [
    "지칠 때 내 몸에서 가장 먼저 신호를 보내는 곳은 ●●●이에요.",
    "에너지를 가장 빠르게 채워 주는 나만의 회복법은 ●●●이에요.",
  ],
  spicy_annual: [
    "올해 내가 가장 조심해야 할 내 안의 함정은 ●●●이에요.",
    "지금 당장 내려놓아야 길이 열리는 한 가지는 ●●●이에요.",
  ],
};

export function getTeaserMaskedLines(catalogId?: string | null): readonly [string, string] {
  if (!catalogId) return DEFAULT_MASKED_PREVIEW_LINES;
  return TEASER_MASKED_LINES_BY_ID[catalogId] ?? DEFAULT_MASKED_PREVIEW_LINES;
}

const SKIP_MASK_TOKENS = new Set([
  "지민",
  "서준",
  "님은",
  "님이",
  "님과",
  "님의",
  "님에게",
  "두",
  "분은",
  "분이",
  "사람은",
  "사람이",
  "가장",
  "정말",
  "사실",
  "특히",
  "늘",
  "항상",
  "겉으로는",
  "속으로는",
]);

const TRAILING_PARTICLES = [
  "으로부터",
  "에게서",
  "에서는",
  "으로는",
  "에게는",
  "이라서",
  "에서",
  "으로",
  "에게",
  "까지",
  "부터",
  "처럼",
  "보다",
  "마다",
  "조차",
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "의",
  "에",
  "로",
  "와",
  "과",
  "도",
  "만",
];

/**
 * 서버 전용 마스킹: 문장 안의 핵심 명사/어절 하나를 `●●●`로 가려 반환한다 (P-016-2 §3).
 * 원문 단어가 브라우저로 전달되지 않도록 서버에서 미리 가린다.
 */
export function maskKeyWordForPreview(sentence: string, maxChars = 60): string {
  const normalized = sentence.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  if (normalized.includes("●●")) {
    const unified = normalized.replace(/●{2,}/g, "●●●");
    return unified.length <= maxChars ? unified : `${unified.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
  }

  const tokens = normalized.split(" ");
  if (tokens.length < 3) return normalized;

  let targetIdx = -1;
  for (let i = Math.min(2, tokens.length - 2); i < tokens.length - 1; i++) {
    const clean = tokens[i].replace(/[,."'!?…]/g, "");
    if (clean.length >= 2 && !SKIP_MASK_TOKENS.has(clean) && !clean.endsWith("님")) {
      targetIdx = i;
      break;
    }
  }
  if (targetIdx === -1) {
    targetIdx = Math.floor(tokens.length / 2);
  }

  const rawToken = tokens[targetIdx];
  const trailingPunctMatch = rawToken.match(/([,."'!?…]+)$/);
  const trailingPunct = trailingPunctMatch ? trailingPunctMatch[1] : "";
  const core = trailingPunct ? rawToken.slice(0, -trailingPunct.length) : rawToken;

  let particle = "";
  for (const p of TRAILING_PARTICLES) {
    if (core.length > p.length + 1 && core.endsWith(p)) {
      particle = p;
      break;
    }
  }

  tokens[targetIdx] = `●●●${particle}${trailingPunct}`;
  const masked = tokens.join(" ");
  if (masked.length <= maxChars) return masked;
  return `${masked.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}
