'use client';

import { useState } from 'react';
import { updateSubscriptionTier, updateUsageTokens } from './actions';
import { Users, Crown, Sparkles, Search, CheckCircle, AlertCircle, Edit2, Shield } from 'lucide-react';

export default function AdminDashboard({ users, stats }: { users: any[], stats: any }) {
  const [search, setSearch] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editTokens, setEditTokens] = useState<number>(0);

  const filteredUsers = users.filter((u) => 
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    u.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleTierChange = async (userId: string, currentTier: string) => {
    const newTier = currentTier === 'FREE' ? 'PREMIUM' : 'FREE';
    const res = await updateSubscriptionTier(userId, newTier as any);
    if (!res.success) alert(res.error);
  };

  const handleSaveTokens = async (userId: string) => {
    const res = await updateUsageTokens(userId, editTokens);
    if (res.success) {
      setEditingUserId(null);
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-serif font-bold text-white tracking-tight">Global Command Center</h1>
        <p className="text-gray-400 font-sans text-sm">Monitor system metrics and manage user access across the K-Destiny platform.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group hover:border-gold/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-blue-400" />
          </div>
          <p className="text-sm font-sans text-gray-400 mb-1">Total Users</p>
          <p className="text-4xl font-serif font-bold text-white">{stats.totalUsers}</p>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group hover:border-gold/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Crown className="w-16 h-16 text-gold" />
          </div>
          <p className="text-sm font-sans text-gray-400 mb-1">Premium Subscribers</p>
          <p className="text-4xl font-serif font-bold text-white">{stats.premiumUsers}</p>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group hover:border-gold/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles className="w-16 h-16 text-emerald-400" />
          </div>
          <p className="text-sm font-sans text-gray-400 mb-1">Saju Readings Today</p>
          <p className="text-4xl font-serif font-bold text-white">{stats.sajuReadingsToday}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-white">User Management</h2>
            <p className="text-xs font-sans text-gray-500 mt-1">{filteredUsers.length} of {users.length} users displayed</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by name, email, or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm font-sans text-white placeholder:text-gray-600 focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-sm">
            <thead className="bg-black/40 text-gray-400 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Tier</th>
                <th className="px-6 py-4 font-semibold">Join Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.03] transition-colors group">
                  {/* Name + Avatar */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img 
                          src={user.image} 
                          alt={user.name || ''} 
                          className="w-8 h-8 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-gold">
                          {(user.name || user.email || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-gray-200 font-medium truncate max-w-[140px]">
                        {user.name || '—'}
                      </span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-6 py-4 text-gray-400 truncate max-w-[200px]" title={user.email}>
                    {user.email}
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.role === 'ADMIN' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                      {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </td>

                  {/* Tier */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.tier === 'PREMIUM' ? 'bg-gold/10 text-gold border border-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.15)]' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'}`}>
                      {user.tier === 'PREMIUM' && <Crown className="w-3 h-3" />}
                      {user.tier}
                    </span>
                  </td>

                  {/* Join Date */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-gray-300 text-xs">{new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      <span className="text-gray-600 text-[10px]">{new Date(user.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleTierChange(user.id, user.tier)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/5 border border-gold/20 text-gold text-xs font-semibold hover:bg-gold/15 hover:border-gold/40 transition-all"
                      >
                        <Crown className="w-3 h-3" />
                        {user.tier === 'PREMIUM' ? 'Revoke' : 'Upgrade'}
                      </button>
                      <button 
                        onClick={() => { setEditingUserId(user.id); setEditTokens(user.usageTokens || 0); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold hover:bg-white/10 hover:border-white/20 transition-all"
                      >
                        <Edit2 className="w-3 h-3" />
                        Tokens
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="font-sans text-sm">No users found matching your search.</p>
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
                <CheckCircle className="w-4 h-4" />
                Save
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
