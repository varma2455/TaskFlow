'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ApiClient } from '@/lib/api';
import { AdminShell } from '@/components/AdminShell';
import {
  Bell,
  Mail,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Send,
  User,
  Inbox,
  Check,
} from 'lucide-react';

export default function AdminNotificationsPage() {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'notifications' | 'emails'>('notifications');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      return ApiClient.getAdminNotifications();
    },
    enabled: Boolean(currentAdmin && currentAdmin.role === 'admin'),
  });

  const notifications = data?.notifications || [];
  const emails = data?.email_outbox || [];

  const sentEmails = emails.filter((e) => e.status === 'sent').length;
  const pendingEmails = emails.filter((e) => e.status === 'pending').length;
  const failedEmails = emails.filter((e) => e.status === 'failed').length;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
                Notification & Dispatch Audit
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Delivery Monitoring
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-1">
              Real-time audit log of in-app user notifications and background Gmail API email dispatch delivery statuses.
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

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                In-App Dispatches
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
                <Bell className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-charcoal-900 font-mono">
                {notifications.length}
              </span>
              <span className="text-xs text-charcoal-500">alerts</span>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                Emails Sent
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-700 font-mono">
                {sentEmails}
              </span>
              <span className="text-xs text-charcoal-500">delivered</span>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                Emails Pending
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-700 font-mono">
                {pendingEmails}
              </span>
              <span className="text-xs text-charcoal-500">queued</span>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                Email Failures
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-charcoal-900 font-mono">
                {failedEmails}
              </span>
              <span className="text-xs text-charcoal-500">errors</span>
            </div>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex items-center gap-2 border-b border-[#EAE6DF] pb-2">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'notifications'
                ? 'bg-brand-600 text-white shadow-subtle'
                : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>In-App Notifications ({notifications.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('emails')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'emails'
                ? 'bg-brand-600 text-white shadow-subtle'
                : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Gmail API Outbox ({emails.length})</span>
          </button>
        </div>

        {/* Tab 1: In-App Notifications */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE6DF] bg-ivory-50/50 text-[11px] font-bold uppercase tracking-wider text-charcoal-500">
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Title & Content</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Read Status</th>
                    <th className="py-3 px-4">Dispatched At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DF] text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-charcoal-400">
                        <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                        Loading in-app notification logs...
                      </td>
                    </tr>
                  ) : notifications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-charcoal-400">
                        No in-app notifications dispatched yet.
                      </td>
                    </tr>
                  ) : (
                    notifications.map((notif: any) => (
                      <tr key={notif.id} className="hover:bg-ivory-50/60 transition">
                        {/* Recipient */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {notif.user ? (
                            <div className="min-w-0">
                              <p className="font-semibold text-charcoal-900 leading-tight">
                                {notif.user.full_name}
                              </p>
                              <p className="text-[10px] text-charcoal-400 leading-none">
                                {notif.user.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-charcoal-500 font-mono">
                              {notif.user_id ? `${notif.user_id.slice(0, 8)}...` : 'N/A'}
                            </span>
                          )}
                        </td>

                        {/* Title & Message */}
                        <td className="py-3.5 px-4 max-w-md">
                          <p className="font-semibold text-charcoal-900">{notif.title}</p>
                          <p className="text-[11px] text-charcoal-500 line-clamp-2 mt-0.5">
                            {notif.message}
                          </p>
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-ivory-200 text-charcoal-700">
                            {notif.type || 'system'}
                          </span>
                        </td>

                        {/* Read status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {notif.is_read ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Read
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Unread
                            </span>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-charcoal-500 text-[11px]">
                          {new Date(notif.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Email Outbox */}
        {activeTab === 'emails' && (
          <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE6DF] bg-ivory-50/50 text-[11px] font-bold uppercase tracking-wider text-charcoal-500">
                    <th className="py-3 px-4">Recipient Email</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4">Retries</th>
                    <th className="py-3 px-4">Dispatched At</th>
                    <th className="py-3 px-4">Error / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DF] text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-charcoal-400">
                        <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                        Loading Gmail API email outbox...
                      </td>
                    </tr>
                  ) : emails.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-charcoal-400">
                        No emails in outbox queue.
                      </td>
                    </tr>
                  ) : (
                    emails.map((email: any) => (
                      <tr key={email.id} className="hover:bg-ivory-50/60 transition">
                        {/* Recipient */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-charcoal-800">
                          {email.recipient_email}
                        </td>

                        {/* Subject */}
                        <td className="py-3.5 px-4 font-semibold text-charcoal-900 max-w-sm">
                          {email.subject}
                        </td>

                        {/* Delivery Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {email.status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Sent
                            </span>
                          ) : email.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Failed
                            </span>
                          )}
                        </td>

                        {/* Retries */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-center text-charcoal-600">
                          {email.retry_count ?? 0}
                        </td>

                        {/* Dispatched At */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-charcoal-500 text-[11px]">
                          {email.created_at
                            ? new Date(email.created_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A'}
                        </td>

                        {/* Error details */}
                        <td className="py-3.5 px-4 max-w-xs text-charcoal-500 text-[11px]">
                          {email.error_message ? (
                            <span className="text-rose-600 truncate block">
                              {email.error_message}
                            </span>
                          ) : email.status === 'sent' ? (
                            <span className="text-emerald-700">Delivered via Gmail API</span>
                          ) : (
                            <span>Queued</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
