'use client';

import { useState, useMemo } from 'react';
import { 
  ShoppingBag, Users, Search, RefreshCcw, 
  AlertCircle, Shield, 
  ExternalLink, Clock, Key, X, ChevronRight,
  BarChart3, AlertTriangle, Eye, Copy, Sparkles,
  Package, Check
} from 'lucide-react';
import Image from 'next/image';
import { CATALOG } from '@/lib/catalog';
import { issueGuestViewLink } from './actions';
import { buildRefundRequestBody } from '@/lib/admin/refundRequest';

// ─── Types ───
export interface OrderItem {
  id: string;
  orderId: string;
  catalogId: string | null;
  productName: string;
  productTier: 'standard' | 'SET' | 'premium' | 'legacy';
  originalPrice: number;
  isFirstDiscount: boolean;
  isManual: boolean;
  amount: number;
  status: string;
  provider: string;
  userId: string | null;
  emailFull: string | null;
  emailMasked: string;
  isGuest: boolean;
  compatId: string | null;
  compatScore: number | null;
  createdAt: string;
  firstViewedAt: string | null;
  unlocks: { id: string; catalogId: string; compatId: string | null; expiresAt: string | null }[];
  reports: {
    id: string;
    kind: string;
    status: string;
    attempts: number;
    firstViewedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
}

export interface FailedReportItem {
  id: string;
  orderId: string;
  catalogId: string;
  productName: string;
  status: string;
  attempts: number;
  firstViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductManagementItem {
  id: string;
  name: string;
  tier: string;
  type: string;
  price: number;
  originalPrice?: number;
  accessDays: number;
  icon3d: string;
  isFree: boolean;
  currentVisible: boolean;
  isOverride: boolean;
  overrideInfo: {
    visible: boolean;
    updatedBy: string;
    reason: string;
    updatedAt: string;
  } | null;
  salesCount30Days: number;
  isNaming?: boolean;
}

export interface UserItem {
  id: string;
  name: string | null;
  emailFull: string | null;
  emailMasked: string;
  role: string;
  tier: string;
  isPassActive: boolean;
  premiumEndDate: string | null;
  purchaseCount: number;
  totalSpend: number;
  lastPurchaseDate: string | null;
  hasSajuProfile: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: unknown;
  createdAt: string;
}

export interface ReportDetailData {
  id: string;
  cacheKey: string;
  firstViewedAt: string | null;
  envelope: {
    success?: boolean;
    score?: number | null;
    data?: {
      headline?: string;
      summary?: string;
      sections?: Array<{ title?: string; content?: string }>;
    };
  } | null;
  rawContent?: unknown;
}

export interface DashboardStats {
  revenue: {
    today: number;
    todayCount: number;
    week: number;
    weekCount: number;
    month: number;
    monthCount: number;
    total: number;
    totalCount: number;
    refundCount: number;
    refundAmount: number;
  };
  salesByProduct: {
    catalogId: string;
    name: string;
    tier: string;
    count: number;
    amount: number;
  }[];
  salesByTier: {
    standard: { count: number; amount: number };
    set: { count: number; amount: number };
    premium: { count: number; amount: number };
  };
  firstPurchaseRatio: {
    firstCount: number;
    regularCount: number;
    ratio: number;
  };
  teaserToPaid: {
    catalogId: string;
    name: string;
    teaserCount: number;
    paidCount: number;
    convRate: number;
  }[];
  reportHealth: {
    successCount: number;
    failCount: number;
    failRate: number;
    avgAttempts: number;
  };
  visitors: {
    count: number;
    startedAt: string | null;
    threshold: number;
    isExposed: boolean;
  };
  legacyPassHolders: number;
  totalUsers: number;
  todayUsers: number;
}

interface AdminDashboardProps {
  stats: DashboardStats;
  orders: OrderItem[];
  failedReports: FailedReportItem[];
  products: ProductManagementItem[];
  users: UserItem[];
  auditLogs: AuditLogItem[];
}

// ─── Helpers ───
function formatCurrency(amount: number) {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

function formatDate(dateStr: string | null | undefined, includeTime = false) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (includeTime) {
    return d.toLocaleString('ko-KR', { 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit' 
    });
  }
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PAID':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">결제완료</span>;
    case 'PENDING':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">대기중</span>;
    case 'CANCELED':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">환불/취소</span>;
    case 'FAILED':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">실패</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{status}</span>;
  }
}

function getTierBadge(tier: string) {
  switch (tier) {
    case 'SET':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">세트</span>;
    case 'premium':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">프리미엄</span>;
    case 'legacy':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">레거시</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">표준</span>;
  }
}

export default function AdminDashboard({
  stats,
  orders: initialOrders,
  failedReports: initialFailedReports,
  products: initialProducts,
  users: initialUsers,
  auditLogs: initialLogs,
}: AdminDashboardProps) {
  // Tabs: orders (주문 목록), reports (리포트 실패 관리), cs (수동 발급), metrics (지표), products (상품 관리), users (회원 관리), audit (감사 로그)
  const [activeTab, setActiveTab] = useState<'orders' | 'reports' | 'cs' | 'metrics' | 'products' | 'users' | 'audit'>('orders');

  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [failedReports, setFailedReports] = useState<FailedReportItem[]>(initialFailedReports);
  const [products, setProducts] = useState<ProductManagementItem[]>(initialProducts);
  const users = initialUsers;
  const auditLogs = initialLogs;

  // 토스트
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ─── 1. 주문 탭 상태 (A2, A3) ───
  const [orderSearch, setOrderSearch] = useState('');
  const [orderProductFilter, setOrderProductFilter] = useState('ALL');
  const [orderTierFilter, setOrderTierFilter] = useState('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderPeriodFilter, setOrderPeriodFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  // 주문 상세 패널
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  // 환불 모달
  const [refundModalOrder, setRefundModalOrder] = useState<OrderItem | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundCancelAmount, setRefundCancelAmount] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState(false);

  // 리포트 상세 보기 모달 (A6)
  const [viewReportModalId, setViewReportModalId] = useState<string | null>(null);
  const [viewReportData, setViewReportData] = useState<ReportDetailData | null>(null);
  const [isLoadingReportView, setIsLoadingReportView] = useState(false);

  // 회원 상세 패널 (A8)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // CS 수동 발급 폼 상태 (A4)
  const [grantCatalogId, setGrantCatalogId] = useState('annual_2026');
  const [grantUserId, setGrantUserId] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantCompatId, setGrantCompatId] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [grantResultUrl, setGrantResultUrl] = useState<string | null>(null);

