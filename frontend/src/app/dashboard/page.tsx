'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, DashboardStats, Task, UserProfile } from '@/lib/api';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { StatusBadge, PriorityBadge } from '@/components/Badge';
import { TaskModal } from '@/components/TaskModal';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  ListTodo,
  Calendar,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({
    total_tasks: 0,
    completed: 0,
    in_progress: 0,
    todo: 0,
    overdue: 0,
    due_soon: 0,
    completion_rate: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [teammates, setTeammates] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      const [statsRes, tasksRes, usersRes] = await Promise.all([
        ApiClient.getDashboardStats().catch(() => ({ stats: { total_tasks: 0, completed: 0, in_progress: 0, todo: 0, overdue: 0, due_soon: 0, completion_rate: 0 } })),
        ApiClient.getTasks({ limit: 5, sort_by: 'created_at', sort_desc: true }).catch(() => ({ tasks: [] })),
        ApiClient.getUsers().catch(() => ({ users: [] })),
      ]);

      setStats(statsRes.stats);
      setRecentTasks(tasksRes.tasks || []);
      setTeammates(usersRes.users || []);
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();

      // Setup Realtime subscription
      if (isSupabaseConfigured()) {
        const channel = supabase
          .channel('public:tasks-dashboard')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks' },
            () => {
              loadDashboardData();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [user]);

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await ApiClient.deleteTask(taskToDelete.id);
      setTaskToDelete(null);
      setSelectedTask(null);
      loadDashboardData();
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

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user.full_name?.split(' ')[0] || 'Team'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time project overview, deadline alerts, and team progress.
          </p>
        </div>

        <button
          onClick={() => {
            setTaskToEdit(null);
            setIsTaskModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Tasks */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Tasks
            </p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">
              {stats.total_tasks}
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <ListTodo className="w-3.5 h-3.5 text-brand-600" />
              Active in workspace
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <ListTodo className="w-6 h-6" />
          </div>
        </div>

        {/* Completed & Rate */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Completed
            </p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">
              {stats.completed}
            </p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              {stats.completion_rate}% completion rate
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Due Soon */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Due Soon (48h)
            </p>
            <p className="text-3xl font-extrabold text-amber-600 mt-2">
              {stats.due_soon}
            </p>
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Reminders active
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Overdue Alert */}
        <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between ${
          stats.overdue > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-white border-slate-200/80'
        }`}>
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
              Overdue Tasks
            </p>
            <p className="text-3xl font-extrabold text-rose-600 mt-2">
              {stats.overdue}
            </p>
            <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Requires immediate attention
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Tasks List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-slate-900">Recent Tasks</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any task to inspect activity history or change status
            </p>
          </div>
          <button
            onClick={() => router.push('/tasks')}
            className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
          >
            View all tasks <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <ListTodo className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">No tasks found yet.</p>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="text-xs text-brand-600 font-semibold hover:underline"
              >
                + Create your first task
              </button>
            </div>
          ) : (
            recentTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTask(t)}
                className="p-4 sm:px-6 hover:bg-slate-50/80 cursor-pointer transition flex items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2.5">
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                    <h3 className="text-sm font-bold text-slate-900 hover:text-brand-600 transition">
                      {t.title}
                    </h3>
                  </div>
                  {t.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {t.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                  {t.assignee && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 font-medium text-slate-700">
                      {t.assignee.avatar_url ? (
                        <img
                          src={t.assignee.avatar_url}
                          alt={t.assignee.full_name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center">
                          {t.assignee.full_name.charAt(0)}
                        </span>
                      )}
                      {t.assignee.full_name}
                    </span>
                  )}

                  {t.due_date && (
                    <span className="hidden md:inline-flex items-center gap-1 text-slate-500">
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

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => {
          loadDashboardData();
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
          loadDashboardData();
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
    </div>
  );
}
