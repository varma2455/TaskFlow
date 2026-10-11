import React from 'react';

interface StatusBadgeProps {
  status: 'todo' | 'in_progress' | 'completed' | string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'sm' }) => {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case 'completed':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]/70 ${pad} ${className}`}
        >
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-[#10B981] shrink-0" />
          Completed
        </span>
      );
    case 'in_progress':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]/70 ${pad} ${className}`}
        >
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-[#EA580C] shrink-0" />
          In Progress
        </span>
      );
    case 'todo':
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-[#F5F5F4] text-[#57534E] border border-[#E7E5E4] ${pad} ${className}`}
        >
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-[#A8A29E] shrink-0" />
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
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] ${className}`}
        >
          Urgent
        </span>
      );
    case 'high':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3] ${className}`}
        >
          High
        </span>
      );
    case 'medium':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] ${className}`}
        >
          Medium
        </span>
      );
    case 'low':
    default:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#F5F5F4] text-[#57534E] border border-[#E7E5E4] ${className}`}
        >
          Low
        </span>
      );
  }
};
