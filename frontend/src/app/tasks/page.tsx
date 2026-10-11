'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, Task, UserProfile } from '@/lib/api';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
} from 'lucide-react';

export default function TasksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [teammates, setTeammates] = useState<UserProfile[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // View state: 'list' or 'kanban'
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dueSoonOnly, setDueSoonOnly] = useState(false);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadTasks = async () => {
    if (!user) return;
    try {
      setLoadingTasks(true);
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (overdueOnly) params.overdue = true;
      if (dueSoonOnly) params.due_soon = true;

      const [taskRes, usersRes] = await Promise.all([
        ApiClient.getTasks(params),
        ApiClient.getUsers().catch(() => ({ users: [] })),
      ]);

      setTasks(taskRes.tasks || []);
      setTeammates(usersRes.users || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTasks();

      // Setup Realtime subscription
      if (isSupabaseConfigured()) {
        const channel = supabase
          .channel('public:tasks-management')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks' },
            () => {
              loadTasks();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [user, search, statusFilter, priorityFilter, overdueOnly, dueSoonOnly]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await ApiClient.updateTaskStatus(taskId, newStatus);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await ApiClient.deleteTask(taskToDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setTaskToDelete(null);
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Filter tasks into Kanban columns
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar: Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Task Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Organize team deliverables, track deadlines, and monitor real-time progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          <button
            onClick={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
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
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Quick Deadline Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setOverdueOnly(!overdueOnly);
                if (!overdueOnly) setDueSoonOnly(false);
              }}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1 ${
                overdueOnly
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Overdue
            </button>
            <button
              onClick={() => {
                setDueSoonOnly(!dueSoonOnly);
                if (!dueSoonOnly) setOverdueOnly(false);
              }}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1 ${
                dueSoonOnly
                  ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Due Soon
            </button>
          </div>
        </div>
      </div>

      {/* Main Task View (Kanban or List) */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Column: To Do */}
          <KanbanColumn
            title="To Do"
            count={todoTasks.length}
            accentColor="bg-slate-400"
            tasks={todoTasks}
            onSelectTask={setSelectedTask}
            onAdvanceStatus={(id) => handleStatusChange(id, 'in_progress')}
            advanceLabel="Start Task &rarr;"
          />

          {/* Column: In Progress */}
          <KanbanColumn
            title="In Progress"
            count={inProgressTasks.length}
            accentColor="bg-indigo-500"
            tasks={inProgressTasks}
            onSelectTask={setSelectedTask}
            onAdvanceStatus={(id) => handleStatusChange(id, 'completed')}
            advanceLabel="Complete &#10004;"
          />

          {/* Column: Completed */}
          <KanbanColumn
            title="Completed"
            count={completedTasks.length}
            accentColor="bg-emerald-500"
            tasks={completedTasks}
            onSelectTask={setSelectedTask}
            onAdvanceStatus={(id) => handleStatusChange(id, 'in_progress')}
            advanceLabel="Re-open"
          />
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                No tasks match your selected criteria.
              </div>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className="p-4 sm:px-6 hover:bg-slate-50 cursor-pointer transition flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2.5">
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                      <h3 className="text-sm font-bold text-slate-900">{t.title}</h3>
                    </div>
                    {t.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {t.assignee && (
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        {t.assignee.full_name}
                      </span>
                    )}
                    {t.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(t.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => loadTasks()}
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
          loadTasks();
        }}
        onEdit={(task) => {
          setSelectedTask(null);
          setTaskToEdit(task);
          setIsTaskModalOpen(true);
        }}
        onDeleteRequest={(task) => setTaskToDelete(task)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        title="Delete Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"?`}
        confirmText="Delete"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
}

// Kanban Column Subcomponent
interface KanbanColumnProps {
  title: string;
  count: number;
  accentColor: string;
  tasks: Task[];
  onSelectTask: (t: Task) => void;
  onAdvanceStatus: (id: string) => void;
  advanceLabel: string;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  count,
  accentColor,
  tasks,
  onSelectTask,
  onAdvanceStatus,
  advanceLabel,
}) => {
  return (
    <div className="bg-slate-100/70 rounded-2xl border border-slate-200/80 p-4 space-y-3">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${accentColor}`} />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {title}
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-slate-600 border border-slate-200">
          {count}
        </span>
      </div>

      {/* Card List */}
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-300 cursor-pointer transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <PriorityBadge priority={task.priority} />
                {task.due_date && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-snug">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                {task.assignee ? (
                  <div className="flex items-center gap-1.5">
                    {task.assignee.avatar_url ? (
                      <img
                        src={task.assignee.avatar_url}
                        alt={task.assignee.full_name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center">
                        {task.assignee.full_name.charAt(0)}
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-slate-600 truncate max-w-[90px]">
                      {task.assignee.full_name}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvanceStatus(task.id);
                  }}
                  className="px-2 py-1 text-[10px] font-semibold text-brand-700 hover:bg-brand-50 rounded-lg transition border border-brand-200"
                >
                  {advanceLabel}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
