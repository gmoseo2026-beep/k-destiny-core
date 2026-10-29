import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getProduct } from "@/lib/catalog";
import { toStorageKey } from "@/lib/productIdentity";
import { GIFT_EXPIRY_MS } from "@/lib/giftCopy";

export interface GiftCreateInput {
  recipientNickname: string;
  senderNickname?: string | null;
  message?: string | null;
}

export interface ValidatedGiftInput {
  recipientNickname: string;
  senderNickname: string | null;
  message: string | null;
}

export type GiftRedeemFailureReason =
  | "NOT_FOUND"
  | "UNPAID"
  | "CATALOG_MISMATCH"
  | "INVALID_PRODUCT"
  | "ALREADY_USED"
  | "EXPIRED"
  | "COMPAT_REQUIRED"
  | "COMPAT_NOT_FOUND";

export type GiftRedeemResult =
  | {
      ok: true;
      orderId: string;
      catalogId: string;
      compatId: string | null;
    }
  | {
      ok: false;
      status: number;
      reason: GiftRedeemFailureReason;
      error: string;
    };

class GiftRaceConflictError extends Error {
  constructor() {
    super("GIFT_ALREADY_USED");
  }
}

/** 추측 불가능한 128비트 선물 코드 생성 (32자 hex) */
export function generateGiftCode(): string {
  return crypto.randomBytes(16).toString("hex");
}

function cleanText(raw: unknown, maxLen: number): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function validateGiftCreateInput(input: {
  recipientNickname?: unknown;
  senderNickname?: unknown;
  message?: unknown;
}): { ok: true; data: ValidatedGiftInput } | { ok: false; error: string } {
  const recipientNickname = cleanText(input.recipientNickname, 20);
  if (!recipientNickname) {
    return { ok: false, error: "받는 분의 애칭을 입력해 주세요." };
  }
  const senderNickname = cleanText(input.senderNickname, 20) || null;
  const message = cleanText(input.message, 80) || null;
  return {
    ok: true,
    data: {
      recipientNickname,
      senderNickname,
      message,
    },
  };
}

export function computeGiftExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + GIFT_EXPIRY_MS);
}

/**
 * 선물 코드 수령(사용) 처리.
 * - 구매 주문이 PAID 상태인지 확인 (미결제·환불 코드 거부)
 * - 지정 상품(catalogId)과 일치하는지 확인 (다른 상품으로 사용 거부)
 * - 만료일(결제일부터 90일) 이내인지 확인
 * - 트랜잭션 + updateMany(where used=false)로 정확히 1회만 사용 허용
 * - 수령자 전용 Order(amount=0, provider="gift_redeem") + Unlock 발급 (보낸 사람과 완전 분리)
 */
export async function redeemGiftCode(params: {
  code: string;
  catalogId: string;
  compatId?: string | null;
  userId?: string | null;
  email?: string | null;
  now?: Date;
}): Promise<GiftRedeemResult> {
  const now = params.now ?? new Date();
  const code = typeof params.code === "string" ? params.code.trim() : "";
  const requestedCatalogId = typeof params.catalogId === "string" ? params.catalogId.trim() : "";

  if (!code || !/^[a-f0-9]{16,64}$/i.test(code)) {
    return {
      ok: false,
      status: 404,
      reason: "NOT_FOUND",
      error: "선물 코드를 찾을 수 없어요.",
    };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const gift = await tx.giftCode.findUnique({ where: { code } });
      if (!gift) {
        return {
          ok: false,
          status: 404,
          reason: "NOT_FOUND",
          error: "선물 코드를 찾을 수 없어요.",
        };
      }

      const purchaseOrder = await tx.order.findUnique({
        where: { orderId: gift.purchaseOrderId },
      });
      if (!purchaseOrder || purchaseOrder.status !== "PAID") {
        return {
          ok: false,
          status: 402,
          reason: "UNPAID",
          error: "결제가 완료되지 않았거나 취소된 선물 코드예요.",
        };
      }

      if (!requestedCatalogId || gift.catalogId !== requestedCatalogId) {
        return {
          ok: false,
          status: 400,
          reason: "CATALOG_MISMATCH",
          error: "선물받은 상품과 다른 상품으로는 사용할 수 없어요.",
        };
      }

      const product = getProduct(gift.catalogId);
      if (!product || product.isFree || product.price <= 0) {
        return {
          ok: false,
          status: 400,
          reason: "INVALID_PRODUCT",
          error: "유효하지 않은 선물 상품이에요.",
        };
      }

      if (gift.used) {
        return {
          ok: false,
          status: 409,
          reason: "ALREADY_USED",
          error: "이미 사용된 선물 코드예요.",
        };
      }

      if (new Date(gift.expiresAt).getTime() <= now.getTime()) {
        return {
          ok: false,
          status: 410,
          reason: "EXPIRED",
          error: "사용 기한(90일)이 지난 선물 코드예요.",
        };
      }

      let targetCompatId: string | null = null;
      if (product.target === "couple") {
        const cid = typeof params.compatId === "string" ? params.compatId.trim() : "";
        if (!cid) {
          return {
            ok: false,
            status: 400,
            reason: "COMPAT_REQUIRED",
            error: "두 분의 정보를 먼저 입력해 주세요.",
          };
        }
        const existingCompat = await tx.compatibility.findUnique({
          where: { id: cid },
          select: { id: true },
        });
        if (!existingCompat) {
          return {
            ok: false,
            status: 404,
            reason: "COMPAT_NOT_FOUND",
            error: "궁합 정보를 찾을 수 없어요.",
          };
        }
        targetCompatId = existingCompat.id;
      }

      const redeemedOrderId = `kd_gift_${crypto.randomBytes(16).toString("hex")}`;

      // 원자적 1회 사용 선점 (동시 요청에서도 1건만 count === 1)
      const claimed = await tx.giftCode.updateMany({
        where: {
          id: gift.id,
          used: false,
          expiresAt: { gt: now },
        },
        data: {
          used: true,
          redeemedAt: now,
          redeemedOrderId,
        },
      });

      if (claimed.count !== 1) {
        throw new GiftRaceConflictError();
      }

      const { productType, productKey } = toStorageKey(product.id);
      const accessDays = product.accessDays ?? 90;
      const unlockExpiresAt = new Date(now.getTime() + accessDays * 24 * 60 * 60 * 1000);

      const redeemedOrder = await tx.order.create({
        data: {
          orderId: redeemedOrderId,
          userId: params.userId ?? null,
          email: params.email ?? null,
          compatId: targetCompatId,
          productType,
          productKey,
          type: "SINGLE",
          amount: 0,
          status: "PAID",
          provider: "gift_redeem",
        },
      });

      await tx.unlock.create({
        data: {
          orderId: redeemedOrder.id,
          userId: params.userId ?? null,
          email: params.email ?? null,
          productType,
          productKey,
          compatId: targetCompatId,
          expiresAt: unlockExpiresAt,
        },
      });

      return {
        ok: true,
        orderId: redeemedOrder.orderId,
        catalogId: product.id,
        compatId: targetCompatId,
      };
    });
  } catch (err) {
    if (err instanceof GiftRaceConflictError) {
      return {
        ok: false,
        status: 409,
        reason: "ALREADY_USED",
        error: "이미 사용된 선물 코드예요.",
      };
    }
    throw err;
  }
}
