'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, Task } from '@/lib/api';
import { AdminShell } from '@/components/AdminShell';
import { CircularProgress } from '@/components/CircularProgress';
import {
  Users,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  Clock,
  Mail,
  History,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Plus,
  ArrowUpRight,
  User,
  Filter,
  Activity,
  FileEdit,
  Trash2,
  Sparkles,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');

  // Query 1: Admin Stats
  const {
    data: statsData,
    isLoading: isLoadingStats,
    isFetching: isFetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin-stats', user?.id],
    queryFn: async () => {
      const res = await ApiClient.getAdminStats();
      return res.stats;
    },
    enabled: Boolean(user && user.role === 'admin'),
  });

  // Query 2: Recent System Tasks
  const {
    data: tasksData,
    isLoading: isLoadingTasks,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['admin-tasks-recent', user?.id],
    queryFn: async () => {
      const res = await ApiClient.getAdminTasks({ limit: 8 });
      return res.tasks || [];
    },
    enabled: Boolean(user && user.role === 'admin'),
  });

  // Query 3: Recent Activity Logs
  const {
    data: activityData = [],
    isLoading: isLoadingActivity,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ['admin-activity-recent', user?.id],
    queryFn: async () => {
      const res = await ApiClient.getAdminActivity({ limit: 6 });
      return res.activity || [];
    },
    enabled: Boolean(user && user.role === 'admin'),
  });

  // Query 4: Teammates Workload
  const {
    data: usersData = [],
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['admin-teammates-workload', user?.id],
    queryFn: async () => {
      const res = await ApiClient.getAdminUsers({ limit: 5 });
      return res.users || [];
    },
    enabled: Boolean(user && user.role === 'admin'),
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task['status'] }) => {
      return ApiClient.updateTaskStatus(taskId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks-recent'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const handleRefreshAll = () => {
    refetchStats();
    refetchTasks();
    refetchActivity();
    refetchUsers();
  };

  const stats = statsData || {
    total_users: 0,
    admin_users: 0,
    regular_users: 0,
    active_users_count: 0,
    total_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    todo_tasks: 0,
    overdue_tasks: 0,
    completion_rate: 0,
    total_activity: 0,
    email_delivery: {
      total: 0,
      sent: 0,
      pending: 0,
      failed: 0,
    },
  };

  const tasksList = (tasksData || []).filter((t: Task) => {
    if (taskStatusFilter === 'all') return true;
    return t.status === taskStatusFilter;
  });

  const priorityStyles: Record<string, string> = {
    urgent: 'bg-rose-50 text-rose-700 border-rose-200',
    high: 'bg-amber-50 text-amber-700 border-amber-200',
    medium: 'bg-sky-50 text-sky-700 border-sky-200',
    low: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const isOverdue = (task: Task) => {
    if (task.status === 'completed' || !task.due_date) return false;
    return new Date(task.due_date) < new Date();
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* =========================================================================
            HEADER & ACTIONS BAR
           ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
                Administrator Overview
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                System Oversight
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-1">
              Cross-organizational workload metrics, active deliverables, audit trail, and delivery reliability.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefreshAll}
              disabled={isFetchingStats}
              className="px-3.5 py-2 text-xs font-semibold text-charcoal-700 hover:text-charcoal-900 bg-white border border-[#EAE6DF] rounded-xl shadow-subtle hover:bg-ivory-50 transition inline-flex items-center gap-1.5 disabled:opacity-50"
              title="Refresh all metrics and tables"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingStats ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>

            <Link
              href="/admin/tasks"
              className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-subtle transition flex items-center gap-1.5 active:scale-95"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Manage All Tasks</span>
            </Link>
          </div>
        </div>

        {/* =========================================================================
            ROW 1: FOUR COMPACT STATISTIC CARDS
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Registered Users */}
          <div className="p-5 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-2 hover:border-[#D9D5CC] transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                Registered Users
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-charcoal-900 font-mono">
                {isLoadingStats ? '—' : stats.total_users}
              </span>
              <span className="text-xs text-charcoal-500">accounts</span>
            </div>
            <p className="text-[11px] text-charcoal-500">
              <span className="font-semibold text-charcoal-800">{stats.admin_users}</span> admin &bull;{' '}
              <span className="font-semibold text-charcoal-800">{stats.regular_users}</span> standard
            </p>
          </div>

          {/* Card 2: Total Tasks */}
          <div className="p-5 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-2 hover:border-[#D9D5CC] transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                Total Tasks
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-brand-600 flex items-center justify-center border border-orange-100">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-brand-600 font-mono">
                {isLoadingStats ? '—' : stats.total_tasks}
              </span>
              <span className="text-xs text-charcoal-500">deliverables</span>
            </div>
            <p className="text-[11px] text-charcoal-500">
              <span className="font-semibold text-charcoal-800">{stats.in_progress_tasks}</span> in progress &bull;{' '}
              <span className="font-semibold text-charcoal-800">{stats.todo_tasks}</span> to do
            </p>
          </div>

          {/* Card 3: Completed Tasks */}
          <div className="p-5 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle space-y-2 hover:border-[#D9D5CC] transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                Completed Tasks
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-700 font-mono">
                {isLoadingStats ? '—' : stats.completed_tasks}
              </span>
              <span className="text-xs text-charcoal-500 font-semibold text-emerald-700">
                ({stats.completion_rate}%)
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium">
              Overall sprint fulfillment
            </p>
          </div>

          {/* Card 4: Overdue Tasks */}
          <div
            className={`p-5 rounded-2xl border shadow-subtle space-y-2 transition ${
              stats.overdue_tasks > 0
                ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                : 'bg-white border-[#EAE6DF] hover:border-[#D9D5CC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  stats.overdue_tasks > 0 ? 'text-rose-700' : 'text-charcoal-400'
                }`}
              >
                Overdue Tasks
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                  stats.overdue_tasks > 0
                    ? 'bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-ivory-200 text-charcoal-500 border-[#EAE6DF]'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-extrabold font-mono ${
                  stats.overdue_tasks > 0 ? 'text-rose-700' : 'text-charcoal-900'
                }`}
              >
                {isLoadingStats ? '—' : stats.overdue_tasks}
              </span>
              <span className="text-xs text-charcoal-500">behind schedule</span>
            </div>
            <p
              className={`text-[11px] font-medium ${
                stats.overdue_tasks > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {stats.overdue_tasks > 0 ? 'Deadlines require attention' : 'All deliverables on schedule'}
            </p>
          </div>
        </div>

        {/* =========================================================================
            ROW 2: SYSTEM TASK TABLE (LEFT) & CIRCULAR COMPLETION INDICATOR (RIGHT)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): System Task Table */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE6DF]">
              <div>
                <h2 className="text-sm font-bold text-charcoal-900">
                  Recent System Deliverables
                </h2>
                <p className="text-[11px] text-charcoal-500 mt-0.5">
                  Latest tasks across all teams and active workstreams.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-ivory-50 p-1 rounded-xl border border-[#EAE6DF]">
                {(['all', 'todo', 'in_progress', 'completed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setTaskStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition capitalize ${
                      taskStatusFilter === st
                        ? 'bg-white text-charcoal-900 shadow-sm'
                        : 'text-charcoal-500 hover:text-charcoal-800'
                    }`}
                  >
                    {st === 'all' ? 'All' : st === 'in_progress' ? 'In Progress' : st === 'todo' ? 'To Do' : 'Completed'}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 border-b border-[#EAE6DF] pb-2">
                    <th className="py-2.5 pr-4">Deliverable</th>
                    <th className="py-2.5 px-3">Assignee</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 pl-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DF] text-xs">
                  {isLoadingTasks ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-charcoal-400">
                        <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                        Loading deliverables...
                      </td>
                    </tr>
                  ) : tasksList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-charcoal-400">
                        No tasks match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    tasksList.map((task: Task) => {
                      const overdue = isOverdue(task);

                      return (
                        <tr key={task.id} className="hover:bg-ivory-50/60 transition group">
                          {/* Title */}
                          <td className="py-3 pr-4 max-w-xs">
                            <Link
                              href={`/tasks/${task.id}`}
                              className="font-semibold text-charcoal-900 hover:text-brand-600 transition block truncate"
                            >
                              {task.title}
                            </Link>
                            {task.description && (
                              <p className="text-[11px] text-charcoal-500 truncate mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </td>

                          {/* Assignee */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {task.assignee ? (
                              <div className="flex items-center gap-1.5">
                                {task.assignee.avatar_url ? (
                                  <img
                                    src={task.assignee.avatar_url}
                                    alt=""
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center">
                                    {task.assignee.full_name?.charAt(0) || 'U'}
                                  </div>
                                )}
                                <span className="text-[11px] text-charcoal-700 truncate max-w-[90px]">
                                  {task.assignee.full_name?.split(' ')[0]}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-charcoal-400 italic">Unassigned</span>
                            )}
                          </td>

                          {/* Priority */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                priorityStyles[task.priority] || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {task.priority}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <select
                              value={task.status}
                              disabled={updateStatusMutation.isPending}
                              onChange={(e) =>
                                updateStatusMutation.mutate({
                                  taskId: task.id,
                                  status: e.target.value as Task['status'],
                                })
                              }
                              className={`text-xs rounded-xl px-2 py-1 border font-semibold cursor-pointer transition ${
                                task.status === 'completed'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : task.status === 'in_progress'
                                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                                  : 'bg-ivory-100 border-[#EAE6DF] text-charcoal-700'
                              }`}
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>

                          {/* Due date */}
                          <td className="py-3 px-3 whitespace-nowrap text-[11px]">
                            {task.due_date ? (
                              <span
                                className={`font-mono ${
                                  overdue ? 'text-rose-600 font-semibold' : 'text-charcoal-600'
                                }`}
                              >
                                {new Date(task.due_date).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            ) : (
                              <span className="text-charcoal-400">—</span>
                            )}
                          </td>

                          {/* Link */}
                          <td className="py-3 pl-3 text-right whitespace-nowrap">
                            <Link
                              href={`/tasks/${task.id}`}
                              className="p-1 rounded-lg text-charcoal-400 hover:text-brand-600 hover:bg-ivory-100 transition inline-flex items-center"
                              title="Open Deliverable"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* View all footer link */}
            <div className="pt-2 text-right">
              <Link
                href="/admin/tasks"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
              >
                <span>Browse All System Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column (4 cols): Circular Overall Completion Visualization */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
                <div>
                  <h2 className="text-sm font-bold text-charcoal-900">System Fulfillment</h2>
                  <p className="text-[11px] text-charcoal-500 mt-0.5">Overall task completion</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Sprint Velocity
                </span>
              </div>

              {/* Circular Progress Ring */}
              <div className="py-4 flex justify-center">
                <CircularProgress
                  completed={stats.completed_tasks}
                  total={stats.total_tasks}
                  inProgress={stats.in_progress_tasks}
                  todo={stats.todo_tasks}
                  size={170}
                  strokeWidth={14}
                />
              </div>
            </div>

            {/* Health assessment card */}
            <div className="p-3.5 rounded-2xl bg-ivory-50 border border-[#EAE6DF] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-600 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Fulfillment Health
                </span>
                <span className="text-xs font-bold text-emerald-700">
                  {stats.completion_rate >= 70
                    ? 'Optimal Velocity'
                    : stats.completion_rate >= 40
                    ? 'In Progress'
                    : 'Initial Stage'}
                </span>
              </div>
              <p className="text-[11px] text-charcoal-500 leading-relaxed">
                {stats.completed_tasks} of {stats.total_tasks} deliverables finished. {stats.in_progress_tasks} tasks currently undergoing active implementation.
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROW 3: RECENT TASK ACTIVITY (LEFT) & WORKLOAD + EMAIL OUTBOX (RIGHT)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Recent Task Activity */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
              <div>
                <h2 className="text-sm font-bold text-charcoal-900">Recent Task Activity</h2>
                <p className="text-[11px] text-charcoal-500 mt-0.5">System audit log of recent updates</p>
              </div>
              <Link
                href="/admin/activity"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
              >
                <span>Full Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Activity List */}
            <div className="space-y-3">
              {isLoadingActivity ? (
                <div className="py-8 text-center text-xs text-charcoal-400">
                  Loading activity audit log...
                </div>
              ) : activityData.length === 0 ? (
                <div className="py-8 text-center text-xs text-charcoal-400">
                  No activity recorded yet.
                </div>
              ) : (
                activityData.map((act: any) => {
                  const actionColor =
                    act.action === 'created'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : act.action === 'status_changed'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : act.action === 'role_changed'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-sky-50 text-sky-700 border-sky-200';

                  return (
                    <div
                      key={act.id}
                      className="p-3 rounded-2xl bg-ivory-50/60 border border-[#EAE6DF] hover:bg-white hover:shadow-subtle transition flex items-start gap-3"
                    >
                      {/* Actor avatar */}
                      {act.user?.avatar_url ? (
                        <img
                          src={act.user.avatar_url}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#EAE6DF] mt-0.5"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {act.user?.full_name?.charAt(0) || 'U'}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-charcoal-900 truncate">
                            {act.user?.full_name || 'System Automated'}
                          </p>
                          <span className="text-[10px] text-charcoal-400 whitespace-nowrap">
                            {new Date(act.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider border ${actionColor}`}
                          >
                            {act.action.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-charcoal-600 truncate">
                            {act.task_title ? `Task: ${act.task_title}` : act.details?.target_email || 'Action executed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Team Workload & Email Delivery Status */}
          <div className="lg:col-span-5 space-y-6">
            {/* Module 1: Team Workload Visualization */}
            <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
                <div>
                  <h2 className="text-sm font-bold text-charcoal-900">Workload by Teammate</h2>
                  <p className="text-[11px] text-charcoal-500 mt-0.5">Active assigned task volumes</p>
                </div>
                <Link
                  href="/admin/users"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
                >
                  <span>Directory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {isLoadingUsers ? (
                  <div className="py-6 text-center text-xs text-charcoal-400">
                    Loading workload...
                  </div>
                ) : usersData.length === 0 ? (
                  <div className="py-6 text-center text-xs text-charcoal-400">
                    No active team members registered.
                  </div>
                ) : (
                  usersData.slice(0, 4).map((member: any) => {
                    const assigned = member.tasks_assigned ?? 0;
                    const completed = member.tasks_completed ?? 0;
                    const completionPct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

                    return (
                      <div key={member.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url}
                                alt=""
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-ivory-300 text-charcoal-700 text-[10px] font-bold flex items-center justify-center">
                                {member.full_name?.charAt(0) || 'U'}
                              </div>
                            )}
                            <span className="font-semibold text-charcoal-900 truncate">
                              {member.full_name}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-charcoal-500">
                            {completed}/{assigned} done
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-ivory-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#EA580C] to-[#10B981] rounded-full transition-all duration-500"
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Module 2: Email Delivery Status */}
            <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand-600" />
                  <div>
                    <h2 className="text-sm font-bold text-charcoal-900">Email Delivery Reliability</h2>
                    <p className="text-[11px] text-charcoal-500 mt-0.5">Gmail API transactional outbox</p>
                  </div>
                </div>
                <Link
                  href="/admin/notifications"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Outbox &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[10px] font-bold uppercase text-emerald-800">Delivered</span>
                  <p className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
                    {stats.email_delivery.sent}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
                  <span className="text-[10px] font-bold uppercase text-amber-800">Queued</span>
                  <p className="text-lg font-bold font-mono text-amber-700 mt-0.5">
                    {stats.email_delivery.pending}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
                  <span className="text-[10px] font-bold uppercase text-rose-800">Errors</span>
                  <p className="text-lg font-bold font-mono text-rose-700 mt-0.5">
                    {stats.email_delivery.failed}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
