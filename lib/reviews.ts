import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getProduct } from "@/lib/catalog";
import { ZODIAC, zodiacOfYear } from "@/lib/seo/zodiac";
import type { PublicReviewItem } from "@/lib/couponsClient";

export const COUPON_AMOUNT = 1000;
export const COUPON_TTL_DAYS = 30;
export const REVIEW_MAX_LEN = 200;

/** 비회원 주문 토큰(order.orderId)의 SHA-256 해시 */
export function hashGuestOrderToken(orderToken: string): string {
  return crypto.createHash("sha256").update(orderToken.trim()).digest("hex");
}

/**
 * 주문 소유자의 쿠폰 ownerKey 생성:
 * - 회원 주문: userId (문자열 그대로)
 * - 비회원 주문: 주문 토큰(order.orderId)의 SHA-256 해시
 */
export function couponOwnerKeyForOrder(order: { userId?: string | null; orderId: string }): string {
  if (order.userId) return order.userId;
  return hashGuestOrderToken(order.orderId);
}

/** 요청자(회원 세션 또는 비회원 주문 토큰들)가 쓸 수 있는 ownerKey 후보 목록 */
export function buildCandidateOwnerKeys(opts: {
  userId?: string | null;
  guestOrderTokens?: string[];
}): string[] {
  const keys = new Set<string>();
  if (opts.userId) {
    keys.add(opts.userId);
    keys.add(`u:${opts.userId}`);
  }
  for (const raw of opts.guestOrderTokens ?? []) {
    if (typeof raw === "string" && raw.trim()) {
      const h = hashGuestOrderToken(raw.trim());
      keys.add(h);
      keys.add(`g:${h}`);
    }
  }
  return [...keys];
}

/** 고유 쿠폰 코드 생성 (예: KD1000-A1B2C3D4E5) */
export function generateCouponCode(): string {
  const rand = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `KD1000-${rand}`;
}

/** 후기 입력(rating 1~5 정수, text 1~200자) 검증 */
export function validateReviewInput(input: {
  rating?: unknown;
  text?: unknown;
}): { ok: true; rating: number; text: string } | { ok: false; error: string } {
  const r = typeof input.rating === "number" ? input.rating : Number(input.rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return { ok: false, error: "별점은 1점부터 5점까지 선택해 주세요." };
  }
  if (typeof input.text !== "string") {
    return { ok: false, error: "후기 내용을 입력해 주세요." };
  }
  const trimmed = input.text.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "후기를 두 글자 이상 입력해 주세요." };
  }
  if (trimmed.length > REVIEW_MAX_LEN) {
    return { ok: false, error: `후기는 ${REVIEW_MAX_LEN}자 이내로 작성해 주세요.` };
  }
  return { ok: true, rating: r, text: trimmed };
}

/** 사주 연주(예: "甲子") 또는 출생연도에서 띠 이모지·이름 추출 (가짜 동물 생성 금지) */
export function deriveZodiacBadge(ctx: {
  yearPillar?: string | null;
  birthYear?: string | number | null;
}): { emoji: string; label: string } {
  if (typeof ctx.yearPillar === "string" && ctx.yearPillar.length >= 2) {
    const branch = ctx.yearPillar[1];
    const match = ZODIAC.find((z) => z.branch === branch);
    if (match) {
      return { emoji: match.emoji, label: `${match.name}띠` };
    }
  }
  if (ctx.birthYear !== null && ctx.birthYear !== undefined && ctx.birthYear !== "") {
    const yr = typeof ctx.birthYear === "number" ? ctx.birthYear : parseInt(String(ctx.birthYear), 10);
    if (Number.isFinite(yr) && yr >= 1900 && yr <= 2100) {
      const z = zodiacOfYear(yr);
      return { emoji: z.emoji, label: `${z.name}띠` };
    }
  }
  return { emoji: "✨", label: "구매자" };
}

/** 서버에서 쿠폰 금액을 차감한 최종 결제 금액 계산 (최소 결제 금액 100원 보장) */
export function calculateDiscountedAmount(basePrice: number, couponAmount: number = COUPON_AMOUNT): {
  amount: number;
  discount: number;
} {
  const safeCoupon = Math.max(0, Math.floor(couponAmount));
  const maxDiscount = Math.max(0, basePrice - 100);
  const discount = Math.min(safeCoupon, maxDiscount);
  return {
    amount: basePrice - discount,
    discount,
  };
}

export interface UsableCoupon {
  id: string;
  code: string;
  amount: number;
  ownerKey: string;
  usedOrderId: string | null;
  expiresAt: Date;
}

