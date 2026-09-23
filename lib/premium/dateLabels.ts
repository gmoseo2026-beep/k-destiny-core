import type { Purpose } from "./dateSelection";

export const OFFICER_WORD: Record<string, string> = {
  除: "묵은 것을 덜어내는 날",
  危: "조심히 쌓아 올리는 날",
  定: "자리를 정하는 날",
  执: "붙잡아 지키는 날",
  成: "이루는 날",
  开: "새로 여는 날",
};

export function officerWord(officer: string): string {
  return OFFICER_WORD[officer] ?? "평범한 날";
}

export const PURPOSE_WORD: Record<Purpose, string> = {
  WEDDING: "결혼",
  MOVING: "이사",
  OPENING: "개업",
  CONTRACT: "계약",
  GENERAL: "일반",
};

export function formatLunarDate(month: number, day: number, isLeapMonth: boolean): string {
  return `음력 ${isLeapMonth ? "윤" : ""}${month}월 ${day}일`;
}
