import prisma from "@/lib/prisma";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const now = new Date();

  // 날짜 기준점 계산
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);

  // 1. 주문 전체 로드 (지표 계산 및 최근 주문 테이블용)
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      unlocks: {
        select: { id: true, expiresAt: true, compatId: true },
      },
    },
  });

  // 주문 관련 궁합 shareToken 매핑
  const compatIds = Array.from(new Set(orders.map((o) => o.compatId).filter(Boolean))) as string[];
  const compats = await prisma.compatibility.findMany({
    where: { id: { in: compatIds } },
    select: { id: true, shareToken: true, score: true, personA: true, personB: true },
  });
  const compatMap = new Map(compats.map((c) => [c.id, c]));

  // 2. 매출 및 건수 집계
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

  let singleCount1900 = 0;
  let singleCount2900 = 0;
  let singleCountOther = 0;
  let passCount1Month = 0;
  let passCount3Months = 0;

  // 유저별 누적 결제액 맵
  const userSpendMap = new Map<string, number>();

  for (const o of orders) {
    const oTime = new Date(o.createdAt).getTime();

    if (o.status === "PAID") {
      totalRevenue += o.amount;
      totalPaidCount++;

      if (o.userId) {
        userSpendMap.set(o.userId, (userSpendMap.get(o.userId) || 0) + o.amount);
      }

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

      // 상품별 카운트
      if (o.type === "SINGLE") {
        if (o.amount === 1900) singleCount1900++;
        else if (o.amount === 2900) singleCount2900++;
        else singleCountOther++;
      } else if (o.type === "PERIOD_PASS") {
        if (o.planId === "1_MONTH") passCount1Month++;
        else if (o.planId === "3_MONTHS") passCount3Months++;
      }
    } else if (o.status === "CANCELED") {
      refundCount++;
      refundAmount += o.amount;
    }
  }

  // 3. 회원 및 궁합 지표 집계
  const [
    totalUsers,
    todayUsers,
    totalCompatibilities,
    todayCompatibilities,
    activePassHolders,
    pushSubscribers,
    users,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.compatibility.count(),
    prisma.compatibility.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({
      where: {
        premiumEndDate: { gt: now },
      },
    }),
    prisma.pushSubscription.count(),
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
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // 전환율 및 ARPPU
  const conversionRate = totalCompatibilities > 0 ? (totalPaidCount / totalCompatibilities) * 100 : 0;
  const uniquePayingUsers = userSpendMap.size;
  const arppu = uniquePayingUsers > 0 ? Math.round(totalRevenue / uniquePayingUsers) : 0;

  const dashboardStats = {
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
    productDistribution: {
      single1900: singleCount1900,
      single2900: singleCount2900,
      singleOther: singleCountOther,
      pass1Month: passCount1Month,
      pass3Months: passCount3Months,
    },
    conversion: {
      rate: Number(conversionRate.toFixed(2)),
      arppu,
      totalCompatibilities,
      todayCompatibilities,
      pushSubscribers,
    },
    users: {
      total: totalUsers,
      today: todayUsers,
      activePassHolders,
    },
  };

  // 포맷팅된 주문 데이터
  const formattedOrders = orders.map((o) => {
    const compat = o.compatId ? compatMap.get(o.compatId) : null;
    const pA = compat?.personA as { name?: string } | null;
    const pB = compat?.personB as { name?: string } | null;
    const coupleName = pA && pB ? `${pA.name || "A"} & ${pB.name || "B"}` : null;

    return {
      id: o.id,
      orderId: o.orderId,
      userId: o.userId,
      email: o.email,
      compatId: o.compatId,
      shareToken: compat?.shareToken || null,
      coupleName,
      type: o.type,
      planId: o.planId,
      amount: o.amount,
      status: o.status,
      provider: o.provider,
      createdAt: o.createdAt.toISOString(),
      unlockCount: o.unlocks.length,
      unlocks: o.unlocks.map((u) => ({
        id: u.id,
        expiresAt: u.expiresAt ? u.expiresAt.toISOString() : null,
      })),
    };
  });

  // 포맷팅된 회원 데이터
  const formattedUsers = users.map((u) => {
    const isPassActive = u.premiumEndDate ? new Date(u.premiumEndDate) > now : false;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role,
      tier: u.tier,
      isPassActive,
      premiumEndDate: u.premiumEndDate ? u.premiumEndDate.toISOString() : null,
      totalSpend: userSpendMap.get(u.id) || 0,
      createdAt: u.createdAt.toISOString(),
    };
  });

  const formattedAuditLogs = recentAuditLogs.map((l) => ({
    id: l.id,
    adminUserId: l.adminUserId,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    detail: l.detail,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <AdminDashboard
      stats={dashboardStats}
      orders={formattedOrders}
      users={formattedUsers}
      auditLogs={formattedAuditLogs}
    />
  );
}
