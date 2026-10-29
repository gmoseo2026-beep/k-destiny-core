import { getProduct, seasonPriceAt, type CatalogItem } from "@/lib/catalog";
import { toCatalogId } from "@/lib/productIdentity";

export const SET_UPGRADE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MIN_UPGRADE_AMOUNT = 100;

export interface SourceOrderForUpgrade {
  id: string;
  orderId: string;
  userId: string | null;
  status: string;
  amount: number;
  compatId: string | null;
  productType: string | null;
  productKey: string | null;
  createdAt: Date | string;
  upgradeFromOrderId?: string | null;
}

export interface UpgradeOrderForSettlement {
  id: string;
  orderId: string;
  amount: number;
  compatId: string | null;
  productType: string | null;
  productKey: string | null;
  createdAt?: Date | string | null;
  upgradeFromOrderId: string;
}

export type SetUpgradeRejectReason =
  | "FORBIDDEN"
  | "NOT_PAID"
  | "EXPIRED"
  | "COMPAT_MISMATCH"
  | "NOT_IN_SET"
  | "ALREADY_UPGRADED";

export type ValidateSetUpgradeResult =
  | {
      ok: true;
      amount: number;
      paidAmount: number;
      setPrice: number;
      sourceCatalogId: string;
      sourceOrderId: string;
    }
  | {
      ok: false;
      status: 400 | 403 | 409;
      reason: SetUpgradeRejectReason;
      error: string;
    };

/** 서버 차액 계산: 세트 가격 − 이미 낸 금액 (최소 100원). 클라이언트 금액은 절대 신뢰하지 않는다. */
export function computeSetUpgradeAmount(setPrice: number, paidAmount: number): number {
  const safeSet = Number.isFinite(setPrice) ? Math.round(setPrice) : 0;
  const safePaid = Number.isFinite(paidAmount) ? Math.round(paidAmount) : 0;
  return Math.max(MIN_UPGRADE_AMOUNT, safeSet - safePaid);
}

/** 화면 안내 문구: "이미 낸 4,900원은 빼고 3,000원만 내면 세트로 바뀌어요" */
export function formatSetUpgradeHeadline(paidAmount: number, diffAmount: number): string {
  return `이미 낸 ${paidAmount.toLocaleString("ko-KR")}원은 빼고 ${diffAmount.toLocaleString("ko-KR")}원만 내면 세트로 바뀌어요`;
}

export function validateSetUpgrade(params: {
  sourceOrder: SourceOrderForUpgrade;
  targetSet: CatalogItem;
  sessionUserId: string | null;
  presentedOrderToken: string | null;
  guestOrderTokens?: readonly string[];
  requestedCompatId: string | null;
  alreadyUpgraded: boolean;
  now?: number;
}): ValidateSetUpgradeResult {
  const {
    sourceOrder,
    targetSet,
    sessionUserId,
    presentedOrderToken,
    guestOrderTokens,
    requestedCompatId,
    alreadyUpgraded,
    now = Date.now(),
  } = params;

  // 1) 같은 소유자 검증 (회원 userId 일치 필수 / 비회원 orderId 베어러 토큰 일치 필수)
  if (sourceOrder.userId) {
    if (!sessionUserId || sessionUserId !== sourceOrder.userId) {
      return {
        ok: false,
        status: 403,
        reason: "FORBIDDEN",
        error: "본인이 결제한 주문만 세트로 바꿀 수 있어요.",
      };
    }
  } else {
    const tokenMatched =
      Boolean(presentedOrderToken) &&
      Boolean(sourceOrder.orderId) &&
      presentedOrderToken === sourceOrder.orderId;
    const memberHasGuestToken =
      !sessionUserId || (Array.isArray(guestOrderTokens) && guestOrderTokens.includes(sourceOrder.orderId));
    if (!tokenMatched || !memberHasGuestToken) {
      return {
        ok: false,
        status: 403,
        reason: "FORBIDDEN",
        error: "결제한 기기에서만 세트로 바꿀 수 있어요.",
      };
    }
  }

  // 2) PAID 상태 검증
  if (sourceOrder.status !== "PAID") {
    return {
      ok: false,
      status: 400,
      reason: "NOT_PAID",
      error: "결제가 완료된 주문만 세트로 바꿀 수 있어요.",
    };
  }

  // 3) 24시간 이내 검증
  const createdMs = new Date(sourceOrder.createdAt).getTime();
  const elapsed = now - createdMs;
  if (!Number.isFinite(createdMs) || elapsed > SET_UPGRADE_WINDOW_MS || elapsed < -60_000) {
    return {
      ok: false,
      status: 400,
      reason: "EXPIRED",
      error: "단품 결제 후 24시간 이내에만 차액으로 세트를 열 수 있어요.",
    };
  }

  // 4) 같은 compatId 검증
  if ((sourceOrder.compatId ?? null) !== (requestedCompatId ?? null)) {
    return {
      ok: false,
      status: 400,
      reason: "COMPAT_MISMATCH",
      error: "같은 대상의 리포트에서만 세트로 바꿀 수 있어요.",
    };
  }

  // 5) 단품 → 그 단품이 포함된 세트 검증
  if (sourceOrder.upgradeFromOrderId) {
    return {
      ok: false,
      status: 400,
      reason: "NOT_IN_SET",
      error: "이미 세트로 바꾼 주문은 다시 업그레이드할 수 없어요.",
    };
  }

  const sourceCatalogId = toCatalogId(
    sourceOrder.productType,
    sourceOrder.productKey,
    sourceOrder.compatId
  );
  const sourceProduct = sourceCatalogId ? getProduct(sourceCatalogId) : undefined;
  if (
    !sourceCatalogId ||
    !sourceProduct ||
    sourceProduct.type === "SET" ||
    sourceProduct.isFree ||
    targetSet.type !== "SET" ||
    !Array.isArray(targetSet.items) ||
    !targetSet.items.includes(sourceCatalogId)
  ) {
    return {
      ok: false,
      status: 400,
      reason: "NOT_IN_SET",
      error: "결제한 단품이 포함된 세트만 선택할 수 있어요.",
    };
  }

  // 6) 이중 업그레이드 거부
  if (alreadyUpgraded) {
    return {
      ok: false,
      status: 409,
      reason: "ALREADY_UPGRADED",
      error: "이미 세트로 업그레이드한 주문이에요.",
    };
  }

  const setPrice = seasonPriceAt(targetSet.id, now)?.price ?? targetSet.price;
  const amount = computeSetUpgradeAmount(setPrice, sourceOrder.amount);

  return {
    ok: true,
    amount,
    paidAmount: sourceOrder.amount,
    setPrice,
    sourceCatalogId,
    sourceOrderId: sourceOrder.orderId,
  };
}

