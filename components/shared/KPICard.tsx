import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status?: 'green' | 'yellow' | 'red' | 'blue' | 'default';
  icon?: ReactNode;
  className?: string;
}

const statusStyles = {
  green: 'border-emerald-200 bg-emerald-50',
  yellow: 'border-amber-200 bg-amber-50',
  red: 'border-red-200 bg-red-50',
  blue: 'border-indigo-200 bg-indigo-50',
  default: 'border-slate-200 bg-white',
};

const statusDot = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-indigo-500',
  default: 'bg-slate-400',
};

export default function KPICard({ title, value, subtitle, trend, trendValue, status = 'default', icon, className }: KPICardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400';

  return (
    <div className={cn('rounded-xl border p-5 transition-all duration-200 hover:shadow-md', statusStyles[status], className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {status !== 'default' && (
            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusDot[status])} />
          )}
          <p className="text-sm font-medium text-slate-600 leading-tight">{title}</p>
        </div>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <p className="text-2xl font-bold text-slate-900 mb-1 leading-none">{value}</p>

      <div className="flex items-center justify-between mt-2">
        {subtitle && <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>}
        {trend && trendValue && (
          <div className={cn('flex items-center gap-1 text-xs font-medium ml-auto', trendColor)}>
            <TrendIcon className="w-3 h-3" />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
