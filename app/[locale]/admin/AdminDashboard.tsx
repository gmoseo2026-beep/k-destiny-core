'use client';

import { useState, useMemo } from 'react';
import { 
  DollarSign, ShoppingBag, Users, Search, RefreshCcw, 
  CheckCircle, AlertCircle, Shield, Download, Filter, 
  ExternalLink, Clock, Key, ArrowRight, X, ChevronRight,
  TrendingUp, BarChart3, UserCheck, AlertTriangle
} from 'lucide-react';

// ─── Types ───
export interface OrderItem {
  id: string;
  orderId: string;
  userId: string | null;
  email: string | null;
  compatId: string | null;
  shareToken: string | null;
  coupleName: string | null;
  type: 'SINGLE' | 'PERIOD_PASS' | string;
  planId: string | null;
  amount: number;
  status: 'PAID' | 'PENDING' | 'CANCELED' | 'FAILED' | string;
  provider: string;
  createdAt: string;
  unlockCount: number;
  unlocks: { id: string; expiresAt: string | null }[];
}

export interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  tier: string;
  isPassActive: boolean;
  premiumEndDate: string | null;
  totalSpend: number;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: any;
  createdAt: string;
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
  productDistribution: {
    single1900: number;
    single2900: number;
    singleOther: number;
    pass1Month: number;
    pass3Months: number;
  };
  conversion: {
    rate: number;
    arppu: number;
    totalCompatibilities: number;
    todayCompatibilities: number;
    pushSubscribers: number;
  };
  users: {
    total: number;
    today: number;
    activePassHolders: number;
  };
}

interface AdminDashboardProps {
  stats: DashboardStats;
  orders: OrderItem[];
  users: UserItem[];
  auditLogs: AuditLogItem[];
}

