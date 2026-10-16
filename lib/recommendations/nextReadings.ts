import { type CatalogItem, getProduct, isViewableFor } from "@/lib/catalog";
import { grantingCatalogIds } from "@/lib/productIdentity";

interface NextReadingRow {
  readonly singles: readonly string[];
  readonly set: string;
}

/**
 * 두 사람(couple) 상품 리포트 열람 끝자리의 고정 추천 매핑 표 (P-007 §2-2).
 * 표에는 상품 ID만 두고 이름·가격·설명 문구는 전부 getProduct()에서 읽는다.
 */
export const NEXT_READING_TABLE: Readonly<Record<string, NextReadingRow>> = {
  compat_basic: { singles: ["inner_mind", "secret_love"], set: "set_this_person" },
  inner_mind: { singles: ["compat_basic", "secret_love"], set: "set_this_person" },
  secret_love: { singles: ["inner_mind", "compat_basic"], set: "set_this_person" },
  reunion: { singles: ["inner_mind", "conflict"], set: "set_reunion" },
  conflict: { singles: ["inner_mind", "reunion"], set: "set_reunion" },
  marriage: { singles: ["compat_basic", "inner_mind"], set: "set_this_person" },
  cheating: { singles: ["inner_mind", "conflict"], set: "set_this_person" },
};

export interface GetNextReadingsInput {
  currentCatalogId: string;
  /** 같은 궁합(compatId)에 대해 이미 보유한 catalogId 목록 */
  ownedCatalogIds?: Iterable<string>;
  /** 서버 페이지에서 계산한 노출 허용 상품 ID 목록 (미전달 시 catalog 기본 노출 규칙 사용) */
  visibleIds?: Iterable<string>;
}

export interface NextReadingsResult {
  singles: CatalogItem[];
  set: CatalogItem | null;
}

export function getNextReadings({
  currentCatalogId,
  ownedCatalogIds,
  visibleIds,
}: GetNextReadingsInput): NextReadingsResult {
  const row = NEXT_READING_TABLE[currentCatalogId];
  if (!row) {
    return { singles: [], set: null };
  }

  const allOwned = new Set<string>([currentCatalogId, ...(ownedCatalogIds ?? [])]);
  const visibleSet = visibleIds ? new Set<string>(visibleIds) : null;

  const isVisible = (id: string): boolean => {
    const p = getProduct(id);
    if (!p) return false;
    if (visibleSet) return visibleSet.has(id);
    return isViewableFor(p, false);
  };

  const isOwned = (id: string): boolean =>
    grantingCatalogIds(id).some((grantId) => allOwned.has(grantId));

  const singles: CatalogItem[] = [];
  for (const id of row.singles) {
    if (!isVisible(id) || isOwned(id)) continue;
    const item = getProduct(id);
    if (item) singles.push(item);
    if (singles.length >= 2) break;
  }

  let setItem: CatalogItem | null = null;
  if (row.set && isVisible(row.set) && !isOwned(row.set)) {
    const candidateSet = getProduct(row.set);
    const items = candidateSet?.items ?? [];
    const hasAnyOwnedOrHiddenConstituent = items.some(
      (itemId) => !isVisible(itemId) || isOwned(itemId),
    );
    if (candidateSet && items.length > 0 && !hasAnyOwnedOrHiddenConstituent) {
      setItem = candidateSet;
    }
  }

  return { singles, set: setItem };
}

/**
 * 같은 두 사람(compatId) 정보로 다음 풀이를 여는 이동 주소 생성 (P-007 §2-3).
 * - 정통 궁합(compat_basic): /compat/<compatId>
 * - 그 외 단품·세트: /compat/new?productId=<id>&from=<compatId>&via=next
 */
export function nextReadingHref(productId: string, compatId: string, locale = "ko"): string {
  const encodedCompatId = encodeURIComponent(compatId);
  if (productId === "compat_basic") {
    return `/${locale}/compat/${encodedCompatId}`;
  }
  return `/${locale}/compat/new?productId=${encodeURIComponent(productId)}&from=${encodedCompatId}&via=next`;
}

export interface MineOrderSummary {
  catalogId?: string | null;
  compatId?: string | null;
  reports?: Array<{
    catalogId?: string;
    compatId?: string | null;
  }>;
}

/**
 * 기기 주문 토큰(/api/payments/owned 검증 통과분)과 회원 주문(/api/reports/mine)에서
 * 오직 현재 궁합(compatId)과 일치하는 catalogId만 추출한다 (P-007 §2-4).
 */
export function extractOwnedForCompat(
  compatId: string,
  sources: {
    currentCatalogId?: string;
    deviceOrders?: ReadonlyArray<{ catalogId: string; compatId: string | null; orderId: string }>;
    validOrderIds?: Iterable<string>;
    mineRows?: ReadonlyArray<MineOrderSummary>;
  },
): string[] {
  const owned = new Set<string>();
  if (sources.currentCatalogId) {
    owned.add(sources.currentCatalogId);
  }
  if (!compatId) {
    return Array.from(owned);
  }

  const validSet = sources.validOrderIds ? new Set<string>(sources.validOrderIds) : null;
  for (const order of sources.deviceOrders ?? []) {
    if (order.compatId !== compatId) continue;
    if (validSet && !validSet.has(order.orderId)) continue;
    if (order.catalogId) owned.add(order.catalogId);
  }

  for (const row of sources.mineRows ?? []) {
    if (row.compatId === compatId && row.catalogId) {
      owned.add(row.catalogId);
    }
    for (const rep of row.reports ?? []) {
      const repCompatId = rep.compatId ?? row.compatId;
      if (repCompatId === compatId && rep.catalogId) {
        owned.add(rep.catalogId);
      }
    }
  }

  return Array.from(owned);
}
