import { isViewableFor, type CatalogItem } from "@/lib/catalog";

export type SeasonEventSlug = "christmas" | "before-new-year" | "single-2027";

export interface SeasonEventConfig {
  slug: SeasonEventSlug;
  title: string;
  subtitle: string;
  endDateLabel: string;
  /** 종료 시각(배타 경계, KST): now < endsAtMs 동안 활성 */
  endsAtIso: string;
  endsAtMs: number;
  productIds: readonly string[];
}

export const SEASON_EVENTS: Readonly<Record<SeasonEventSlug, SeasonEventConfig>> = {
  christmas: {
    slug: "christmas",
    title: "크리스마스 전에, 그 사람 마음",
    subtitle:
      "연락하기 전에, 약속을 잡기 전에 먼저 확인해 보는 그 사람의 속마음과 우리 사이 온도",
    endDateLabel: "12/25까지",
    endsAtIso: "2026-12-26T00:00:00+09:00",
    endsAtMs: Date.parse("2026-12-26T00:00:00+09:00"),
    productIds: ["inner_mind", "set_heart", "set_sure"],
  },
  "before-new-year": {
    slug: "before-new-year",
    title: "올해 가기 전에 정리하고 싶은 사람",
    subtitle:
      "다시 다가갈지 마음을 접을지, 해가 바뀌기 전에 두 사람의 흐름과 갈등 해법을 차분히 짚어 봐요",
    endDateLabel: "12/31까지",
    endsAtIso: "2027-01-01T00:00:00+09:00",
    endsAtMs: Date.parse("2027-01-01T00:00:00+09:00"),
    productIds: ["set_reunion", "reunion", "conflict"],
  },
  "single-2027": {
    slug: "single-2027",
    title: "내년엔 연애할까",
    subtitle:
      "다가오는 2027년, 나에게 찾아올 새로운 인연의 시기와 타고난 매력, 한 해의 흐름을 미리 살펴봐요",
    endDateLabel: "12/31까지",
    endsAtIso: "2027-01-01T00:00:00+09:00",
    endsAtMs: Date.parse("2027-01-01T00:00:00+09:00"),
    productIds: ["love_single", "set_love", "annual_2027"],
  },
} as const;

export const SEASON_EVENT_SLUGS: readonly SeasonEventSlug[] = [
  "christmas",
  "before-new-year",
  "single-2027",
] as const;

export function getSeasonEvent(slug: string): SeasonEventConfig | null {
  if (Object.prototype.hasOwnProperty.call(SEASON_EVENTS, slug)) {
    return SEASON_EVENTS[slug as SeasonEventSlug];
  }
  return null;
}

export function isSeasonEventActive(
  event: Pick<SeasonEventConfig, "endsAtMs">,
  now: number = Date.now()
): boolean {
  return now < event.endsAtMs;
}

/**
 * 실제 종료 시각(endsAtMs)까지 남은 일수를 계산한다. 종료됐으면 0을 돌려준다.
 */
export function getSeasonEventDaysLeft(
  event: Pick<SeasonEventConfig, "endsAtMs">,
  now: number = Date.now()
): number {
  if (!isSeasonEventActive(event, now)) return 0;
  return Math.max(1, Math.ceil((event.endsAtMs - now) / 86_400_000));
}

export function formatSeasonDaysLeftLabel(
  event: Pick<SeasonEventConfig, "endsAtMs">,
  now: number = Date.now()
): string | null {
  const days = getSeasonEventDaysLeft(event, now);
  if (days <= 0) return null;
  return `${days}일 남음`;
}

export function evaluateSeasonEventState(
  event: Pick<SeasonEventConfig, "endsAtMs">,
  now: number = Date.now()
): { active: boolean; daysLeft: number; daysLeftLabel: string | null } {
  const active = isSeasonEventActive(event, now);
  const daysLeft = getSeasonEventDaysLeft(event, now);
  const daysLeftLabel = daysLeft > 0 ? `${daysLeft}일 남음` : null;
  return { active, daysLeft, daysLeftLabel };
}

/**
 * 기획전에 지정된 기존 카탈로그 상품을 순서대로 추려 돌려준다(새 상품·새 가격 변형 없음).
 */
export function resolveSeasonEventProducts(
  event: Pick<SeasonEventConfig, "productIds">,
  catalog: readonly CatalogItem[],
  preview = false
): CatalogItem[] {
  const byId = new Map<string, CatalogItem>();
  for (const item of catalog) {
    if (isViewableFor(item, preview)) {
      byId.set(item.id, item);
    }
  }
  const resolved: CatalogItem[] = [];
  for (const id of event.productIds) {
    const found = byId.get(id);
    if (found) resolved.push(found);
  }
  return resolved;
}
