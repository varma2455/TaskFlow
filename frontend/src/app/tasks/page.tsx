'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, Task, UserProfile } from '@/lib/api';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AppShell } from '@/components/AppShell';
import { StatusBadge, PriorityBadge } from '@/components/Badge';
import { TaskModal } from '@/components/TaskModal';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  User,
  RotateCcw,
} from 'lucide-react';

function TasksContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // View state: 'list' or 'kanban'
  const initialView = searchParams.get('view') === 'kanban' ? 'kanban' : 'list';
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(initialView);

  // Search & Filters
  const initialFilter = searchParams.get('filter') === 'my_tasks' ? 'my_tasks' : 'all';
  const [activeTab, setActiveTab] = useState<'all' | 'my_tasks' | 'due_soon' | 'overdue'>(
    initialFilter
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(
    searchParams.get('create') === 'true'
  );
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Keep state synced if URL params change
  useEffect(() => {
    if (searchParams.get('view') === 'kanban') {
      setViewMode('kanban');
    }
    if (searchParams.get('filter') === 'my_tasks') {
      setActiveTab('my_tasks');
    }
    if (searchParams.get('create') === 'true') {
      setIsTaskModalOpen(true);
    }
  }, [searchParams]);

  // TanStack Query for Tasks
  const { data: rawTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: [
      'tasks',
      search,
      statusFilter,
      priorityFilter,
      assigneeFilter,
      activeTab,
      user?.id,
    ],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 100 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (assigneeFilter) params.assignee_id = assigneeFilter;
      if (activeTab === 'my_tasks' && user) params.assignee_id = user.id;
      if (activeTab === 'due_soon') params.due_soon = true;
      if (activeTab === 'overdue') params.overdue = true;

      const res = await ApiClient.getTasks(params);
      return res.tasks || [];
    },
    enabled: Boolean(user),
  });

  // Query for Teammates
  const { data: teammates = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await ApiClient.getUsers();
      return res.users || [];
    },
    enabled: Boolean(user),
  });

  // Supabase Realtime subscription
  useEffect(() => {
    if (user && isSupabaseConfigured()) {
      const channel = supabase
        .channel('public:tasks-management-realtime')
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

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await ApiClient.updateTaskStatus(taskId, newStatus);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (e) {
      console.error(e);
    }
  };

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
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setActiveTab('all');
  };

  // Kanban groupings
  const todoTasks = useMemo(
    () => rawTasks.filter((t) => t.status === 'todo'),
    [rawTasks]
  );
  const inProgressTasks = useMemo(
    () => rawTasks.filter((t) => t.status === 'in_progress'),
    [rawTasks]
  );
  const completedTasks = useMemo(
    () => rawTasks.filter((t) => t.status === 'completed'),
    [rawTasks]
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hasActiveFilters = Boolean(
    search || statusFilter || priorityFilter || assigneeFilter || activeTab !== 'all'
  );

  return (
    <AppShell
      onCreateTaskClick={() => {
        setTaskToEdit(null);
        setIsTaskModalOpen(true);
      }}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Filter tasks across your workspace..."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
                Task Management
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ivory-200 text-charcoal-700 border border-[#EAE6DF]">
                {rawTasks.length} tasks
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-1">
              Organize, filter, and track lifecycle states with real-time team collaboration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-white border border-[#EAE6DF] rounded-xl shadow-subtle">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'list'
                    ? 'bg-ivory-200 text-charcoal-900 shadow-sm'
                    : 'text-charcoal-500 hover:text-charcoal-900'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === 'kanban'
                    ? 'bg-ivory-200 text-charcoal-900 shadow-sm'
                    : 'text-charcoal-500 hover:text-charcoal-900'
                }`}
                title="Kanban Board View"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Board</span>
              </button>
            </div>

            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsTaskModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-subtle transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Tab Filters & Selector Bar */}
        <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle p-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Tasks' },
                { id: 'my_tasks', label: 'My Tasks' },
                { id: 'due_soon', label: 'Due Soon (48h)' },
                { id: 'overdue', label: 'Overdue' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
                      : 'text-charcoal-600 hover:bg-ivory-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1 self-start sm:self-auto shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Reset filters
              </button>
            )}
          </div>

          {/* Secondary Dropdown Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#EAE6DF]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-ivory-50 border border-[#EAE6DF] rounded-xl text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-ivory-50 border border-[#EAE6DF] rounded-xl text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-ivory-50 border border-[#EAE6DF] rounded-xl text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium col-span-2 sm:col-span-1"
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

        {/* View Mode: LIST vs KANBAN */}
        {viewMode === 'list' ? (
          /* ===================================================================
              LIST VIEW
             =================================================================== */
          <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#EAE6DF] bg-ivory-50/50 text-charcoal-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Task Details</th>
                    <th className="py-3 px-3">Assignee</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Quick Transition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DF]">
                  {isLoadingTasks ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-charcoal-400">
                        <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                        Loading tasks...
                      </td>
                    </tr>
                  ) : rawTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-charcoal-400">
                        <p className="font-semibold text-charcoal-700">No tasks found</p>
                        <p className="text-[11px] text-charcoal-400 mt-1">
                          No tasks match the selected criteria.
                        </p>
                        <button
                          onClick={() => {
                            setTaskToEdit(null);
                            setIsTaskModalOpen(true);
                          }}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition"
                        >
                          + Create New Task
                        </button>
                      </td>
                    </tr>
                  ) : (
                    rawTasks.map((task) => {
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
                          <td className="py-3.5 px-4 max-w-sm">
                            <p className="font-semibold text-charcoal-900 group-hover:text-brand-600 transition">
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-[11px] text-charcoal-500 truncate mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
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

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <PriorityBadge priority={task.priority} />
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {task.due_date ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] ${
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

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <StatusBadge status={task.status} />
                          </td>

                          <td
                            className="py-3.5 px-4 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
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
          </div>
        ) : (
          /* ===================================================================
              KANBAN BOARD VIEW
             =================================================================== */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Column 1: To Do */}
            <div className="bg-ivory-100 rounded-2xl border border-[#EAE6DF] p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAE6DF]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-charcoal-400" />
                  <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                    To Do
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-charcoal-700 border border-[#EAE6DF]">
                  {todoTasks.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[150px]">
                {todoTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-charcoal-400">
                    No tasks in To Do
                  </div>
                ) : (
                  todoTasks.map((t) => (
                    <KanbanCard
                      key={t.id}
                      task={t}
                      onSelect={() => setSelectedTask(t)}
                      onAdvance={() => handleStatusChange(t.id, 'in_progress')}
                      advanceLabel="Start Work"
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="bg-orange-50/40 rounded-2xl border border-orange-200/60 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-orange-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-600 animate-pulse" />
                  <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                    In Progress
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-brand-700 border border-orange-200/60">
                  {inProgressTasks.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[150px]">
                {inProgressTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-charcoal-400">
                    No tasks currently in progress
                  </div>
                ) : (
                  inProgressTasks.map((t) => (
                    <KanbanCard
                      key={t.id}
                      task={t}
                      onSelect={() => setSelectedTask(t)}
                      onAdvance={() => handleStatusChange(t.id, 'completed')}
                      advanceLabel="Complete"
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Completed */}
            <div className="bg-emerald-50/30 rounded-2xl border border-emerald-200/60 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                    Completed
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200/60">
                  {completedTasks.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[150px]">
                {completedTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-charcoal-400">
                    No completed tasks yet
                  </div>
                ) : (
                  completedTasks.map((t) => (
                    <KanbanCard
                      key={t.id}
                      task={t}
                      onSelect={() => setSelectedTask(t)}
                      onAdvance={() => handleStatusChange(t.id, 'todo')}
                      advanceLabel="Re-open"
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
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

      {/* Delete Confirmation Modal */}
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

// Kanban Card Item
function KanbanCard({
  task,
  onSelect,
  onAdvance,
  advanceLabel,
}: {
  task: Task;
  onSelect: () => void;
  onAdvance: () => void;
  advanceLabel: string;
}) {
  const isOverdue =
    task.status !== 'completed' &&
    task.due_date &&
    new Date(task.due_date) < new Date();

  return (
    <div
      onClick={onSelect}
      className="p-4 bg-white rounded-xl border border-[#EAE6DF] shadow-subtle hover:border-[#D9D5CC] hover:shadow-card cursor-pointer transition space-y-3 group"
    >
      <div className="flex items-start justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        {task.due_date && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium ${
              isOverdue ? 'text-rose-600 font-semibold' : 'text-charcoal-500'
            }`}
          >
            <Calendar className="w-3 h-3" />
            {new Date(task.due_date).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>

      <div>
        <h4 className="text-xs font-bold text-charcoal-900 group-hover:text-brand-600 transition leading-snug">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-[11px] text-charcoal-500 line-clamp-2 mt-1 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#EAE6DF] text-xs">
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
            <span className="text-[11px] text-charcoal-700 font-medium">
              {task.assignee.full_name.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-charcoal-400 italic">Unassigned</span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdvance();
          }}
          className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-0.5"
        >
          {advanceLabel} &rarr;
        </button>
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      }
    >
      <TasksContent />
    </React.Suspense>
  );
}

