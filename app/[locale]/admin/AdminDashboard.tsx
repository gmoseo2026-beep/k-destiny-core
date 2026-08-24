'use client';

import { useState, useMemo } from 'react';
import { updateSubscriptionTier, updateUsageTokens } from './actions';
import { 
  Users, Crown, Sparkles, Search, CheckCircle, AlertCircle, 
  Edit2, Shield, Download, Filter, Calendar, DollarSign, 
  ChevronDown, X
} from 'lucide-react';

// ─── Types ───
type UserData = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  tier: string;
  usageTokens: number;
  planType: string | null;
  paidAmount: number | null;
  premiumStartDate: string | null;
  premiumEndDate: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
};

// ─── Helpers ───
const PLAN_LABELS: Record<string, string> = {
  '1_MONTH': '1개월',
  '3_MONTHS': '3개월',
  '6_MONTHS': '6개월',
  '1_YEAR': '1년',
};

function formatCurrency(cents: number | null) {
  if (!cents) return '—';
  return `₩${cents.toLocaleString()}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusColor(status: string | null) {
  switch (status) {
    case 'ACTIVE': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    case 'EXPIRED': return 'bg-red-50 text-red-600 border-red-200';
    case 'CANCELLED': return 'bg-orange-50 text-orange-600 border-orange-200';
    default: return 'bg-gray-100 text-gray-500 border-gray-200';
  }
}

// ─── CSV Export ───
function exportToCSV(users: UserData[]) {
  const headers = ['이름', '이메일', '역할', '등급', '플랜', '결제액', '상태', '시작일', '종료일', '토큰', '가입일'];
  const rows = users.map(u => [
    u.name || '', 
    u.email || '', 
    u.role, 
    u.tier,
    PLAN_LABELS[u.planType || ''] || u.planType || '',
    u.paidAmount ? u.paidAmount.toString() : '',
    u.subscriptionStatus || 'NONE',
    u.premiumStartDate ? new Date(u.premiumStartDate).toISOString().split('T')[0] : '',
    u.premiumEndDate ? new Date(u.premiumEndDate).toISOString().split('T')[0] : '',
    u.usageTokens.toString(),
    new Date(u.createdAt).toISOString().split('T')[0],
  ]);
  
  const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `kongdak-users-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───
export default function AdminDashboard({ users: rawUsers, stats }: { users: any[], stats: any }) {
  const users: UserData[] = rawUsers.map(u => ({ ...u, createdAt: u.createdAt?.toISOString?.() || u.createdAt, premiumStartDate: u.premiumStartDate?.toISOString?.() || u.premiumStartDate, premiumEndDate: u.premiumEndDate?.toISOString?.() || u.premiumEndDate }));

  // Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editTokens, setEditTokens] = useState<number>(0);

  // Computed
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = search === '' || 
        (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
        (u.email || '').toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchTier = tierFilter === 'ALL' || u.tier === tierFilter;
      const matchPlan = planFilter === 'ALL' || u.planType === planFilter;
      const matchStatus = statusFilter === 'ALL' || (u.subscriptionStatus || 'NONE') === statusFilter;
      return matchSearch && matchRole && matchTier && matchPlan && matchStatus;
    });
  }, [users, search, roleFilter, tierFilter, planFilter, statusFilter]);

  const activeFiltersCount = [roleFilter, tierFilter, planFilter, statusFilter].filter(f => f !== 'ALL').length;

  const handleTierChange = async (userId: string, currentTier: string) => {
    const newTier = currentTier === 'FREE' ? 'PREMIUM' : 'FREE';
    const res = await updateSubscriptionTier(userId, newTier as any);
    if (!res.success) alert(res.error);
  };

  const handleSaveTokens = async (userId: string) => {
    const res = await updateUsageTokens(userId, editTokens);
    if (res.success) setEditingUserId(null);
    else alert(res.error);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-ink tracking-tight">콩닥 관리자</h1>
          <p className="text-ink/70 font-sans text-sm mt-1">콩닥 서비스 지표와 회원을 관리합니다.</p>
        </div>
        <button
          onClick={() => exportToCSV(filteredUsers)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-coral/10 border border-coral/30 text-coral text-sm font-semibold hover:bg-coral/20 hover:border-coral/50 active:scale-95 transition-all self-start"
        >
          <Download className="w-4 h-4" />
          CSV 내보내기 ({filteredUsers.length})
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-14 h-14 text-blue-500" />} label="전체 회원" value={stats.totalUsers} color="hover:border-blue-500/30" />
        <StatCard icon={<Crown className="w-14 h-14 text-gold" />} label="유료 구독자" value={stats.premiumUsers} color="hover:border-gold/30" />
        <StatCard icon={<Sparkles className="w-14 h-14 text-coral" />} label="오늘의 사주" value={stats.sajuReadingsToday} color="hover:border-coral/30" />
        <StatCard icon={<DollarSign className="w-14 h-14 text-purple-500" />} label="활성 구독" value={stats.activeSubscriptions ?? 0} color="hover:border-purple-500/30" />
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#2B2430]/10 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="이름 또는 이메일 검색..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#FFF6F1]/50 border border-[#2B2430]/10 rounded-xl pl-9 pr-4 py-2.5 text-sm font-sans text-ink placeholder:text-gray-400 focus:outline-none focus:border-coral/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <FilterSelect label="역할" value={roleFilter} onChange={setRoleFilter} options={[
              { value: 'ALL', label: '전체 역할' },
              { value: 'ADMIN', label: '관리자' },
              { value: 'USER', label: '사용자' },
            ]} />
            <FilterSelect label="등급" value={tierFilter} onChange={setTierFilter} options={[
              { value: 'ALL', label: '전체 등급' },
              { value: 'FREE', label: '무료' },
              { value: 'PREMIUM', label: '프리미엄' },
            ]} />
            <FilterSelect label="플랜" value={planFilter} onChange={setPlanFilter} options={[
              { value: 'ALL', label: '전체 플랜' },
              { value: '1_MONTH', label: '1개월' },
              { value: '3_MONTHS', label: '3개월' },
              { value: '6_MONTHS', label: '6개월' },
              { value: '1_YEAR', label: '1년' },
            ]} />
            <FilterSelect label="상태" value={statusFilter} onChange={setStatusFilter} options={[
              { value: 'ALL', label: '전체 상태' },
              { value: 'ACTIVE', label: '활성' },
              { value: 'EXPIRED', label: '만료' },
              { value: 'CANCELLED', label: '취소' },
              { value: 'NONE', label: '없음' },
            ]} />

            {activeFiltersCount > 0 && (
              <button
                onClick={() => { setRoleFilter('ALL'); setTierFilter('ALL'); setPlanFilter('ALL'); setStatusFilter('ALL'); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-all"
              >
                <X className="w-3 h-3" />
                초기화 ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] font-sans text-gray-500 mt-2 flex items-center gap-1.5">
          <Filter className="w-3 h-3" />
          전체 {users.length}명 중 {filteredUsers.length}명 표시
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#2B2430]/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-sm">
            <thead className="bg-[#2B2430]/5 text-ink/70 border-b border-[#2B2430]/10">
              <tr>
                <th className="px-5 py-4 font-semibold whitespace-nowrap">이름/이메일</th>
                <th className="px-5 py-4 font-semibold whitespace-nowrap">역할</th>
                <th className="px-5 py-4 font-semibold whitespace-nowrap">등급</th>
                <th className="px-5 py-4 font-semibold whitespace-nowrap">플랜</th>
                <th className="px-5 py-4 font-semibold whitespace-nowrap">결제액</th>
                <th className="px-5 py-4 font-semibold whitespace-nowrap">활성 기간</th>
                <th className="px-5 py-4 font-semibold whitespace-nowrap">상태</th>
                <th className="px-5 py-4 font-semibold whitespace-nowrap">가입일</th>
                <th className="px-5 py-4 font-semibold text-right whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B2430]/5">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#FFF6F1]/50 transition-colors group">
                  {/* User (Name + Email + Avatar) */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img src={user.image} alt="" className="w-8 h-8 rounded-full border border-gray-200 object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-coral/10 border border-coral/20 flex items-center justify-center text-xs font-bold text-coral flex-shrink-0">
                          {(user.name || user.email || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-ink font-medium text-sm truncate max-w-[140px]">{user.name || '—'}</p>
                        <p className="text-gray-500 text-[11px] truncate max-w-[140px]">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.role === 'ADMIN' ? 'bg-coral/10 text-coral border border-coral/20' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {user.role === 'ADMIN' && <Shield className="w-2.5 h-2.5" />}
                      {user.role === 'ADMIN' ? '관리자' : '사용자'}
                    </span>
                  </td>

                  {/* Tier */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.tier === 'PREMIUM' ? 'bg-gold/10 text-gold border border-gold/30' : 'bg-blue-50 text-blue-500 border border-blue-200'}`}>
                      {user.tier === 'PREMIUM' && <Crown className="w-2.5 h-2.5" />}
                      {user.tier === 'PREMIUM' ? '프리미엄' : '무료'}
                    </span>
                  </td>

                  {/* Plan */}
                  <td className="px-5 py-4">
                    <span className="text-gray-600 text-xs">
                      {PLAN_LABELS[user.planType || ''] || '—'}
                    </span>
                  </td>

                  {/* Paid Amount */}
                  <td className="px-5 py-4">
                    <span className={`text-xs font-mono ${user.paidAmount ? 'text-coral' : 'text-gray-400'}`}>
                      {formatCurrency(user.paidAmount)}
                    </span>
                  </td>

                  {/* Active Period */}
                  <td className="px-5 py-4">
                    {user.premiumStartDate ? (
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="text-[11px] text-gray-500">
                          {formatDate(user.premiumStartDate)} ~ {formatDate(user.premiumEndDate)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColor(user.subscriptionStatus)}`}>
                      {user.subscriptionStatus === 'ACTIVE' ? '활성' : 
                       user.subscriptionStatus === 'EXPIRED' ? '만료' : 
                       user.subscriptionStatus === 'CANCELLED' ? '취소' : '없음'}
                    </span>
                  </td>

                  {/* Joined */}
                  <td className="px-5 py-4">
                    <span className="text-gray-500 text-xs whitespace-nowrap">{formatDate(user.createdAt)}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleTierChange(user.id, user.tier)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gold/10 border border-gold/20 text-gold text-[11px] font-semibold hover:bg-gold/20 active:scale-95 transition-all"
                        title={user.tier === 'PREMIUM' ? '프리미엄 해제' : '프리미엄 승급'}
                      >
                        <Crown className="w-3 h-3" />
                        {user.tier === 'PREMIUM' ? '해제' : '승급'}
                      </button>
                      <button 
                        onClick={() => { setEditingUserId(user.id); setEditTokens(user.usageTokens || 0); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 text-[11px] font-semibold hover:bg-gray-200 active:scale-95 transition-all"
                        title="토큰 개수 수정"
                      >
                        <Edit2 className="w-3 h-3" />
                        토큰
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center text-gray-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="font-sans text-sm">조건에 맞는 회원이 없습니다.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Token Edit Modal */}
      {editingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditingUserId(null)}>
          <div className="bg-white border border-[#2B2430]/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-serif font-bold text-ink mb-4">토큰 개수 수정</h3>
            <input 
              type="number" 
              value={editTokens} 
              onChange={(e) => setEditTokens(parseInt(e.target.value) || 0)}
              className="w-full bg-[#FFF6F1]/50 border border-[#2B2430]/10 rounded-lg px-4 py-3 text-ink text-sm font-mono focus:outline-none focus:border-coral/50 mb-4"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => handleSaveTokens(editingUserId)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-coral text-white text-sm font-semibold hover:bg-coral/90 active:scale-95 transition-all shadow-sm"
              >
                <CheckCircle className="w-4 h-4" /> 저장
              </button>
              <button 
                onClick={() => setEditingUserId(null)}
                className="flex-1 py-2.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-200 active:scale-95 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub Components ───

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={`bg-white border border-[#2B2430]/10 rounded-2xl p-5 shadow-sm relative overflow-hidden group ${color} transition-colors`}>
      <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">{icon}</div>
      <p className="text-xs font-sans text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-serif font-bold text-ink">{value}</p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-[#FFF6F1]/50 border border-[#2B2430]/10 rounded-xl pl-3 pr-8 py-2.5 text-xs font-sans text-ink focus:outline-none focus:border-coral/50 cursor-pointer transition-colors hover:border-[#2B2430]/20"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-white text-ink">{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}
