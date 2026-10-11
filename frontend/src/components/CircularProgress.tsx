'use client';

import React from 'react';

interface CircularProgressProps {
  completed: number;
  total: number;
  inProgress?: number;
  todo?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  completed,
  total,
  inProgress = 0,
  todo = 0,
  size = 150,
  strokeWidth = 12,
  className = '',
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      role="region"
      aria-label="Task completion progress"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 origin-center"
          role="img"
          aria-label={`Task completion: ${percentage} percent. ${completed} of ${total} tasks completed.`}
        >
          <defs>
            <linearGradient id="taskflowProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#ECE8DF"
            strokeWidth={strokeWidth}
            className="transition-colors"
          />

          {/* Progress stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={total > 0 ? 'url(#taskflowProgressGradient)' : '#E5E1D8'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={total > 0 ? offset : circumference}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-2xl font-bold tracking-tight text-charcoal-900 font-mono">
            {percentage}%
          </span>
          <span className="text-[11px] font-medium text-charcoal-500 uppercase tracking-wider mt-0.5">
            Done
          </span>
        </div>
      </div>

      {/* Summary stats below circle */}
      <div className="mt-4 w-full grid grid-cols-3 gap-2 text-center pt-3 border-t border-[#EAE6DF]">
        <div className="px-1">
          <p className="text-[10px] uppercase font-semibold text-charcoal-400">Total</p>
          <p className="text-sm font-bold text-charcoal-800 mt-0.5">{total}</p>
        </div>
        <div className="px-1 border-x border-[#EAE6DF]">
          <p className="text-[10px] uppercase font-semibold text-emerald-600">Done</p>
          <p className="text-sm font-bold text-emerald-700 mt-0.5">{completed}</p>
        </div>
        <div className="px-1">
          <p className="text-[10px] uppercase font-semibold text-brand-600">Active</p>
          <p className="text-sm font-bold text-brand-700 mt-0.5">{inProgress + todo}</p>
        </div>
      </div>
    </div>
  );
};
