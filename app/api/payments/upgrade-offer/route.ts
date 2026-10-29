import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { isViewableFor } from "@/lib/catalog";
import { getEffectiveCatalog } from "@/lib/catalogVisibility";
import { canPreview } from "@/lib/preview";
import { toCatalogId, toStorageKey } from "@/lib/productIdentity";
import {
  SET_UPGRADE_WINDOW_MS,
  validateSetUpgrade,
  formatSetUpgradeHeadline,
} from "@/lib/payments/setUpgrade";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id ?? null;
    const preview = canPreview(session?.user?.email);

    const body = await req.json().catch(() => ({}));
    const rawOrderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    const rawCatalogId = typeof body?.catalogId === "string" ? body.catalogId.trim() : "";
    const rawCompatId =
      typeof body?.compatId === "string" && body.compatId.trim() ? body.compatId.trim() : null;
    const guestOrderTokens: string[] = Array.isArray(body?.guestOrderTokens)
      ? body.guestOrderTokens
          .filter((t: unknown): t is string => typeof t === "string" && t.length > 0 && t.length <= 100)
          .slice(0, 20)
      : [];

    const now = Date.now();
    const cutoff = new Date(now - SET_UPGRADE_WINDOW_MS);

    let sourceOrder = null;

    if (rawOrderId) {
      sourceOrder = await prisma.order.findUnique({
        where: { orderId: rawOrderId },
      });
    } else if (sessionUserId && rawCatalogId) {
      let storage: { productType: string; productKey: string } | null = null;
      try {
        storage = toStorageKey(rawCatalogId);
      } catch {
        storage = null;
      }
      if (storage) {
        sourceOrder = await prisma.order.findFirst({
          where: {
            userId: sessionUserId,
            status: "PAID",
            upgradeFromOrderId: null,
            productType: storage.productType,
            productKey: storage.productKey,
            compatId: rawCompatId,
            createdAt: { gte: cutoff },
          },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    if (!sourceOrder) {
      return NextResponse.json({ eligible: false, offers: [] }, { headers: NO_STORE });
    }
    // 선물로 산 주문은 보낸 사람에게 열람권이 없으므로 업그레이드 대상이 아니다
    const sourceIsGift = await prisma.giftCode.findUnique({
      where: { purchaseOrderId: sourceOrder.orderId },
      select: { id: true },
    });
    if (sourceIsGift) {
      return NextResponse.json({ eligible: false, offers: [] }, { headers: NO_STORE });
    }

    const existingPaidUpgrade = await prisma.order.findFirst({
      where: { upgradeFromOrderId: sourceOrder.orderId, status: "PAID" },
      select: { id: true },
    });
    if (existingPaidUpgrade) {
      return NextResponse.json({ eligible: false, offers: [] }, { headers: NO_STORE });
    }

    const sourceCatalogId = toCatalogId(
      sourceOrder.productType,
      sourceOrder.productKey,
      sourceOrder.compatId
    );
    if (!sourceCatalogId) {
      return NextResponse.json({ eligible: false, offers: [] }, { headers: NO_STORE });
    }

    const effectiveCatalog = await getEffectiveCatalog();
    const candidateSets = effectiveCatalog.filter(
      (item) =>
        isViewableFor(item, preview) &&
        item.type === "SET" &&
        Array.isArray(item.items) &&
        item.items.includes(sourceCatalogId)
    );

    if (candidateSets.length === 0) {
      return NextResponse.json({ eligible: false, offers: [] }, { headers: NO_STORE });
    }

    // 이미 보유 중인 세트는 추천에서 제외
    const ownedSetIds = new Set<string>();
    const unlockOwnerClauses: Array<Record<string, unknown>> = [];
    if (sessionUserId) {
      unlockOwnerClauses.push({ userId: sessionUserId });
    }
    const tokenList = [...new Set([rawOrderId, ...guestOrderTokens].filter(Boolean))];
    if (tokenList.length > 0) {
      unlockOwnerClauses.push({ order: { orderId: { in: tokenList }, status: "PAID" } });
    }
    if (unlockOwnerClauses.length > 0) {
      const activeUnlocks = await prisma.unlock.findMany({
        where: {
          productType: "SET",
          compatId: sourceOrder.compatId ?? null,
          OR: unlockOwnerClauses,
        },
        select: { productKey: true, expiresAt: true },
      });
      for (const u of activeUnlocks) {
        if (u.productKey && (!u.expiresAt || u.expiresAt.getTime() > now)) {
          ownedSetIds.add(u.productKey);
        }
      }
    }

    const presentedOrderToken = rawOrderId || sourceOrder.orderId;
    const effectiveGuestTokens =
      rawOrderId && !guestOrderTokens.includes(rawOrderId)
        ? [...guestOrderTokens, rawOrderId]
        : guestOrderTokens;

    const offers = [];
    for (const setItem of candidateSets) {
      if (ownedSetIds.has(setItem.id)) continue;
      const check = validateSetUpgrade({
        sourceOrder,
        targetSet: setItem,
        sessionUserId,
        presentedOrderToken,
        guestOrderTokens: effectiveGuestTokens,
        requestedCompatId: sourceOrder.compatId ?? null,
        alreadyUpgraded: false,
        now,
      });
      if (!check.ok) continue;
      offers.push({
        setId: setItem.id,
        setName: setItem.name,
        setDescription: setItem.description,
        setPrice: check.setPrice,
        paidAmount: check.paidAmount,
        diffAmount: check.amount,
        headline: formatSetUpgradeHeadline(check.paidAmount, check.amount),
      });
    }

    offers.sort((a, b) => a.diffAmount - b.diffAmount);

    if (offers.length === 0) {
      return NextResponse.json({ eligible: false, offers: [] }, { headers: NO_STORE });
    }

    const expiresAt = new Date(
      new Date(sourceOrder.createdAt).getTime() + SET_UPGRADE_WINDOW_MS
    ).toISOString();

    return NextResponse.json(
      {
        eligible: true,
        fromCatalogId: sourceCatalogId,
        upgradeFromOrderId: sourceOrder.orderId,
        compatId: sourceOrder.compatId ?? null,
        paidAmount: sourceOrder.amount,
        expiresAt,
        offers,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    console.error("[payments/upgrade-offer]", e);
    return NextResponse.json({ eligible: false, offers: [] }, { status: 200, headers: NO_STORE });
  }
}
