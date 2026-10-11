'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Calendar, User, Flag, AlertCircle, Loader2, Check } from 'lucide-react';
import { ApiClient, Task, UserProfile } from '@/lib/api';

const taskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().max(2000, 'Description is too long').optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignee_id: z.string().optional().or(z.literal('')),
  due_date: z.string().optional().or(z.literal('')),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: Task) => void;
  taskToEdit?: Task | null;
  teammates?: UserProfile[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  taskToEdit,
  teammates = [],
}) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      assignee_id: '',
      due_date: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (taskToEdit) {
        let formattedDate = '';
        if (taskToEdit.due_date) {
          const date = new Date(taskToEdit.due_date);
          const pad = (n: number) => (n < 10 ? '0' + n : n);
          formattedDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }
        reset({
          title: taskToEdit.title || '',
          description: taskToEdit.description || '',
          priority: taskToEdit.priority || 'medium',
          assignee_id: taskToEdit.assignee_id ? String(taskToEdit.assignee_id) : '',
          due_date: formattedDate,
        });
      } else {
        reset({
          title: '',
          description: '',
          priority: 'medium',
          assignee_id: '',
          due_date: '',
        });
      }
    }
  }, [taskToEdit, isOpen, reset]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const onSubmit = async (data: TaskFormData) => {
    setServerError(null);
    try {
      const isoDueDate = data.due_date ? new Date(data.due_date).toISOString() : null;

      if (taskToEdit) {
        const res = await ApiClient.updateTask(taskToEdit.id, {
          title: data.title.trim(),
          description: data.description ? data.description.trim() : '',
          priority: data.priority,
          assignee_id: data.assignee_id || null,
          due_date: isoDueDate,
        });
        onSuccess(res.task);
      } else {
        const res = await ApiClient.createTask({
          title: data.title.trim(),
          description: data.description ? data.description.trim() : '',
          priority: data.priority,
          assignee_id: data.assignee_id || null,
          due_date: isoDueDate,
        });
        onSuccess(res.task);
      }
      onClose();
    } catch (err: any) {
      setServerError(err.message || 'Failed to save task. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-[#EAE6DF] overflow-hidden text-charcoal-900">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE6DF] bg-ivory-50">
          <div>
            <h2 id="task-modal-title" className="text-base font-bold text-charcoal-900">
              {taskToEdit ? 'Edit Task' : 'Create New Task'}
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              {taskToEdit
                ? 'Update task details, deadline, and assignment.'
                : 'Fill out details to schedule a task and notify your team.'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-ivory-200 transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p>{serverError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="block text-xs font-semibold text-charcoal-800">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              placeholder="e.g., Implement Supabase Realtime synchronization"
              {...register('title')}
              className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition placeholder:text-charcoal-400 ${
                errors.title ? 'border-rose-400 bg-rose-50/20' : 'border-[#D9D5CC]'
              }`}
            />
            {errors.title && (
              <p className="text-[11px] text-rose-600 font-medium">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="task-description" className="block text-xs font-semibold text-charcoal-800">
              Description <span className="text-charcoal-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="task-description"
              rows={3}
              placeholder="Add key requirements, acceptance criteria, or context..."
              {...register('description')}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-[#D9D5CC] bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition placeholder:text-charcoal-400 resize-none"
            />
            {errors.description && (
              <p className="text-[11px] text-rose-600 font-medium">{errors.description.message}</p>
            )}
          </div>

          {/* Priority & Assignee Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-1.5">
              <label htmlFor="task-priority" className="block text-xs font-semibold text-charcoal-800 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-brand-600" /> Priority
              </label>
              <select
                id="task-priority"
                {...register('priority')}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#D9D5CC] bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <label htmlFor="task-assignee" className="block text-xs font-semibold text-charcoal-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-600" /> Assignee
              </label>
              <select
                id="task-assignee"
                {...register('assignee_id')}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#D9D5CC] bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition"
              >
                <option value="">Unassigned</option>
                {teammates.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label htmlFor="task-due-date" className="block text-xs font-semibold text-charcoal-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-brand-600" /> Due Date & Time
            </label>
            <input
              id="task-due-date"
              type="datetime-local"
              {...register('due_date')}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-[#D9D5CC] bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition"
            />
            <p className="text-[11px] text-charcoal-400">
              Teammate will receive transactional email reminders within 48h of deadline.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#EAE6DF] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {taskToEdit ? 'Save Changes' : 'Create Task'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
