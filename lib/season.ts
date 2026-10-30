import type { CatalogItem } from "@/lib/catalog";
import { filterProductsByCategory } from "@/lib/home/explore";

/**
 * 2027 신년 시즌 자동 전환 설정 (단일 기준점).
 * - 10-30 사장님 결정: 11/1 예정이던 전환을 12/1 로 미룬다(2027 신년운 판매 0건, 매출은 속마음이 만드는 중).
 * - KST 2026-12-01 00:00:00 부터 홈 히어로와 첫 추천을 2027 신년 대표 상품 3종 중심으로 전환한다.
 * - 연말 특가 가격·기한("12/31까지") 자체는 lib/catalog.ts 의 SEASON_PROMO_* 가 유일한 출처이며 여기서 새 한정 문구를 만들지 않는다.
 */
export const SEASON_2027_YEAR = 2027 as const;
export const SEASON_2027_STARTS_AT = Date.parse("2026-12-01T00:00:00+09:00");

export const SEASON_2027_CORE_IDS = [
  "annual_2027",
  "premium_2027_daeun",
  "set_2027",
] as const;

export type SeasonHeroSlideId =
  | "inner_mind"
  | "annual_2027"
  | "premium_2027_daeun"
  | "compat_basic";

const PRE_SEASON_HERO_ORDER: readonly SeasonHeroSlideId[] = [
  "inner_mind",
  "annual_2027",
  "premium_2027_daeun",
  "compat_basic",
];

const SEASON_2027_HERO_ORDER: readonly SeasonHeroSlideId[] = [
  "annual_2027",
  "premium_2027_daeun",
  "inner_mind",
  "compat_basic",
];

export function getSeasonNow(): number {
  return Date.now();
}

export function isSeason2027Active(now: number = Date.now()): boolean {
  return now >= SEASON_2027_STARTS_AT;
}

/** 시각(now)에 따른 홈 히어로 포스터 슬라이드 ID 순서 */
export function getSeasonHeroSlideOrder(
  now: number = Date.now(),
): readonly SeasonHeroSlideId[] {
  return isSeason2027Active(now) ? SEASON_2027_HERO_ORDER : PRE_SEASON_HERO_ORDER;
}

/**
 * KST 2026-12-01 00:00 부터 홈 히어로 직하단에 노출되는 첫 추천 3종
 * (`annual_2027` · `premium_2027_daeun` · `set_2027`).
 * 전환 시각 이전에는 빈 배열을 반환해 기존 홈 구성을 유지한다.
 */
export function getSeasonFirstRecommendations(
  visibleProducts: readonly CatalogItem[],
  now: number = Date.now(),
): CatalogItem[] {
  if (!isSeason2027Active(now)) return [];
  const publicItems = filterProductsByCategory([...visibleProducts], "all");
  const byId = new Map(publicItems.map((p) => [p.id, p]));
  return SEASON_2027_CORE_IDS.map((id) => byId.get(id)).filter(
    (p): p is CatalogItem => Boolean(p),
  );
}

/**
 * 세트 상품 진열 정렬:
 * - 2026-12-01 00:00 KST 이전: 기존 featuredOrder 순
 * - 2026-12-01 00:00 KST 이후: `set_2027`(2027 신년 종합 세트)을 맨 앞에 두고 나머지는 featuredOrder 순
 */
export function sortSeasonSets(
  sets: readonly CatalogItem[],
  now: number = Date.now(),
): CatalogItem[] {
  const active = isSeason2027Active(now);
  return [...sets].sort((a, b) => {
    if (active) {
      if (a.id === "set_2027" && b.id !== "set_2027") return -1;
      if (b.id === "set_2027" && a.id !== "set_2027") return 1;
    }
    return (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99);
  });
}

/**
 * 실집계 20건 미만일 때의 홈 폴백 추천("콩닥 추천 콘텐츠") 정렬:
 * - 2026-12-01 00:00 KST 이전: 기존 featuredOrder 순
 * - 2026-12-01 00:00 KST 이후: `annual_2027` → `premium_2027_daeun` → `set_2027` 우선 배치 후 featuredOrder 순
 */
export function sortFallbackRecommendations(
  products: readonly CatalogItem[],
  now: number = Date.now(),
): CatalogItem[] {
  const active = isSeason2027Active(now);
  const corePriority = new Map<string, number>(
    SEASON_2027_CORE_IDS.map((id, idx) => [id, idx]),
  );

  return [...products].sort((a, b) => {
    if (active) {
      const pa = corePriority.get(a.id);
      const pb = corePriority.get(b.id);
      if (pa !== undefined && pb !== undefined) return pa - pb;
      if (pa !== undefined) return -1;
      if (pb !== undefined) return 1;
    }
    return (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99);
  });
}
