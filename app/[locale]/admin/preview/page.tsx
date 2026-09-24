import { notFound } from "next/navigation";
import AdminDashboard, {
  OrderItem,
  FailedReportItem,
  ProductManagementItem,
  UserItem,
  AuditLogItem,
  DashboardStats,
} from "../AdminDashboard";
import { CATALOG } from "@/lib/catalog";
import { resolveHidden } from "@/lib/catalogVisibility";

// 고정된 목업 기준 시각 (렌더링 순수성 보장)
const MOCK_BASE_TIME = 1758672000000;
const mockIso = (offsetMs: number = 0) => new Date(MOCK_BASE_TIME + offsetMs).toISOString();

export default function AdminPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  // 목업 지표 데이터
  const mockStats: DashboardStats = {
    revenue: {
      today: 13800,
      todayCount: 2,
      week: 89400,
      weekCount: 14,
      month: 342600,
      monthCount: 52,
      total: 1250000,
      totalCount: 180,
      refundCount: 2,
      refundAmount: 13800,
    },
    salesByProduct: [
      { catalogId: "annual_2026", name: "2026년 총운", tier: "standard", count: 24, amount: 165600 },
      { catalogId: "compat_basic", name: "정통 사주 궁합", tier: "standard", count: 18, amount: 124200 },
      { catalogId: "set_this_person", name: "이 사람 세트", tier: "SET", count: 6, amount: 77400 },
      { catalogId: "wealth", name: "평생 재물운과 돈복", tier: "standard", count: 4, amount: 27600 },
    ],
    salesByTier: {
      standard: { count: 46, amount: 265200 },
      set: { count: 6, amount: 77400 },
      premium: { count: 0, amount: 0 },
    },
    firstPurchaseRatio: {
      firstCount: 38,
      regularCount: 14,
      ratio: 73,
    },
    teaserToPaid: [
      { catalogId: "annual_2026", name: "2026년 총운", teaserCount: 142, paidCount: 24, convRate: 17 },
      { catalogId: "compat_basic", name: "정통 사주 궁합", teaserCount: 210, paidCount: 18, convRate: 9 },
      { catalogId: "wealth", name: "평생 재물운과 돈복", teaserCount: 50, paidCount: 4, convRate: 8 },
    ],
    reportHealth: {
      successCount: 176,
      failCount: 4,
      failRate: 2,
      avgAttempts: 1.1,
    },
    visitors: {
      count: 1420,
      startedAt: "2026-09-01",
      threshold: 1000,
      isExposed: true,
    },
    legacyPassHolders: 12,
    totalUsers: 120,
    todayUsers: 4,
  };

  // 목업 주문 목록
  const mockOrders: OrderItem[] = [
    {
      id: "ord_row_1",
      orderId: "kd_ord_20260924_a1b2c3",
      catalogId: "annual_2026",
      productName: "2026년 총운",
      productTier: "standard",
      originalPrice: 6900,
      isFirstDiscount: true,
      isManual: false,
      amount: 4900,
      status: "PAID",
      provider: "portone",
      userId: "usr_mock_1",
      emailFull: "minsu.kim@gmail.com",
      emailMasked: "mi***@gmail.com",
      isGuest: false,
      compatId: null,
      compatScore: null,
      createdAt: mockIso(),
      firstViewedAt: mockIso(),
      unlocks: [
        {
          id: "unl_1",
          catalogId: "annual_2026",
          compatId: null,
          expiresAt: mockIso(90 * 86400000),
        },
      ],
      reports: [
        {
          id: "rep_full_1",
          kind: "FULL",
          status: "READY",
          attempts: 1,
          firstViewedAt: mockIso(),
          createdAt: mockIso(),
          updatedAt: mockIso(),
        },
      ],
    },
    {
      id: "ord_row_2",
      orderId: "kd_ord_20260924_x9y8z7",
      catalogId: "set_this_person",
      productName: "이 사람 세트",
      productTier: "SET",
      originalPrice: 12900,
      isFirstDiscount: false,
      isManual: false,
      amount: 12900,
      status: "PAID",
      provider: "portone",
      userId: null,
      emailFull: "guest.buyer@naver.com",
      emailMasked: "gu***@naver.com",
      isGuest: true,
      compatId: "cpt_mock_123",
      compatScore: 84,
      createdAt: mockIso(-3600000),
      firstViewedAt: null,
      unlocks: [
        {
          id: "unl_2",
          catalogId: "set_this_person",
          compatId: "cpt_mock_123",
          expiresAt: mockIso(90 * 86400000),
        },
      ],
      reports: [
        {
          id: "rep_full_2a",
          kind: "FULL",
          status: "READY",
          attempts: 1,
          firstViewedAt: null,
          createdAt: mockIso(-3600000),
          updatedAt: mockIso(-3600000),
        },
      ],
    },
    {
      id: "ord_row_3",
      orderId: "kd_ord_20260923_f4f5f6",
      catalogId: "wealth",
      productName: "평생 재물운과 돈복",
      productTier: "standard",
      originalPrice: 6900,
      isFirstDiscount: false,
      isManual: false,
      amount: 6900,
      status: "PAID",
      provider: "portone",
      userId: "usr_mock_2",
      emailFull: "jiwon.lee@kakao.com",
      emailMasked: "ji***@kakao.com",
      isGuest: false,
      compatId: null,
      compatScore: null,
      createdAt: mockIso(-86400000),
      firstViewedAt: mockIso(-85000000),
      unlocks: [
        {
          id: "unl_3",
          catalogId: "wealth",
          compatId: null,
          expiresAt: mockIso(89 * 86400000),
        },
      ],
      reports: [
        {
          id: "rep_full_3",
          kind: "FULL",
          status: "READY",
          attempts: 1,
          firstViewedAt: mockIso(-85000000),
          createdAt: mockIso(-86400000),
          updatedAt: mockIso(-85000000),
        },
      ],
    },
    {
      id: "ord_row_4",
      orderId: "kd_ord_20260923_failed_1",
      catalogId: "compat_basic",
      productName: "정통 사주 궁합",
      productTier: "standard",
      originalPrice: 6900,
      isFirstDiscount: false,
      isManual: false,
      amount: 6900,
      status: "PAID",
      provider: "portone",
      userId: "usr_mock_3",
      emailFull: "trouble.user@daum.net",
      emailMasked: "tr***@daum.net",
      isGuest: false,
      compatId: "cpt_mock_fail",
      compatScore: 78,
      createdAt: mockIso(-7200000),
      firstViewedAt: null,
      unlocks: [
        {
          id: "unl_4",
          catalogId: "compat_basic",
          compatId: "cpt_mock_fail",
          expiresAt: mockIso(90 * 86400000),
        },
      ],
      reports: [
        {
          id: "rep_fail_1",
          kind: "FULL",
          status: "FAILED",
          attempts: 3,
          firstViewedAt: null,
          createdAt: mockIso(-7200000),
          updatedAt: mockIso(-7100000),
        },
      ],
    },
  ];

  // 목업 실패 리포트 데이터
  const mockFailedReports: FailedReportItem[] = [
    {
      id: "rep_fail_1",
      orderId: "kd_ord_20260923_failed_1",
      catalogId: "compat_basic",
      productName: "정통 사주 궁합",
      status: "FAILED",
      attempts: 3,
      firstViewedAt: null,
      createdAt: mockIso(-7200000),
      updatedAt: mockIso(-7100000),
    },
  ];

  // 목업 상품 목록 (카탈로그 기반 + 오버라이드 시뮬레이션)
  const mockProducts: ProductManagementItem[] = CATALOG.map((p) => {
    const isOverride = p.id === "wealth";
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
      currentVisible: isOverride ? true : !resolveHidden(p),
      isOverride,
      overrideInfo: isOverride
        ? {
            visible: true,
            updatedBy: "admin_test",
            reason: "출시 전 어드민 사전 오픈 테스트",
            updatedAt: mockIso(),
          }
        : null,
      salesCount30Days: p.id === "annual_2026" ? 24 : p.id === "compat_basic" ? 18 : 0,
      isNaming: p.id === "premium_naming",
    };
  });

  // 목업 회원 목록
  const mockUsers: UserItem[] = [
    {
      id: "usr_mock_1",
      name: "김민수",
      emailFull: "minsu.kim@gmail.com",
      emailMasked: "mi***@gmail.com",
      role: "USER",
      tier: "standard",
      isPassActive: false,
      premiumEndDate: null,
      purchaseCount: 3,
      totalSpend: 16700,
      lastPurchaseDate: mockIso(),
      hasSajuProfile: true,
      createdAt: "2026-08-15T12:00:00.000Z",
    },
    {
      id: "usr_mock_2",
      name: "이지원",
      emailFull: "jiwon.lee@kakao.com",
      emailMasked: "ji***@kakao.com",
      role: "USER",
      tier: "PREMIUM",
      isPassActive: true,
      premiumEndDate: mockIso(20 * 86400000),
      purchaseCount: 5,
      totalSpend: 34800,
      lastPurchaseDate: mockIso(-86400000),
      hasSajuProfile: true,
      createdAt: "2026-07-10T09:30:00.000Z",
    },
  ];

  // 목업 감사 로그
  const mockAuditLogs: AuditLogItem[] = [
    {
      id: "log_1",
      adminUserId: "admin_owner",
      action: "product_visibility",
      targetType: "PRODUCT",
      targetId: "wealth",
      detail: { action: "show", reason: "운영 테스트 통과 후 판매 개시" },
      createdAt: mockIso(),
    },
    {
      id: "log_2",
      adminUserId: "admin_cs",
      action: "GRANT_MANUAL",
      targetType: "ORDER",
      targetId: "kd_ord_manual_sample",
      detail: { catalogId: "annual_2026", reason: "결제 오류 보상 지급" },
      createdAt: mockIso(-3600000),
    },
  ];

  return (
    <div className="relative">
      <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-xs font-bold flex items-center justify-between">
        <span>🛠️ 개발 모드 어드민 미리보기 환경 (/ko/admin/_preview) — 목업 데이터로 전체 탭을 확인 중입니다.</span>
        <span className="text-[10px] bg-amber-200 px-2 py-0.5 rounded">DEV ONLY</span>
      </div>
      <AdminDashboard
        stats={mockStats}
        orders={mockOrders}
        failedReports={mockFailedReports}
        products={mockProducts}
        users={mockUsers}
        auditLogs={mockAuditLogs}
      />
    </div>
  );
}
