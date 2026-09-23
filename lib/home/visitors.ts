export const VISITOR_COUNTER_MIN_DISPLAY = 1000;

export function shouldDisplayVisitorCounter(count: number | bigint): boolean {
  const num = typeof count === "bigint" ? Number(count) : count;
  return num >= VISITOR_COUNTER_MIN_DISPLAY;
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