  // 상품 공개/숨김 확인 모달 (A9)
  const [visibilityModalProduct, setVisibilityModalProduct] = useState<ProductManagementItem | null>(null);
  const [visibilityAction, setVisibilityAction] = useState<'show' | 'hide' | 'reset'>('show');
  const [visibilityReason, setVisibilityReason] = useState('');
  const [isSubmittingVisibility, setIsSubmittingVisibility] = useState(false);

  // 렌더링 순수성을 위한 기준 시각 고정
  const [filterBaseTime] = useState(() => Date.now());

  // ─── 주문 목록 필터링 (A2) ───
  const filteredOrders = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;

    return orders.filter((o) => {
      // 1. 검색어 (주문번호 앞부분, 이메일 부분 일치)
      if (orderSearch.trim()) {
        const q = orderSearch.trim().toLowerCase();
        const ordMatch = o.orderId.toLowerCase().includes(q);
        const emailMatch = o.emailFull ? o.emailFull.toLowerCase().includes(q) : false;
        if (!ordMatch && !emailMatch) return false;
      }

      // 2. 상품 드롭다운 필터
      if (orderProductFilter !== 'ALL') {
        if (o.catalogId !== orderProductFilter) return false;
      }

      // 3. 등급 필터
      if (orderTierFilter !== 'ALL') {
        if (o.productTier !== orderTierFilter) return false;
      }

      // 4. 상태 필터
      if (orderStatusFilter !== 'ALL') {
        if (o.status !== orderStatusFilter) return false;
      }

      // 5. 기간 필터
      if (orderPeriodFilter !== 'ALL') {
        const oTime = new Date(o.createdAt).getTime();
        if (orderPeriodFilter === 'TODAY' && filterBaseTime - oTime > dayMs) return false;
        if (orderPeriodFilter === 'WEEK' && filterBaseTime - oTime > 7 * dayMs) return false;
        if (orderPeriodFilter === 'MONTH' && filterBaseTime - oTime > 30 * dayMs) return false;
      }

      return true;
    });
  }, [orders, orderSearch, orderProductFilter, orderTierFilter, orderStatusFilter, orderPeriodFilter, filterBaseTime]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE) || 1;

  // ─── 리포트 상세 조회 핸들러 (A6) ───
  const handleOpenReportView = async (reportId: string) => {
    setViewReportModalId(reportId);
    setIsLoadingReportView(true);
    setViewReportData(null);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '리포트 조회 실패');
        setViewReportModalId(null);
        return;
      }
      setViewReportData(data.report);
    } catch {
      showToast('리포트 조회 중 네트워크 오류 발생');
      setViewReportModalId(null);
    } finally {
      setIsLoadingReportView(false);
    }
  };

  // ─── 리포트 재시도 허용 핸들러 (A5) ───
  const handleResetReport = async (reportId: string) => {
    if (!confirm('이 리포트의 생성을 재시도할 수 있도록 상태를 초기화하시겠습니까?')) return;
    try {
      const res = await fetch('/api/admin/reports/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, reason: '관리자 재시도 허용' }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '재시도 초기화 실패');
        return;
      }
      showToast('리포트 생성 재시도가 허용되었습니다.');
      // 목록 갱신
      setFailedReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'FAILED', attempts: 0 } : r))
      );
      setOrders((prev) =>
        prev.map((o) => ({
          ...o,
          reports: o.reports.map((r) =>
            r.id === reportId ? { ...r, status: 'FAILED', attempts: 0 } : r
          ),
        }))
      );
      if (selectedOrder) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                reports: prev.reports.map((r) =>
                  r.id === reportId ? { ...r, status: 'FAILED', attempts: 0 } : r
                ),
              }
            : null
        );
      }
    } catch {
      showToast('재시도 초기화 중 오류 발생');
    }
  };

  // ─── CS 수동 발급 핸들러 (A4) ───
  const handleExecuteGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantReason.trim()) {
      showToast('발급 사유를 입력해주세요.');
      return;
    }
    if (!grantUserId.trim() && !grantEmail.trim()) {
      showToast('회원 ID 또는 이메일 중 하나를 입력해주세요.');
      return;
    }
    const targetProd = CATALOG.find((p) => p.id === grantCatalogId);
    if (targetProd?.target === 'couple' && !grantCompatId.trim()) {
      showToast('궁합 상품은 compatId가 필수입니다.');
      return;
    }

    setIsGranting(true);
    setGrantResultUrl(null);
    try {
      const res = await fetch('/api/admin/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogId: grantCatalogId,
          userId: grantUserId.trim() || undefined,
          email: grantEmail.trim() || undefined,
          compatId: grantCompatId.trim() || undefined,
          reason: grantReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '수동 발급 실패');
        return;
      }
      showToast('수동 발급이 성공적으로 완료되었습니다.');
      if (data.viewUrl) {
        setGrantResultUrl(data.viewUrl);
      }
      // 폼 초기화
      setGrantReason('');
      setGrantCompatId('');
    } catch {
      showToast('수동 발급 처리 중 오류 발생');
    } finally {
      setIsGranting(false);
    }
  };

  // ─── 상품 공개/숨김 오버라이드 핸들러 (A9, A11) ───
  const handleExecuteVisibility = async () => {
    if (!visibilityModalProduct) return;
    if (!visibilityReason.trim()) {
      showToast('변경 사유를 반드시 입력해주세요.');
      return;
    }

    setIsSubmittingVisibility(true);
    try {
      const res = await fetch('/api/admin/products/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogId: visibilityModalProduct.id,
          action: visibilityAction,
          reason: visibilityReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '공개 설정 변경 실패');
        return;
      }
      showToast(data.message || '반영되었습니다 (최대 30초 내 적용)');
      // 상품 목록 로컬 상태 갱신
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== visibilityModalProduct.id) return p;
          if (visibilityAction === 'reset') {
            return {
              ...p,
              currentVisible: data.visible,
              isOverride: false,
              overrideInfo: null,
            };
          }
          const isVis = Boolean(data.visible);
          return {
            ...p,
            currentVisible: isVis,
            isOverride: true,
            overrideInfo: {
              visible: isVis,
              updatedBy: 'admin',
              reason: visibilityReason.trim(),
              updatedAt: new Date().toISOString(),
            },
          };
        })
      );
      setVisibilityModalProduct(null);
      setVisibilityReason('');
    } catch {
      showToast('공개 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingVisibility(false);
    }
  };

  // ─── 환불 처리 핸들러 ───
  const handleExecuteRefund = async () => {
    if (!refundModalOrder) return;
    if (!refundReason.trim()) {
      alert('환불 사유를 입력해주세요.');
      return;
    }
    const cancelAmt = refundCancelAmount ? parseInt(refundCancelAmount, 10) : undefined;
    if (cancelAmt !== undefined && (isNaN(cancelAmt) || cancelAmt <= 0)) {
      alert('올바른 환불 금액을 입력해주세요.');
      return;
    }

    setIsRefunding(true);
    try {
      const res = await fetch('/api/admin/orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRefundRequestBody(refundModalOrder.orderId, refundReason, cancelAmt)),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '환불 처리에 실패했습니다.');
        return;
      }
      showToast('환불 처리가 완료되었습니다.');
      setOrders((prev) =>
        prev.map((o) => (o.orderId === refundModalOrder.orderId ? { ...o, status: 'CANCELED' } : o))
      );
      if (selectedOrder?.orderId === refundModalOrder.orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'CANCELED' } : null));
      }
      setRefundModalOrder(null);
      setRefundReason('');
      setRefundCancelAmount('');
    } catch {
      alert('환불 요청 중 오류가 발생했습니다.');
    } finally {
      setIsRefunding(false);
    }
  };

  // ─── 고객 열람 링크 복사 (A3) ───
  const handleCopySecretLink = async (orderId: string) => {
    if (!confirm('⚠️ [보안 주의] 이 링크는 게스트 열람권 그 자체(비밀 링크)입니다.\n고객 CS 용도 외에는 절대 노출하지 마세요.\n링크를 클립보드에 복사하시겠습니까?')) {
      return;
    }
    const res = await issueGuestViewLink(orderId);
    if (!res.success || !res.link) {
      showToast(res.error || '링크 발급에 실패했습니다.');
      return;
    }
    try {
      await navigator.clipboard.writeText(res.link);
      showToast('비밀 열람 링크가 복사되었습니다. (감사 로그에 기록됨)');
    } catch {
      showToast('클립보드 복사 실패');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-ink pb-20">
      {/* 토스트 */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#3A1F33] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 border border-white/20 animate-fade-in">
          <Sparkles className="w-4 h-4 text-[#FF5C77]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-white border-b border-line/60 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF5C77]/10 flex items-center justify-center text-[#FF5C77]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-ink flex items-center gap-2">
                콩닥 통합 운영 어드민
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface text-caption">Phase A</span>
              </h1>
              <p className="text-[11px] font-medium text-caption">21종 전 상품 · 세트 · 리포트 실패 관리 · 공개 스위치</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-caption">관리자 모드</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* 탭 내비게이션 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto">
          {[
            { id: 'orders', label: '주문 관리', icon: ShoppingBag, count: filteredOrders.length },
            { id: 'reports', label: '리포트 실패 관리', icon: AlertTriangle, count: failedReports.length, alert: failedReports.length > 0 },
            { id: 'cs', label: 'CS 수동 발급', icon: Key },
            { id: 'metrics', label: '상품 지표', icon: BarChart3 },
            { id: 'products', label: '상품 스위치', icon: Package },
            { id: 'users', label: '회원 관리', icon: Users, count: users.length },
            { id: 'audit', label: '감사 로그', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'orders' | 'reports' | 'cs' | 'metrics' | 'products' | 'users' | 'audit')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all shrink-0 active:scale-[0.96] ${
                  isActive
                    ? 'border-[#FF5C77] text-[#FF5C77] bg-[#FF5C77]/5'
                    : 'border-transparent text-caption hover:text-ink hover:bg-surface/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.alert ? 'text-rose-500 animate-bounce' : ''}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    tab.alert ? 'bg-rose-500 text-white' : 'bg-surface text-caption'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* 본문 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ══════════════════════════════════════════════════════
            TAB 1: 주문 관리 (A1, A2, A3)
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* 검색 및 필터 바 */}
            <div className="bg-white rounded-2xl p-4 border border-line/60 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* 검색 인풋 */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-caption absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => {
                      setOrderSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="주문번호 앞부분, 고객 이메일 검색..."
                    className="w-full pl-10 pr-4 py-2.5 bg-surface/50 rounded-xl text-xs font-medium text-ink placeholder:text-caption/60 border border-transparent focus:border-[#FF5C77] focus:bg-white outline-none transition-all"
                  />
                  {orderSearch && (
                    <button
                      onClick={() => setOrderSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-caption hover:text-ink"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 상품 필터 드롭다운 */}
                <select
                  value={orderProductFilter}
                  onChange={(e) => {
                    setOrderProductFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2.5 bg-surface/50 rounded-xl text-xs font-bold text-ink border border-transparent focus:border-[#FF5C77] outline-none"
                >
                  <option value="ALL">전체 상품</option>
                  {CATALOG.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* 등급 필터 */}
                <select
                  value={orderTierFilter}
                  onChange={(e) => {
                    setOrderTierFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2.5 bg-surface/50 rounded-xl text-xs font-bold text-ink border border-transparent focus:border-[#FF5C77] outline-none"
                >
                  <option value="ALL">전체 등급</option>
                  <option value="standard">표준 (단건)</option>
                  <option value="SET">세트</option>
                  <option value="premium">프리미엄</option>
                  <option value="legacy">레거시 패스</option>
                </select>

                {/* 상태 필터 */}
                <select
                  value={orderStatusFilter}
                  onChange={(e) => {
                    setOrderStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2.5 bg-surface/50 rounded-xl text-xs font-bold text-ink border border-transparent focus:border-[#FF5C77] outline-none"
                >
                  <option value="ALL">전체 상태</option>
                  <option value="PAID">결제완료</option>
                  <option value="PENDING">대기중</option>
                  <option value="CANCELED">환불/취소</option>
                </select>

                {/* 기간 필터 */}
                <div className="flex bg-surface/50 p-1 rounded-xl">
                  {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((per) => (
                    <button
                      key={per}
                      onClick={() => {
                        setOrderPeriodFilter(per);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                        orderPeriodFilter === per
                          ? 'bg-white text-[#FF5C77] shadow-xs'
                          : 'text-caption hover:text-ink'
                      }`}
                    >
                      {per === 'ALL' ? '전체' : per === 'TODAY' ? '오늘' : per === 'WEEK' ? '7일' : '30일'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 주문 테이블 & 상세 패널 (A3 레이아웃) */}
            <div className="flex gap-6 items-start">
              {/* 목록 영역 */}
              <div className="flex-1 bg-white rounded-2xl border border-line/60 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface/60 border-b border-line text-caption font-extrabold">
                      <tr>
                        <th className="py-3 px-4">주문번호</th>
                        <th className="py-3 px-4">상품 (카탈로그)</th>
                        <th className="py-3 px-4">금액 / 할인</th>
                        <th className="py-3 px-4">고객 (마스킹)</th>
                        <th className="py-3 px-4">상태</th>
                        <th className="py-3 px-4">결제 시각</th>
                        <th className="py-3 px-4 text-right">상세</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/40">
                      {paginatedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-caption font-medium">
                            조건에 맞는 주문 내역이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        paginatedOrders.map((o) => {
                          const isSelected = selectedOrder?.id === o.id;
                          return (
                            <tr
                              key={o.id}
                              onClick={() => setSelectedOrder(o)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#FF5C77]/5' : 'hover:bg-surface/30'
                              }`}
                            >
                              <td className="py-3.5 px-4 font-mono font-bold text-ink">
                                {o.orderId.slice(0, 16)}...
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  {getTierBadge(o.productTier)}
                                  <span className="font-extrabold text-ink">{o.productName}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-ink">{formatCurrency(o.amount)}</span>
                                  {o.isFirstDiscount && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-coral-soft text-coral-deep">
                                      첫 결제
                                    </span>
                                  )}
                                  {o.isManual && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                                      수동 발급
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-medium text-ink flex items-center gap-1.5">
                                  <span>{o.emailMasked}</span>
                                  {o.isGuest ? (
                                    <span className="text-[10px] text-caption font-bold bg-surface px-1 rounded">게스트</span>
                                  ) : (
                                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1 rounded">회원</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                {getStatusBadge(o.status)}
                              </td>
                              <td className="py-3.5 px-4 text-caption font-medium">
                                {formatDate(o.createdAt, true)}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <ChevronRight className="w-4 h-4 text-caption inline-block" />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 페이지네이션 */}
                <div className="p-4 border-t border-line/60 flex items-center justify-between text-xs text-caption">
                  <div>
                    총 <strong className="text-ink">{filteredOrders.length}</strong>건 중{' '}
                    {(currentPage - 1) * PAGE_SIZE + 1}~{Math.min(currentPage * PAGE_SIZE, filteredOrders.length)}건 표시
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-line bg-white text-ink disabled:opacity-30 font-bold"
                    >
                      이전
                    </button>
                    <span className="font-bold text-ink">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-line bg-white text-ink disabled:opacity-30 font-bold"
                    >
                      다음
                    </button>
                  </div>
                </div>
              </div>

              {/* 오른쪽 주문 상세 패널 (A3) */}
              {selectedOrder && (
                <div className="w-96 bg-white rounded-2xl border border-line/60 shadow-lg p-5 space-y-5 shrink-0 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <h3 className="font-extrabold text-sm text-ink flex items-center gap-2">
                      <span>주문 상세 정보</span>
                      {getTierBadge(selectedOrder.productTier)}
                    </h3>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="text-caption hover:text-ink"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 1. 주문 기본 정보 */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-caption">주문번호</span>
                      <span className="font-mono font-bold text-ink select-all">{selectedOrder.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption">상품명</span>
                      <span className="font-extrabold text-ink">{selectedOrder.productName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption">결제 금액</span>
                      <span className="font-black text-[#FF5C77]">{formatCurrency(selectedOrder.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption">결제 상태</span>
                      <span>{getStatusBadge(selectedOrder.status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption">제공자 / 수단</span>
                      <span className="font-bold text-ink">{selectedOrder.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption">고객 이메일</span>
                      <span className="font-bold text-ink select-all">{selectedOrder.emailFull || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption">생성 시각</span>
                      <span className="text-ink">{formatDate(selectedOrder.createdAt, true)}</span>
                    </div>
                  </div>

                  {/* 2. 환불 판단 보조 표시 (A3 핵심) */}
                  <div className="p-3 rounded-xl border border-line bg-surface/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-ink">환불 판단 보조</span>
                      {selectedOrder.firstViewedAt ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          열람함 — 청약철회 제한
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                          미열람
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-caption leading-relaxed">
                      최초 열람: {selectedOrder.firstViewedAt ? formatDate(selectedOrder.firstViewedAt, true) : '기록 없음'}
                      <br />
                      <span className="text-[10px] text-caption/80">* 전자상거래법 상 콘텐츠 열람 후 단순 변심 환불은 제한될 수 있습니다 (사람이 최종 판단).</span>
                    </p>
                  </div>

                  {/* 3. 생성된 리포트 (FULL:orderId:*) */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-ink">생성된 리포트 ({selectedOrder.reports.length}개)</h4>
                    {selectedOrder.reports.length === 0 ? (
                      <p className="text-xs text-caption py-2">생성된 FULL 리포트가 없습니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedOrder.reports.map((r) => (
                          <div key={r.id} className="p-2.5 rounded-xl border border-line bg-white text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-ink">리포트 ID: {r.id.slice(0, 8)}...</span>
                              <span className="text-[11px] font-extrabold">{r.status}</span>
                            </div>
                            <div className="text-[11px] text-caption flex justify-between">
                              <span>시도 횟수: {r.attempts}회</span>
                              <span>{formatDate(r.updatedAt, true)}</span>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleOpenReportView(r.id)}
                                className="flex-1 py-1 px-2 rounded-lg bg-surface text-ink text-[11px] font-bold hover:bg-surface-soft active:scale-[0.96]"
                              >
                                내용 보기
                              </button>
                              {r.status === 'FAILED' && (
                                <button
                                  onClick={() => handleResetReport(r.id)}
                                  className="py-1 px-2 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold hover:bg-rose-100 active:scale-[0.96]"
                                >
                                  재시도 허용
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. 액션 버튼들 */}
                  <div className="pt-2 border-t border-line space-y-2">
                    {selectedOrder.isGuest && (
                      <button
                        onClick={() => handleCopySecretLink(selectedOrder.orderId)}
                        className="w-full py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-[0.96]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>고객 비밀 열람 링크 복사 (게스트)</span>
                      </button>
                    )}

                    {selectedOrder.status === 'PAID' && (
                      <button
                        onClick={() => setRefundModalOrder(selectedOrder)}
                        className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-[0.96]"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        <span>주문 환불 처리</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 2: 리포트 생성 실패 관리 (A5)
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* 상단 7일 리포트 건전성 요약 */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-line shadow-xs">
                <span className="text-xs font-bold text-caption">최근 7일 생성 성공</span>
                <p className="text-xl font-black text-emerald-600 mt-1">{stats.reportHealth.successCount}건</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-line shadow-xs">
                <span className="text-xs font-bold text-caption">최근 7일 생성 실패</span>
                <p className="text-xl font-black text-rose-600 mt-1">{stats.reportHealth.failCount}건</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-line shadow-xs">
                <span className="text-xs font-bold text-caption">실패율</span>
                <p className="text-xl font-black text-ink mt-1">{stats.reportHealth.failRate}%</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-line shadow-xs">
                <span className="text-xs font-bold text-caption">평균 시도 횟수</span>
                <p className="text-xl font-black text-ink mt-1">{stats.reportHealth.avgAttempts}회</p>
              </div>
            </div>

            {/* 실패/지연 리포트 목록 */}
            <div className="bg-white rounded-2xl border border-line shadow-xs overflow-hidden">
              <div className="p-4 border-b border-line bg-surface/40 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-ink">관리 조치가 필요한 리포트 목록</h3>
                  <p className="text-xs text-caption">FAILED 상태이거나 10분 이상 생성 지연 중, 또는 attempts가 3회 이상인 건</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  {failedReports.length}건 대기중
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/60 border-b border-line text-caption font-extrabold">
                    <tr>
                      <th className="py-3 px-4">리포트 ID</th>
                      <th className="py-3 px-4">상품명</th>
                      <th className="py-3 px-4">주문번호</th>
                      <th className="py-3 px-4">상태</th>
                      <th className="py-3 px-4">시도 횟수</th>
                      <th className="py-3 px-4">마지막 갱신 시각</th>
                      <th className="py-3 px-4 text-right">조치</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40">
                    {failedReports.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-caption font-medium">
                          🎉 현재 실패하거나 지연된 리포트가 없습니다!
                        </td>
                      </tr>
                    ) : (
                      failedReports.map((r) => (
                        <tr key={r.id} className="hover:bg-surface/30">
                          <td className="py-3 px-4 font-mono font-bold text-ink">{r.id.slice(0, 12)}...</td>
                          <td className="py-3 px-4 font-extrabold text-ink">{r.productName}</td>
                          <td className="py-3 px-4 font-mono text-caption">{r.orderId}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-ink">{r.attempts}회</td>
                          <td className="py-3 px-4 text-caption">{formatDate(r.updatedAt, true)}</td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleResetReport(r.id)}
                              className="px-3 py-1.5 rounded-lg bg-[#FF5C77] text-white font-extrabold text-xs hover:bg-[#E0245A] active:scale-[0.96]"
                            >
                              재시도 허용
                            </button>
                            <button
                              onClick={() => handleOpenReportView(r.id)}
                              className="px-2.5 py-1.5 rounded-lg border border-line bg-white text-ink font-bold text-xs hover:bg-surface active:scale-[0.96]"
                            >
                              내용 보기
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 3: CS 수동 발급 (A4)
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'cs' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-line shadow-xs p-6 space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
                <Key className="w-5 h-5 text-[#FF5C77]" />
                CS 보상 전 상품 수동 발급
              </h2>
              <p className="text-xs text-caption mt-1">
                결제 오류나 CS 보상 시, 결제와 동일한 경로(applyPaidOrder, amount 0원)로 즉시 권한을 부여합니다.
              </p>
            </div>

            {grantResultUrl && (
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-purple-900">
                  <Check className="w-4 h-4 text-purple-700" />
                  <span>게스트 고객용 비밀 열람 링크가 생성되었습니다</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={grantResultUrl}
                    className="flex-1 bg-white p-2 rounded-lg text-xs font-mono text-ink border border-purple-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(grantResultUrl);
                      showToast('열람 링크가 복사되었습니다.');
                    }}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700"
                  >
                    복사
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleExecuteGrant} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-ink mb-1">
                  발급 상품 선택 (카탈로그 전체 21종 + 세트) *
                </label>
                <select
                  value={grantCatalogId}
                  onChange={(e) => setGrantCatalogId(e.target.value)}
                  className="w-full p-2.5 bg-surface/50 border border-line rounded-xl text-xs font-bold text-ink outline-none focus:border-[#FF5C77]"
                >
                  {CATALOG.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.tier === 'premium' ? '프리미엄' : p.type === 'SET' ? '세트' : '표준'}] {p.name} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-ink mb-1">회원 ID (userId)</label>
                  <input
                    type="text"
                    value={grantUserId}
                    onChange={(e) => setGrantUserId(e.target.value)}
                    placeholder="회원 발급 시 입력 (예: cly...)"
                    className="w-full p-2.5 bg-surface/50 border border-line rounded-xl text-xs font-medium text-ink outline-none focus:border-[#FF5C77]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-ink mb-1">고객 이메일 (email)</label>
                  <input
                    type="email"
                    value={grantEmail}
                    onChange={(e) => setGrantEmail(e.target.value)}
                    placeholder="게스트 발급 시 필수 (예: abc@gmail.com)"
                    className="w-full p-2.5 bg-surface/50 border border-line rounded-xl text-xs font-medium text-ink outline-none focus:border-[#FF5C77]"
                  />
                </div>
              </div>

              {CATALOG.find((p) => p.id === grantCatalogId)?.target === 'couple' && (
                <div>
                  <label className="block text-xs font-extrabold text-ink mb-1">
                    궁합 ID (compatId) <span className="text-[#FF5C77]">* 궁합 상품 필수</span>
                  </label>
                  <input
                    type="text"
                    value={grantCompatId}
                    onChange={(e) => setGrantCompatId(e.target.value)}
                    placeholder="기존 생성된 궁합 ID 입력"
                    className="w-full p-2.5 bg-surface/50 border border-line rounded-xl text-xs font-medium text-ink outline-none focus:border-[#FF5C77]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-ink mb-1">발급 사유 (감사 로그 기록) *</label>
                <textarea
                  rows={3}
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="예: 결제 완료 후 시스템 지연으로 인한 리포트 수동 보상 지급"
                  className="w-full p-2.5 bg-surface/50 border border-line rounded-xl text-xs font-medium text-ink outline-none focus:border-[#FF5C77]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isGranting}
                  className="w-full py-3 bg-[#FF5C77] text-white rounded-xl text-xs font-extrabold hover:bg-[#E0245A] disabled:opacity-50 active:scale-[0.96] transition-all"
                >
                  {isGranting ? '권한 발급 처리 중...' : '권한 즉시 발급하기'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 4: 상품 중심 지표 (A7)
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* 매출 요약 카드 4종 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
                <span className="text-xs font-bold text-caption">오늘 매출 (0시 기준)</span>
                <p className="text-2xl font-black text-ink mt-1.5">{formatCurrency(stats.revenue.today)}</p>
                <span className="text-xs font-medium text-caption mt-1 block">{stats.revenue.todayCount}건 결제</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
                <span className="text-xs font-bold text-caption">최근 7일 매출</span>
                <p className="text-2xl font-black text-ink mt-1.5">{formatCurrency(stats.revenue.week)}</p>
                <span className="text-xs font-medium text-caption mt-1 block">{stats.revenue.weekCount}건 결제</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
                <span className="text-xs font-bold text-caption">최근 30일 매출</span>
                <p className="text-2xl font-black text-ink mt-1.5">{formatCurrency(stats.revenue.month)}</p>
                <span className="text-xs font-medium text-caption mt-1 block">{stats.revenue.monthCount}건 결제</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
                <span className="text-xs font-bold text-caption">누적 매출 (실 결제액)</span>
                <p className="text-2xl font-black text-[#FF5C77] mt-1.5">{formatCurrency(stats.revenue.total)}</p>
                <span className="text-xs font-medium text-caption mt-1 block">환불 {stats.revenue.refundCount}건 ({formatCurrency(stats.revenue.refundAmount)})</span>
              </div>
            </div>

            {/* 등급별 비중 & 첫 결제 비중 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-line shadow-xs space-y-3">
                <h3 className="text-xs font-extrabold text-ink">등급별 매출 비중</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <span className="text-[11px] font-bold text-blue-700">표준 단건</span>
                    <p className="text-base font-black text-ink mt-1">{stats.salesByTier.standard.count}건</p>
                    <span className="text-[10px] text-caption">{formatCurrency(stats.salesByTier.standard.amount)}</span>
                  </div>
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                    <span className="text-[11px] font-bold text-purple-700">세트</span>
                    <p className="text-base font-black text-ink mt-1">{stats.salesByTier.set.count}건</p>
                    <span className="text-[10px] text-caption">{formatCurrency(stats.salesByTier.set.amount)}</span>
                  </div>
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                    <span className="text-[11px] font-bold text-amber-700">프리미엄</span>
                    <p className="text-base font-black text-ink mt-1">{stats.salesByTier.premium.count}건</p>
                    <span className="text-[10px] text-caption">{formatCurrency(stats.salesByTier.premium.amount)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-line shadow-xs space-y-3">
                <h3 className="text-xs font-extrabold text-ink">첫 결제(4,900원) 대 정가 결제</h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-coral-soft/40 rounded-xl border border-coral-line/40">
                    <span className="text-[11px] font-bold text-coral-deep">첫 결제 할인 (4,900원)</span>
                    <p className="text-xl font-black text-ink mt-1">{stats.firstPurchaseRatio.firstCount}건</p>
                    <span className="text-[10px] text-caption">비중 {stats.firstPurchaseRatio.ratio}%</span>
                  </div>
                  <div className="p-3 bg-surface/50 rounded-xl border border-line">
                    <span className="text-[11px] font-bold text-caption">정가 결제</span>
                    <p className="text-xl font-black text-ink mt-1">{stats.firstPurchaseRatio.regularCount}건</p>
                    <span className="text-[10px] text-caption">비중 {100 - stats.firstPurchaseRatio.ratio}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 상품별 매출·건수 표 (최근 30일) */}
            <div className="bg-white rounded-2xl border border-line shadow-xs overflow-hidden">
              <div className="p-4 border-b border-line bg-surface/40">
                <h3 className="font-extrabold text-sm text-ink">최근 30일 상품별 매출 및 판매 건수</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/60 border-b border-line text-caption font-extrabold">
                    <tr>
                      <th className="py-3 px-4">상품 ID</th>
                      <th className="py-3 px-4">상품명</th>
                      <th className="py-3 px-4">등급</th>
                      <th className="py-3 px-4">판매 건수</th>
                      <th className="py-3 px-4 text-right">매출액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40">
                    {stats.salesByProduct.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-caption">
                          최근 30일간 결제된 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      stats.salesByProduct.map((p) => (
                        <tr key={p.catalogId} className="hover:bg-surface/30">
                          <td className="py-3 px-4 font-mono font-bold text-ink">{p.catalogId}</td>
                          <td className="py-3 px-4 font-extrabold text-ink">{p.name}</td>
                          <td className="py-3 px-4">{getTierBadge(p.tier)}</td>
                          <td className="py-3 px-4 font-bold text-ink">{p.count}건</td>
                          <td className="py-3 px-4 text-right font-black text-ink">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TEASER -> PAID 전환 표 */}
            <div className="bg-white rounded-2xl border border-line shadow-xs overflow-hidden">
              <div className="p-4 border-b border-line bg-surface/40 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-ink">미리보기(TEASER) → 결제(PAID) 전환율</h3>
                  <p className="text-[11px] text-caption">* 최근 30일 기준 단순 비율 비교 (대략적 지표)</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/60 border-b border-line text-caption font-extrabold">
                    <tr>
                      <th className="py-3 px-4">상품명</th>
                      <th className="py-3 px-4">미리보기 생성 수</th>
                      <th className="py-3 px-4">결제 건수</th>
                      <th className="py-3 px-4 text-right">전환율</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40">
                    {stats.teaserToPaid.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-caption">
                          집계 가능한 미리보기/결제 데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      stats.teaserToPaid.map((item) => (
                        <tr key={item.catalogId} className="hover:bg-surface/30">
                          <td className="py-3 px-4 font-extrabold text-ink">{item.name}</td>
                          <td className="py-3 px-4 text-caption font-medium">{item.teaserCount}건</td>
                          <td className="py-3 px-4 text-ink font-bold">{item.paidCount}건</td>
                          <td className="py-3 px-4 text-right font-black text-[#FF5C77]">{item.convRate}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 방문자 수 & 레거시 패스 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-line shadow-xs space-y-2">
                <span className="text-xs font-bold text-caption">실제 방문자 수 (SiteCounter)</span>
                <p className="text-2xl font-black text-ink">{stats.visitors.count.toLocaleString()}명</p>
                <div className="flex items-center gap-2 text-xs text-caption">
                  <span>집계 시작: {formatDate(stats.visitors.startedAt)}</span>
                  <span>·</span>
                  <span className={stats.visitors.isExposed ? 'text-emerald-600 font-bold' : 'text-caption font-bold'}>
                    홈 노출 ({stats.visitors.threshold}명): {stats.visitors.isExposed ? '노출중' : '미달성'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-line shadow-xs space-y-2">
                <span className="text-xs font-bold text-caption">활성 레거시 패스 회원</span>
                <p className="text-2xl font-black text-ink">{stats.legacyPassHolders}명</p>
                <p className="text-xs text-caption">현재 기간권이 유효한 레거시 패스 보유 회원 수</p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 5: 상품 관리 (공개/숨김 스위치) (A9, A11)
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-sm">상품 공개/숨김 즉시 전환 안내</p>
                <p className="mt-1 leading-relaxed">
                  • <strong>공개하기</strong>: 결제 및 환불 운영 테스트를 통과한 상품만 공개하세요. 공개 즉시 모든 방문자에게 노출되며 결제가 가능해집니다.<br />
                  • <strong>숨기기</strong>: 문제 발생 시 즉시 신규 판매가 중단됩니다. 이미 구매한 고객의 열람은 계속 유지됩니다.<br />
                  • 모든 서버 프로세스 반영까지 <strong>최대 30초</strong>가 소요될 수 있습니다.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-line shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/60 border-b border-line text-caption font-extrabold">
                    <tr>
                      <th className="py-3 px-4">상품 (3D)</th>
                      <th className="py-3 px-4">등급 / 유형</th>
                      <th className="py-3 px-4">가격</th>
                      <th className="py-3 px-4">보관 기간</th>
                      <th className="py-3 px-4">30일 판매량</th>
                      <th className="py-3 px-4">공개 상태</th>
                      <th className="py-3 px-4">상태 출처</th>
                      <th className="py-3 px-4 text-right">스위치 액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-surface/30">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 relative shrink-0">
                              <Image src={p.icon3d} alt="" width={28} height={28} className="object-contain" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-ink">{p.name}</span>
                                {p.isNaming && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    검수 대기
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-caption">{p.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{getTierBadge(p.type === 'SET' ? 'SET' : p.tier)}</td>
                        <td className="py-3.5 px-4 font-bold text-ink">
                          {p.isFree ? '무료' : formatCurrency(p.price)}
                        </td>
                        <td className="py-3.5 px-4 text-caption">{p.accessDays}일</td>
                        <td className="py-3.5 px-4 font-bold text-ink">{p.salesCount30Days}건</td>
                        <td className="py-3.5 px-4">
                          {p.currentVisible ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ● 공개중
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                              ○ 숨김
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-caption">
                          {p.isOverride ? (
                            <span className="text-purple-700 font-bold">
                              어드민 변경 ({formatDate(p.overrideInfo?.updatedAt)})
                            </span>
                          ) : (
                            <span>코드 기본값</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          {p.currentVisible ? (
                            <button
                              onClick={() => {
                                setVisibilityModalProduct(p);
                                setVisibilityAction('hide');
                                setVisibilityReason('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold active:scale-[0.96]"
                            >
                              숨기기
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setVisibilityModalProduct(p);
                                setVisibilityAction('show');
                                setVisibilityReason('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#FF5C77] hover:bg-[#E0245A] text-white text-xs font-extrabold active:scale-[0.96]"
                            >
                              공개하기
                            </button>
                          )}
                          {p.isOverride && (
                            <button
                              onClick={() => {
                                setVisibilityModalProduct(p);
                                setVisibilityAction('reset');
                                setVisibilityReason('코드 기본값으로 초기화');
                              }}
                              className="px-2 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-soft text-caption text-xs font-bold active:scale-[0.96]"
                            >
                              기본값으로
                            </button>
                          )}
                          <a
                            href={`/ko/products/${p.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-caption hover:text-ink inline-block"
                            title="새 탭에서 보기"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 6: 회원 관리 (A8)
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div className="flex gap-6 items-start">
            <div className="flex-1 bg-white rounded-2xl border border-line shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/60 border-b border-line text-caption font-extrabold">
                    <tr>
                      <th className="py-3 px-4">이름 / 회원 ID</th>
                      <th className="py-3 px-4">이메일 (마스킹)</th>
                      <th className="py-3 px-4">구매 이력</th>
                      <th className="py-3 px-4">패스 상태</th>
                      <th className="py-3 px-4">사주 프로필</th>
                      <th className="py-3 px-4">가입일</th>
                      <th className="py-3 px-4 text-right">상세</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40">
                    {users.map((u) => {
                      const isSelected = selectedUser?.id === u.id;
                      return (
                        <tr
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#FF5C77]/5' : 'hover:bg-surface/30'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <span className="font-extrabold text-ink block">{u.name || '회원'}</span>
                            <span className="font-mono text-[10px] text-caption">{u.id.slice(0, 10)}...</span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-ink">{u.emailMasked}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-extrabold text-ink block">구매 {u.purchaseCount}건</span>
                            <span className="text-[10px] text-caption">{u.lastPurchaseDate ? formatDate(u.lastPurchaseDate) : '—'}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {u.isPassActive ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">활성</span>
                            ) : (
                              <span className="text-[10px] text-caption">만료/없음</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {u.hasSajuProfile ? (
                              <span className="text-[10px] font-bold text-emerald-600">있음</span>
                            ) : (
                              <span className="text-[10px] text-caption">없음</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-caption">{formatDate(u.createdAt)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <ChevronRight className="w-4 h-4 text-caption inline-block" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 회원 상세 패널 (A8) */}
            {selectedUser && (
              <div className="w-96 bg-white rounded-2xl border border-line shadow-lg p-5 space-y-4 shrink-0 animate-fade-in">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="font-extrabold text-sm text-ink">회원 상세 정보</h3>
                  <button onClick={() => setSelectedUser(null)} className="text-caption hover:text-ink">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-caption">회원 ID</span>
                    <span className="font-mono text-ink select-all">{selectedUser.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">이름</span>
                    <span className="font-extrabold text-ink">{selectedUser.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">이메일 (전체)</span>
                    <span className="font-bold text-ink select-all">{selectedUser.emailFull || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">누적 결제액</span>
                    <span className="font-black text-[#FF5C77]">{formatCurrency(selectedUser.totalSpend)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption">사주 프로필</span>
                    <span className="font-bold text-ink">{selectedUser.hasSajuProfile ? '보유중 (보안 보호)' : '미등록'}</span>
                  </div>
                </div>

                {/* 해당 회원의 최근 주문 목록 */}
                <div className="pt-2 border-t border-line space-y-2">
                  <h4 className="text-xs font-extrabold text-ink">구매 주문 내역</h4>
                  {orders.filter((o) => o.userId === selectedUser.id).length === 0 ? (
                    <p className="text-xs text-caption py-2">주문 내역이 없습니다.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {orders
                        .filter((o) => o.userId === selectedUser.id)
                        .map((o) => (
                          <div
                            key={o.id}
                            onClick={() => {
                              setSelectedOrder(o);
                              setActiveTab('orders');
                            }}
                            className="p-2 rounded-lg bg-surface/40 hover:bg-surface text-xs flex justify-between items-center cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-ink block">{o.productName}</span>
                              <span className="text-[10px] text-caption">{formatDate(o.createdAt)}</span>
                            </div>
                            <span className="font-bold text-ink">{formatCurrency(o.amount)}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 7: 감사 로그 (A10)
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-line shadow-xs overflow-hidden">
            <div className="p-4 border-b border-line bg-surface/40">
              <h3 className="font-extrabold text-sm text-ink">관리자 감사 로그 (최근 30건)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface/60 border-b border-line text-caption font-extrabold">
                  <tr>
                    <th className="py-3 px-4">관리자 ID</th>
                    <th className="py-3 px-4">수행 액션</th>
                    <th className="py-3 px-4">대상 유형</th>
                    <th className="py-3 px-4">대상 ID</th>
                    <th className="py-3 px-4">상세 내역</th>
                    <th className="py-3 px-4 text-right">기록 시각</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface/30">
                      <td className="py-3 px-4 text-ink font-bold">{log.adminUserId.slice(0, 10)}...</td>
                      <td className="py-3 px-4 font-bold text-[#FF5C77]">{log.action}</td>
                      <td className="py-3 px-4 text-caption">{log.targetType}</td>
                      <td className="py-3 px-4 font-sans text-caption max-w-xs truncate">
                        {typeof log.detail === 'object' && log.detail !== null
                          ? JSON.stringify(log.detail)
                          : String(log.detail ?? '')}
                      </td>
                      <td className="py-3 px-4 text-right font-sans text-caption">{formatDate(log.createdAt, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════
          MODAL: 리포트 내용 조회 (A6)
      ══════════════════════════════════════════════════════ */}
      {viewReportModalId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-line flex items-center justify-between bg-surface/30">
              <h3 className="font-extrabold text-sm text-ink flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#FF5C77]" />
                리포트 내용 검수 (CS 전용)
              </h3>
              <button onClick={() => setViewReportModalId(null)} className="text-caption hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {isLoadingReportView ? (
                <div className="py-12 text-center text-caption font-bold">리포트 데이터를 안전하게 불러오는 중...</div>
              ) : viewReportData ? (
                <div className="space-y-4">
                  <div className="p-3 bg-surface/50 rounded-xl text-xs space-y-1">
                    <p><strong>리포트 ID:</strong> {viewReportData.id}</p>
                    <p><strong>캐시 키:</strong> {viewReportData.cacheKey}</p>
                    <p><strong>점수:</strong> {viewReportData.envelope?.score ?? '—'}점</p>
                    <p><strong>최초 열람:</strong> {formatDate(viewReportData.firstViewedAt, true)}</p>
                  </div>

                  {viewReportData.envelope ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-coral-soft/20 border border-coral-line/40">
                        <h4 className="font-extrabold text-base text-coral-deep">
                          {viewReportData.envelope.data?.headline || '리포트 헤드라인'}
                        </h4>
                        <p className="text-xs text-ink mt-2 leading-relaxed">
                          {viewReportData.envelope.data?.summary || '요약 내용이 없습니다.'}
                        </p>
                      </div>

                      {/* 섹션별 내용 */}
                      {viewReportData.envelope.data?.sections && (
                        <div className="space-y-2">
                          {viewReportData.envelope.data.sections.map((sec: { title?: string; content?: string }, idx: number) => (
                            <div key={idx} className="p-3 bg-surface/30 rounded-xl border border-line text-xs space-y-1">
                              <h5 className="font-extrabold text-ink">{sec.title}</h5>
                              <p className="text-caption leading-relaxed">{sec.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <span className="text-xs font-bold text-caption mb-2 block">원문 JSON 데이터 (프리미엄 등)</span>
                      <pre className="text-[11px] font-mono text-ink overflow-x-auto p-2 bg-white rounded border">
                        {JSON.stringify(viewReportData.rawContent, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t border-line bg-surface/20 flex justify-end">
              <button
                onClick={() => setViewReportModalId(null)}
                className="px-5 py-2.5 bg-ink text-white rounded-xl text-xs font-bold hover:bg-black"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: 상품 공개/숨김 확인 (A9, A11)
      ══════════════════════════════════════════════════════ */}
      {visibilityModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-extrabold text-sm text-ink">
                상품 {visibilityAction === 'show' ? '공개' : visibilityAction === 'hide' ? '숨김' : '기본값 복귀'} 확인
              </h3>
              <button onClick={() => setVisibilityModalProduct(null)} className="text-caption hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-surface/50 rounded-xl text-xs space-y-1">
                <p><strong>대상 상품:</strong> {visibilityModalProduct.name} ({visibilityModalProduct.id})</p>
                <p><strong>현재 상태:</strong> {visibilityModalProduct.currentVisible ? '공개중' : '숨김'}</p>
                <p><strong>변경 액션:</strong> {visibilityAction === 'show' ? '공개하기 (판매 개시)' : visibilityAction === 'hide' ? '숨기기 (판매 중단)' : '코드 기본값'}</p>
              </div>

              {visibilityAction === 'show' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed font-semibold">
                  ⚠️ 운영 테스트(결제→환불)를 통과한 상품인가요? 공개하면 즉시 모든 방문자에게 보이고 결제가 가능해집니다.
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-ink mb-1">변경 사유 (감사 로그 필수 기록) *</label>
                <textarea
                  rows={2}
                  value={visibilityReason}
                  onChange={(e) => setVisibilityReason(e.target.value)}
                  placeholder="예: 390px 모바일 및 결제 환불 검증 완료로 정식 오픈"
                  className="w-full p-2.5 bg-surface/50 border border-line rounded-xl text-xs font-medium text-ink outline-none focus:border-[#FF5C77]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVisibilityModalProduct(null)}
                className="flex-1 py-2.5 rounded-xl border border-line bg-surface text-caption text-xs font-bold hover:bg-surface-soft"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isSubmittingVisibility}
                onClick={handleExecuteVisibility}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white disabled:opacity-50 ${
                  visibilityAction === 'show' ? 'bg-[#FF5C77] hover:bg-[#E0245A]' : 'bg-gray-800 hover:bg-black'
                }`}
              >
                {isSubmittingVisibility ? '반영 중...' : '확인 및 즉시 반영'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: 주문 환불 처리
      ══════════════════════════════════════════════════════ */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-extrabold text-sm text-ink">주문 환불 처리</h3>
              <button onClick={() => setRefundModalOrder(null)} className="text-caption hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface/50 rounded-xl space-y-1">
                <p><strong>주문번호:</strong> {refundModalOrder.orderId}</p>
                <p><strong>상품명:</strong> {refundModalOrder.productName}</p>
                <p><strong>결제 금액:</strong> {formatCurrency(refundModalOrder.amount)}</p>
                <p><strong>최초 열람:</strong> {refundModalOrder.firstViewedAt ? formatDate(refundModalOrder.firstViewedAt, true) : '미열람'}</p>
              </div>

              <div>
                <label className="block font-extrabold text-ink mb-1">환불 사유 *</label>
                <textarea
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="고객 요청 환불 사유를 입력하세요."
                  className="w-full p-2.5 bg-surface/50 border border-line rounded-xl outline-none focus:border-[#FF5C77]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-ink mb-1">환불 금액 (전액 환불 시 비워두기)</label>
                <input
                  type="number"
                  value={refundCancelAmount}
                  onChange={(e) => setRefundCancelAmount(e.target.value)}
                  placeholder={`기본: 전액 ${refundModalOrder.amount}원`}
                  className="w-full p-2.5 bg-surface/50 border border-line rounded-xl outline-none focus:border-[#FF5C77]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-line bg-surface text-caption text-xs font-bold hover:bg-surface-soft"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isRefunding}
                onClick={handleExecuteRefund}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold disabled:opacity-50"
              >
                {isRefunding ? '환불 진행 중...' : '환불 승인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
