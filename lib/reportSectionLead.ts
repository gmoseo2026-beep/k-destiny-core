/**
 * 리포트 섹션 본문에서 첫 문장("한 줄 결론" 말풍선용)과 나머지 본문을 분리하는 순수 함수.
 * - 본문이 한 문장뿐이거나 첫 문장이 지나치게 길면(> 110자) 중복 노출을 막기 위해 lead = null 을 반환한다.
 */
export function splitLeadSentence(rawText: string): { lead: string | null; rest: string } {
  const trimmed = (rawText ?? "").trim();
  if (!trimmed) {
    return { lead: null, rest: "" };
  }

  // 1) 첫 줄바꿈이나 마침표·물음표·느낌표 뒤 공백/줄바꿈 위치를 찾는다.
  const sentenceEndMatch = trimmed.match(/^(.{6,110}?(?:[.|!|?]|다\.|요\.|죠\.|네\.))(?:\s+|\n+)([\s\S]+)$/);
  if (sentenceEndMatch) {
    const lead = sentenceEndMatch[1].trim();
    const rest = sentenceEndMatch[2].trim();
    if (lead && rest) {
      return { lead, rest };
    }
  }

  // 2) 줄바꿈으로 문단이 나뉘어 있고 첫 줄이 6~110자인 경우
  const newlineIdx = trimmed.indexOf("\n");
  if (newlineIdx > 5 && newlineIdx <= 110) {
    const firstLine = trimmed.slice(0, newlineIdx).trim();
    const remaining = trimmed.slice(newlineIdx + 1).trim();
    if (firstLine && remaining) {
      return { lead: firstLine, rest: remaining };
    }
  }

  return { lead: null, rest: trimmed };
}

/**
 * 이미 존재하는 점수(0~100)를 게이지 바 너비(%)로 안전하게 변환한다. (새 점수 생성 금지)
 */
export function clampGaugePercent(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}
