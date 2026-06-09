'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  calculatePipelineWeightedValue,
  calculatePipelineTotal,
  formatCurrency,
} from '@/lib/financialCalculations';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import type { PipelineOpportunity, PipelineStage } from '@/lib/types';
import {
  Plus, GitBranch, Trash2, CalendarRange, TrendingUp,
  AlertTriangle, CheckCircle2, ChevronDown, Target, Info, Pencil,
} from 'lucide-react';
import Link from 'next/link';

const STAGES: { value: PipelineStage; label: string }[] = [
  { value: 'lead',              label: 'Lead' },
  { value: 'contacted',         label: 'Contactado' },
  { value: 'meeting_scheduled', label: 'Reunião Marcada' },
  { value: 'diagnosis_done',    label: 'Diagnóstico Feito' },
  { value: 'proposal_sent',     label: 'Proposta Enviada' },
  { value: 'negotiation',       label: 'Negociação' },
  { value: 'closed_won',        label: 'Fechado (Ganho)' },
  { value: 'closed_lost',       label: 'Fechado (Perdido)' },
];

const PROB_BY_STAGE: Record<PipelineStage, number> = {
  lead: 10, contacted: 20, meeting_scheduled: 30, diagnosis_done: 40,
  proposal_sent: 60, negotiation: 75, closed_won: 100, closed_lost: 0,
};

