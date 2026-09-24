// lib/catalogVisibility.ts — 서버 전용 상품 공개/숨김 Resolver (A11-2)
// 클라이언트 컴포넌트에서는 직접 사용하지 않고 서버가 넘겨준 목록만 쓴다.

import prisma from "@/lib/prisma";
import { CATALOG, CatalogItem } from "@/lib/catalog";

const CACHE_TTL_MS = 30 * 1000; // 30초 메모리 캐시

let cachedCatalog: CatalogItem[] | null = null;
let cacheExpiresAt = 0;

/**
 * 순수 함수: 오버라이드 맵이 주어지면 오버라이드 값(!visible)을, 없으면 코드 기본값(item.isHidden ?? false)을 반환
 */
export function resolveHidden(
  item: CatalogItem,
  overrides?: Map<string, boolean> | Record<string, boolean> | null
): boolean {
  if (overrides) {
    let overrideVisible: boolean | undefined;
    if (overrides instanceof Map) {
      overrideVisible = overrides.get(item.id);
    } else if (typeof overrides === "object") {
      overrideVisible = overrides[item.id];
    }

    if (typeof overrideVisible === "boolean") {
      return !overrideVisible;
    }
  }

  return item.isHidden ?? false;
}

/**
 * 캐시 무효화 함수: 어드민 변경 시 즉시 메모리 캐시를 초기화한다.
 */
export function invalidateVisibilityCache(): void {
  cachedCatalog = null;
  cacheExpiresAt = 0;
}

/**
 * DB의 ProductVisibility 오버라이드를 반영한 유효 카탈로그 목록 반환 (캐시 30초)
 * DB 오류 발생 시 코드 기본값으로 안전하게 폴백한다.
 */
export async function getEffectiveCatalog(): Promise<CatalogItem[]> {
  const now = Date.now();
  if (cachedCatalog && now < cacheExpiresAt) {
    return cachedCatalog;
  }

  try {
    if (!prisma?.productVisibility?.findMany) {
      return CATALOG.map((item) => ({ ...item, isHidden: item.isHidden ?? false }));
    }

    const rowsPromise = prisma.productVisibility.findMany({
      select: { catalogId: true, visible: true },
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("ProductVisibility DB timeout (1500ms)")), 1500);
    });
    const rows = await Promise.race([rowsPromise, timeoutPromise]).finally(() => clearTimeout(timer));

    const overrideMap = new Map<string, boolean>();
    for (const r of rows) {
      overrideMap.set(r.catalogId, r.visible);
    }

    const effective = CATALOG.map((item) => ({
      ...item,
      isHidden: resolveHidden(item, overrideMap),
    }));

    cachedCatalog = effective;
    cacheExpiresAt = now + CACHE_TTL_MS;
    return effective;
  } catch (error) {
    console.warn("[getEffectiveCatalog] DB 조회 실패, 코드 기본값으로 폴백합니다:", error);
    // DB 실패 시 기존 캐시가 있으면 그것을, 없으면 코드 기본값 복제본 반환
    if (cachedCatalog) return cachedCatalog;
    return CATALOG.map((item) => ({ ...item, isHidden: item.isHidden ?? false }));
  }
}

/**
 * 단건 유효 상품 조회
 */
export async function getEffectiveProduct(id: string): Promise<CatalogItem | undefined> {
  const catalog = await getEffectiveCatalog();
  return catalog.find((p) => p.id === id);
}

/**
 * 공개 상태인 상품들만 반환하는 유효 카탈로그 조회
 */
export async function getEffectiveVisibleCatalog(): Promise<CatalogItem[]> {
  const catalog = await getEffectiveCatalog();
  return catalog.filter((p) => !p.isHidden);
}

