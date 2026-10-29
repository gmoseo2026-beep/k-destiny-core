const DISMISS_PREFIX = "kd_review_prompt_dismiss_";

export function reviewPromptDismissKey(orderKey: string): string {
  return `${DISMISS_PREFIX}${orderKey.trim()}`;
}

/**
 * 해당 주문(orderKey)에서 하단 후기 요청 시트를 이미 닫았는지 확인한다.
 * 인앱 브라우저·사파리 프라이빗 모드에서 localStorage 접근이 예외를 던져도 안전하게 false를 반환한다.
 */
export function isReviewPromptDismissed(orderKey: string | null | undefined): boolean {
  if (!orderKey || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(reviewPromptDismissKey(orderKey)) === "1";
  } catch {
    return false;
  }
}

/**
 * 해당 주문(orderKey)에서 하단 후기 요청 시트를 닫았음을 기록한다.
 * 한 번 닫으면 같은 주문에서는 다시 띄우지 않는다.
 */
export function dismissReviewPrompt(orderKey: string | null | undefined): void {
  if (!orderKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(reviewPromptDismissKey(orderKey), "1");
  } catch {
    // localStorage 차단/용량 초과 환경에서는 조용히 무시
  }
}

/** 문서 스크롤 위치가 80% 이상에 도달했는지 순수 판정 */
export function hasReached80PercentScroll(metrics: {
  scrollY: number;
  innerHeight: number;
  scrollHeight: number;
}): boolean {
  const { scrollY, innerHeight, scrollHeight } = metrics;
  if (!Number.isFinite(scrollHeight) || scrollHeight <= 0) return false;
  return (Math.max(0, scrollY) + Math.max(0, innerHeight)) / scrollHeight >= 0.8;
}
