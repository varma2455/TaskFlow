'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  Clock,
  Trash2,
  Edit,
  CheckCircle,
  AlertTriangle,
  History,
} from 'lucide-react';
import { ApiClient, Task, ActivityLog } from '@/lib/api';
import { StatusBadge, PriorityBadge } from './Badge';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  currentUserId: string;
  onStatusChange: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDeleteRequest: (task: Task) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  task,
  currentUserId,
  onStatusChange,
  onEdit,
  onDeleteRequest,
}) => {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      loadActivity(task.id);
    }
  }, [task, isOpen]);

  const loadActivity = async (taskId: string) => {
    setLoadingActivity(true);
    try {
      const res = await ApiClient.getTaskActivity(taskId);
      setActivity(res.activity || []);
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  if (!isOpen || !task) return null;

  const isCreator = task.creator_id === currentUserId;

  const handleQuickStatus = async (newStatus: 'todo' | 'in_progress' | 'completed') => {
    setIsUpdatingStatus(true);
    try {
      const res = await ApiClient.updateTaskStatus(task.id, newStatus);
      onStatusChange(res.task);
      loadActivity(task.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Due date & overdue calculation
  const getDueBadge = () => {
    if (!task.due_date) return null;
    const due = new Date(task.due_date);
    const now = new Date();
    const isCompleted = task.status === 'completed';

    if (isCompleted) {
      return (
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" /> Due: {due.toLocaleDateString()}
        </span>
      );
    }

    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      const hoursOverdue = Math.abs(Math.round(diffHours));
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5" /> Overdue by {hoursOverdue}h ({due.toLocaleDateString()})
        </span>
      );
    } else if (diffHours <= 48) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          <Clock className="w-3.5 h-3.5" /> Due in {Math.round(diffHours)}h
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
          <Calendar className="w-3.5 h-3.5" /> Due: {due.toLocaleDateString()}
        </span>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
              title="Edit Task"
            >
              <Edit className="w-4 h-4" />
            </button>
            {isCreator && (
              <button
                onClick={() => onDeleteRequest(task)}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {task.title}
            </h1>
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
              {task.description || 'No description provided.'}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Assignee
              </span>
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  {task.assignee.avatar_url ? (
                    <img
                      src={task.assignee.avatar_url}
                      alt={task.assignee.full_name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                      {task.assignee.full_name.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-800">
                    {task.assignee.full_name}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">Unassigned</span>
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Due Date
              </span>
              {getDueBadge() || <span className="text-sm text-slate-400">None</span>}
            </div>
          </div>

          {/* Status Workflow Action */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Change Status
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                disabled={task.status === 'todo' || isUpdatingStatus}
                onClick={() => handleQuickStatus('todo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  task.status === 'todo'
                    ? 'bg-slate-200 text-slate-800 cursor-default'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                To Do
              </button>
              <button
                disabled={task.status === 'in_progress' || isUpdatingStatus}
                onClick={() => handleQuickStatus('in_progress')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  task.status === 'in_progress'
                    ? 'bg-indigo-600 text-white cursor-default'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                In Progress
              </button>
              <button
                disabled={task.status === 'completed' || isUpdatingStatus}
                onClick={() => handleQuickStatus('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  task.status === 'completed'
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Completed
              </button>
            </div>
          </div>

          {/* Chronological Activity History */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <History className="w-4 h-4 text-brand-600" />
              Activity History & Audit Trail
            </div>

            {loadingActivity ? (
              <div className="text-xs text-slate-400 py-4 text-center">Loading audit history...</div>
            ) : activity.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">No activity records found.</div>
            ) : (
              <div className="space-y-2.5">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700"
                  >
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-brand-500 shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-slate-900">
                          {item.user?.full_name || 'Team member'}{' '}
                          <span className="font-normal text-slate-500">
                            {item.action === 'created'
                              ? 'created the task'
                              : item.action === 'updated'
                              ? 'updated details'
                              : item.action}
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      {item.details && Object.keys(item.details).length > 0 && (
                        <div className="mt-1 text-slate-500">
                          {item.details.status_changed && (
                            <span>Status changed: <strong>{item.details.status_changed}</strong></span>
                          )}
                          {item.details.assignee_changed_to && (
                            <span>Assigned to: <strong>{item.details.assignee_changed_to}</strong></span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
