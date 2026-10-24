/**
 * 대화형 궁합 입력 4단계 "지금 제일 궁금한 것" 선택지 및 말투 가이드 (P-016-2 §6).
 *
 * - 클라이언트("use client")와 서버 API 가 함께 쓸 수 있도록 서버 전용 의존성을 두지 않는다.
 * - 궁합 점수·키워드에는 영향을 주지 않으며, 오직 AI 문장 말투와 장면 초점에만 반영한다.
 */

export type CompatCuriosityKey = "mind" | "reunion" | "longevity" | "conflict";

export interface CompatCuriosityOption {
  readonly key: CompatCuriosityKey;
  readonly label: string;
  readonly subLabel: string;
  readonly emoji: string;
}

export const COMPAT_CURIOSITY_OPTIONS: readonly CompatCuriosityOption[] = [
  {
    key: "mind",
    label: "그 사람 마음",
    subLabel: "나를 어떻게 생각하는지, 말 못 한 속마음",
    emoji: "💭",
  },
  {
    key: "reunion",
    label: "다시 만날 수 있을지",
    subLabel: "멀어진 거리와 다시 이어질 타이밍",
    emoji: "🌙",
  },
  {
    key: "longevity",
    label: "오래 갈지",
    subLabel: "설렘 뒤에도 편안하게 이어지는 호흡",
    emoji: "💞",
  },
  {
    key: "conflict",
    label: "다툼 이유",
    subLabel: "자꾸 부딪히는 지점과 서운함이 쌓이는 방식",
    emoji: "⚡",
  },
] as const;

const ALLOWED_KEYS = new Set<string>(COMPAT_CURIOSITY_OPTIONS.map((o) => o.key));

export function isCompatCuriosityKey(val: unknown): val is CompatCuriosityKey {
  return typeof val === "string" && ALLOWED_KEYS.has(val);
}

const CURIOSITY_TONE_HINT: Readonly<Record<CompatCuriosityKey, string>> = {
  mind: "독자가 지금 가장 궁금해하는 것은 '그 사람 마음(겉으로 드러내지 않는 속마음과 감정 표현)'입니다. 일상 장면을 묘사할 때 연락·표현·눈치 보는 순간의 말투를 섬세하게 살려 주세요.",
  reunion: "독자가 지금 가장 궁금해하는 것은 '다시 만날 수 있을지(가까워졌다가 멀어지는 호흡과 미련)'입니다. 연락 템포나 거리를 두는 순간의 분위기를 차분하고 공감 어린 말투로 담아 주세요.",
  longevity: "독자가 지금 가장 궁금해하는 것은 '오래 갈지(일상을 함께할 때의 편안함과 지속성)'입니다. 약속을 잡거나 함께 시간을 보낼 때의 생활 리듬이 느껴지는 다정한 말투로 써 주세요.",
  conflict: "독자가 지금 가장 궁금해하는 것은 '다툼 이유(사소하게 부딪히는 순간과 서운함을 삼키는 방식)'입니다. 의견이 엇갈리거나 말투 때문에 멈칫하는 순간을 또렷하고 따뜻한 말투로 짚어 주세요.",
};

/**
 * 기존 toneGuide 뒤에 선택된 관심사 말투 힌트를 덧붙인다.
 * 선택값이 없거나 유효하지 않으면 원본 toneGuide 를 한 글자도 바꾸지 않고 그대로 반환한다.
 */
export function appendCuriosityToneGuide(baseToneGuide: string, curiosity?: unknown): string {
  if (!isCompatCuriosityKey(curiosity)) return baseToneGuide;
  return `${baseToneGuide} ${CURIOSITY_TONE_HINT[curiosity]}`;
}
