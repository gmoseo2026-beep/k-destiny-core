import prisma from "@/lib/prisma";
import AdminDashboard from "./AdminDashboard";
import { getAdminSessionOrThrow } from "@/lib/adminAuth";
import { CATALOG, FIRST_PURCHASE_PRICE, getProduct } from "@/lib/catalog";
import { toCatalogId } from "@/lib/productIdentity";
import { resolveHidden } from "@/lib/catalogVisibility";
import { fetchVisitorCount } from "@/lib/home/visitors";

// 이메일 마스킹 헬퍼 (A2, A8)
function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const user = parts[0];
  const domain = parts[1];
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
}

async function loadAdminDashboardData() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);

  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  // 병렬 쿼리 수행
  const [
    orders,
    reportsRaw,
    failedReportsRaw,
    visibilities,
    visitorData,
    users,
    userSajuProfiles,
    recentAuditLogs,
    teaserCountGroup,
    fullCountGroup,
    totalUsers,
    todayUsers,
    activePassHolders,
  ] = await Promise.all([
    // 1. 주문 목록 (최근 300건)
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        unlocks: {
          select: { id: true, expiresAt: true, compatId: true, productType: true, productKey: true },
        },
      },
    }),

    // 2. FULL 생성 리포트 (최근 300건) — cacheKey로 주문 매핑
    prisma.generatedReport.findMany({
      where: {
        kind: "FULL",
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        cacheKey: true,
        kind: true,
        status: true,
        attempts: true,
        firstViewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    // 3. 실패 및 지연 리포트 (A5)
    prisma.generatedReport.findMany({
      where: {
        kind: "FULL",
        OR: [
          { status: "FAILED" },
          { status: "GENERATING", updatedAt: { lt: tenMinutesAgo } },
          { attempts: { gte: 3 } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        cacheKey: true,
        kind: true,
        status: true,
        attempts: true,
        firstViewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    // 4. 상품 공개 오버라이드
    prisma.productVisibility.findMany({
      select: {
        catalogId: true,
        visible: true,
        updatedBy: true,
        reason: true,
        updatedAt: true,
      },
    }),

    // 5. 방문자 수 통계
    fetchVisitorCount(prisma),

    // 6. 회원 목록 (최근 100건)
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        tier: true,
        premiumEndDate: true,
        createdAt: true,
      },
    }),

    // 7. 사주 프로필 보유 유저 ID 목록 (생년월일 미조회 - PII 보호)
    prisma.userSajuProfile.findMany({
      select: { userId: true },
    }),

    // 8. 감사 로그 (최근 30건)
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),

    // 9. 최근 30일 TEASER 생성 건수 집계 (캐시 키 프리픽스별)
    prisma.generatedReport.findMany({
      where: {
        kind: "TEASER",
        createdAt: { gte: monthStart },
      },
      select: { cacheKey: true },
      take: 1000,
    }),

    // 10. 최근 7일 FULL 생성 성공/실패 집계
    prisma.generatedReport.groupBy({
      by: ["status"],
      where: {
        kind: "FULL",
        createdAt: { gte: weekStart },
      },
      _count: { _all: true },
      _avg: { attempts: true },
    }),

    // 11. 유저 통계
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { premiumEndDate: { gt: now } } }),
  ]);

  // 궁합 요약 매핑 (PII 원문 제외, 점수 및 이름 앞글자만)
  const compatIds = Array.from(new Set(orders.map((o) => o.compatId).filter(Boolean))) as string[];
  const compats = compatIds.length > 0
    ? await prisma.compatibility.findMany({
        where: { id: { in: compatIds } },
        select: { id: true, shareToken: true, score: true },
      })
    : [];
  const compatMap = new Map(compats.map((c) => [c.id, c]));

  // 리포트 orderId 매핑 (FULL:{orderId}:{productId})
  const reportsByOrderId = new Map<string, typeof reportsRaw>();
  for (const r of reportsRaw) {
    const parts = r.cacheKey.split(":");
    if (parts.length >= 2 && parts[0] === "FULL") {
      const ordId = parts[1];
      const list = reportsByOrderId.get(ordId) || [];
      list.push(r);
      reportsByOrderId.set(ordId, list);
    }
  }

  // 상품 오버라이드 맵
  const overrideMap = new Map<string, typeof visibilities[0]>();
  const overrideBooleanMap = new Map<string, boolean>();
  for (const v of visibilities) {
    overrideMap.set(v.catalogId, v);
    overrideBooleanMap.set(v.catalogId, v.visible);
  }

  // 유저별 사주 프로필 보유 세트
  const sajuUserIds = new Set(userSajuProfiles.map((p) => p.userId));

  // 유저별 결제액 및 결제건수 맵
  const userStatsMap = new Map<string, { totalSpend: number; count: number; lastDate: string }>();

  // 매출 지표 및 상품별 판매 집계
  let revenueToday = 0;
  let paidCountToday = 0;
  let revenueWeek = 0;
  let paidCountWeek = 0;
  let revenueMonth = 0;
  let paidCountMonth = 0;
  let totalRevenue = 0;
  let totalPaidCount = 0;

  let refundCount = 0;
  let refundAmount = 0;

  let firstPurchaseCount = 0;
  let regularPurchaseCount = 0;

  const productSalesMap = new Map<string, { count: number; amount: number }>();
  const tierSalesMap = {
    standard: { count: 0, amount: 0 },
    set: { count: 0, amount: 0 },
    premium: { count: 0, amount: 0 },
  };

  // 포맷팅된 주문 데이터 생성
  const formattedOrders = orders.map((o) => {
    const isManual = o.provider === "admin_manual" || o.amount === 0;
    const catId = toCatalogId(o.productType, o.productKey, o.compatId);
    const prod = catId ? getProduct(catId) : undefined;

    let productName = prod?.name;
    let productTier: "standard" | "SET" | "premium" | "legacy" =
      prod?.tier === "premium" ? "premium" : "standard";
    if (prod?.type === "SET") {
      productTier = "SET";
    }

    if (o.type === "PERIOD_PASS") {
      productName = o.planId === "3_MONTHS" ? "레거시 패스 (3개월)" : "레거시 패스 (1개월)";
      productTier = "legacy";
    } else if (!productName) {
      productName = o.productKey || o.productType || "알 수 없는 상품";
    }

    const originalPrice = prod?.originalPrice || prod?.price || o.amount;
    const isFirstDiscount = !isManual && o.amount === FIRST_PURCHASE_PRICE && originalPrice > o.amount;

    const oTime = new Date(o.createdAt).getTime();

    // 집계 (유효 결제건만)
    if (o.status === "PAID") {
      if (!isManual) {
        totalRevenue += o.amount;
        totalPaidCount++;

        if (oTime >= todayStart.getTime()) {
          revenueToday += o.amount;
          paidCountToday++;
        }
        if (oTime >= weekStart.getTime()) {
          revenueWeek += o.amount;
          paidCountWeek++;
        }
        if (oTime >= monthStart.getTime()) {
          revenueMonth += o.amount;
          paidCountMonth++;
        }

        if (isFirstDiscount) {
          firstPurchaseCount++;
        } else {
          regularPurchaseCount++;
        }

        // 상품별 판매량 집계 (최근 30일)
        if (catId && oTime >= monthStart.getTime()) {
          const prev = productSalesMap.get(catId) || { count: 0, amount: 0 };
          productSalesMap.set(catId, {
            count: prev.count + 1,
            amount: prev.amount + o.amount,
          });
        }

        // 등급별 판매 집계
        if (productTier === "premium") {
          tierSalesMap.premium.count++;
          tierSalesMap.premium.amount += o.amount;
        } else if (prod?.type === "SET") {
          tierSalesMap.set.count++;
          tierSalesMap.set.amount += o.amount;
        } else {
          tierSalesMap.standard.count++;
          tierSalesMap.standard.amount += o.amount;
        }
      }

      // 회원별 지표
      if (o.userId) {
        const uStat = userStatsMap.get(o.userId) || { totalSpend: 0, count: 0, lastDate: "" };
        uStat.totalSpend += o.amount;
        uStat.count += 1;
        if (!uStat.lastDate || new Date(o.createdAt) > new Date(uStat.lastDate)) {
          uStat.lastDate = o.createdAt.toISOString();
        }
        userStatsMap.set(o.userId, uStat);
      }
    } else if (o.status === "CANCELED") {
      refundCount++;
      refundAmount += o.amount;
    }

    const orderReports = reportsByOrderId.get(o.orderId) || [];
    const firstViewedAt = orderReports.find((r) => r.firstViewedAt)?.firstViewedAt;

    return {
      id: o.id,
      orderId: o.orderId,
      catalogId: catId || null,
      productName,
      productTier,
      originalPrice,
      isFirstDiscount,
      isManual,
      amount: o.amount,
      status: o.status,
      provider: o.provider,
      userId: o.userId,
      emailFull: o.email,
      emailMasked: maskEmail(o.email),
      isGuest: !o.userId,
      compatId: o.compatId,
      compatScore: (o.compatId ? compatMap.get(o.compatId)?.score : null) ?? null,
      createdAt: o.createdAt.toISOString(),
      firstViewedAt: firstViewedAt ? firstViewedAt.toISOString() : null,
      unlocks: o.unlocks.map((u) => ({
        id: u.id,
        catalogId: toCatalogId(u.productType, u.productKey, u.compatId) || "",
        compatId: u.compatId,
        expiresAt: u.expiresAt ? u.expiresAt.toISOString() : null,
      })),
      reports: orderReports.map((r) => ({
        id: r.id,
        kind: r.kind,
        status: r.status,
        attempts: r.attempts,
        firstViewedAt: r.firstViewedAt ? r.firstViewedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  });

  // 포맷팅된 실패 리포트 목록 (A5)
  const formattedFailedReports = failedReportsRaw.map((r) => {
    const parts = r.cacheKey.split(":");
    const orderId = parts.length >= 2 ? parts[1] : "";
    const catalogId = parts.length >= 3 ? parts[2] : "";
    const prod = catalogId ? getProduct(catalogId) : undefined;

    return {
      id: r.id,
      orderId,
      catalogId: catalogId || "—",
      productName: prod?.name || catalogId || "리포트",
      status: r.status,
      attempts: r.attempts,
      firstViewedAt: r.firstViewedAt ? r.firstViewedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  // TEASER -> PAID 전환 집계 (상품별)
  const teaserCountMap: Record<string, number> = {};
  for (const t of teaserCountGroup) {
    const parts = t.cacheKey.split(":");
    if (parts.length >= 3 && parts[0] === "TEASER") {
      const catId = parts[2];
      teaserCountMap[catId] = (teaserCountMap[catId] || 0) + 1;
    }
  }

  const teaserToPaidList = CATALOG.map((p) => {
    const tCount = teaserCountMap[p.id] || 0;
    const pSales = productSalesMap.get(p.id)?.count || 0;
    const convRate = tCount > 0 ? Math.round((pSales / tCount) * 100) : 0;
    return {
      catalogId: p.id,
      name: p.name,
      teaserCount: tCount,
      paidCount: pSales,
      convRate,
    };
  }).filter((item) => item.teaserCount > 0 || item.paidCount > 0);

  // FULL 리포트 건강도 집계
  let fullSuccessCount = 0;
  let fullFailCount = 0;
  let totalAttemptsSum = 0;
  let attemptsCount = 0;

  for (const g of fullCountGroup) {
    if (g.status === "READY") {
      fullSuccessCount += g._count._all;
    } else if (g.status === "FAILED") {
      fullFailCount += g._count._all;
    }
    if (g._avg.attempts) {
      totalAttemptsSum += g._avg.attempts * g._count._all;
      attemptsCount += g._count._all;
    }
  }
  const avgAttempts = attemptsCount > 0 ? Number((totalAttemptsSum / attemptsCount).toFixed(1)) : 1;

  // 전체 상품 목록 + 오버라이드 상태 (A9)
  const formattedProducts = CATALOG.map((p) => {
    const override = overrideMap.get(p.id);
    const isOverride = !!override;
    const currentVisible = !resolveHidden(p, overrideBooleanMap);
    const sales30Days = productSalesMap.get(p.id)?.count || 0;

    return {
      id: p.id,
      name: p.name,
      tier: p.tier,
      type: p.type,
      price: p.price,
      originalPrice: p.originalPrice,
      accessDays: p.accessDays,
      icon3d: p.icon3d,
      isFree: !!p.isFree,
      currentVisible,
      isOverride,
      overrideInfo: override
        ? {
            visible: override.visible,
            updatedBy: override.updatedBy,
            reason: override.reason,
            updatedAt: override.updatedAt.toISOString(),
          }
        : null,
      salesCount30Days: sales30Days,
      isNaming: p.id === "premium_naming",
    };
  });

  // 포맷팅된 회원 목록 (A8)
  const formattedUsers = users.map((u) => {
    const isPassActive = u.premiumEndDate ? new Date(u.premiumEndDate) > now : false;
    const stat = userStatsMap.get(u.id) || { totalSpend: 0, count: 0, lastDate: "" };

    return {
      id: u.id,
      name: u.name,
      emailFull: u.email,
      emailMasked: maskEmail(u.email),
      role: u.role,
      tier: u.tier,
      isPassActive,
      premiumEndDate: u.premiumEndDate ? u.premiumEndDate.toISOString() : null,
      purchaseCount: stat.count,
      totalSpend: stat.totalSpend,
      lastPurchaseDate: stat.lastDate || null,
      hasSajuProfile: sajuUserIds.has(u.id),
      createdAt: u.createdAt.toISOString(),
    };
  });

  // 감사 로그
  const formattedAuditLogs = recentAuditLogs.map((l) => ({
    id: l.id,
    adminUserId: l.adminUserId,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    detail: l.detail,
    createdAt: l.createdAt.toISOString(),
  }));

  const stats = {
    revenue: {
      today: revenueToday,
      todayCount: paidCountToday,
      week: revenueWeek,
      weekCount: paidCountWeek,
      month: revenueMonth,
      monthCount: paidCountMonth,
      total: totalRevenue,
      totalCount: totalPaidCount,
      refundCount,
      refundAmount,
    },
    salesByProduct: Array.from(productSalesMap.entries()).map(([catId, s]) => {
      const p = getProduct(catId);
      return {
        catalogId: catId,
        name: p?.name || catId,
        tier: p?.tier || "standard",
        count: s.count,
        amount: s.amount,
      };
    }),
    salesByTier: tierSalesMap,
    firstPurchaseRatio: {
      firstCount: firstPurchaseCount,
      regularCount: regularPurchaseCount,
      ratio: totalPaidCount > 0 ? Math.round((firstPurchaseCount / totalPaidCount) * 100) : 0,
    },
    teaserToPaid: teaserToPaidList,
    reportHealth: {
      successCount: fullSuccessCount,
      failCount: fullFailCount,
      failRate:
        fullSuccessCount + fullFailCount > 0
          ? Math.round((fullFailCount / (fullSuccessCount + fullFailCount)) * 100)
          : 0,
      avgAttempts,
    },
    visitors: {
      count: visitorData.count,
      startedAt: visitorData.startedAt
        ? (visitorData.startedAt instanceof Date
            ? visitorData.startedAt.toISOString()
            : String(visitorData.startedAt))
        : null,
      threshold: 1000,
      isExposed: visitorData.count >= 1000,
    },
    legacyPassHolders: activePassHolders,
    totalUsers,
    todayUsers,
  };

  return {
    stats,
    formattedOrders,
    formattedFailedReports,
    formattedProducts,
    formattedUsers,
    formattedAuditLogs,
  };
}

export default async function AdminPage() {
  await getAdminSessionOrThrow();
  const data = await loadAdminDashboardData();

  return (
    <AdminDashboard
      stats={data.stats}
      orders={data.formattedOrders}
      failedReports={data.formattedFailedReports}
      products={data.formattedProducts}
      users={data.formattedUsers}
      auditLogs={data.formattedAuditLogs}
    />
  );
}
