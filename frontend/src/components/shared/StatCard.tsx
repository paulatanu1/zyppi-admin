import React from 'react';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: 'indigo' | 'green' | 'amber' | 'rose';
  loading?: boolean;
}

const COLORS = {
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', iconBg: 'bg-indigo-100' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  iconBg: 'bg-green-100'  },
  amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  iconBg: 'bg-amber-100'  },
  rose:   { bg: 'bg-rose-50',   icon: 'text-rose-600',   iconBg: 'bg-rose-100'   },
};

export function StatCard({ title, value, icon: Icon, trend, trendLabel, color = 'indigo', loading }: StatCardProps) {
  const c = COLORS[color];

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
        <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
        <div className="h-3 w-20 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={cn('rounded-xl p-2.5', c.iconBg)}>
          <Icon className={cn('h-5 w-5', c.icon)} />
        </div>
      </div>
      {trend != null && (
        <div className="mt-3 flex items-center gap-1.5">
          {trend > 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          ) : trend < 0 ? (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-gray-400" />
          )}
          <span className={cn('text-xs font-medium', trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500')}>
            {Math.abs(trend)}% {trendLabel ?? 'vs last month'}
          </span>
        </div>
      )}
    </div>
  );
}
