import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { Recommendation } from '@/lib/financialCalculations';

interface RecommendationPanelProps {
  recommendations: Recommendation[];
  className?: string;
}

const typeConfig = {
  success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'text-emerald-800' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'text-amber-800' },
  danger: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'text-red-800' },
  info: { icon: Info, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', label: 'text-indigo-800' },
};

export default function RecommendationPanel({ recommendations, className }: RecommendationPanelProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {recommendations.map((rec, i) => {
        const { icon: Icon, color, bg, label } = typeConfig[rec.type];
        return (
          <div key={i} className={cn('flex gap-3 p-4 rounded-xl border', bg)}>
            <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', color)} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className={cn('text-sm font-semibold', label)}>{rec.title}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white bg-opacity-60 text-slate-500 border border-slate-200">{rec.area}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{rec.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
