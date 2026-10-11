'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ApiClient, Task } from '@/lib/api';
import { AdminShell } from '@/components/AdminShell';
import {
  CheckSquare,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Clock,
  User,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export default function AdminTasksPage() {
  const { user: currentAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-tasks', page, search, statusFilter, priorityFilter],
    queryFn: async () => {
      return ApiClient.getAdminTasks({
        page,
        limit: 15,
        search,
        status: statusFilter,
        priority: priorityFilter,
      });
    },
    enabled: Boolean(currentAdmin && currentAdmin.role === 'admin'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task['status'] }) => {
      return ApiClient.updateTaskStatus(taskId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const tasksList = data?.tasks || [];
  const totalTasks = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  const isOverdue = (task: Task) => {
    if (task.status === 'completed' || !task.due_date) return false;
    return new Date(task.due_date) < new Date();
  };

  const priorityStyles: Record<string, string> = {
    urgent: 'bg-rose-50 text-rose-700 border-rose-200',
    high: 'bg-amber-50 text-amber-700 border-amber-200',
    medium: 'bg-sky-50 text-sky-700 border-sky-200',
    low: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
                System-Wide Task Oversight
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                All Users & Workstreams
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-1">
              Cross-organizational view of all deliverables, active assignees, deadlines, and delivery bottlenecks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3.5 py-1.5 text-xs font-semibold text-charcoal-700 hover:text-charcoal-900 bg-white border border-[#EAE6DF] rounded-xl shadow-subtle hover:bg-ivory-50 transition inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Refresh Tasks</span>
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-[#EAE6DF] shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search title, description, or tags..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-ivory-50/50 text-xs text-charcoal-800 placeholder:text-charcoal-400 border border-[#EAE6DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-charcoal-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-white border border-[#EAE6DF] rounded-xl px-2.5 py-1.5 text-charcoal-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-charcoal-500 font-medium">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-white border border-[#EAE6DF] rounded-xl px-2.5 py-1.5 text-charcoal-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAE6DF] bg-ivory-50/50 text-[11px] font-bold uppercase tracking-wider text-charcoal-500">
                  <th className="py-3 px-4">Task Deliverable</th>
                  <th className="py-3 px-4">Creator</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DF] text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-charcoal-400">
                      <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                      Loading system tasks...
                    </td>
                  </tr>
                ) : tasksList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-charcoal-400">
                      No tasks found matching current filters.
                    </td>
                  </tr>
                ) : (
                  tasksList.map((task: Task) => {
                    const overdue = isOverdue(task);

                    return (
                      <tr key={task.id} className="hover:bg-ivory-50/60 transition">
                        {/* Title & Preview */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div>
                            <Link
                              href={`/tasks/${task.id}`}
                              className="font-semibold text-charcoal-900 hover:text-brand-600 transition truncate block"
                            >
                              {task.title}
                            </Link>
                            {task.description && (
                              <p className="text-[11px] text-charcoal-500 line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Creator */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {task.creator ? (
                            <div className="flex items-center gap-2">
                              {task.creator.avatar_url ? (
                                <img
                                  src={task.creator.avatar_url}
                                  alt=""
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-ivory-300 text-charcoal-700 text-[10px] font-bold flex items-center justify-center">
                                  {task.creator.full_name?.charAt(0) || 'U'}
                                </div>
                              )}
                              <span className="text-[11px] text-charcoal-700 truncate max-w-[100px]">
                                {task.creator.full_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-charcoal-400">System</span>
                          )}
                        </td>

                        {/* Assignee */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
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
                              <span className="text-[11px] text-charcoal-800 font-medium truncate max-w-[100px]">
                                {task.assignee.full_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-charcoal-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              priorityStyles[task.priority] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </td>

                        {/* Status Select */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={task.status}
                            disabled={statusMutation.isPending}
                            onChange={(e) =>
                              statusMutation.mutate({
                                taskId: task.id,
                                status: e.target.value as Task['status'],
                              })
                            }
                            className={`text-xs rounded-xl px-2.5 py-1 border font-semibold cursor-pointer transition ${
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

                        {/* Due Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-[11px]">
                          {task.due_date ? (
                            <div className="flex items-center gap-1.5">
                              {overdue ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                              )}
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
                            </div>
                          ) : (
                            <span className="text-charcoal-400">None</span>
                          )}
                        </td>

                        {/* Action Link */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="p-1.5 rounded-lg text-charcoal-400 hover:text-brand-600 hover:bg-ivory-100 transition inline-flex items-center"
                            title="Open Task"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="py-3 px-4 border-t border-[#EAE6DF] bg-ivory-50/30 flex items-center justify-between">
            <span className="text-xs text-charcoal-500">
              Showing <span className="font-semibold text-charcoal-800">{tasksList.length}</span> of{' '}
              <span className="font-semibold text-charcoal-800">{totalTasks}</span> tasks
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-[#EAE6DF] bg-white hover:bg-ivory-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4 text-charcoal-600" />
              </button>
              <span className="text-xs font-semibold text-charcoal-800 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-[#EAE6DF] bg-white hover:bg-ivory-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4 text-charcoal-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
