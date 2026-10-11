'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, NotificationItem, Task } from '@/lib/api';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AppShell } from '@/components/AppShell';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import {
  Bell,
  Check,
  Clock,
  CheckCheck,
  Inbox,
  Mail,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Query notifications
  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const res = await ApiClient.getNotifications();
      return res;
    },
    enabled: Boolean(user),
  });

  const notifications: NotificationItem[] = notifData?.notifications || [];
  const unreadCount: number = notifData?.unread_count || 0;

  // Realtime subscription
  useEffect(() => {
    if (user && isSupabaseConfigured()) {
      const channel = supabase
        .channel(`public:notifications-page-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, queryClient]);

  const handleMarkRead = async (id: string) => {
    try {
      await ApiClient.markNotificationRead(id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await ApiClient.markAllNotificationsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleTaskClick = async (taskId?: string) => {
    if (!taskId) return;
    try {
      const res = await ApiClient.getTask(taskId);
      setSelectedTask(res.task);
    } catch (err) {
      console.error('Failed to load task details:', err);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE6DF]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
                Notification Center
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-charcoal-500 mt-1">
              Transactional email & in-app alerts for assignments, deadline reminders, and completions.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-ivory-200 text-charcoal-700 text-xs font-semibold rounded-xl border border-[#EAE6DF] shadow-subtle transition self-start sm:self-auto"
            >
              <CheckCheck className="w-4 h-4 text-brand-600" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
                : 'bg-white text-charcoal-600 hover:bg-ivory-100 border border-[#EAE6DF]'
            }`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
              filter === 'unread'
                ? 'bg-brand-600 text-white font-semibold shadow-sm'
                : 'bg-white text-charcoal-600 hover:bg-ivory-100 border border-[#EAE6DF]'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center text-charcoal-400">
              <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
              Loading notifications...
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="p-16 text-center text-charcoal-400 space-y-2">
              <Inbox className="w-10 h-10 mx-auto text-charcoal-300" />
              <p className="text-sm font-semibold text-charcoal-700">No notifications in this view</p>
              <p className="text-xs text-charcoal-400">
                You are completely caught up with task alerts.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EAE6DF]">
              {displayedNotifications.map((notif) => {
                const isDeadline = notif.type === 'deadline_reminder';
                const isCompleted = notif.type === 'task_completed';

                return (
                  <div
                    key={notif.id}
                    className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition hover:bg-ivory-50/70 ${
                      !notif.is_read ? 'bg-orange-50/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                          isDeadline
                            ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                            : isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                            : 'bg-orange-50 text-brand-600 border-orange-200/60'
                        }`}
                      >
                        {isDeadline ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-charcoal-900 truncate">
                            {notif.title}
                          </h3>
                          {!notif.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-charcoal-600 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] text-charcoal-400">
                            {new Date(notif.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {notif.task_id && (
                            <button
                              onClick={() => handleTaskClick(notif.task_id)}
                              className="text-[10px] font-semibold text-brand-600 hover:underline inline-flex items-center gap-1"
                            >
                              Inspect Task <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {!notif.is_read && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-brand-50 transition shrink-0"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        currentUserId={user.id}
        onStatusChange={() => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }}
        onEdit={() => {}}
        onDeleteRequest={() => {}}
      />
    </AppShell>
  );
}