/**
 * 주문 생성 또는 결제 창 열람 시 사용 가능한 쿠폰을 조회·검증한다.
 * - 만료(expiresAt <= now)된 쿠폰 제외
 * - 이미 PAID 된 주문에 쓰인 쿠폰(usedOrderId 가 PAID 주문) 제외
 * - PENDING(결제 중단) 주문에 걸려 있던 쿠폰은 다시 결제할 때 재사용 허용
 */
export async function findUsableCoupon(opts: {
  couponCode?: string | null;
  userId?: string | null;
  guestOrderTokens?: string[];
  now?: Date;
}): Promise<UsableCoupon | null> {
  const now = opts.now ?? new Date();
  const candidateKeys = buildCandidateOwnerKeys({
    userId: opts.userId,
    guestOrderTokens: opts.guestOrderTokens,
  });

  try {
    const couponRepo = (prisma as unknown as { coupon?: typeof prisma.coupon }).coupon;
    if (!couponRepo) return null;

    let coupon: UsableCoupon | null = null;
    const trimmedCode = typeof opts.couponCode === "string" ? opts.couponCode.trim() : "";

    if (trimmedCode && typeof couponRepo.findUnique === "function") {
      const found = await couponRepo.findUnique({
        where: { code: trimmedCode },
      });
      if (found && found.expiresAt > now) {
        // ownerKey 검증: 회원(userId) 또는 비회원 주문 토큰 해시(candidateKeys)와 일치해야만 허용
        if (candidateKeys.includes(found.ownerKey)) {
          coupon = found;
        }
      }
    }

    if (!coupon && candidateKeys.length > 0 && typeof couponRepo.findFirst === "function") {
      coupon = await couponRepo.findFirst({
        where: {
          ownerKey: { in: candidateKeys },
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!coupon) return null;

    if (coupon.usedOrderId) {
      const prevOrder = await prisma.order.findUnique({
        where: { orderId: coupon.usedOrderId },
        select: { status: true },
      });
      if (prevOrder?.status === "PAID") {
        return null;
      }
    }

    return coupon;
  } catch {
    // DB 테이블 미반영 또는 조회 실패 시 결제 흐름을 막지 않고 쿠폰 미적용으로 진행
    return null;
  }
}

/**
 * 상품 상세 · 결제 창에 노출할 실제 구매자 후기(displayOk=true) 목록 조회.
 * - 별점, 띠 이모지, 같은 사람의 실제 누적 구매 수("N번째 구매" 배지)를 계산해 반환.
 * - 후기가 0개면 빈 배열([])을 반환(UI에서 영역 숨김).
 */
export async function getPublicReviewsForCatalog(
  catalogId: string,
  limit: number = 10,
): Promise<PublicReviewItem[]> {
  try {
    const product = getProduct(catalogId);
    const targetIds =
      product?.type === "SET" && product.items?.length
        ? [catalogId, ...product.items]
        : [catalogId];

    const rows = await prisma.review.findMany({
      where: {
        catalogId: { in: targetIds },
        displayOk: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (rows.length === 0) return [];

    const orderIds = [...new Set(rows.map((r) => r.orderId))];
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true,
        orderId: true,
        userId: true,
        email: true,
        compatId: true,
      },
    });
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    const compatIds = [...new Set(orders.map((o) => o.compatId).filter((v): v is string => Boolean(v)))];
    const userIds = [...new Set(orders.map((o) => o.userId).filter((v): v is string => Boolean(v)))];

    const [compats, profiles] = await Promise.all([
      compatIds.length > 0
        ? prisma.compatibility.findMany({
            where: { id: { in: compatIds } },
            select: { id: true, personA: true },
          })
        : Promise.resolve([]),
      userIds.length > 0
        ? prisma.userSajuProfile.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, birthYear: true, fourPillars: true },
          })
        : Promise.resolve([]),
    ]);

    const compatMap = new Map(compats.map((c) => [c.id, c]));
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    // 같은 사람의 실제 누적 PAID 주문 수 계산
    const paidOrdersForUsers =
      userIds.length > 0
        ? await prisma.order.findMany({
            where: { userId: { in: userIds }, status: "PAID" },
            select: { userId: true },
          })
        : [];
    const userPaidCount = new Map<string, number>();
    for (const o of paidOrdersForUsers) {
      if (o.userId) userPaidCount.set(o.userId, (userPaidCount.get(o.userId) ?? 0) + 1);
    }

    const paidOrdersForCompats =
      compatIds.length > 0
        ? await prisma.order.findMany({
            where: { compatId: { in: compatIds }, status: "PAID" },
            select: { compatId: true },
          })
        : [];
    const compatPaidCount = new Map<string, number>();
    for (const o of paidOrdersForCompats) {
      if (o.compatId) compatPaidCount.set(o.compatId, (compatPaidCount.get(o.compatId) ?? 0) + 1);
    }

    return rows.map((r) => {
      const ord = orderMap.get(r.orderId);
      const compat = ord?.compatId ? compatMap.get(ord.compatId) : undefined;
      const profile = ord?.userId ? profileMap.get(ord.userId) : undefined;

      const personA = (compat?.personA ?? null) as { fourPillars?: { year?: string } } | null;
      const profilePillars = (profile?.fourPillars ?? null) as { year?: string } | null;
      const yearPillar = personA?.fourPillars?.year || profilePillars?.year || null;
      const birthYear = profile?.birthYear || null;

      const zodiac = deriveZodiacBadge({ yearPillar, birthYear });

      let purchaseCount = 1;
      if (ord?.userId && userPaidCount.has(ord.userId)) {
        purchaseCount = Math.max(1, userPaidCount.get(ord.userId)!);
      } else if (ord?.compatId && compatPaidCount.has(ord.compatId)) {
        purchaseCount = Math.max(1, compatPaidCount.get(ord.compatId)!);
      }

      return {
        id: r.id,
        catalogId: r.catalogId,
        rating: r.rating,
        text: r.text,
        zodiacEmoji: zodiac.emoji,
        zodiacLabel: zodiac.label,
        purchaseCount,
        createdAt: r.createdAt.toISOString(),
      };
    });
  } catch {
    return [];
  }
}

