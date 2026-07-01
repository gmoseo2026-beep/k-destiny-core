'use client';

import { useState } from 'react';
import { updateSubscriptionTier, updateUsageTokens } from './actions';
import { Users, Crown, Sparkles, Search, CheckCircle, AlertCircle, Edit2, Shield } from 'lucide-react';

export default function AdminDashboard({ users, stats }: { users: any[], stats: any }) {
  const [search, setSearch] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editTokens, setEditTokens] = useState<number>(0);

  const filteredUsers = users.filter((u) => 
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
          <h2 className="text-xl font-serif font-bold text-white">User Management</h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by email or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm font-sans text-white focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-sm">
            <thead className="bg-black/40 text-gray-400 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-semibold">User ID</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Subscription</th>
                <th className="px-6 py-4 font-semibold">Tokens</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-500 truncate max-w-[120px]" title={user.id}>
                    {user.id}
                  </td>
                  <td className="px-6 py-4 text-gray-200">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.role === 'ADMIN' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                      {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleTierChange(user.id, user.subscriptionTier)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 ${user.subscriptionTier === 'PREMIUM' ? 'bg-gold/10 text-gold border border-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'}`}
                    >
                      {user.subscriptionTier === 'PREMIUM' && <Crown className="w-3 h-3" />}
                      {user.subscriptionTier}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {editingUserId === user.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={editTokens} 
                          onChange={(e) => setEditTokens(parseInt(e.target.value) || 0)}
                          className="w-16 bg-black border border-white/20 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-gold"
                        />
                        <button onClick={() => handleSaveTokens(user.id)} className="text-emerald-400 hover:text-emerald-300">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-300 font-mono">
                        {user.usageTokens}
                        <button 
                          onClick={() => { setEditingUserId(user.id); setEditTokens(user.usageTokens); }}
                          className="text-gray-500 hover:text-gold transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs text-gray-500">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