/**
 * 결제 완료(/api/payments/complete) 및 포트원 웹훅(/api/webhooks/portone) 공통 정산 검증.
 * Order.upgradeFromOrderId 가 설정된 주문은 PG 실결제 금액이 서버 차액 산식과 정확히 일치하고,
 * 원본 단품 주문이 여전히 PAID 이며, 다른 주문으로 이중 업그레이드되지 않았을 때만 승인한다.
 */
export function verifyUpgradeSettlement(params: {
  upgradeOrder: UpgradeOrderForSettlement;
  sourceOrder: SourceOrderForUpgrade | null;
  pgPaidTotal: number;
  alreadyUpgradedByAnotherOrder: boolean;
}): { ok: true; expectedAmount: number } | { ok: false; reason: string } {
  const { upgradeOrder, sourceOrder, pgPaidTotal, alreadyUpgradedByAnotherOrder } = params;

  if (!sourceOrder) {
    return { ok: false, reason: "SOURCE_NOT_FOUND" };
  }
  if (sourceOrder.status !== "PAID") {
    return { ok: false, reason: "SOURCE_NOT_PAID" };
  }
  if (sourceOrder.upgradeFromOrderId) {
    return { ok: false, reason: "SOURCE_ALREADY_UPGRADE_ORDER" };
  }
  if (alreadyUpgradedByAnotherOrder) {
    return { ok: false, reason: "ALREADY_UPGRADED" };
  }
  if ((sourceOrder.compatId ?? null) !== (upgradeOrder.compatId ?? null)) {
    return { ok: false, reason: "COMPAT_MISMATCH" };
  }

  const targetCatalogId = toCatalogId(
    upgradeOrder.productType,
    upgradeOrder.productKey,
    upgradeOrder.compatId
  );
  const sourceCatalogId = toCatalogId(
    sourceOrder.productType,
    sourceOrder.productKey,
    sourceOrder.compatId
  );
  const targetSet = targetCatalogId ? getProduct(targetCatalogId) : undefined;
  const sourceProduct = sourceCatalogId ? getProduct(sourceCatalogId) : undefined;

  if (
    !targetSet ||
    targetSet.type !== "SET" ||
    !sourceCatalogId ||
    !sourceProduct ||
    sourceProduct.type === "SET" ||
    sourceProduct.isFree ||
    !Array.isArray(targetSet.items) ||
    !targetSet.items.includes(sourceCatalogId)
  ) {
    return { ok: false, reason: "NOT_IN_SET" };
  }

  const orderCreatedMs = upgradeOrder.createdAt
    ? new Date(upgradeOrder.createdAt).getTime()
    : Date.now();
  const sourceCreatedMs = new Date(sourceOrder.createdAt).getTime();
  if (
    Number.isFinite(orderCreatedMs) &&
    Number.isFinite(sourceCreatedMs) &&
    orderCreatedMs - sourceCreatedMs > SET_UPGRADE_WINDOW_MS
  ) {
    return { ok: false, reason: "EXPIRED" };
  }

  const setPrice = seasonPriceAt(targetSet.id, orderCreatedMs)?.price ?? targetSet.price;
  const expectedAmount = computeSetUpgradeAmount(setPrice, sourceOrder.amount);

  if (upgradeOrder.amount !== expectedAmount || pgPaidTotal !== expectedAmount) {
    return { ok: false, reason: "AMOUNT_MISMATCH" };
  }

  return { ok: true, expectedAmount };
}
