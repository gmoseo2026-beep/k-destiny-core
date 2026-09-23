import { getProduct } from "@/lib/catalog";
import { toCatalogId } from "@/lib/productIdentity";

export interface OrderLike {
  id: string;
  orderId: string;
  compatId: string | null;
  createdAt: Date;
  unlocks: Array<{
    productType: string | null;
    productKey: string | null;
    compatId: string | null;
    expiresAt: Date | null;
  }>;
}
export interface MineRow {
  catalogId: string;
  compatId: string | null;
  cacheKey: string;
}

/** 주문의 Unlock 을 "열람 가능한 상품 단위"로 펼친다. 세트는 구성품으로, annual 은 annual_YYYY 로. */
export function expandOrderReports(order: OrderLike): MineRow[] {
  return order.unlocks.flatMap((u) => {
    const cid = toCatalogId(u.productType, u.productKey, u.compatId);
    if (!cid) return [];
    const p = getProduct(cid);
    const items = p?.type === "SET" ? p.items ?? [] : [cid];
    return items.map((item) => ({
      catalogId: item,
      compatId: u.compatId,
      cacheKey: `FULL:${order.id}:${item}`,
    }));
  });
}
