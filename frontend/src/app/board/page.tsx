'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, Task } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { PriorityBadge } from '@/components/Badge';
import { TaskModal } from '@/components/TaskModal';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  ListTodo,
  Kanban,
  Search,
} from 'lucide-react';

export default function BoardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Query user tasks
  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ['board-tasks', user?.id],
    queryFn: async () => {
      const res = await ApiClient.getTasks({ limit: 100 });
      return res.tasks || [];
    },
    enabled: Boolean(user),
  });

  // Query teammates
  const { data: teammates = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await ApiClient.getUsers();
      return res.users || [];
    },
    enabled: Boolean(user),
  });

  const filteredTasks = rawTasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

  const moveStatus = async (taskId: string, newStatus: string) => {
    try {
      await ApiClient.updateTaskStatus(taskId, newStatus);
      queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const columns = [
    {
      id: 'todo',
      title: 'To Do',
      color: 'border-slate-300 text-charcoal-700 bg-slate-50',
      badgeColor: 'bg-slate-200 text-slate-700',
      tasks: todoTasks,
      nextStatus: 'in_progress',
      nextLabel: 'Start →',
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      color: 'border-brand-300 text-brand-800 bg-orange-50/50',
      badgeColor: 'bg-brand-100 text-brand-800',
      tasks: inProgressTasks,
      nextStatus: 'completed',
      nextLabel: 'Complete ✓',
    },
    {
      id: 'completed',
      title: 'Completed',
      color: 'border-emerald-300 text-emerald-800 bg-emerald-50/50',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      tasks: completedTasks,
      nextStatus: 'todo',
      nextLabel: 'Reopen ↺',
    },
  ];

  return (
    <AppShell
      onCreateTaskClick={() => {
        setTaskToEdit(null);
        setIsTaskModalOpen(true);
      }}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
                Task Board
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ivory-200 text-charcoal-700 border border-[#EAE6DF]">
                Interactive Kanban
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-1">
              Visualize workflow velocity, move task states, and manage active sprint deliverables.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsTaskModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-subtle transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#EAE6DF] shadow-subtle">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search board tasks..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-ivory-50 border border-[#EAE6DF] rounded-xl text-charcoal-800 placeholder:text-charcoal-400 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-[#EAE6DF] rounded-xl text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* 3-Column Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns.map((col) => (
            <div
              key={col.id}
              className="bg-white rounded-3xl border border-[#EAE6DF] shadow-subtle p-4 space-y-3 min-h-[500px] flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-charcoal-900">{col.title}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badgeColor}`}>
                    {col.tasks.length}
                  </span>
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1">
                {col.tasks.length === 0 ? (
                  <div className="h-40 flex items-center justify-center border-2 border-dashed border-[#EAE6DF] rounded-2xl text-[11px] text-charcoal-400 font-medium">
                    No {col.title.toLowerCase()} tasks
                  </div>
                ) : (
                  col.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-4 rounded-2xl bg-ivory-50/70 hover:bg-white border border-[#EAE6DF] hover:border-[#D9D5CC] hover:shadow-card cursor-pointer transition space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <PriorityBadge priority={task.priority} />
                        {task.due_date && (
                          <span className="text-[10px] text-charcoal-500 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-brand-600" />
                            {new Date(task.due_date).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xs font-bold text-charcoal-900 group-hover:text-brand-600 transition">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-[11px] text-charcoal-500 line-clamp-2 mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#EAE6DF]/60">
                        {/* Assignee Avatar */}
                        <div>
                          {task.assignee ? (
                            <div className="flex items-center gap-1.5" title={task.assignee.full_name}>
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
                              <span className="text-[11px] text-charcoal-600 truncate max-w-[90px]">
                                {task.assignee.full_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-charcoal-400 italic">Unassigned</span>
                          )}
                        </div>

                        {/* Move state action button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveStatus(task.id, col.nextStatus);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-brand-50 text-charcoal-700 hover:text-brand-700 border border-[#EAE6DF] transition"
                        >
                          {col.nextLabel}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          currentUserId={user?.id || ''}
          onEdit={(task) => {
            setSelectedTask(null);
            setTaskToEdit(task);
            setIsTaskModalOpen(true);
          }}
          onStatusChange={(updated) => {
            setSelectedTask(updated);
            queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
          }}
          onDeleteRequest={async (task) => {
            if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
              await ApiClient.deleteTask(task.id);
              setSelectedTask(null);
              queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
            }
          }}
        />
      )}

      {/* Create / Edit Modal */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setTaskToEdit(null);
          }}
          taskToEdit={taskToEdit}
          teammates={teammates}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }}
        />
      )}
    </AppShell>
  );
}
