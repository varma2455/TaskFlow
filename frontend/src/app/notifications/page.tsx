'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, NotificationItem } from '@/lib/api';
import { Bell, Check, Clock, CheckCheck, Inbox, Mail, AlertTriangle } from 'lucide-react';

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const res = await ApiClient.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const handleMarkRead = async (id: string) => {
    try {
      await ApiClient.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await ApiClient.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const displayedNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-600" />
            Notification Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Stay updated with task assignments, completions, and upcoming deadlines.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            <CheckCheck className="w-4 h-4 text-slate-500" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
            filter === 'unread'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification list */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {displayedNotifications.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Inbox className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-medium">No notifications in this view.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-5 flex items-start justify-between gap-4 transition hover:bg-slate-50/80 ${
                  !notif.is_read ? 'bg-brand-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    notif.type === 'deadline_reminder'
                      ? 'bg-amber-100 text-amber-600'
                      : notif.type === 'task_completed'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-brand-100 text-brand-600'
                  }`}>
                    {notif.type === 'deadline_reminder' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : notif.type === 'task_completed' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{notif.title}</h3>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-brand-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-slate-400 inline-block">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="text-xs text-brand-600 hover:text-brand-800 font-semibold px-2 py-1 rounded-lg hover:bg-brand-50 transition shrink-0"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
