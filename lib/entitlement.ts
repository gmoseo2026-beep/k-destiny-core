import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getProduct } from "@/lib/catalog";
import { grantingCatalogIds, normalizeProductKey, toStorageKey } from "@/lib/productIdentity";
import { unlockGrants } from "@/lib/entitlementRules";

export interface EntitlementResult {
  entitled: boolean;
  reason: "ADMIN" | "SUBSCRIPTION" | "UNLOCK" | "NONE";
}

const NONE: EntitlementResult = { entitled: false, reason: "NONE" };

export async function isEntitled(params: {
  userId?: string | null;
  role?: string | null;
  tier?: string | null;
  compatId?: string | null;
  email?: string | null;
  orderId?: string | null;
  productKey?: string | null; // "ANNUAL:2026" 또는 카탈로그 id
}): Promise<EntitlementResult> {
  const { userId, role, compatId, orderId, productKey } = params;
  if (role === "ADMIN") return { entitled: true, reason: "ADMIN" };

  // productKey 없이 compatId 만 오면 레거시 궁합 심층(deep-report) 요청 → compat_basic 으로만 해석
  const catalogId = productKey ? normalizeProductKey(productKey) : compatId ? "compat_basic" : null;
  const product = catalogId ? getProduct(catalogId) : undefined;

  // 레거시 기간권: passCovered 상품만(사장님 결정 D4). 상품 지정이 없는 호출(주간/데일리)은 기존대로 전체.
  if (userId && (!catalogId || product?.passCovered)) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true, premiumEndDate: true } });
    if (user?.tier === "PREMIUM" && (!user.premiumEndDate || user.premiumEndDate > new Date())) {
      return { entitled: true, reason: "SUBSCRIPTION" };
    }
    const activeSub = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE", currentPeriodEnd: { gte: new Date() } },
      select: { id: true },
    });
    if (activeSub) return { entitled: true, reason: "SUBSCRIPTION" };
  }

  if (!catalogId || !product) return NONE; // 알 수 없는 상품 → fail-closed

  const req = { catalogId, compatId: compatId ?? null, now: new Date() };

  // [H-2] 게스트: orderId 제시(베어러)
  if (orderId) {
    const order = await prisma.order.findUnique({ where: { orderId }, include: { unlocks: true } });
    if (order?.status === "PAID" && order.unlocks.some((x) => unlockGrants(x, req))) {
      return { entitled: true, reason: "UNLOCK" };
    }
  }

  // 회원: 본인 Unlock 중 규칙을 통과하는 행
  if (userId) {
    const keys: Prisma.UnlockWhereInput[] = grantingCatalogIds(catalogId).map((id) => toStorageKey(id));
    if (catalogId === "compat_basic") {
      keys.push({ productType: null }, { productType: "COMPAT", productKey: null }); // 레거시 궁합 행
    }
    const unlocks = await prisma.unlock.findMany({
      where: { userId, OR: keys },
      select: { productType: true, productKey: true, compatId: true, expiresAt: true },
    });
    if (unlocks.some((x) => unlockGrants(x, req))) return { entitled: true, reason: "UNLOCK" };
  }

  // ⛔ 여기서 끝. 과거처럼 compatId 전용 분기로 폴스루하지 않는다(감사 B1).
  return NONE;
}
