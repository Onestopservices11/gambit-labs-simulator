import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, AlertTriangle, Star } from 'lucide-react';

interface DecisionBadgeProps {
  decision: 'hire' | 'wait' | 'dont_hire' | 'excellent' | 'interesting' | 'analyze' | 'risk';
  className?: string;
}

const config = {
  hire: { label: 'Contratar', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  wait: { label: 'Aguardar', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  dont_hire: { label: 'Não Contratar', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  excellent: { label: 'Excelente', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Star },
  interesting: { label: 'Interessante', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: CheckCircle2 },
  analyze: { label: 'A Analisar', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle },
  risk: { label: 'Risco', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

export default function DecisionBadge({ decision, className }: DecisionBadgeProps) {
  const { label, color, icon: Icon } = config[decision];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold', color, className)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
