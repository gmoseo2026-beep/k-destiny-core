export const VISITOR_COUNTER_MIN_DISPLAY = 1000;

export function shouldDisplayVisitorCounter(count: number | bigint): boolean {
  const num = typeof count === "bigint" ? Number(count) : count;
  return num >= VISITOR_COUNTER_MIN_DISPLAY;
}

/**
 * 홈 맨 위 한 줄("벌써 N명이 함께했어요")을 보여 주기 시작하는 방문 수.
 * 아래쪽 큰 칸(1,000명)보다 조금 먼저 켠다 — 995명일 때 사장님이 바로 적용하기로 했다(2026-10-09).
 * 숫자는 실제 값을 그대로 쓴다.
 */
export const VISITOR_PILL_MIN_DISPLAY = 900;

export function shouldDisplayVisitorPill(count: number | bigint): boolean {
  const num = typeof count === "bigint" ? Number(count) : count;
  return Number.isFinite(num) && num >= VISITOR_PILL_MIN_DISPLAY;
}

export function formatVisitorCount(count: number | bigint): string {
  const num = typeof count === "bigint" ? Number(count) : count;
  return `${num.toLocaleString("ko-KR")}명`;
}

export function formatStartedAt(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

export interface VisitorCounterData {
  count: number;
  startedAt: Date;
  shouldDisplay: boolean;
}

export interface SiteCounterClient {
  siteCounter: {
    findUnique: (args: { where: { key: string } }) => Promise<{
      key: string;
      value: bigint | number;
      startedAt: Date;
      updatedAt?: Date;
    } | null>;
  };
}

export async function fetchVisitorCount(prismaClient: SiteCounterClient): Promise<VisitorCounterData> {
  try {
    const counter = await prismaClient.siteCounter.findUnique({
      where: { key: "visitors" },
    });

    if (!counter) {
      return {
        count: 0,
        startedAt: new Date(),
        shouldDisplay: false,
      };
    }

    const count = Number(counter.value);
    return {
      count,
      startedAt: counter.startedAt,
      shouldDisplay: shouldDisplayVisitorCounter(count),
    };
  } catch (e) {
    console.error("[fetchVisitorCount] Error fetching visitors:", e);
    return {
      count: 0,
      startedAt: new Date(),
      shouldDisplay: false,
    };
  }
}
