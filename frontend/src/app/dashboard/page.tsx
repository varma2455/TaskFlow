'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, DashboardStats, Task, UserProfile } from '@/lib/api';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AppShell } from '@/components/AppShell';
import { StatusBadge, PriorityBadge } from '@/components/Badge';
import { CircularProgress } from '@/components/CircularProgress';
import { TaskModal } from '@/components/TaskModal';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Filter,
  Calendar,
  CheckSquare,
  Users,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters & Search
  const [globalSearch, setGlobalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Query 1: Dashboard statistics
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      const res = await ApiClient.getDashboardStats();
      return res.stats;
    },
    enabled: Boolean(user),
  });

  // Query 2: Tasks list (with filters)
  const { data: tasksData, isLoading: isLoadingTasks } = useQuery({
    queryKey: [
      'tasks',
      user?.id,
      globalSearch,
      statusFilter,
      priorityFilter,
      assigneeFilter,
      dateRangeFilter,
    ],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 100 };
      if (globalSearch) params.search = globalSearch;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (assigneeFilter) params.assignee_id = assigneeFilter;
      if (dateRangeFilter === 'overdue') params.overdue = true;
      if (dateRangeFilter === 'today' || dateRangeFilter === 'week') params.due_soon = true;

      const res = await ApiClient.getTasks(params);
      return res.tasks;
    },
    enabled: Boolean(user),
  });

  // Query 3: Teammates list
  const { data: teammates = [] } = useQuery({
    queryKey: ['users', user?.id],
    queryFn: async () => {
      const res = await ApiClient.getUsers();
      return res.users || [];
    },
    enabled: Boolean(user),
  });

  // Supabase Realtime synchronization
  useEffect(() => {
    if (user && isSupabaseConfigured()) {
      const channel = supabase
        .channel(`public:tasks-dashboard-realtime-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, queryClient]);

  // Normalized stats fallback
  const stats: DashboardStats = useMemo(() => {
    return (
      statsData || {
        total_tasks: 0,
        completed: 0,
        in_progress: 0,
        todo: 0,
        overdue: 0,
        due_soon: 0,
        completion_rate: 0,
      }
    );
  }, [statsData]);

  const allTasks: Task[] = useMemo(() => tasksData || [], [tasksData]);

  // Compute My Tasks count from authorized dataset
  const myTasksCount = useMemo(() => {
    if (!user) return 0;
    return allTasks.filter((t) => t.assignee_id === user.id).length;
  }, [allTasks, user]);

  // Compute Today's Tasks & Upcoming Deadlines (within 48 hours or today)
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    return allTasks
      .filter((t) => {
        if (t.status === 'completed') return false;
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours >= -24 && diffHours <= 72; // Near deadline
      })
      .slice(0, 5);
  }, [allTasks]);

  // Compute Teammate Workload stats
  const teamWorkload = useMemo(() => {
    return teammates.map((member) => {
      const assigned = allTasks.filter((t) => t.assignee_id === member.id);
      const completed = assigned.filter((t) => t.status === 'completed').length;
      const inProgress = assigned.filter((t) => t.status === 'in_progress').length;
      const todo = assigned.filter((t) => t.status === 'todo').length;
      const activeCount = inProgress + todo;
      const totalCount = assigned.length;
      const percent = totalCount > 0 ? Math.round((completed / totalCount) * 100) : 0;

      return {
        member,
        totalCount,
        activeCount,
        inProgress,
        completed,
        percent,
      };
    });
  }, [teammates, allTasks]);

  // Quick Status Transition directly from table
  const handleQuickStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await ApiClient.updateTaskStatus(taskId, newStatus);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  // Delete task confirm
  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await ApiClient.deleteTask(taskToDelete.id);
      setTaskToDelete(null);
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = () => {
    setGlobalSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setDateRangeFilter('all');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hasActiveFilters = Boolean(
    globalSearch || statusFilter || priorityFilter || assigneeFilter || (dateRangeFilter && dateRangeFilter !== 'all')
  );

  return (
    <AppShell
      onCreateTaskClick={() => {
        setTaskToEdit(null);
        setIsTaskModalOpen(true);
      }}
      searchValue={globalSearch}
      onSearchChange={setGlobalSearch}
      dateRangeFilter={dateRangeFilter}
      onDateRangeChange={setDateRangeFilter}
    >
      <div className="space-y-6">
        {/* =====================================================================
            HEADER: Page Title & Welcome
           ===================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
                Dashboard
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ivory-200 text-charcoal-700 border border-[#EAE6DF]">
                Live Workspace
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-1">
              Welcome back, <span className="font-semibold text-charcoal-800">{user.full_name}</span>.
              Here is your project velocity and team workload summary.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsTaskModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-subtle transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            FIRST ROW: FOUR COMPACT STATISTIC CARDS
           ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: My Tasks */}
          <div className="p-4 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle flex items-center justify-between transition hover:border-[#D9D5CC]">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">
                My Tasks
              </p>
              <p className="text-2xl font-extrabold text-charcoal-900 font-mono">
                {myTasksCount}
              </p>
              <p className="text-[11px] text-charcoal-500">
                Assigned to you
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: In Progress */}
          <div className="p-4 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle flex items-center justify-between transition hover:border-[#D9D5CC]">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">
                In Progress
              </p>
              <p className="text-2xl font-extrabold text-brand-600 font-mono">
                {stats.in_progress}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-brand-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                Active workload
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-brand-600 flex items-center justify-center shrink-0 border border-orange-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Completed */}
          <div className="p-4 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle flex items-center justify-between transition hover:border-[#D9D5CC]">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">
                Completed
              </p>
              <p className="text-2xl font-extrabold text-emerald-700 font-mono">
                {stats.completed}
              </p>
              <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {stats.completion_rate}% finished
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Overdue */}
          <div
            className={`p-4 rounded-2xl border shadow-subtle flex items-center justify-between transition ${
              stats.overdue > 0
                ? 'bg-[#FEF2F2]/50 border-rose-200'
                : 'bg-white border-[#EAE6DF] hover:border-[#D9D5CC]'
            }`}
          >
            <div className="space-y-1">
              <p
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  stats.overdue > 0 ? 'text-rose-700' : 'text-charcoal-500'
                }`}
              >
                Overdue
              </p>
              <p
                className={`text-2xl font-extrabold font-mono ${
                  stats.overdue > 0 ? 'text-rose-700' : 'text-charcoal-900'
                }`}
              >
                {stats.overdue}
              </p>
              {stats.overdue > 0 ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                  <AlertTriangle className="w-3 h-3" />
                  Requires attention
                </span>
              ) : (
                <p className="text-[11px] text-emerald-600 font-medium">
                  All on schedule
                </p>
              )}
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                stats.overdue > 0
                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-ivory-200 text-charcoal-500 border-[#EAE6DF]'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* =====================================================================
            SECOND ROW: TASK OVERVIEW TABLE (LEFT) & CIRCULAR PROGRESS (RIGHT)
           ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Task Overview Table (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle overflow-hidden flex flex-col">
            {/* Table Header & Working Filters */}
            <div className="p-4 sm:p-5 border-b border-[#EAE6DF] bg-ivory-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-charcoal-900">Task Overview</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ivory-200 text-charcoal-700">
                    {allTasks.length} tasks
                  </span>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1 self-start sm:self-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset filters
                  </button>
                )}
              </div>

              {/* Working Filter Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-[#EAE6DF] rounded-xl text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                >
                  <option value="">All Statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-[#EAE6DF] rounded-xl text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                >
                  <option value="">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Assignee Filter */}
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-[#EAE6DF] rounded-xl text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium col-span-2 sm:col-span-1"
                >
                  <option value="">All Assignees</option>
                  {teammates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#EAE6DF] bg-ivory-50/30 text-charcoal-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-4">Task</th>
                    <th className="py-2.5 px-3">Assignee</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DF]">
                  {isLoadingTasks ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-charcoal-400">
                        <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                        Loading workspace tasks...
                      </td>
                    </tr>
                  ) : allTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-charcoal-400">
                        <p className="font-medium text-charcoal-600">No tasks match your filters</p>
                        <p className="text-[11px] text-charcoal-400 mt-1">
                          Try adjusting search query or clearing your filter criteria.
                        </p>
                        {hasActiveFilters && (
                          <button
                            onClick={resetFilters}
                            className="mt-3 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition"
                          >
                            Clear All Filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    allTasks.slice(0, 8).map((task) => {
                      const isOverdue =
                        task.status !== 'completed' &&
                        task.due_date &&
                        new Date(task.due_date) < new Date();

                      return (
                        <tr
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="hover:bg-ivory-50/70 cursor-pointer transition select-none group"
                        >
                          {/* Task Title & Excerpt */}
                          <td className="py-3 px-4 max-w-xs">
                            <p className="font-semibold text-charcoal-900 group-hover:text-brand-600 transition truncate">
                              {task.title}
                            </p>
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
                                    alt={task.assignee.full_name}
                                    className="w-5 h-5 rounded-full object-cover border border-[#EAE6DF]"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[9px] font-bold flex items-center justify-center">
                                    {task.assignee.full_name.charAt(0)}
                                  </div>
                                )}
                                <span className="text-xs text-charcoal-700 font-medium">
                                  {task.assignee.full_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-charcoal-400 italic text-[11px]">Unassigned</span>
                            )}
                          </td>

                          {/* Priority */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <PriorityBadge priority={task.priority} />
                          </td>

                          {/* Due Date */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {task.due_date ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                  isOverdue ? 'text-rose-600 font-semibold' : 'text-charcoal-600'
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            ) : (
                              <span className="text-charcoal-400 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <StatusBadge status={task.status} />
                          </td>

                          {/* Quick Action */}
                          <td
                            className="py-3 px-3 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={task.status}
                              onChange={(e) =>
                                handleQuickStatusChange(task.id, e.target.value)
                              }
                              className="px-2 py-1 text-[11px] bg-ivory-50 border border-[#EAE6DF] rounded-lg text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium cursor-pointer"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 border-t border-[#EAE6DF] bg-ivory-50/50 flex items-center justify-between text-xs text-charcoal-500">
              <span>Showing up to {Math.min(8, allTasks.length)} of {allTasks.length} tasks</span>
              <button
                onClick={() => router.push('/tasks')}
                className="font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
              >
                View all in Task Manager <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Circular Overall Task Completion Indicator (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
                <div>
                  <h2 className="text-sm font-bold text-charcoal-900">Overall Progress</h2>
                  <p className="text-[11px] text-charcoal-500 mt-0.5">
                    Authorized tasks completion status
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  {stats.completion_rate}% Done
                </span>
              </div>

              {/* Circular SVG Progress */}
              <div className="py-6">
                <CircularProgress
                  completed={stats.completed}
                  total={stats.total_tasks}
                  inProgress={stats.in_progress}
                  todo={stats.todo}
                  size={160}
                  strokeWidth={13}
                />
              </div>
            </div>

            {/* Restrained Explanatory Note */}
            <div className="p-3 rounded-xl bg-ivory-50 border border-[#EAE6DF] text-xs space-y-1">
              <p className="font-semibold text-charcoal-800">Sprint Summary</p>
              <p className="text-[11px] text-charcoal-500 leading-relaxed">
                {stats.total_tasks === 0
                  ? 'No tasks created yet. Click "Create Task" to kick off your project.'
                  : stats.overdue > 0
                  ? `${stats.overdue} task(s) past due. Prioritize overdue items to maintain velocity.`
                  : `${stats.completed} of ${stats.total_tasks} tasks fulfilled with 0 overdue items.`}
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================================
            THIRD ROW: TODAY'S TASKS / DEADLINES (LEFT) & TEAM WORKLOAD (RIGHT)
           ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Today's Tasks / Upcoming Deadlines (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-brand-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-charcoal-900">Upcoming Deadlines</h2>
                  <p className="text-[11px] text-charcoal-500">Tasks approaching due date</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ivory-200 text-charcoal-700">
                {upcomingTasks.length} pending
              </span>
            </div>

            <div className="space-y-2.5">
              {upcomingTasks.length === 0 ? (
                <div className="py-8 text-center text-charcoal-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-semibold text-charcoal-700">No urgent deadlines</p>
                  <p className="text-[11px]">All non-completed tasks are well within scheduled dates.</p>
                </div>
              ) : (
                upcomingTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="p-3 rounded-xl bg-ivory-50/70 border border-[#EAE6DF] hover:border-[#D9D5CC] cursor-pointer transition flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={t.priority} />
                        <span className="text-xs font-semibold text-charcoal-900 group-hover:text-brand-600 transition truncate">
                          {t.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-charcoal-500">
                        <span className="flex items-center gap-1 text-brand-700 font-medium">
                          <Calendar className="w-3 h-3" />
                          {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'Today'}
                        </span>
                        {t.assignee && (
                          <span>&bull; {t.assignee.full_name}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={t.status} />
                      <button
                        onClick={() => handleQuickStatusChange(t.id, 'completed')}
                        className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                        title="Mark Completed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Team Workload Visualization (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-charcoal-900">Team Workload</h2>
                  <p className="text-[11px] text-charcoal-500">Distribution across registered teammates</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/team')}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                View Team &rarr;
              </button>
            </div>

            <div className="space-y-3.5">
              {teamWorkload.length === 0 ? (
                <div className="py-8 text-center text-xs text-charcoal-400">
                  No registered teammates found.
                </div>
              ) : (
                teamWorkload.map(({ member, totalCount, activeCount, completed, percent }) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-xl bg-ivory-50/70 border border-[#EAE6DF] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.full_name}
                            className="w-7 h-7 rounded-full object-cover border border-[#EAE6DF]"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold text-[10px] flex items-center justify-center">
                            {member.full_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-charcoal-900 leading-tight">
                            {member.full_name}
                          </p>
                          <p className="text-[10px] text-charcoal-500 capitalize">{member.role}</p>
                        </div>
                      </div>

                      <div className="text-right text-[11px]">
                        <span className="font-semibold text-charcoal-800 font-mono">
                          {activeCount} active
                        </span>
                        <span className="text-charcoal-400"> / {totalCount} total</span>
                      </div>
                    </div>

                    {/* Workload Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-[#EAE6DF] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-brand-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-charcoal-400 font-medium">
                        <span>{completed} completed</span>
                        <span>{percent}% done</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }}
        taskToEdit={taskToEdit}
        teammates={teammates}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        currentUserId={user.id}
        onStatusChange={(updated) => {
          setSelectedTask(updated);
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }}
        onEdit={(task) => {
          setSelectedTask(null);
          setTaskToEdit(task);
          setIsTaskModalOpen(true);
        }}
        onDeleteRequest={(task) => {
          setTaskToDelete(task);
        }}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        title="Delete Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"? This will permanently remove the task and its audit history.`}
        confirmText="Delete"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setTaskToDelete(null)}
      />
    </AppShell>
  );
}
