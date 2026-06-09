import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  state?: string;
  stateType?: 'success' | 'warning' | 'danger' | 'info';
  children?: ReactNode;
  className?: string;
  highlight?: boolean;
}

const stateStyles = {
  success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  danger: 'text-red-700 bg-red-50 border-red-200',
  info: 'text-indigo-700 bg-indigo-50 border-indigo-200',
};

export default function MetricCard({ title, value, description, state, stateType = 'info', children, className, highlight }: MetricCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:shadow-md hover:border-slate-300',
      highlight && 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-white ring-1 ring-indigo-100',
      className
    )}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{title}</p>
      <p className={cn('text-3xl font-bold mb-2 leading-none', highlight ? 'text-indigo-700' : 'text-slate-900')}>{value}</p>
      <p className="text-sm text-slate-500 mb-3 leading-relaxed">{description}</p>

      {state && (
        <div className={cn('text-xs font-medium px-3 py-1.5 rounded-md border inline-block', stateStyles[stateType])}>
          {state}
        </div>
      )}

      {children}
    </div>
  );
}
