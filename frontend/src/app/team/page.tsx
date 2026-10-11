'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, Task, UserProfile } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { StatusBadge, PriorityBadge } from '@/components/Badge';
import { TaskModal } from '@/components/TaskModal';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import {
  Users,
  Mail,
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  ListTodo,
  Calendar,
} from 'lucide-react';

export default function TeamPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [preselectedAssignee, setPreselectedAssignee] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Query teammates
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['users', user?.id],
    queryFn: async () => {
      const res = await ApiClient.getUsers();
      return res.users || [];
    },
    enabled: Boolean(user),
  });

  // Query tasks to calculate assigned workload
  const { data: allTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['tasks', 'all-for-team', user?.id],
    queryFn: async () => {
      const res = await ApiClient.getTasks({ limit: 100 });
      return res.tasks || [];
    },
    enabled: Boolean(user),
  });

  // Aggregate teammate statistics
  const memberWorkloads = useMemo(() => {
    const now = new Date();
    return members.map((member) => {
      const assigned = allTasks.filter((t) => t.assignee_id === member.id);
      const inProgress = assigned.filter((t) => t.status === 'in_progress');
      const completed = assigned.filter((t) => t.status === 'completed');
      const todo = assigned.filter((t) => t.status === 'todo');
      const overdue = assigned.filter((t) => {
        if (t.status === 'completed' || !t.due_date) return false;
        return new Date(t.due_date) < now;
      });

      return {
        member,
        total: assigned.length,
        inProgress: inProgress.length,
        completed: completed.length,
        todo: todo.length,
        overdue: overdue.length,
        tasks: assigned,
      };
    });
  }, [members, allTasks]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppShell
      onCreateTaskClick={() => {
        setPreselectedAssignee(null);
        setIsTaskModalOpen(true);
      }}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
                Team Tasks & Workload
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ivory-200 text-charcoal-700 border border-[#EAE6DF]">
                {members.length} teammates
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-1">
              Authorized task assignments, in-progress velocity, and overdue breakdown per team member.
            </p>
          </div>

          <button
            onClick={() => {
              setPreselectedAssignee(null);
              setIsTaskModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-subtle transition active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Assign New Task</span>
          </button>
        </div>

        {/* Teammates Workload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingMembers || isLoadingTasks ? (
            <div className="col-span-full py-16 text-center text-charcoal-400">
              <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
              Loading team directory...
            </div>
          ) : memberWorkloads.length === 0 ? (
            <div className="col-span-full py-16 text-center text-charcoal-400">
              No teammates found in workspace.
            </div>
          ) : (
            memberWorkloads.map(
              ({ member, total, inProgress, completed, overdue, tasks }) => (
                <div
                  key={member.id}
                  className="bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle p-5 flex flex-col justify-between space-y-4 hover:border-[#D9D5CC] transition"
                >
                  <div className="space-y-4">
                    {/* Member Profile */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.full_name}
                            className="w-11 h-11 rounded-full object-cover border border-[#EAE6DF]"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center">
                            {member.full_name?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-sm text-charcoal-900 leading-tight">
                            {member.full_name}
                          </h3>
                          <p className="text-[11px] text-charcoal-500 mt-0.5 truncate max-w-[150px]">
                            {member.email}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-ivory-200 text-charcoal-700">
                            {member.role}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setPreselectedAssignee(member.id);
                          setIsTaskModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-charcoal-400 hover:text-brand-600 hover:bg-ivory-100 transition"
                        title={`Assign task to ${member.full_name}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Metric Pills */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#EAE6DF] text-center">
                      <div className="p-2 rounded-xl bg-ivory-50 border border-[#EAE6DF]">
                        <p className="text-[10px] font-semibold text-charcoal-400 uppercase">Assigned</p>
                        <p className="text-sm font-bold text-charcoal-900 mt-0.5 font-mono">{total}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-orange-50/60 border border-orange-200/60">
                        <p className="text-[10px] font-semibold text-brand-700 uppercase">Active</p>
                        <p className="text-sm font-bold text-brand-700 mt-0.5 font-mono">{inProgress}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                        <p className="text-[10px] font-semibold text-emerald-700 uppercase">Done</p>
                        <p className="text-sm font-bold text-emerald-700 mt-0.5 font-mono">{completed}</p>
                      </div>
                      <div
                        className={`p-2 rounded-xl border ${
                          overdue > 0
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-ivory-50 border-[#EAE6DF] text-charcoal-400'
                        }`}
                      >
                        <p className="text-[10px] font-semibold uppercase">Late</p>
                        <p className="text-sm font-bold mt-0.5 font-mono">{overdue}</p>
                      </div>
                    </div>

                    {/* Member's Recent Tasks Snippet */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                        Assigned Tasks ({tasks.length})
                      </p>
                      {tasks.length === 0 ? (
                        <p className="text-xs text-charcoal-400 italic py-2">
                          No tasks assigned to this teammate.
                        </p>
                      ) : (
                        tasks.slice(0, 3).map((t) => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className="p-2 rounded-xl bg-ivory-50/60 border border-[#EAE6DF] hover:border-[#D9D5CC] cursor-pointer transition flex items-center justify-between text-xs"
                          >
                            <span className="truncate max-w-[180px] font-medium text-charcoal-800">
                              {t.title}
                            </span>
                            <StatusBadge status={t.status} size="sm" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#EAE6DF] flex items-center justify-between text-xs text-charcoal-500">
                    <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Registered Teammate
                    </span>
                    <button
                      onClick={() => router.push(`/tasks?assignee=${member.id}`)}
                      className="text-xs font-semibold text-brand-600 hover:underline"
                    >
                      Filter Tasks &rarr;
                    </button>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </div>

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setPreselectedAssignee(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }}
        taskToEdit={
          preselectedAssignee
            ? ({ assignee_id: preselectedAssignee, priority: 'medium' } as any)
            : null
        }
        teammates={members}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        currentUserId={user.id}
        onStatusChange={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }}
        onEdit={(task) => {
          setSelectedTask(null);
        }}
        onDeleteRequest={() => {}}
      />
    </AppShell>
  );
}
