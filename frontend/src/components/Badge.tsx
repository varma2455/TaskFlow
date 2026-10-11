import React from 'react';

interface StatusBadgeProps {
  status: 'todo' | 'in_progress' | 'completed' | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'completed':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
          Completed
        </span>
      );
    case 'in_progress':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}>
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          In Progress
        </span>
      );
    case 'todo':
    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-slate-400"></span>
          To Do
        </span>
      );
  }
};

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className = '' }) => {
  switch (priority) {
    case 'urgent':
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
          Urgent
        </span>
      );
    case 'high':
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
          High
        </span>
      );
    case 'medium':
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200 ${className}`}>
          Medium
        </span>
      );
    case 'low':
    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
          Low
        </span>
      );
  }
};