const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn', referral: 'Referência', outbound: 'Outbound',
  inbound: 'Inbound', event: 'Evento', other: 'Outro',
};

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function AddOpportunityModal({ onAdd, onSave, onClose, initial }: {
  onAdd?: (o: PipelineOpportunity) => void;
  onSave?: (id: string, o: Partial<PipelineOpportunity>) => void;
  onClose: () => void;
  initial?: PipelineOpportunity;
}) {
  const isEdit = !!initial;
  const [stage, setStage] = useState<PipelineStage>(initial?.stage ?? 'lead');
  const [form, setForm] = useState({
    clientName:        initial?.clientName        ?? '',
    opportunityName:   initial?.opportunityName   ?? '',
    service:           initial?.service           ?? '',
    estimatedValue:    initial?.estimatedValue    ?? 15000,
    probability:       initial?.probability       ?? 10,
    responsible:       initial?.responsible       ?? '',
    expectedCloseDate: initial?.expectedCloseDate ?? new Date().toISOString().split('T')[0],
    nextAction:        initial?.nextAction        ?? '',
    source:            initial?.source            ?? 'outbound' as PipelineOpportunity['source'],
    notes:             initial?.notes             ?? '',
  });

  function handleStageChange(s: PipelineStage) {
    setStage(s);
    setForm(p => ({ ...p, probability: PROB_BY_STAGE[s] }));
  }

  function handleSubmit() {
    if (!form.clientName) return;
    if (isEdit && initial && onSave) {
      onSave(initial.id, { ...form, stage });
    } else if (onAdd) {
      onAdd({ ...form, stage, id: `pip-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Editar Oportunidade' : 'Nova Oportunidade'}</h2>
        </div>
        <div className="p-6 space-y-4">
          {[
            { key: 'clientName',        label: 'Nome do Cliente',             type: 'text' },
            { key: 'opportunityName',   label: 'Nome da Oportunidade',        type: 'text' },
            { key: 'service',           label: 'Serviço / Produto',           type: 'text' },
            { key: 'estimatedValue',    label: 'Valor Estimado (€)',          type: 'number' },
            { key: 'probability',       label: 'Probabilidade de Fecho (%)',  type: 'number' },
            { key: 'responsible',       label: 'Responsável',                 type: 'text' },
            { key: 'expectedCloseDate', label: 'Data Prevista de Fecho',      type: 'date' },
            { key: 'nextAction',        label: 'Próxima Ação',                type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
              <input
                type={f.type}
                value={(form as Record<string, unknown>)[f.key] as string}
                onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Fase</label>
            <select value={stage} onChange={e => handleStageChange(e.target.value as PipelineStage)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Origem</label>
            <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value as PipelineOpportunity['source'] }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">{isEdit ? 'Guardar' : 'Adicionar'}</button>
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { yearPlans, pipeline, addOpportunity, updateOpportunity, removeOpportunity } = useAppStore();
  const [showModal, setShowModal]         = useState(false);
  const [editOpp, setEditOpp]             = useState<PipelineOpportunity | null>(null);
  const [filterStage, setFilterStage]     = useState<string>('all');

  const today       = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  // Year selector — same years as dashboard
  const availableYears = useMemo(() => {
    const years = new Set<number>(yearPlans.map(y => y.year));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [yearPlans, currentYear]);

  const [selectedYear, setSelectedYear] = useState(() => {
    if (yearPlans.some(y => y.year === currentYear)) return currentYear;
    const sorted = [...yearPlans].sort((a, b) => a.year - b.year);
    return sorted[0]?.year ?? currentYear;
  });

  const yearPlan    = yearPlans.find(y => y.year === selectedYear) ?? null;
  const annualGoal  = yearPlan?.revenueTarget ?? 0;
  const monthlyGoal = annualGoal / 12;

  // Overall pipeline metrics (all years)
  const weighted     = useMemo(() => calculatePipelineWeightedValue(pipeline), [pipeline]);
  const total        = useMemo(() => calculatePipelineTotal(pipeline), [pipeline]);
  const filtered     = filterStage === 'all' ? pipeline : pipeline.filter(p => p.stage === filterStage);
  const proposalValue = pipeline.filter(p => ['proposal_sent', 'negotiation'].includes(p.stage)).reduce((s, p) => s + p.estimatedValue, 0);
  const wonValue      = pipeline.filter(p => p.stage === 'closed_won').reduce((s, p) => s + p.estimatedValue, 0);

  // Pipeline for selected year
  const yearPipeline = useMemo(
    () => pipeline.filter(p => p.expectedCloseDate?.startsWith(`${selectedYear}-`) && p.stage !== 'closed_lost'),
    [pipeline, selectedYear]
  );
  const yearTotal    = yearPipeline.reduce((s, p) => s + p.estimatedValue, 0);
  const yearWon      = yearPipeline.filter(p => p.stage === 'closed_won').reduce((s, p) => s + p.estimatedValue, 0);
  const yearCovPct   = annualGoal > 0 ? (yearTotal / annualGoal) * 100 : 0;

  // Month-by-month coverage for selected year (all 12 months)
  const monthlyCoverage = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const monthStr = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
      const opps = pipeline.filter(p => p.stage !== 'closed_lost' && p.expectedCloseDate?.startsWith(monthStr));
      const wVal = opps.reduce((s, p) => s + p.estimatedValue, 0);
      const isPast = selectedYear < currentYear || (selectedYear === currentYear && m < currentMonth);
      const isCurrent = selectedYear === currentYear && m === currentMonth;
      return {
        label: MONTH_NAMES[m],
        month: m,
        goal: monthlyGoal,
        weighted: wVal,
        count: opps.length,
        isPast,
        isCurrent,
      };
    });
  }, [pipeline, selectedYear, monthlyGoal, currentYear, currentMonth]);

  const hasYearPlans = yearPlans.length > 0;

  return (
    <div>
      <PageHeader
        title="Pipeline Comercial"
        description="Acompanhe todas as oportunidades face às metas do Planeamento 5 Anos."
        badge={`${pipeline.filter(p => p.stage !== 'closed_lost').length} oportunidades ativas`}
      >
        <div className="flex items-center gap-3">
          {/* Year selector */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            <Plus className="w-4 h-4" />
            Nova Oportunidade
          </button>
        </div>
      </PageHeader>

      {/* No plan warning */}
      {!yearPlan && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Não há plano definido para {selectedYear}.{' '}
            <Link href="/planeamento" className="font-semibold underline hover:text-amber-900">
              Define os objetivos no Planeamento 5 Anos
            </Link>
            {' '}para ver a cobertura da pipeline face às metas.
          </p>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        {/* Meta anual do plano */}
        <div className="rounded-xl border border-indigo-300 bg-indigo-600 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200 mb-1">
            Meta {selectedYear}
          </p>
          <p className="text-2xl font-bold text-white">{annualGoal > 0 ? formatCurrency(annualGoal) : '—'}</p>
          <p className="text-xs text-indigo-200 mt-1">
            {monthlyGoal > 0 ? `${formatCurrency(monthlyGoal)}/mês` : 'Sem plano definido'}
          </p>
        </div>

        {/* Cobertura do ano selecionado */}
        <div className={`rounded-xl border p-5 ${
          annualGoal === 0 ? 'bg-white border-slate-200'
          : yearTotal >= annualGoal ? 'bg-emerald-50 border-emerald-200'
          : yearTotal >= annualGoal * 0.5 ? 'bg-amber-50 border-amber-200'
          : 'bg-red-50 border-red-200'
        }`}>
          <p className="text-xs text-slate-500 mb-1">Pipeline {selectedYear}</p>
          <p className={`text-2xl font-bold ${
            annualGoal === 0 ? 'text-slate-900'
            : yearTotal >= annualGoal ? 'text-emerald-700'
            : yearTotal >= annualGoal * 0.5 ? 'text-amber-700'
            : 'text-red-700'
          }`}>{formatCurrency(yearTotal)}</p>
          {annualGoal > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              {yearCovPct.toFixed(0)}% da meta anual
            </p>
          )}
        </div>

        {/* Em proposta / negociação */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
          <p className="text-xs text-slate-500 mb-1">Em Proposta / Negociação</p>
          <p className="text-2xl font-bold text-indigo-700">{formatCurrency(proposalValue)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {pipeline.filter(p => ['proposal_sent', 'negotiation'].includes(p.stage)).length} oportunidades
          </p>
        </div>

        {/* Fechado ganho */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs text-slate-500 mb-1">Fechado (Ganho)</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(wonValue)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {annualGoal > 0 ? `${((yearWon / annualGoal) * 100).toFixed(0)}% da meta ${selectedYear}` : `${pipeline.filter(p => p.stage === 'closed_won').length} negócios`}
          </p>
        </div>
      </div>

      {/* ── Barra de progresso anual ── */}
      {annualGoal > 0 && (
        <div className="mb-8 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                Cobertura da Pipeline — {selectedYear}
              </p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {formatCurrency(yearTotal)}
                <span className="text-sm font-normal text-slate-400 ml-2">de {formatCurrency(annualGoal)}</span>
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${yearCovPct >= 100 ? 'text-emerald-600' : yearCovPct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {yearCovPct.toFixed(0)}%
              </p>
              <p className="text-xs text-slate-400">coberto</p>
            </div>
          </div>
          {/* Barra com 3 faixas: ganho / pipeline / em falta */}
          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (yearWon / annualGoal) * 100)}%` }} />
            <div className="h-full bg-indigo-400" style={{ width: `${Math.min(100 - (yearWon / annualGoal) * 100, ((yearTotal - yearWon) / annualGoal) * 100)}%` }} />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Ganho: {formatCurrency(yearWon)}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> Pipeline: {formatCurrency(yearTotal - yearWon)}</span>
            {yearTotal < annualGoal && (
              <span className="flex items-center gap-1 text-red-500 font-semibold">
                <AlertTriangle className="w-3 h-3" /> Em falta: {formatCurrency(annualGoal - yearTotal)}
              </span>
            )}
          </div>
          {yearPlan && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                Meta mensal: {formatCurrency(monthlyGoal)}
              </span>
              {yearPlan.salaryGrowthPct > 0 && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                  +{yearPlan.salaryGrowthPct}% custos equipa
                </span>
              )}
              {yearPlan.extraHeadcount > 0 && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                  +{yearPlan.extraHeadcount} contratações planeadas
                </span>
              )}
              <Link href="/planeamento" className="text-xs text-indigo-600 px-2.5 py-1 rounded-full font-medium hover:bg-indigo-50 flex items-center gap-1">
                <CalendarRange className="w-3 h-3" /> Ver plano completo →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Cobertura mês a mês ── */}
      {hasYearPlans && annualGoal > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-indigo-500" />
            Cobertura Mensal — {selectedYear}
          </h2>
          <div className="grid grid-cols-4 lg:grid-cols-12 gap-2">
            {monthlyCoverage.map((m) => {
              const pct    = m.goal > 0 ? Math.min((m.weighted / m.goal) * 100, 100) : 0;
              const isOk   = m.weighted >= m.goal;
              return (
                <div key={m.month} className={`rounded-xl border p-2.5 ${
                  m.isCurrent ? 'ring-2 ring-indigo-400 border-transparent' :
                  m.isPast    ? 'bg-slate-50 border-slate-100' :
                  isOk        ? 'bg-white border-slate-200' :
                                'bg-amber-50 border-amber-100'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold ${m.isPast ? 'text-slate-400' : 'text-slate-700'}`}>{m.label}</span>
                    {m.isCurrent && <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-100 px-1 rounded-full">●</span>}
                  </div>
                  <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full ${m.isPast ? 'bg-slate-300' : isOk ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={`text-[10px] font-bold ${m.isPast ? 'text-slate-400' : isOk ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {m.weighted > 0 ? `${(m.weighted / 1000).toFixed(0)}k` : '—'}
                  </p>
                  <p className="text-[9px] text-slate-400">{m.count > 0 ? `${m.count} op.` : ''}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-2">Meta por mês: {formatCurrency(monthlyGoal)}</p>
        </div>
      )}

      {/* ── Cobertura por ano (todos os planos) ── */}
      {hasYearPlans && yearPlans.length > 1 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            Cobertura por Ano do Plano
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ano</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Meta Anual</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Meta Mensal</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pipeline Ponderado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ganho</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cobertura</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {yearPlans.sort((a, b) => a.year - b.year).map(yp => {
                  const opps     = pipeline.filter(p => p.stage !== 'closed_lost' && p.expectedCloseDate?.startsWith(`${yp.year}-`));
                  const yw       = opps.reduce((s, p) => s + p.estimatedValue * (p.probability / 100), 0);
                  const ywon     = opps.filter(p => p.stage === 'closed_won').reduce((s, p) => s + p.estimatedValue, 0);
                  const pct      = yp.revenueTarget > 0 ? (yw / yp.revenueTarget) * 100 : 0;
                  const isOk     = yp.revenueTarget === 0 || yw >= yp.revenueTarget;
                  const isSelected = yp.year === selectedYear;
                  return (
                    <tr
                      key={yp.year}
                      onClick={() => setSelectedYear(yp.year)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900">{yp.year}</span>
                        {isSelected && <span className="ml-2 text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">selecionado</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrency(yp.revenueTarget)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(yp.revenueTarget / 12)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-indigo-700">{formatCurrency(yw)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrency(ywon)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full ${isOk ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${isOk ? 'text-emerald-700' : 'text-amber-700'}`}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isOk ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Coberto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> {formatCurrency(yp.revenueTarget - yw)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Clica numa linha para ver a cobertura mensal desse ano.</p>
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterStage('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStage === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
          Todas ({pipeline.length})
        </button>
        {STAGES.map(s => {
          const count = pipeline.filter(p => p.stage === s.value).length;
          if (!count) return null;
          return (
            <button key={s.value} onClick={() => setFilterStage(s.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStage === s.value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Tabela ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <GitBranch className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma oportunidade encontrada</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            Adicionar Oportunidade
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Oportunidade</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prob.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fase</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecho</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">% da Meta/mês</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(opp => {
                const oppYear    = opp.expectedCloseDate ? parseInt(opp.expectedCloseDate.slice(0, 4), 10) : selectedYear;
                const oppPlan    = yearPlans.find(y => y.year === oppYear);
                const oppMonthly = oppPlan ? oppPlan.revenueTarget / 12 : 0;
                const pctGoal    = oppMonthly > 0 ? (opp.estimatedValue / oppMonthly) * 100 : 0;
                return (
                  <tr key={opp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{opp.opportunityName}</p>
                      <p className="text-xs text-slate-400">{opp.clientName} · {SOURCE_LABELS[opp.source]}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(opp.estimatedValue)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-slate-400">{opp.probability}%</span>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={opp.stage} /></td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">{opp.expectedCloseDate}</td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      {oppMonthly > 0 && opp.stage !== 'closed_lost' ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pctGoal >= 20 ? 'bg-emerald-100 text-emerald-700' : pctGoal >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {pctGoal.toFixed(0)}%
                        </span>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditOpp(opp)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-300 hover:text-indigo-500">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeOpportunity(opp.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <AddOpportunityModal onAdd={addOpportunity} onClose={() => setShowModal(false)} />}
      {editOpp && <AddOpportunityModal initial={editOpp} onSave={updateOpportunity} onClose={() => setEditOpp(null)} />}
    </div>
  );
}
