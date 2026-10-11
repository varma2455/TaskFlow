'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, Task, ActivityLog } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { PriorityBadge, StatusBadge } from '@/components/Badge';
import { TaskModal } from '@/components/TaskModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User as UserIcon,
  CheckCircle2,
  Edit2,
  Trash2,
  History,
  AlertTriangle,
} from 'lucide-react';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  const router = useRouter();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Query Task details
  const {
    data: taskData,
    isLoading: isLoadingTask,
    error: taskError,
  } = useQuery({
    queryKey: ['task', taskId, user?.id],
    queryFn: async () => {
      const res = await ApiClient.getTask(taskId);
      return res.task;
    },
    enabled: Boolean(user && taskId),
    retry: 1,
  });

  // Query Task Activity
  const { data: activityLogs = [] } = useQuery({
    queryKey: ['task-activity', taskId, user?.id],
    queryFn: async () => {
      const res = await ApiClient.getTaskActivity(taskId);
      return res.activity || [];
    },
    enabled: Boolean(user && taskId && taskData),
  });

  // Query Teammates
  const { data: teammates = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await ApiClient.getUsers();
      return res.users || [];
    },
    enabled: Boolean(user),
  });

  const handleStatusChange = async (newStatus: string) => {
    try {
      await ApiClient.updateTaskStatus(taskId, newStatus);
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await ApiClient.deleteTask(taskId);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      router.push('/tasks');
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoadingTask) {
    return (
      <AppShell>
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-charcoal-500 font-medium">Loading task details...</p>
        </div>
      </AppShell>
    );
  }

  if (taskError || !taskData) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto py-16 text-center space-y-4 bg-white rounded-3xl border border-[#EAE6DF] p-8 shadow-subtle">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-charcoal-900">Task Not Accessible</h2>
          <p className="text-xs text-charcoal-600 leading-relaxed">
            This task does not exist or you do not have permission to view it. Only authorized task creators, assignees, and administrators can access this resource.
          </p>
          <button
            onClick={() => router.push('/tasks')}
            className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl hover:bg-brand-500 transition inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Return to My Tasks
          </button>
        </div>
      </AppShell>
    );
  }

  const isCreator = user.id === taskData.creator_id;
  const isAdmin = user.role === 'admin';
  const canDelete = isCreator || isAdmin;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-charcoal-700 bg-white hover:bg-ivory-50 border border-[#EAE6DF] rounded-xl transition inline-flex items-center gap-1.5 shadow-subtle"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Task
            </button>
            {canDelete && (
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200/80 rounded-xl transition inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Task Header & Card */}
        <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#EAE6DF]">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={taskData.priority} />
                <StatusBadge status={taskData.status} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-charcoal-900 tracking-tight">
                {taskData.title}
              </h1>
            </div>

            {/* Quick Status Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                Status:
              </span>
              <select
                value={taskData.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-1.5 text-xs bg-ivory-50 border border-[#EAE6DF] rounded-xl font-semibold text-charcoal-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-charcoal-400 uppercase tracking-wider">Description</h3>
            <p className="text-sm text-charcoal-700 leading-relaxed whitespace-pre-wrap">
              {taskData.description || 'No detailed description provided for this task.'}
            </p>
          </div>

          {/* Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#EAE6DF]">
            {/* Assignee */}
            <div className="p-3.5 rounded-2xl bg-ivory-50/70 border border-[#EAE6DF] space-y-1">
              <span className="text-[10px] uppercase font-bold text-charcoal-400">Assignee</span>
              <div className="flex items-center gap-2 pt-0.5">
                {taskData.assignee ? (
                  <>
                    {taskData.assignee.avatar_url ? (
                      <img
                        src={taskData.assignee.avatar_url}
                        alt={taskData.assignee.full_name}
                        className="w-6 h-6 rounded-full object-cover border border-[#EAE6DF]"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold text-[10px] flex items-center justify-center">
                        {taskData.assignee.full_name.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-charcoal-800">
                      {taskData.assignee.full_name}
                    </span>
                  </>
                ) : (
                  <span className="text-xs italic text-charcoal-400">Unassigned</span>
                )}
              </div>
            </div>

            {/* Creator */}
            <div className="p-3.5 rounded-2xl bg-ivory-50/70 border border-[#EAE6DF] space-y-1">
              <span className="text-[10px] uppercase font-bold text-charcoal-400">Creator</span>
              <div className="flex items-center gap-2 pt-0.5">
                {taskData.creator ? (
                  <>
                    {taskData.creator.avatar_url ? (
                      <img
                        src={taskData.creator.avatar_url}
                        alt={taskData.creator.full_name}
                        className="w-6 h-6 rounded-full object-cover border border-[#EAE6DF]"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-ivory-200 text-charcoal-700 font-bold text-[10px] flex items-center justify-center">
                        {taskData.creator.full_name.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-charcoal-800">
                      {taskData.creator.full_name}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-charcoal-500">System</span>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div className="p-3.5 rounded-2xl bg-ivory-50/70 border border-[#EAE6DF] space-y-1">
              <span className="text-[10px] uppercase font-bold text-charcoal-400">Due Date</span>
              <div className="flex items-center gap-1.5 pt-0.5 text-xs font-semibold text-charcoal-800">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                <span>
                  {taskData.due_date ? new Date(taskData.due_date).toLocaleDateString() : 'No date set'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Activity Trail */}
        <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-bold text-charcoal-900">Task Activity History</h2>
            </div>
            <span className="text-[11px] text-charcoal-400 font-medium">
              {activityLogs.length} events recorded
            </span>
          </div>

          <div className="divide-y divide-[#EAE6DF]">
            {activityLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-charcoal-400">
                No activity history logged yet.
              </p>
            ) : (
              activityLogs.map((log: ActivityLog) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="text-charcoal-800">
                      <span className="font-semibold">{log.user?.full_name || 'A teammate'}</span>{' '}
                      <span className="text-charcoal-500">
                        {log.action === 'created'
                          ? 'created this task'
                          : log.action === 'status_changed'
                          ? `changed status to ${log.details?.status || 'updated'}`
                          : log.action === 'assigned'
                          ? `assigned task`
                          : 'updated task details'}
                      </span>
                    </p>
                    <p className="text-[10px] text-charcoal-400 font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <TaskModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          taskToEdit={taskData}
          teammates={teammates}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
            queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }}
        />
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Delete Task"
          message={`Are you sure you want to permanently delete "${taskData.title}"? This action cannot be undone.`}
          confirmText={isDeleting ? 'Deleting...' : 'Delete'}
          isDanger
        />
      )}
    </AppShell>
  );
}
