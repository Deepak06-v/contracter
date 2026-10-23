import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'amber' | 'emerald' | 'rose' | 'blue';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-sm hover:border-slate-300 transition-colors flex flex-col justify-between min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
          {title}
        </span>
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 shrink-0" />
        </div>
      </div>

      <div className="mt-2 min-w-0">
        <span className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 tabular-nums block truncate">
          {value}
        </span>
        {subtitle && (
          <p className="mt-0.5 text-[11px] sm:text-xs text-slate-400 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