// ─── Helpers ───
function formatCurrency(amount: number) {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

function formatDate(dateStr: string | null, includeTime = false) {
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

function getProductLabel(o: OrderItem) {
  if (o.type === 'SINGLE') {
    if (o.amount === 1900) return '단건 (첫결제 1,900원)';
    if (o.amount === 2900) return '단건 (2,900원)';
    return `단건 심층 리포트 (${formatCurrency(o.amount)})`;
  }
  if (o.type === 'PERIOD_PASS') {
    if (o.planId === '1_MONTH') return '플러스 1개월 패스';
    if (o.planId === '3_MONTHS') return '플러스 3개월 패스';
    return `플러스 이용권 (${o.planId || '패스'})`;
  }
  return o.type;
}

export default function AdminDashboard({ stats: initialStats, orders: initialOrders, users: initialUsers, auditLogs: initialLogs }: AdminDashboardProps) {
  // Tabs: orders (주문/결제), cs (고객조회), metrics (지표), users (회원), audit (감사로그)
  const [activeTab, setActiveTab] = useState<'orders' | 'cs' | 'metrics' | 'users' | 'audit'>('orders');

  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(initialLogs);

  // ─── 1. 주문 탭 상태 ───
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');

  // 환불 모달 상태
  const [refundModalOrder, setRefundModalOrder] = useState<OrderItem | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundCancelAmount, setRefundCancelAmount] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState(false);

  // ─── 2. CS 고객조회 탭 상태 ───
  const [csQuery, setCsQuery] = useState('');
  const [isSearchingCs, setIsSearchingCs] = useState(false);
  const [csResult, setCsResult] = useState<{
    query: string;
    users: any[];
    orders: any[];
    unlocks: any[];
  } | null>(null);

  // 언락 수동 발급 모달 상태
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantCompatId, setGrantCompatId] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantDays, setGrantDays] = useState(90);
  const [grantReason, setGrantReason] = useState('');
  const [isGranting, setIsGranting] = useState(false);

  // 토스트 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ─── 필터링된 주문 목록 ───
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        orderSearch === '' ||
        o.orderId.toLowerCase().includes(orderSearch.toLowerCase()) ||
        (o.email && o.email.toLowerCase().includes(orderSearch.toLowerCase())) ||
        (o.compatId && o.compatId.toLowerCase().includes(orderSearch.toLowerCase())) ||
        (o.coupleName && o.coupleName.toLowerCase().includes(orderSearch.toLowerCase()));

      const matchStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
      const matchType = orderTypeFilter === 'ALL' || o.type === orderTypeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [orders, orderSearch, orderStatusFilter, orderTypeFilter]);

  // ─── 환불 처리 핸들러 ───
  const handleExecuteRefund = async () => {
    if (!refundModalOrder) return;
    if (!refundReason.trim()) {
      alert('환불 사유를 입력해주세요.');
      return;
    }

    if (!confirm(`[경고] 주문 ${refundModalOrder.orderId} 건을 정말 환불하시겠습니까?\n사유: ${refundReason}`)) {
      return;
    }

    try {
      setIsRefunding(true);
      const res = await fetch('/api/admin/orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: refundModalOrder.orderId,
          reason: refundReason.trim(),
          cancelAmount: refundCancelAmount ? Number(refundCancelAmount) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '환불 처리에 실패했습니다.');
      }

      // 로컬 주문 상태 갱신
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === refundModalOrder.orderId ? { ...o, status: 'CANCELED' } : o
        )
      );

      showToast('환불 및 권한 회수가 성공적으로 완료되었습니다! ✅');
      setRefundModalOrder(null);
      setRefundReason('');
      setRefundCancelAmount('');
    } catch (err: any) {
      alert(err.message || '오류가 발생했습니다.');
    } finally {
      setIsRefunding(false);
    }
  };

  // ─── CS 고객 조회 핸들러 ───
  const handleSearchCustomer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!csQuery.trim()) {
      alert('검색할 이메일, 주문번호, 또는 궁합ID를 입력해주세요.');
      return;
    }

    try {
      setIsSearchingCs(true);
      const res = await fetch(`/api/admin/customers/search?query=${encodeURIComponent(csQuery.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '검색 실패');
      setCsResult(data);
    } catch (err: any) {
      alert(err.message || '검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearchingCs(false);
    }
  };

  // ─── 언락 수동 발급 핸들러 ───
  const handleGrantUnlock = async () => {
    if (!grantCompatId.trim()) {
      alert('궁합 식별자(compatId)를 입력해주세요.');
      return;
    }
    if (!grantEmail.trim()) {
      alert('고객 이메일을 입력해주세요. (compatId 단독 발급 금지)');
      return;
    }
    if (!grantReason.trim()) {
      alert('발급 사유를 입력해주세요.');
      return;
    }

    try {
      setIsGranting(true);
      const res = await fetch('/api/admin/unlocks/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compatId: grantCompatId.trim(),
          email: grantEmail.trim() || undefined,
          days: grantDays,
          reason: grantReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '언락 발급 실패');

      showToast(data.message || '심층 리포트 열람 권한이 성공적으로 발급되었습니다! 🔑');
      setGrantModalOpen(false);
      setGrantCompatId('');
      setGrantEmail('');
      setGrantReason('');

      // CS 검색 중이었다면 다시 검색하여 갱신
      if (csQuery) handleSearchCustomer();
    } catch (err: any) {
      alert(err.message || '언락 발급 오류');
    } finally {
      setIsGranting(false);
    }
  };

  // ─── 회원 권한 변경 핸들러 ───
  const handleToggleRole = async (user: UserItem) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`${user.name || user.email} 회원의 권한을 ${newRole}(으)로 변경하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '권한 변경 실패');

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      showToast(data.message || '권한이 변경되었습니다.');
    } catch (err: any) {
      alert(err.message || '오류가 발생했습니다.');
    }
  };

  // ─── CSV 내보내기 ───
  const handleExportOrdersCSV = () => {
    const headers = ['주문일시', '주문번호', '상품유형', '플랜', '금액', '상태', '이메일', '회원ID', '궁합ID'];
    const rows = filteredOrders.map((o) => [
      formatDate(o.createdAt, true),
      o.orderId,
      o.type,
      o.planId || '',
      o.amount.toString(),
      o.status,
      o.email || '',
      o.userId || '게스트',
      o.compatId || '',
    ]);

    const csvContent = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kongdak-orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2B2430] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-white/10 animate-bounce">
          <span>✨</span>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#2B2430]">콩닥 운영·CS 콘솔</h1>
            <span className="text-xs px-2.5 py-0.5 bg-[#FF5C77]/10 text-[#FF5C77] font-bold rounded-full">
              Phase A 실전
            </span>
          </div>
          <p className="text-xs text-[#8A8291] mt-1 font-medium">
            주문·결제 관리, 원클릭 환불, 고객 언락 재발급, 실시간 매출 지표
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={() => {
            setGrantModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8AA1] to-[#FF5C77] text-white text-xs font-bold shadow-md hover:opacity-95 transition-all active:scale-95"
        >
          <Key className="w-4 h-4" />
          <span>수동 언락 발급/연장</span>
        </button>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#2B2430]/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'orders'
              ? 'bg-[#6A2C70] text-white shadow-sm'
              : 'bg-white text-[#6A5E72] hover:bg-[#FFF6F1] border border-[#2B2430]/5'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>주문·결제 관리</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('cs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'cs'
              ? 'bg-[#6A2C70] text-white shadow-sm'
              : 'bg-white text-[#6A5E72] hover:bg-[#FFF6F1] border border-[#2B2430]/5'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>고객(이메일) 조회 & CS</span>
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'metrics'
              ? 'bg-[#6A2C70] text-white shadow-sm'
              : 'bg-white text-[#6A5E72] hover:bg-[#FFF6F1] border border-[#2B2430]/5'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>매출·전환 지표</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-[#6A2C70] text-white shadow-sm'
              : 'bg-white text-[#6A5E72] hover:bg-[#FFF6F1] border border-[#2B2430]/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>회원 관리</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-[#6A2C70] text-white shadow-sm'
              : 'bg-white text-[#6A5E72] hover:bg-[#FFF6F1] border border-[#2B2430]/5'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>감사 로그</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: 주문·결제 관리 (CS 1순위)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/60 shadow-sm">
              <span className="text-[11px] font-bold text-[#8A8291]">오늘 결제액</span>
              <div className="text-xl font-black text-[#6A2C70] mt-1">
                {formatCurrency(initialStats.revenue.today)}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">
                {initialStats.revenue.todayCount}건 완료
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/60 shadow-sm">
              <span className="text-[11px] font-bold text-[#8A8291]">이번 주 결제액</span>
              <div className="text-xl font-black text-[#2B2430] mt-1">
                {formatCurrency(initialStats.revenue.week)}
              </div>
              <span className="text-[10px] text-[#8A8291] font-semibold">
                {initialStats.revenue.weekCount}건 완료
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/60 shadow-sm">
              <span className="text-[11px] font-bold text-[#8A8291]">누적 매출</span>
              <div className="text-xl font-black text-[#2B2430] mt-1">
                {formatCurrency(initialStats.revenue.total)}
              </div>
              <span className="text-[10px] text-[#8A8291] font-semibold">
                총 {initialStats.revenue.totalCount}건
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/60 shadow-sm">
              <span className="text-[11px] font-bold text-rose-600">환불/취소 내역</span>
              <div className="text-xl font-black text-rose-600 mt-1">
                {formatCurrency(initialStats.revenue.refundAmount)}
              </div>
              <span className="text-[10px] text-rose-500 font-bold">
                총 {initialStats.revenue.refundCount}건 회수
              </span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-[#FFD9E0]/60 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex-1 w-full md:w-auto relative">
              <Search className="w-4 h-4 text-[#8A8291] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="주문번호, 이메일, 커플이름, compatId 검색..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#FFF6F1] border border-[#FFD9E0] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5C77]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-[#FFD9E0] rounded-xl text-xs font-bold text-[#6A2C70] focus:outline-none"
              >
                <option value="ALL">전체 상태</option>
                <option value="PAID">결제완료 (PAID)</option>
                <option value="PENDING">대기중 (PENDING)</option>
                <option value="CANCELED">환불/취소 (CANCELED)</option>
              </select>

              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-[#FFD9E0] rounded-xl text-xs font-bold text-[#6A2C70] focus:outline-none"
              >
                <option value="ALL">전체 상품</option>
                <option value="SINGLE">단건 심층 리포트</option>
                <option value="PERIOD_PASS">플러스 이용권 패스</option>
              </select>

              <button
                onClick={handleExportOrdersCSV}
                className="px-3 py-2 bg-[#FFF6F1] hover:bg-[#FFD9E0]/40 border border-[#FFD9E0] text-[#6A2C70] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-[#FFD9E0]/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FFF6F1] text-[#6A2C70] border-b border-[#FFD9E0] font-bold">
                    <th className="py-3 px-4">주문일시</th>
                    <th className="py-3 px-4">주문번호</th>
                    <th className="py-3 px-4">상품</th>
                    <th className="py-3 px-4">금액</th>
                    <th className="py-3 px-4">상태</th>
                    <th className="py-3 px-4">구매자 (이메일/회원)</th>
                    <th className="py-3 px-4">궁합/결과 링크</th>
                    <th className="py-3 px-4 text-center">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFD9E0]/40 font-medium text-[#2B2430]">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#8A8291]">
                        일치하는 주문 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#FFF6F1]/50 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-[#8A8291]">
                          {formatDate(o.createdAt, true)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] font-bold">
                          {o.orderId}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#6A2C70]">
                            {getProductLabel(o)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold whitespace-nowrap">
                          {formatCurrency(o.amount)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(o.status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs">{o.email || '—'}</span>
                            <span className="text-[10px] text-[#8A8291]">
                              {o.userId ? '회원 결제' : '비회원 게스트'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {o.shareToken ? (
                            <a
                              href={`/ko/compat/${o.shareToken}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#FF5C77] font-bold hover:underline flex items-center gap-1"
                            >
                              <span>{o.coupleName || '결과 보기'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[#8A8291]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {o.status === 'PAID' ? (
                            <button
                              onClick={() => {
                                setRefundModalOrder(o);
                                setRefundCancelAmount(o.amount.toString());
                              }}
                              className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all active:scale-95"
                            >
                              환불
                            </button>
                          ) : o.status === 'PENDING' ? (
                            <span className="text-[11px] text-amber-600">미결제</span>
                          ) : (
                            <span className="text-[11px] text-gray-400">완료됨</span>
                          )}
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

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: 고객(이메일) 조회 & CS 대응 (CS 2순위)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'cs' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
            <h2 className="text-base font-bold text-[#2B2430] mb-2 flex items-center gap-2">
              <span>🔍</span>
              <span>고객 이메일 / 주문번호 통합 조회</span>
            </h2>
            <p className="text-xs text-[#8A8291] mb-4">
              &quot;결제했는데 안 열려요&quot;, &quot;결과 링크를 잃어버렸어요&quot; 문의 시 고객의 이메일이나 주문번호로 조회하여 언락 권한을 즉시 확인하고 재발급할 수 있습니다.
            </p>

            <form onSubmit={handleSearchCustomer} className="flex gap-2 max-w-xl">
              <input
                type="text"
                placeholder="고객 이메일, 주문번호(kd_ord_...), 궁합ID 입력..."
                value={csQuery}
                onChange={(e) => setCsQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-[#FFF6F1] border border-[#FFD9E0] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5C77]"
              />
              <button
                type="submit"
                disabled={isSearchingCs}
                className="px-5 py-2.5 bg-[#6A2C70] text-white rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSearchingCs ? '검색 중...' : '조회하기'}
              </button>
            </form>
          </div>

          {/* Search Results */}
          {csResult && (
            <div className="space-y-6">
              {/* 1. 회원 계정 정보 */}
              {csResult.users.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
                  <h3 className="text-sm font-bold text-[#6A2C70] mb-3 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    <span>회원 계정 정보</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {csResult.users.map((u) => (
                      <div key={u.id} className="p-4 bg-[#FFF6F1] rounded-2xl border border-[#FFD9E0] space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#2B2430]">{u.name || '이름 없음'}</span>
                          <span className="px-2 py-0.5 bg-white text-[#6A2C70] font-bold rounded-md border border-[#FFD9E0]">
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[#6A5E72]">{u.email}</div>
                        <div className="pt-2 text-[11px] text-[#8A8291] flex justify-between">
                          <span>가입일: {formatDate(u.createdAt)}</span>
                          <span>이용권: {u.premiumEndDate ? `~${formatDate(u.premiumEndDate)}` : '없음'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. 언락 (열람 권한) 목록 */}
              <div className="bg-white p-6 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#6A2C70] flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    <span>보유한 심층 리포트 열람 권한 (Unlock)</span>
                  </h3>
                  <button
                    onClick={() => {
                      setGrantEmail(csQuery.includes('@') ? csQuery : '');
                      setGrantModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#FF5C77] text-white rounded-xl text-xs font-bold hover:opacity-90 active:scale-95"
                  >
                    + 이 고객에게 언락 수동 발급
                  </button>
                </div>

                {csResult.unlocks.length === 0 ? (
                  <p className="text-xs text-[#8A8291] py-4 text-center">
                    등록된 언락 권한이 없습니다. (미결제이거나 주문만 생성됨)
                  </p>
                ) : (
                  <div className="space-y-3">
                    {csResult.unlocks.map((u) => {
                      const isExpired = u.expiresAt ? new Date(u.expiresAt) < new Date() : false;
                      return (
                        <div
                          key={u.id}
                          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                            isExpired ? 'bg-gray-50 border-gray-200' : 'bg-emerald-50/40 border-emerald-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#2B2430]">
                                {u.compatInfo?.personA?.name || 'A'} ❤️ {u.compatInfo?.personB?.name || 'B'} 궁합
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isExpired ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isExpired ? '만료됨' : '열람 가능'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#8A8291] mt-1 space-x-2">
                              <span>발급일: {formatDate(u.createdAt)}</span>
                              <span>•</span>
                              <span>만료일: {u.expiresAt ? formatDate(u.expiresAt) : '영구'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {u.compatInfo?.shareToken && (
                              <a
                                href={`/ko/compat/${u.compatInfo.shareToken}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-white border border-[#FFD9E0] text-[#6A2C70] rounded-xl font-bold hover:bg-[#FFF6F1] flex items-center gap-1"
                              >
                                <span>결과 열기</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setGrantCompatId(u.compatId);
                                setGrantEmail(u.email || '');
                                setGrantDays(30);
                                setGrantModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-[#6A2C70] text-white rounded-xl font-bold hover:opacity-90 active:scale-95"
                            >
                              +30일 연장
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. 주문 내역 목록 */}
              <div className="bg-white p-6 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
                <h3 className="text-sm font-bold text-[#6A2C70] mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>주문 및 결제 이력</span>
                </h3>

                {csResult.orders.length === 0 ? (
                  <p className="text-xs text-[#8A8291] py-4 text-center">주문 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {csResult.orders.map((o) => (
                      <div key={o.id} className="p-3 bg-[#FFF6F1] rounded-xl border border-[#FFD9E0] flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{o.orderId}</span>
                            {getStatusBadge(o.status)}
                            <span className="font-bold text-[#6A2C70]">{formatCurrency(o.amount)}</span>
                          </div>
                          <div className="text-[11px] text-[#8A8291] mt-0.5">
                            {formatDate(o.createdAt, true)} • {o.type} ({o.planId || '단건'})
                          </div>
                        </div>

                        {o.status === 'PAID' && (
                          <button
                            onClick={() => {
                              setRefundModalOrder(o);
                              setRefundCancelAmount(o.amount.toString());
                            }}
                            className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg font-bold hover:bg-rose-100"
                          >
                            환불
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: 대시보드 지표 (3순위)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Revenue Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
              <span className="text-xs font-bold text-[#8A8291]">오늘 매출</span>
              <div className="text-3xl font-black text-[#6A2C70] mt-2">
                {formatCurrency(initialStats.revenue.today)}
              </div>
              <p className="text-xs text-emerald-600 font-bold mt-2">
                결제 건수: {initialStats.revenue.todayCount}건
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
              <span className="text-xs font-bold text-[#8A8291]">최근 7일 매출</span>
              <div className="text-3xl font-black text-[#2B2430] mt-2">
                {formatCurrency(initialStats.revenue.week)}
              </div>
              <p className="text-xs text-[#8A8291] font-semibold mt-2">
                결제 건수: {initialStats.revenue.weekCount}건
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
              <span className="text-xs font-bold text-[#8A8291]">최근 30일 매출</span>
              <div className="text-3xl font-black text-[#2B2430] mt-2">
                {formatCurrency(initialStats.revenue.month)}
              </div>
              <p className="text-xs text-[#8A8291] font-semibold mt-2">
                결제 건수: {initialStats.revenue.monthCount}건
              </p>
            </div>
          </div>

          {/* Conversion & Funnel Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
              <span className="text-xs font-bold text-[#8A8291]">궁합 → 결제 전환율</span>
              <div className="text-2xl font-black text-[#FF5C77] mt-1">
                {initialStats.conversion.rate}%
              </div>
              <p className="text-[11px] text-[#8A8291] mt-1">
                궁합 {initialStats.conversion.totalCompatibilities.toLocaleString()}건 중 {initialStats.revenue.totalCount}건 결제
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
              <span className="text-xs font-bold text-[#8A8291]">ARPPU (결제자당 평균매출)</span>
              <div className="text-2xl font-black text-[#2B2430] mt-1">
                {formatCurrency(initialStats.conversion.arppu)}
              </div>
              <p className="text-[11px] text-[#8A8291] mt-1">
                유료 결제 고객 기준
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
              <span className="text-xs font-bold text-[#8A8291]">오늘 생성된 궁합</span>
              <div className="text-2xl font-black text-[#2B2430] mt-1">
                {initialStats.conversion.todayCompatibilities.toLocaleString()}건
              </div>
              <p className="text-[11px] text-[#8A8291] mt-1">
                누적: {initialStats.conversion.totalCompatibilities.toLocaleString()}건
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
              <span className="text-xs font-bold text-[#8A8291]">활성 플러스 패스 회원</span>
              <div className="text-2xl font-black text-[#6A2C70] mt-1">
                {initialStats.users.activePassHolders}명
              </div>
              <p className="text-[11px] text-[#8A8291] mt-1">
                전체 가입자 {initialStats.users.total}명 중
              </p>
            </div>
          </div>

          {/* Product Distribution */}
          <div className="bg-white p-6 rounded-3xl border border-[#FFD9E0]/60 shadow-sm">
            <h3 className="text-sm font-bold text-[#2B2430] mb-4">상품별 판매 분포</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
              <div className="p-3 bg-[#FFF6F1] rounded-2xl border border-[#FFD9E0]">
                <div className="text-[11px] text-[#8A8291] font-semibold">단건 (첫결제 1,900)</div>
                <div className="text-lg font-black text-[#FF5C77] mt-1">
                  {initialStats.productDistribution.single1900}건
                </div>
              </div>
              <div className="p-3 bg-[#FFF6F1] rounded-2xl border border-[#FFD9E0]">
                <div className="text-[11px] text-[#8A8291] font-semibold">단건 (정가 2,900)</div>
                <div className="text-lg font-black text-[#FF5C77] mt-1">
                  {initialStats.productDistribution.single2900}건
                </div>
              </div>
              <div className="p-3 bg-[#FFF6F1] rounded-2xl border border-[#FFD9E0]">
                <div className="text-[11px] text-[#8A8291] font-semibold">단건 (기타)</div>
                <div className="text-lg font-black text-[#2B2430] mt-1">
                  {initialStats.productDistribution.singleOther}건
                </div>
              </div>
              <div className="p-3 bg-[#FFF6F1] rounded-2xl border border-[#FFD9E0]">
                <div className="text-[11px] text-[#8A8291] font-semibold">플러스 1개월 (9,900)</div>
                <div className="text-lg font-black text-[#6A2C70] mt-1">
                  {initialStats.productDistribution.pass1Month}건
                </div>
              </div>
              <div className="p-3 bg-[#FFF6F1] rounded-2xl border border-[#FFD9E0]">
                <div className="text-[11px] text-[#8A8291] font-semibold">플러스 3개월 (24,900)</div>
                <div className="text-lg font-black text-[#6A2C70] mt-1">
                  {initialStats.productDistribution.pass3Months}건
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: 회원 관리 (개편)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#FFD9E0]/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FFF6F1] text-[#6A2C70] border-b border-[#FFD9E0] font-bold">
                    <th className="py-3 px-4">회원</th>
                    <th className="py-3 px-4">이메일</th>
                    <th className="py-3 px-4">권한 (Role)</th>
                    <th className="py-3 px-4">이용권 상태 (플러스 패스)</th>
                    <th className="py-3 px-4">누적 결제액</th>
                    <th className="py-3 px-4">가입일</th>
                    <th className="py-3 px-4 text-center">관리자 설정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFD9E0]/40 font-medium text-[#2B2430]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FFF6F1]/50 transition-colors">
                      <td className="py-3 px-4 font-bold">
                        {u.name || '이름 없음'}
                      </td>
                      <td className="py-3 px-4 text-[#6A5E72]">
                        {u.email || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'ADMIN' ? 'bg-[#FF5C77]/15 text-[#FF5C77]' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.isPassActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <span>✨ 활성</span>
                            <span className="text-[10px] text-[#8A8291]">
                              (~{formatDate(u.premiumEndDate)})
                            </span>
                          </span>
                        ) : (
                          <span className="text-[#8A8291]">미보유</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        {formatCurrency(u.totalSpend)}
                      </td>
                      <td className="py-3 px-4 text-[#8A8291]">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleRole(u)}
                          className="px-2 py-1 bg-white border border-[#FFD9E0] text-[#6A2C70] rounded-lg text-[11px] font-bold hover:bg-[#FFF6F1]"
                        >
                          {u.role === 'ADMIN' ? '관리자 해제' : '관리자 승급'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: 감사 로그 (Audit Log)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-[#FFD9E0]/60 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#2B2430]">운영자 감사 로그 (Audit Trail)</h2>
            <p className="text-xs text-[#8A8291] mt-1">
              환불, 언락 수동 발급, 권한 변경 등 관리자의 모든 주요 운영 행위가 기록됩니다.
            </p>
          </div>

          <div className="divide-y divide-[#FFD9E0]/40 text-xs">
            {auditLogs.length === 0 ? (
              <p className="py-8 text-center text-[#8A8291]">기록된 감사 로그가 없습니다.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.action === 'REFUND' ? 'bg-rose-100 text-rose-800' :
                        log.action === 'UNLOCK_GRANT' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {log.action}
                      </span>
                      <span className="font-bold text-[#2B2430]">대상: {log.targetType} ({log.targetId})</span>
                    </div>
                    {log.detail && (
                      <div className="text-[#6A5E72] text-[11px] font-mono bg-[#FFF6F1] p-2 rounded-lg">
                        {JSON.stringify(log.detail)}
                      </div>
                    )}
                  </div>
                  <div className="text-[#8A8291] text-[11px] whitespace-nowrap">
                    {formatDate(log.createdAt, true)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: 환불 처리 모달
      ───────────────────────────────────────────────────────────── */}
      {refundModalOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#FFD9E0] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-[#2B2430]">결제 환불 처리</h3>
              </div>
              <button onClick={() => setRefundModalOrder(null)} className="text-[#8A8291] hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#FFF6F1] rounded-xl text-xs space-y-1.5 border border-[#FFD9E0]">
              <div><strong>주문번호:</strong> <span className="font-mono">{refundModalOrder.orderId}</span></div>
              <div><strong>구매상품:</strong> {getProductLabel(refundModalOrder)}</div>
              <div><strong>결제금액:</strong> {formatCurrency(refundModalOrder.amount)}</div>
              <div><strong>구매자:</strong> {refundModalOrder.email || '비회원 게스트'}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#2B2430] block mb-1">
                  환불 사유 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="예: 고객 단순 변심, 시스템 오류로 인한 중복 결제 등"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full p-2.5 border border-[#FFD9E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C77]"
                />
              </div>

              <div>
                <label className="font-bold text-[#2B2430] block mb-1">
                  환불 금액 (미입력 시 전액 환불)
                </label>
                <input
                  type="number"
                  placeholder={refundModalOrder.amount.toString()}
                  value={refundCancelAmount}
                  onChange={(e) => setRefundCancelAmount(e.target.value)}
                  className="w-full p-2.5 border border-[#FFD9E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C77]"
                />
              </div>
            </div>

            <p className="text-[11px] text-[#8A8291] leading-relaxed">
              ⚠️ 환불 처리 시 PortOne PG 결제 취소가 호출되며, 회원의 경우 Unlock 회수 및 이용권 기간이 즉시 롤백됩니다. 이 작업은 취소할 수 없습니다.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isRefunding}
                onClick={handleExecuteRefund}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 active:scale-95 disabled:opacity-50"
              >
                {isRefunding ? '환불 진행 중...' : '환불 확정'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: 언락 수동 발급 / 연장 모달
      ───────────────────────────────────────────────────────────── */}
      {grantModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#FFD9E0] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[#FF5C77]" />
                <h3 className="text-base font-black text-[#2B2430]">심층 리포트 언락 수동 발급/연장</h3>
              </div>
              <button onClick={() => setGrantModalOpen(false)} className="text-[#8A8291] hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#2B2430] block mb-1">
                  대상 궁합 식별자 (compatId 또는 shareToken) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="예: cmtsrm97e0002dvkuiwsgbqz8"
                  value={grantCompatId}
                  onChange={(e) => setGrantCompatId(e.target.value)}
                  className="w-full p-2.5 border border-[#FFD9E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C77]"
                />
              </div>

              <div>
                <label className="font-bold text-[#2B2430] block mb-1">
                  고객 이메일 <span className="text-rose-500">*</span> <span className="text-xs text-gray-400 font-normal">(열람자 특정 필수)</span>
                </label>
                <input
                  type="email"
                  placeholder="예: customer@example.com"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  className="w-full p-2.5 border border-[#FFD9E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C77]"
                />
              </div>

              <div>
                <label className="font-bold text-[#2B2430] block mb-1">
                  유효 일수 <span className="text-xs text-gray-400 font-normal">(최대 90일, KG 열람 유효기간 준수)</span>
                </label>
                <select
                  value={grantDays}
                  onChange={(e) => setGrantDays(Number(e.target.value))}
                  className="w-full p-2.5 border border-[#FFD9E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C77]"
                >
                  <option value={30}>30일 (+1개월)</option>
                  <option value={90}>90일 (+3개월, KG 표준 최대 열람기간)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#2B2430] block mb-1">
                  발급 사유 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="예: 결제 완료 후 열람 장애 CS 보상, VIP 고객 이벤트 부여 등"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="w-full p-2.5 border border-[#FFD9E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5C77]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGrantModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isGranting}
                onClick={handleGrantUnlock}
                className="flex-1 py-2.5 bg-[#6A2C70] text-white rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {isGranting ? '발급 중...' : '언락 권한 발급'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
