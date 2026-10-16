// lib/teaserBlurCopy.ts
// 유료 단품(맛보기 12종)의 첫 섹션 끝 흐림(blur) 안내 문구.
// 클라이언트 컴포넌트("use client")에서 안전하게 쓰도록 lib/prompts/* 를 import 하지 않는다(B1 6-6).
// 각 문장은 lib/prompts/productSpecs.ts 의 2~4번째 유료 섹션 제목에 실제로 있는 내용만 쉬운 말로 옮긴다.

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
