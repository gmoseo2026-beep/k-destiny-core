import { CatalogItem } from "@/lib/catalog";
import { getEffectiveVisibleCatalog } from "@/lib/catalogVisibility";
import { toCatalogId } from "@/lib/productIdentity";

export interface OrderRowForRanking {
  productType: string | null;
  productKey: string | null;
  compatId: string | null;
  status: string;
  amount: number;
  provider: string;
}

export interface HomeRankingResult {
  title: string;
  isRealRanking: boolean;
  items: Array<{
    product: CatalogItem;
    rank?: number; // 1, 2, 3, 4 (only present if isRealRanking === true)
  }>;
}

/**
 * 순수 함수: 주문 목록과 가시적 상품 목록을 기반으로 랭킹 산출
 * - 최근 30일 유효 결제가 20건 이상이고 집계된 상품이 4개 이상이면 상위 4개 상품을 1~4위로 반환
 * - 20건 미만이면 "콩닥 추천 콘텐츠"로 제목을 바꾸고 순위 숫자 없이 featuredOrder 순으로 4개 반환
 */
export function computeHomeRanking(
  orders: OrderRowForRanking[],
  visibleProducts: CatalogItem[] = [],
  minThreshold: number = 20
): HomeRankingResult {
  const validOrders = orders.filter(
    (o) => o.status === "PAID" && o.amount > 0 && o.provider !== "admin_manual"
  );

  if (validOrders.length >= minThreshold) {
    const countMap: Record<string, number> = {};
    for (const o of validOrders) {
      const catId = toCatalogId(o.productType, o.productKey, o.compatId);
      if (catId) {
        countMap[catId] = (countMap[catId] || 0) + 1;
      }
    }

    const visibleWithCount = visibleProducts
      .filter((p) => (countMap[p.id] || 0) > 0)
      .sort((a, b) => {
        const countDiff = (countMap[b.id] || 0) - (countMap[a.id] || 0);
        if (countDiff !== 0) return countDiff;
        return (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99);
      });

    if (visibleWithCount.length >= 4) {
      return {
        title: "지금 많이 보는 콘텐츠",
        isRealRanking: true,
        items: visibleWithCount.slice(0, 4).map((product, idx) => ({
          product,
          rank: idx + 1,
        })),
      };
    }
  }

  // 20건 미만 또는 집계 가능 상품 부족 시 fallback
  const fallback = [...visibleProducts]
    .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99))
    .slice(0, 4);

  return {
    title: "콩닥 추천 콘텐츠",
    isRealRanking: false,
    items: fallback.map((product) => ({
      product,
    })),
  };
}

export interface PrismaClientForRanking {
  order: {
    findMany: (args: {
      where: Record<string, unknown>;
      select: Record<string, boolean>;
    }) => Promise<OrderRowForRanking[]>;
  };
}

/**
 * DB에서 최근 30일 PAID 주문 조회
 */
export async function fetchHomeRanking(
  prismaClient: unknown,
  visibleProducts?: CatalogItem[]
): Promise<HomeRankingResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const targetVisibleProducts = visibleProducts ?? (await getEffectiveVisibleCatalog());
  try {
    const client = prismaClient as {
      order: {
        findMany: (args: {
          where: Record<string, unknown>;
          select: Record<string, boolean>;
        }) => Promise<OrderRowForRanking[]>;
      };
    };
    const orders = await client.order.findMany({
      where: {
        status: "PAID",
        amount: { gt: 0 },
        provider: { not: "admin_manual" },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        productType: true,
        productKey: true,
        compatId: true,
        status: true,
        amount: true,
        provider: true,
      },
    });

    return computeHomeRanking(orders, targetVisibleProducts);
  } catch (e) {
    console.error("[fetchHomeRanking] Error fetching orders, using fallback:", e);
    return computeHomeRanking([], targetVisibleProducts);
  }
}
