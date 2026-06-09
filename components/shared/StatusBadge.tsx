import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  planned: { label: 'Planeado', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  active: { label: 'Ativo', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  in_progress: { label: 'Em Execução', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  suspended: { label: 'Suspenso', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  terminated: { label: 'Terminado', color: 'bg-red-100 text-red-800 border-red-200' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-200' },
  idea: { label: 'Ideia', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  analysis: { label: 'Em Análise', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  approved: { label: 'Aprovado', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  lead: { label: 'Lead', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  contacted: { label: 'Contactado', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  meeting_scheduled: { label: 'Reunião Marcada', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  diagnosis_done: { label: 'Diagnóstico Feito', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  proposal_sent: { label: 'Proposta Enviada', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  negotiation: { label: 'Negociação', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  closed_won: { label: 'Fechado (Ganho)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  closed_lost: { label: 'Fechado (Perdido)', color: 'bg-red-100 text-red-800 border-red-200' },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium', config.color, className)}>
      {config.label}
    </span>
  );
}
