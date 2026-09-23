// 순수 함수 — DB 접근 금지. 모든 열람 판정의 단일 규칙(감사 B1·H1 근본 수정).
import { getProduct } from "@/lib/catalog";
import { toCatalogId, grantingCatalogIds } from "@/lib/productIdentity";

export interface UnlockRow {
  productType: string | null;
  productKey: string | null;
  compatId: string | null;
  expiresAt: Date | null;
}

export interface GrantRequest {
  catalogId: string;
  compatId: string | null;
  now: Date;
}

export function unlockGrants(u: UnlockRow, req: GrantRequest): boolean {
  const product = getProduct(req.catalogId);
  if (!product) return false;
  const unlockCatalogId = toCatalogId(u.productType, u.productKey, u.compatId);
  if (!unlockCatalogId || !grantingCatalogIds(req.catalogId).includes(unlockCatalogId)) return false;
  // 관계 상품은 같은 궁합(compatId)에서만 — 상대 무제한 열람 차단(D1.1)
  if (product.target === "couple" && (!req.compatId || u.compatId !== req.compatId)) return false;
  // [M-5] 만료 판단의 유일한 출처는 Unlock.expiresAt. null 은 과거 수동 부여 행 호환.
  if (u.expiresAt && u.expiresAt.getTime() <= req.now.getTime()) return false;
  return true;
}

export interface OrderSnapshot {
  orderId: string;
  userId: string | null;
  status: string;
  unlocks: UnlockRow[];
}

export type OrderGrantResult =
  | { ok: true; unlock: UnlockRow }
  | { ok: false; reason: "FORBIDDEN" | "NOT_PAID" | "NO_GRANT" };

export function orderGrants(
  order: OrderSnapshot,
  req: GrantRequest & { sessionUserId: string | null; presentedOrderId: string | null }
): OrderGrantResult {
  // [H-2] 소유 증명: 세션이 주문 주인과 같거나, 추측 불가한 orderId 를 제시한 경우만
  const bySession = !!order.userId && order.userId === req.sessionUserId;
  const byBearer = req.presentedOrderId === order.orderId;
  if (!bySession && !byBearer) return { ok: false, reason: "FORBIDDEN" };
  if (order.status !== "PAID") return { ok: false, reason: "NOT_PAID" };
  const unlock = order.unlocks.find((x) => unlockGrants(x, req));
  return unlock ? { ok: true, unlock } : { ok: false, reason: "NO_GRANT" };
}
