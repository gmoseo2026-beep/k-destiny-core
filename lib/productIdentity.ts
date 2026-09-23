import { CATALOG, getProduct } from "@/lib/catalog";

const ANNUAL_ID = /^annual_(\d{4})$/;

/** DB의 (productType, productKey) → 카탈로그 id. 레거시 행 호환의 유일한 지점. */
export function toCatalogId(productType: string | null, productKey: string | null, compatId: string | null): string | null {
  if (productType === "ANNUAL" && productKey && /^\d{4}$/.test(productKey)) return `annual_${productKey}`;
  if (!productType && compatId) return "compat_basic"; // 초기 궁합 주문
  if (productType === "COMPAT" && !productKey) return "compat_basic";
  return productKey ?? null;
}

/** 카탈로그 id → 주문/Unlock 저장 형식. annual 은 기존 운영 데이터 호환을 위해 ("ANNUAL","2026") 유지. */
export function toStorageKey(catalogId: string): { productType: string; productKey: string } {
  const m = ANNUAL_ID.exec(catalogId);
  if (m) return { productType: "ANNUAL", productKey: m[1] };
  const p = getProduct(catalogId);
  if (!p) throw new Error(`unknown catalogId: ${catalogId}`);
  return { productType: p.type, productKey: p.id };
}

/** catalogId 를 열람하게 해 주는 카탈로그 id 목록: 자기 자신 + 이를 포함한 세트 */
export function grantingCatalogIds(catalogId: string): string[] {
  const sets = CATALOG.filter((c) => c.type === "SET" && c.items?.includes(catalogId)).map((c) => c.id);
  return [catalogId, ...sets];
}

export function normalizeProductKey(key: string): string {
  const m = /^ANNUAL:(\d{4})$/.exec(key);
  return m ? `annual_${m[1]}` : key;
}
