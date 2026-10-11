'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ApiClient } from '@/lib/api';
import { AdminShell } from '@/components/AdminShell';
import {
  History,
  Shield,
  Clock,
  User,
  CheckCircle2,
  FileEdit,
  PlusCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Activity,
} from 'lucide-react';

export default function AdminActivityPage() {
  const { user: currentAdmin } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-activity', page],
    queryFn: async () => {
      return ApiClient.getAdminActivity({ page, limit: 25 });
    },
    enabled: Boolean(currentAdmin && currentAdmin.role === 'admin'),
  });

  const logs = data?.activity || [];
  const totalLogs = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'created':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PlusCircle className="w-3 h-3 text-emerald-600" />
            Created Task
          </span>
        );
      case 'updated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
            <FileEdit className="w-3 h-3 text-sky-600" />
            Updated Task
          </span>
        );
      case 'status_changed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <CheckCircle2 className="w-3 h-3 text-amber-600" />
            Status Changed
          </span>
        );
      case 'role_changed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            <Shield className="w-3 h-3 text-rose-600" />
            Role Changed
          </span>
        );
      case 'deleted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
            <Trash2 className="w-3 h-3 text-rose-700" />
            Deleted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            <Activity className="w-3 h-3 text-slate-500" />
            {action}
          </span>
        );
    }
  };

  const renderDetails = (log: any) => {
    const details = log.details || {};
    if (log.action === 'role_changed') {
      return (
        <span className="text-xs text-charcoal-700">
          Target: <strong className="text-charcoal-900">{details.target_email || details.target_user_id}</strong> &bull;{' '}
          <span className="font-mono text-[11px] bg-ivory-200 px-1 py-0.5 rounded">
            {details.previous_role}
          </span>{' '}
          &rarr;{' '}
          <span className="font-mono text-[11px] bg-rose-100 text-rose-800 font-bold px-1 py-0.5 rounded">
            {details.new_role}
          </span>
        </span>
      );
    }

    if (log.action === 'status_changed') {
      return (
        <span className="text-xs text-charcoal-700">
          Status updated from{' '}
          <span className="font-mono text-[11px] bg-ivory-200 px-1 py-0.5 rounded">
            {details.old_status}
          </span>{' '}
          to{' '}
          <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-1 py-0.5 rounded">
            {details.new_status}
          </span>
        </span>
      );
    }

    if (log.task_title) {
      return (
        <span className="text-xs text-charcoal-700">
          Task: <strong className="text-charcoal-900">{log.task_title}</strong>
        </span>
      );
    }

    return (
      <span className="text-xs text-charcoal-500 font-mono">
        {JSON.stringify(details)}
      </span>
    );
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
                System Audit Trail
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Immutable Log
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-1">
              Complete chronological audit trail of all task modifications, assignments, status updates, and role promotions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3.5 py-1.5 text-xs font-semibold text-charcoal-700 hover:text-charcoal-900 bg-white border border-[#EAE6DF] rounded-xl shadow-subtle hover:bg-ivory-50 transition inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Refresh Log</span>
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAE6DF] bg-ivory-50/50 text-[11px] font-bold uppercase tracking-wider text-charcoal-500">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Activity Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DF] text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-charcoal-400">
                      <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                      Loading audit log records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-charcoal-400">
                      No audit records found yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-ivory-50/60 transition">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-charcoal-500 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                          <span className="font-mono">
                            {new Date(log.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            {log.user.avatar_url ? (
                              <img
                                src={log.user.avatar_url}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center">
                                {log.user.full_name?.charAt(0) || 'U'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-charcoal-900 leading-tight">
                                {log.user.full_name}
                              </p>
                              <p className="text-[10px] text-charcoal-400 leading-none">
                                {log.user.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-charcoal-400 italic">System / Automated</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4">
                        {renderDetails(log)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="py-3 px-4 border-t border-[#EAE6DF] bg-ivory-50/30 flex items-center justify-between">
            <span className="text-xs text-charcoal-500">
              Showing <span className="font-semibold text-charcoal-800">{logs.length}</span> of{' '}
              <span className="font-semibold text-charcoal-800">{totalLogs}</span> activity events
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
