/**
 * 궁합 점수 위치(상위 N%) 결정론 계산 모듈 (P-016-2 §4).
 *
 * 실제 누적 궁합 분포(한국어 궁합 1,177쌍, 2026-10-24 Claude가 DB에서 점수별 "이 점수 이상" 비율을 계산):
 * 90점 34.2% · 91점 26.9% · 92~93점 20.1% · 94점 10.1% · 95~96점 6.1% · 97점 1.3% · 98~99점 0.4%
 * → 상위 30% 이내가 되는 첫 점수는 91점. 표시 값은 실제 비율을 올림(부풀리지 않음).
 *
 * 규칙:
 * - 오직 점수(score)만으로 계산하는 순수 결정론 함수(같은 점수 = 항상 같은 결과).
 * - 점수가 낮은 쌍이 실망하지 않도록 **상위 30% 이내(91점 이상)일 때만** 상위 퍼센트를 반환하고,
 *   90점 이하(중앙값 86점 포함)는 `null`을 반환해 화면에 표시하지 않는다.
 */

export const COMPAT_DISTRIBUTION_META = {
  totalPairs: 1177,
  median: 86,
  top30Score: 91,
  top25Score: 92,
  top10Score: 94,
} as const;

const SCORE_TO_TOP_PERCENT: Readonly<Record<number, number>> = {
  91: 27,
  92: 21,
  93: 21,
  94: 11,
  95: 7,
  96: 7,
  97: 2,
  98: 1,
  99: 1,
  100: 1,
};

/**
 * 점수가 상위 30% 이내(>= 90점)이면 상위 퍼센트 정수(1~30)를 반환하고,
 * 그 밖의 점수(< 90점 또는 비정상 값)는 null 을 반환한다.
 */
export function getCompatTopPercent(score: number): number | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  const rounded = Math.round(score);
  if (rounded < COMPAT_DISTRIBUTION_META.top30Score) return null;
  if (rounded >= 100) return 1;
  return SCORE_TO_TOP_PERCENT[rounded] ?? null;
}

/**
 * 상위 30% 이내일 때만 `"상위 N% 궁합"` 배지 문구를 반환한다.
 */
export function formatCompatTopPercentBadge(score: number): string | null {
  const pct = getCompatTopPercent(score);
  if (pct === null) return null;
  return `상위 ${pct}% 궁합`;
}
