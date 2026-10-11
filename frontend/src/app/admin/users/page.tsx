'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, UserProfile } from '@/lib/api';
import { AdminShell } from '@/components/AdminShell';
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter],
    queryFn: async () => {
      return ApiClient.getAdminUsers({
        page,
        limit: 15,
        search,
        role: roleFilter,
      });
    },
    enabled: Boolean(currentAdmin && currentAdmin.role === 'admin'),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'user' }) => {
      return ApiClient.updateAdminUserRole(userId, newRole);
    },
    onSuccess: (res) => {
      setActionSuccess(res.message);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setTimeout(() => setActionSuccess(null), 4000);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to update user role');
      setActionSuccess(null);
      setTimeout(() => setActionError(null), 6000);
    },
  });

  const handleRoleChange = (targetUser: any, newRole: 'admin' | 'user') => {
    if (targetUser.id === currentAdmin?.id && newRole !== 'admin') {
      setActionError('Security restriction: You cannot demote your own administrator account.');
      setTimeout(() => setActionError(null), 5000);
      return;
    }
    if (targetUser.role === newRole) return;

    if (
      confirm(
        `Are you sure you want to change ${targetUser.full_name}'s role to ${newRole.toUpperCase()}?`
      )
    ) {
      roleMutation.mutate({ userId: targetUser.id, newRole });
    }
  };

  const usersList = data?.users || [];
  const totalUsers = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
                User Directory & Access Control
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Staff RBAC
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-1">
              Authoritative list of registered Google OAuth accounts, activity distribution, and administrative privileges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3.5 py-1.5 text-xs font-semibold text-charcoal-700 hover:text-charcoal-900 bg-white border border-[#EAE6DF] rounded-xl shadow-subtle hover:bg-ivory-50 transition inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Refresh Directory</span>
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {actionSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-200 shadow-subtle">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-200 shadow-subtle">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-[#EAE6DF] shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-ivory-50/50 text-xs text-charcoal-800 placeholder:text-charcoal-400 border border-[#EAE6DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-charcoal-400" />
            <span className="text-xs text-charcoal-500 font-medium">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-[#EAE6DF] rounded-xl px-3 py-2 text-charcoal-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">All Roles</option>
              <option value="admin">Administrators</option>
              <option value="user">Standard Users</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAE6DF] bg-ivory-50/50 text-[11px] font-bold uppercase tracking-wider text-charcoal-500">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role & Privileges</th>
                  <th className="py-3 px-4 text-center">Tasks Created</th>
                  <th className="py-3 px-4 text-center">Tasks Assigned</th>
                  <th className="py-3 px-4 text-center">Completed</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DF] text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-charcoal-400">
                      <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                      Loading user accounts...
                    </td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-charcoal-400">
                      No users match the search criteria.
                    </td>
                  </tr>
                ) : (
                  usersList.map((targetUser: any) => {
                    const isSelf = targetUser.id === currentAdmin?.id;
                    const isAdmin = targetUser.role === 'admin';

                    return (
                      <tr key={targetUser.id} className="hover:bg-ivory-50/60 transition">
                        {/* User Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {targetUser.avatar_url ? (
                              <img
                                src={targetUser.avatar_url}
                                alt={targetUser.full_name}
                                className="w-8 h-8 rounded-full object-cover border border-[#EAE6DF] shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0">
                                {targetUser.full_name?.charAt(0) || 'U'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-charcoal-900 truncate">
                                  {targetUser.full_name}
                                </p>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-ivory-200 text-charcoal-700">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-charcoal-500 truncate">
                                {targetUser.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                              <Shield className="w-3 h-3 text-rose-600" />
                              admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
                              <UserCheck className="w-3 h-3 text-sky-600" />
                              user
                            </span>
                          )}
                        </td>

                        {/* Task metrics */}
                        <td className="py-3.5 px-4 text-center font-mono font-medium text-charcoal-800">
                          {targetUser.tasks_created ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-medium text-charcoal-800">
                          {targetUser.tasks_assigned ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-medium text-emerald-700">
                          {targetUser.tasks_completed ?? 0}
                        </td>

                        {/* Created At */}
                        <td className="py-3.5 px-4 text-charcoal-500 text-[11px]">
                          {targetUser.created_at
                            ? new Date(targetUser.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </td>

                        {/* Actions: Role Selector */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <select
                              value={targetUser.role}
                              disabled={roleMutation.isPending || (isSelf && isAdmin)}
                              onChange={(e) =>
                                handleRoleChange(targetUser, e.target.value as 'admin' | 'user')
                              }
                              className={`text-xs rounded-xl px-2.5 py-1.5 border font-semibold transition cursor-pointer ${
                                isAdmin
                                  ? 'bg-rose-50/50 border-rose-200 text-rose-800 focus:ring-rose-400'
                                  : 'bg-white border-[#EAE6DF] text-charcoal-800 focus:ring-brand-500'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={
                                isSelf && isAdmin
                                  ? 'Self-demotion is restricted for security'
                                  : 'Update role'
                              }
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="py-3 px-4 border-t border-[#EAE6DF] bg-ivory-50/30 flex items-center justify-between">
            <span className="text-xs text-charcoal-500">
              Showing <span className="font-semibold text-charcoal-800">{usersList.length}</span> of{' '}
              <span className="font-semibold text-charcoal-800">{totalUsers}</span> accounts
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-[#EAE6DF] bg-white hover:bg-ivory-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4 text-charcoal-600" />
              </button>
              <span className="text-xs font-semibold text-charcoal-800 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-[#EAE6DF] bg-white hover:bg-ivory-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4 text-charcoal-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
