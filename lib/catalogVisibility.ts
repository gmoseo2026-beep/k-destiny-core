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

async function loadEffectiveCatalog(): Promise<CatalogItem[]> {
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
  return CATALOG.map((item) => ({
    ...item,
    isHidden: resolveHidden(item, overrideMap),
  }));
}

let refreshing: Promise<void> | null = null;

/**
 * DB의 ProductVisibility 오버라이드를 반영한 유효 카탈로그 목록 반환.
 * - 30초 안: 메모리 값 그대로
 * - 30초 지남: 이전 값을 바로 돌려주고 뒤에서 새로 읽는다(페이지가 먼 DB를 기다리지 않게)
 * - 값이 아직 없음(서버 시작 직후·어드민 변경 직후): DB를 기다린다. 실패하면 코드 기본값으로 폴백.
 */
export async function getEffectiveCatalog(): Promise<CatalogItem[]> {
  const now = Date.now();
  if (cachedCatalog && now < cacheExpiresAt) {
    return cachedCatalog;
  }

  if (!prisma?.productVisibility?.findMany) {
    return CATALOG.map((item) => ({ ...item, isHidden: item.isHidden ?? false }));
  }

  if (cachedCatalog) {
    if (!refreshing) {
      // 실패해도 매 요청마다 다시 시도하지 않게 만료 시각을 먼저 민다
      cacheExpiresAt = now + CACHE_TTL_MS;
      refreshing = loadEffectiveCatalog()
        .then((effective) => {
          cachedCatalog = effective;
          cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        })
        .catch((error) => {
          console.warn("[getEffectiveCatalog] 뒤에서 새로 고침 실패, 이전 값을 유지합니다:", error);
        })
        .finally(() => {
          refreshing = null;
        });
    }
    return cachedCatalog;
  }

  try {
    const effective = await loadEffectiveCatalog();
    cachedCatalog = effective;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return effective;
  } catch (error) {
    console.warn("[getEffectiveCatalog] DB 조회 실패, 코드 기본값으로 폴백합니다:", error);
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

