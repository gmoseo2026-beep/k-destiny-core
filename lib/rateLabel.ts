/** 비율 표시(예: 12.5%). 브라우저 화면에서도 쓰므로 다른 파일을 가져오지 않는다. */
export function rateLabel(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}
