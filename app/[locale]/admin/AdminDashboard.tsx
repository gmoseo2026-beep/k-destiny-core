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
  '1_MONTH': '1 Month',
  '3_MONTHS': '3 Months',
  '6_MONTHS': '6 Months',
  '1_YEAR': '1 Year',
};

function formatCurrency(cents: number | null) {
  if (!cents) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusColor(status: string | null) {
  switch (status) {
    case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'EXPIRED': return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'CANCELLED': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
}

// ─── CSV Export ───
function exportToCSV(users: UserData[]) {
  const headers = ['Name', 'Email', 'Role', 'Tier', 'Plan', 'Paid Amount', 'Status', 'Start Date', 'End Date', 'Tokens', 'Join Date'];
  const rows = users.map(u => [
    u.name || '', 
    u.email || '', 
    u.role, 
    u.tier,
    PLAN_LABELS[u.planType || ''] || u.planType || '',
    u.paidAmount ? (u.paidAmount / 100).toFixed(2) : '',
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
  link.download = `k-destiny-users-${new Date().toISOString().split('T')[0]}.csv`;
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
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">Global Command Center</h1>
          <p className="text-gray-400 font-sans text-sm mt-1">Monitor system metrics and manage user access across the K-Destiny platform.</p>
        </div>
        <button
          onClick={() => exportToCSV(filteredUsers)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all self-start"
        >
          <Download className="w-4 h-4" />
          Export CSV ({filteredUsers.length})
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-14 h-14 text-blue-400" />} label="Total Users" value={stats.totalUsers} color="hover:border-blue-500/30" />
        <StatCard icon={<Crown className="w-14 h-14 text-gold" />} label="Premium Subscribers" value={stats.premiumUsers} color="hover:border-gold/30" />
        <StatCard icon={<Sparkles className="w-14 h-14 text-emerald-400" />} label="Readings Today" value={stats.sajuReadingsToday} color="hover:border-emerald-500/30" />
        <StatCard icon={<DollarSign className="w-14 h-14 text-purple-400" />} label="Active Subs" value={stats.activeSubscriptions ?? 0} color="hover:border-purple-500/30" />
      </div>

      {/* Filter Bar */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm font-sans text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={[
              { value: 'ALL', label: 'All Roles' },
              { value: 'ADMIN', label: 'Admin' },
              { value: 'USER', label: 'User' },
            ]} />
            <FilterSelect label="Tier" value={tierFilter} onChange={setTierFilter} options={[
              { value: 'ALL', label: 'All Tiers' },
              { value: 'FREE', label: 'Free' },
              { value: 'PREMIUM', label: 'Premium' },
            ]} />
            <FilterSelect label="Plan" value={planFilter} onChange={setPlanFilter} options={[
              { value: 'ALL', label: 'All Plans' },
              { value: '1_MONTH', label: '1 Month' },
              { value: '3_MONTHS', label: '3 Months' },
              { value: '6_MONTHS', label: '6 Months' },
              { value: '1_YEAR', label: '1 Year' },
            ]} />
            <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={[
              { value: 'ALL', label: 'All Status' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'EXPIRED', label: 'Expired' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'NONE', label: 'None' },
            ]} />

            {activeFiltersCount > 0 && (
              <button
                onClick={() => { setRoleFilter('ALL'); setTierFilter('ALL'); setPlanFilter('ALL'); setStatusFilter('ALL'); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
              >
                <X className="w-3 h-3" />
                Clear ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] font-sans text-gray-600 mt-2 flex items-center gap-1.5">
          <Filter className="w-3 h-3" />
          Showing {filteredUsers.length} of {users.length} users
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-sm">
            <thead className="bg-black/40 text-gray-400 border-b border-white/10">
              <tr>
                <th className="px-5 py-4 font-semibold">User</th>
                <th className="px-5 py-4 font-semibold">Role</th>
                <th className="px-5 py-4 font-semibold">Tier</th>
                <th className="px-5 py-4 font-semibold">Plan</th>
                <th className="px-5 py-4 font-semibold">Paid</th>
                <th className="px-5 py-4 font-semibold">Active Period</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Joined</th>
                <th className="px-5 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.03] transition-colors group">
                  {/* User (Name + Email + Avatar) */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img src={user.image} alt="" className="w-8 h-8 rounded-full border border-white/10 object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-gold flex-shrink-0">
                          {(user.name || user.email || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-gray-200 font-medium text-sm truncate max-w-[140px]">{user.name || '—'}</p>
                        <p className="text-gray-500 text-[11px] truncate max-w-[140px]">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.role === 'ADMIN' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                      {user.role === 'ADMIN' && <Shield className="w-2.5 h-2.5" />}
                      {user.role}
                    </span>
                  </td>

                  {/* Tier */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.tier === 'PREMIUM' ? 'bg-gold/10 text-gold border border-gold/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'}`}>
                      {user.tier === 'PREMIUM' && <Crown className="w-2.5 h-2.5" />}
                      {user.tier}
                    </span>
                  </td>

                  {/* Plan */}
                  <td className="px-5 py-4">
                    <span className="text-gray-300 text-xs">
                      {PLAN_LABELS[user.planType || ''] || '—'}
                    </span>
                  </td>

                  {/* Paid Amount */}
                  <td className="px-5 py-4">
                    <span className={`text-xs font-mono ${user.paidAmount ? 'text-emerald-400' : 'text-gray-600'}`}>
                      {formatCurrency(user.paidAmount)}
                    </span>
                  </td>

                  {/* Active Period */}
                  <td className="px-5 py-4">
                    {user.premiumStartDate ? (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <span className="text-[11px] text-gray-400">
                          {formatDate(user.premiumStartDate)} ~ {formatDate(user.premiumEndDate)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColor(user.subscriptionStatus)}`}>
                      {user.subscriptionStatus || 'NONE'}
                    </span>
                  </td>

                  {/* Joined */}
                  <td className="px-5 py-4">
                    <span className="text-gray-500 text-xs">{formatDate(user.createdAt)}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleTierChange(user.id, user.tier)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gold/5 border border-gold/20 text-gold text-[11px] font-semibold hover:bg-gold/15 transition-all"
                        title={user.tier === 'PREMIUM' ? 'Revoke Premium' : 'Upgrade to Premium'}
                      >
                        <Crown className="w-3 h-3" />
                        {user.tier === 'PREMIUM' ? 'Revoke' : 'Upgrade'}
                      </button>
                      <button 
                        onClick={() => { setEditingUserId(user.id); setEditTokens(user.usageTokens || 0); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-[11px] font-semibold hover:bg-white/10 transition-all"
                        title="Edit Usage Tokens"
                      >
                        <Edit2 className="w-3 h-3" />
                        Tokens
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center text-gray-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="font-sans text-sm">No users found matching your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Token Edit Modal */}
      {editingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingUserId(null)}>
          <div className="bg-[#0f0f14] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-serif font-bold text-white mb-4">Edit Usage Tokens</h3>
            <input 
              type="number" 
              value={editTokens} 
              onChange={(e) => setEditTokens(parseInt(e.target.value) || 0)}
              className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-gold/50 mb-4"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => handleSaveTokens(editingUserId)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gold/10 border border-gold/30 text-gold text-sm font-semibold hover:bg-gold/20 transition-colors"
              >
                <CheckCircle className="w-4 h-4" /> Save
              </button>
              <button 
                onClick={() => setEditingUserId(null)}
                className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                Cancel
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
    <div className={`bg-white/[0.02] border border-white/10 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group ${color} transition-colors`}>
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">{icon}</div>
      <p className="text-xs font-sans text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-serif font-bold text-white">{value}</p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-black/40 border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-xs font-sans text-gray-300 focus:outline-none focus:border-gold/50 cursor-pointer transition-colors hover:border-white/20"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-[#0a0a0a] text-gray-300">{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
    </div>
  );
}