/**
 * 홈 피드에 보여 줄 최근 공개 후기(displayOk=true) 목록 조회.
 * 후기가 0개면 빈 배열([])을 반환해 영역 자체를 숨긴다.
 */
export async function getRecentPublicReviews(limit: number = 6): Promise<PublicReviewItem[]> {
  try {
    const rows = await prisma.review.findMany({
      where: { displayOk: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    if (rows.length === 0) return [];

    const orderIds = [...new Set(rows.map((r) => r.orderId))];
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, orderId: true, userId: true, compatId: true },
    });
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const compatIds = [...new Set(orders.map((o) => o.compatId).filter((v): v is string => Boolean(v)))];
    const userIds = [...new Set(orders.map((o) => o.userId).filter((v): v is string => Boolean(v)))];

    const [compats, profiles] = await Promise.all([
      compatIds.length > 0
        ? prisma.compatibility.findMany({
            where: { id: { in: compatIds } },
            select: { id: true, personA: true },
          })
        : Promise.resolve([]),
      userIds.length > 0
        ? prisma.userSajuProfile.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, birthYear: true, fourPillars: true },
          })
        : Promise.resolve([]),
    ]);
    const compatMap = new Map(compats.map((c) => [c.id, c]));
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const paidOrdersForUsers =
      userIds.length > 0
        ? await prisma.order.findMany({
            where: { userId: { in: userIds }, status: "PAID" },
            select: { userId: true },
          })
        : [];
    const userPaidCount = new Map<string, number>();
    for (const o of paidOrdersForUsers) {
      if (o.userId) userPaidCount.set(o.userId, (userPaidCount.get(o.userId) ?? 0) + 1);
    }

    return rows.map((r) => {
      const ord = orderMap.get(r.orderId);
      const compat = ord?.compatId ? compatMap.get(ord.compatId) : undefined;
      const profile = ord?.userId ? profileMap.get(ord.userId) : undefined;
      const personA = (compat?.personA ?? null) as { fourPillars?: { year?: string } } | null;
      const profilePillars = (profile?.fourPillars ?? null) as { year?: string } | null;
      const yearPillar = personA?.fourPillars?.year || profilePillars?.year || null;
      const birthYear = profile?.birthYear || null;
      const zodiac = deriveZodiacBadge({ yearPillar, birthYear });
      const purchaseCount =
        ord?.userId && userPaidCount.has(ord.userId)
          ? Math.max(1, userPaidCount.get(ord.userId)!)
          : 1;
      return {
        id: r.id,
        catalogId: r.catalogId,
        rating: r.rating,
        text: r.text,
        zodiacEmoji: zodiac.emoji,
        zodiacLabel: zodiac.label,
        purchaseCount,
        createdAt: r.createdAt.toISOString(),
      };
    });
  } catch {
    return [];
  }
}

/** 로그인 회원의 미사용 유효 쿠폰 장수 조회 (홈 상단 1줄 요약용) */
export async function countAvailableCouponsForUser(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const keys = buildCandidateOwnerKeys({ userId });
    return await prisma.coupon.count({
      where: {
        ownerKey: { in: keys },
        usedOrderId: null,
        expiresAt: { gt: new Date() },
      },
    });
  } catch {
    return 0;
  }
}
