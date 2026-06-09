'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
  calculateRevenueGoalRequirements,
  formatCurrency,
  formatPercent,
  formatNumber,
} from '@/lib/financialCalculations';
import PageHeader from '@/components/shared/PageHeader';
import type { Scenario, Assumptions } from '@/lib/types';
import { Plus, Trash2, X, Check, BarChart3, Table2, Star, Pencil } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis,
} from 'recharts';

type ScenarioParams = Pick<Assumptions,
  | 'annualRevenueGoal' | 'grossMargin' | 'targetNetMargin'
  | 'averageProjectTicket' | 'averageMonthlyRecurringRevenue'
  | 'oneOffRevenueShare' | 'leadToMeetingConversion'
  | 'meetingToProposalConversion' | 'proposalToCloseConversion'
  | 'salesCapacityPerPerson' | 'deliveryCapacityPerPerson'
  | 'monthlyFixedCosts' | 'annualGrowthRate'
>;

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];

const TYPE_LABELS: Record<Scenario['type'], string> = {
  conservative: 'Conservador', base: 'Base',
  aggressive: 'Agressivo',    custom: 'Personalizado',
};

// ── Row groups for comparison table ──────────────────────────────────────────
type RowDef =
  | { kind: 'group'; label: string }
  | { kind: 'input'; key: keyof ScenarioParams; label: string; fmt: 'currency' | 'percent' | 'number'; step?: number }
  | { kind: 'output'; label: string; fn: (c: ReturnType<typeof calculateRevenueGoalRequirements>, p: ScenarioParams) => string; highlight?: 'good_high' | 'good_low' };

const ROWS: RowDef[] = [
  { kind: 'group', label: 'Meta e Crescimento' },
  { kind: 'input', key: 'annualRevenueGoal', label: 'Meta Anual', fmt: 'currency', step: 100000 },
  { kind: 'output', label: 'Meta Mensal', fn: (c) => formatCurrency(c.monthlyGoal) },
  { kind: 'output', label: 'Lucro Estimado / Mês', fn: (c) => formatCurrency(c.estimatedProfit), highlight: 'good_high' },
  { kind: 'input', key: 'annualGrowthRate', label: 'Crescimento Anual', fmt: 'percent' },

  { kind: 'group', label: 'Margens' },
  { kind: 'input', key: 'grossMargin', label: 'Margem Bruta', fmt: 'percent' },
  { kind: 'input', key: 'targetNetMargin', label: 'Margem Líquida Pretendida', fmt: 'percent' },
  { kind: 'output', label: 'Margem Bruta / Mês', fn: (c) => formatCurrency(c.estimatedMargin) },

  { kind: 'group', label: 'Mix de Receita' },
  { kind: 'input', key: 'averageProjectTicket', label: 'Ticket Médio One-Off', fmt: 'currency', step: 1000 },
  { kind: 'input', key: 'averageMonthlyRecurringRevenue', label: 'Mensalidade Recorrente', fmt: 'currency', step: 100 },
  { kind: 'input', key: 'oneOffRevenueShare', label: '% Receita One-Off', fmt: 'percent' },
  { kind: 'output', label: 'Projetos One-Off / Mês', fn: (c) => `${c.oneOffProjectsPerMonth}`, highlight: 'good_low' },
  { kind: 'output', label: 'Clientes Recorrentes Necessários', fn: (c) => `${c.recurringClientsNeeded}`, highlight: 'good_low' },

  { kind: 'group', label: 'Funil Comercial' },
  { kind: 'input', key: 'leadToMeetingConversion', label: 'Lead → Reunião', fmt: 'percent' },
  { kind: 'input', key: 'meetingToProposalConversion', label: 'Reunião → Proposta', fmt: 'percent' },
  { kind: 'input', key: 'proposalToCloseConversion', label: 'Proposta → Venda', fmt: 'percent' },
  { kind: 'output', label: 'Conversão Global', fn: (_, p) => `${(p.leadToMeetingConversion * p.meetingToProposalConversion * p.proposalToCloseConversion * 100).toFixed(2)}%`, highlight: 'good_high' },
  { kind: 'output', label: 'Leads / Mês', fn: (c) => formatNumber(c.leadsPerMonth), highlight: 'good_low' },
  { kind: 'output', label: 'Propostas / Mês', fn: (c) => formatNumber(c.proposalsPerMonth), highlight: 'good_low' },
  { kind: 'output', label: 'Vendas / Mês', fn: (c) => formatNumber(c.closingsPerMonth) },

  { kind: 'group', label: 'Equipa e Custos' },
  { kind: 'input', key: 'salesCapacityPerPerson', label: 'Receita máx. por Comercial', fmt: 'currency', step: 5000 },
  { kind: 'input', key: 'deliveryCapacityPerPerson', label: 'Receita máx. por Delivery', fmt: 'currency', step: 1000 },
  { kind: 'input', key: 'monthlyFixedCosts', label: 'Custos Fixos Mensais', fmt: 'currency', step: 500 },
  { kind: 'output', label: 'Comerciais Necessários', fn: (c) => `${c.salesPeopleNeeded}`, highlight: 'good_low' },
  { kind: 'output', label: 'Delivery Necessários', fn: (c) => `${c.deliveryPeopleNeeded}`, highlight: 'good_low' },
];

// ── Inline editable cell ──────────────────────────────────────────────────────
function EditableCell({ value, fmt, step = 1, onChange, isBase, delta }: {
  value: number; fmt: 'currency' | 'percent' | 'number';
  step?: number; onChange: (v: number) => void;
  isBase?: boolean; delta?: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const display = fmt === 'percent' ? +(value * 100).toFixed(2) : fmt === 'currency' ? Math.round(value) : value;

  function startEdit() { setDraft(String(display)); setEditing(true); }
  function commit() {
    const raw = parseFloat(draft);
    if (!isNaN(raw)) onChange(fmt === 'percent' ? raw / 100 : raw);
    setEditing(false);
  }

  const deltaLabel = delta !== null && delta !== undefined && Math.abs(delta) > 0.001
    ? `${delta > 0 ? '+' : ''}${fmt === 'percent' ? (delta * 100).toFixed(1) + 'pp' : fmt === 'currency' ? formatCurrency(delta) : delta.toFixed(1)}`
    : null;

  const deltaColor = delta && delta > 0 ? 'text-emerald-600' : delta && delta < 0 ? 'text-red-500' : '';

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {fmt === 'currency' && <span className="text-xs text-slate-400">€</span>}
        <input
          ref={inputRef}
          type="number"
          value={draft}
          step={step}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-24 px-2 py-1 text-xs border border-indigo-400 rounded focus:outline-none bg-white font-semibold"
        />
        {fmt === 'percent' && <span className="text-xs text-slate-400">%</span>}
      </div>
    );
  }

  const formatted = fmt === 'currency' ? formatCurrency(value)
    : fmt === 'percent' ? formatPercent(value)
    : String(value);

  return (
    <button
      onClick={startEdit}
      className={`group flex flex-col items-end gap-0.5 w-full text-right hover:bg-indigo-50 rounded px-1.5 py-0.5 transition-colors ${isBase ? 'cursor-default' : 'cursor-text'}`}
    >
      <span className={`text-xs font-bold ${isBase ? 'text-slate-500' : 'text-slate-900'} group-hover:text-indigo-700`}>{formatted}</span>
      {deltaLabel && <span className={`text-[10px] font-semibold ${deltaColor}`}>{deltaLabel}</span>}
      {!isBase && <Pencil className="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity self-end" />}
    </button>
  );
}

// ── Add scenario modal ────────────────────────────────────────────────────────
function AddScenarioModal({ base, onAdd, onClose }: {
  base: Assumptions; onAdd: (s: Scenario) => void; onClose: () => void;
}) {
  const [name, setName] = useState('Novo Cenário');
  const [type, setType] = useState<Scenario['type']>('custom');

  const templates: Record<Scenario['type'], Partial<ScenarioParams>> = {
    conservative: {
      annualRevenueGoal: base.annualRevenueGoal * 0.6,
      grossMargin: Math.max(0.3, base.grossMargin - 0.08),
      proposalToCloseConversion: base.proposalToCloseConversion * 0.75,
      averageProjectTicket: base.averageProjectTicket * 0.85,
    },
    base: {},
    aggressive: {
      annualRevenueGoal: base.annualRevenueGoal * 1.6,
      grossMargin: Math.min(0.75, base.grossMargin + 0.05),
      proposalToCloseConversion: Math.min(0.5, base.proposalToCloseConversion * 1.3),
      averageProjectTicket: base.averageProjectTicket * 1.3,
    },
    custom: {},
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Criar Cenário</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['conservative', 'base', 'aggressive', 'custom'] as Scenario['type'][]).map(t => (
              <button key={t} onClick={() => { setType(t); if (t !== 'custom') setName(TYPE_LABELS[t]); }}
                className={`px-3 py-3 rounded-xl border text-sm font-semibold transition-all text-left ${type === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <p>{TYPE_LABELS[t]}</p>
                <p className="text-xs font-normal text-slate-400 mt-0.5">
                  {t === 'conservative' ? 'Meta ×0.6, margens reduzidas' :
                   t === 'base'         ? 'Pressupostos actuais' :
                   t === 'aggressive'   ? 'Meta ×1.6, ticket aumentado' :
                   'Em branco'}
                </p>
              </button>
            ))}
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={() => { onAdd({ id: `sc-${Date.now()}`, name, type, color: COLORS[0], assumptionsOverride: templates[type], notes: '' }); onClose(); }}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CenariosPage() {
  const { assumptions, scenarios, addScenario, updateScenario, removeScenario } = useAppStore();
  const [showModal, setShowModal]   = useState(false);
  const [view,      setView]        = useState<'table' | 'charts'>('table');
  const [baseId,    setBaseId]      = useState<string | null>(null);

  // Compute merged params + calcs for each scenario
  const scenarioData = useMemo(() => scenarios.map((s, i) => {
    const params: ScenarioParams = {
      annualRevenueGoal:              assumptions.annualRevenueGoal,
      grossMargin:                    assumptions.grossMargin,
      targetNetMargin:                assumptions.targetNetMargin,
      averageProjectTicket:           assumptions.averageProjectTicket,
      averageMonthlyRecurringRevenue: assumptions.averageMonthlyRecurringRevenue,
      oneOffRevenueShare:             assumptions.oneOffRevenueShare,
      leadToMeetingConversion:        assumptions.leadToMeetingConversion,
      meetingToProposalConversion:    assumptions.meetingToProposalConversion,
      proposalToCloseConversion:      assumptions.proposalToCloseConversion,
      salesCapacityPerPerson:         assumptions.salesCapacityPerPerson,
      deliveryCapacityPerPerson:      assumptions.deliveryCapacityPerPerson,
      monthlyFixedCosts:              assumptions.monthlyFixedCosts,
      annualGrowthRate:               assumptions.annualGrowthRate,
      ...s.assumptionsOverride,
    };
    const merged = { ...assumptions, ...params };
    const calc   = calculateRevenueGoalRequirements(params.annualRevenueGoal, merged);
    return { s, params, calc, color: COLORS[i % COLORS.length] };
  }), [scenarios, assumptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveBaseId = baseId ?? scenarios[0]?.id ?? null;
  const baseData = scenarioData.find(d => d.s.id === effectiveBaseId);

  function updateParam(scenarioId: string, key: keyof ScenarioParams, value: number) {
    const s = scenarios.find(x => x.id === scenarioId);
    if (!s) return;
    const override = { ...(s.assumptionsOverride ?? {}), [key]: value };
    if (key === 'oneOffRevenueShare') override.recurringRevenueShare = Math.max(0, 1 - value);
    updateScenario(scenarioId, { assumptionsOverride: override });
  }

  // Charts data
  const revenueChart = scenarioData.map(({ s, params, calc, color }) => ({
    name: s.name, color,
    'Receita/ano (k€)': Math.round(params.annualRevenueGoal / 1000),
    'Lucro/mês (k€)':   Math.round(calc.estimatedProfit / 1000),
  }));

  const radarData = useMemo(() => {
    const metrics = [
      { label: 'Receita',   vals: scenarioData.map(d => d.params.annualRevenueGoal) },
      { label: 'Lucro',     vals: scenarioData.map(d => d.calc.estimatedProfit) },
      { label: 'Margem',    vals: scenarioData.map(d => d.params.grossMargin) },
      { label: 'Conversão', vals: scenarioData.map(d => d.params.leadToMeetingConversion * d.params.meetingToProposalConversion * d.params.proposalToCloseConversion) },
      { label: 'Ticket',    vals: scenarioData.map(d => d.params.averageProjectTicket) },
    ];
    return metrics.map(m => {
      const max  = Math.max(...m.vals, 1);
      const entry: Record<string, unknown> = { metric: m.label };
      scenarioData.forEach((d, i) => { entry[d.s.name] = Math.round((m.vals[i] / max) * 100); });
      return entry;
    });
  }, [scenarioData]);

  if (scenarios.length === 0) {
    return (
      <div>
        <PageHeader title="Cenários" description="Cria cenários e compara os resultados lado a lado, editando qualquer parâmetro directamente na tabela." badge="0 cenários">
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Novo Cenário
          </button>
        </PageHeader>
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-500 font-medium mb-2">Nenhum cenário criado</p>
          <p className="text-slate-400 text-sm mb-5">Cria 2+ cenários para comparar resultados lado a lado e editar parâmetros directamente na tabela.</p>
          <button onClick={() => setShowModal(true)} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            Criar Primeiro Cenário
          </button>
        </div>
        {showModal && <AddScenarioModal base={assumptions} onAdd={addScenario} onClose={() => setShowModal(false)} />}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Cenários" description="Edita qualquer valor directamente na tabela — os resultados actualizam em tempo real." badge={`${scenarios.length} cenários`}>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
            <button onClick={() => setView('table')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${view === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Table2 className="w-3.5 h-3.5" /> Tabela
            </button>
            <button onClick={() => setView('charts')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${view === 'charts' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <BarChart3 className="w-3.5 h-3.5" /> Gráficos
            </button>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Novo Cenário
          </button>
        </div>
      </PageHeader>

      {view === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

          {/* Scenario headers */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-52 bg-slate-50 sticky left-0 z-10">
                    Parâmetro / Métrica
                  </th>
                  {scenarioData.map(({ s, color }) => (
                    <th key={s.id} className="px-3 py-3 min-w-[180px]" style={{ borderTopColor: color, borderTopWidth: 3 }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <input
                            value={s.name}
                            onChange={e => updateScenario(s.id, { name: e.target.value })}
                            className="text-sm font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none w-full"
                          />
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-white" style={{ background: color }}>
                              {TYPE_LABELS[s.type]}
                            </span>
                            <button
                              onClick={() => setBaseId(s.id)}
                              title="Definir como base de comparação"
                              className={`p-0.5 rounded transition-colors ${effectiveBaseId === s.id ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                            >
                              <Star className="w-3 h-3" fill={effectiveBaseId === s.id ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        </div>
                        <button onClick={() => removeScenario(s.id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {effectiveBaseId === s.id && (
                        <p className="text-[10px] text-amber-600 font-semibold mt-1">★ base de comparação</p>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {ROWS.map((row, ri) => {
                  if (row.kind === 'group') {
                    return (
                      <tr key={ri} className="bg-slate-50">
                        <td colSpan={scenarioData.length + 1} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50">
                          {row.label}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={ri} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-xs font-medium text-slate-600 sticky left-0 bg-white/95 backdrop-blur-sm">
                        {row.label}
                        {row.kind === 'input' && <span className="ml-1 text-[10px] text-indigo-400 font-semibold">editável</span>}
                      </td>
                      {scenarioData.map(({ s, params, calc, color }) => {
                        const isBase = s.id === effectiveBaseId;

                        if (row.kind === 'input') {
                          const val = (params as unknown as Record<string, number>)[row.key];
                          const baseVal = baseData ? (baseData.params as unknown as Record<string, number>)[row.key] : null;
                          const delta   = !isBase && baseVal !== null ? val - baseVal : null;
                          return (
                            <td key={s.id} className={`px-3 py-1.5 ${isBase ? 'bg-amber-50/30' : ''}`}>
                              <EditableCell
                                value={val} fmt={row.fmt} step={row.step}
                                onChange={v => updateParam(s.id, row.key, v)}
                                isBase={isBase} delta={delta}
                              />
                            </td>
                          );
                        }

                        // output row
                        const rawFn = row.fn;
                        const displayVal = rawFn(calc, params);

                        // compute numeric delta for output rows if possible
                        let numericVal: number | null = null;
                        let numericBase: number | null = null;
                        try {
                          numericVal  = parseFloat(displayVal.replace(/[^0-9,.-]/g, '').replace(',', '.'));
                          numericBase = baseData ? parseFloat(rawFn(baseData.calc, baseData.params).replace(/[^0-9,.-]/g, '').replace(',', '.')) : null;
                        } catch { /* ignore */ }

                        const outputDelta = !isBase && numericBase !== null && numericVal !== null && !isNaN(numericVal) && !isNaN(numericBase)
                          ? numericVal - numericBase : null;

                        const outputDeltaFmt = outputDelta !== null && Math.abs(outputDelta) > 0.01
                          ? `${outputDelta > 0 ? '+' : ''}${outputDelta.toFixed(0)}`
                          : null;

                        const isGoodDelta = row.highlight === 'good_high' ? outputDelta && outputDelta > 0
                          : row.highlight === 'good_low' ? outputDelta && outputDelta < 0
                          : null;
                        const isBadDelta = row.highlight === 'good_high' ? outputDelta && outputDelta < 0
                          : row.highlight === 'good_low' ? outputDelta && outputDelta > 0
                          : null;

                        return (
                          <td key={s.id} className={`px-3 py-1.5 text-right ${isBase ? 'bg-amber-50/30' : ''}`}>
                            <span className={`text-xs font-bold ${isBase ? 'text-slate-500' : 'text-slate-900'}`} style={!isBase ? { color } : undefined}>
                              {displayVal}
                            </span>
                            {outputDeltaFmt && (
                              <span className={`block text-[10px] font-semibold ${isGoodDelta ? 'text-emerald-600' : isBadDelta ? 'text-red-500' : 'text-slate-400'}`}>
                                {outputDelta! > 0 ? '+' : ''}{outputDeltaFmt}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <p className="text-xs text-slate-400">
              Clica em qualquer valor <span className="text-indigo-500 font-semibold">editável</span> para alterar directamente.
              Os valores a <span className="text-emerald-600 font-semibold">verde</span> são melhores que a base (★),
              a <span className="text-red-500 font-semibold">vermelho</span> são piores.
              Clica em ★ para mudar a base de comparação.
            </p>
          </div>
        </div>
      )}

      {view === 'charts' && (
        <div className="space-y-6">

          {/* Revenue vs profit */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Receita Anual vs Lucro Mensal</h3>
            <p className="text-xs text-slate-500 mb-4">Milhares de euros</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: unknown) => [`${v}k€`]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Receita/ano (k€)" radius={[3, 3, 0, 0]}>
                  {revenueChart.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.35} />)}
                </Bar>
                <Bar dataKey="Lucro/mês (k€)" radius={[3, 3, 0, 0]}>
                  {revenueChart.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar */}
          {scenarios.length >= 2 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Perfil Comparativo (normalizado 0–100)</h3>
              <p className="text-xs text-slate-500 mb-4">Cada eixo é normalizado face ao valor máximo entre os cenários</p>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#f1f5f9" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#64748b' }} />
                  {scenarioData.map(({ s }, i) => (
                    <Radar key={s.id} name={s.name} dataKey={s.name}
                      stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Funnel comparison */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Actividade Comercial Necessária / Mês</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={scenarioData.map(({ s, calc }) => ({
                name: s.name,
                Leads: calc.leadsPerMonth,
                Propostas: calc.proposalsPerMonth,
                Vendas: calc.closingsPerMonth,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Leads"    fill="#e0e7ff" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Propostas" fill="#a5b4fc" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Vendas"   fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {showModal && <AddScenarioModal base={assumptions} onAdd={addScenario} onClose={() => setShowModal(false)} />}
    </div>
  );
}

function Info({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={12} cy={12} r={10} /><line x1={12} y1={16} x2={12} y2={12} /><line x1={12} y1={8} x2={12.01} y2={8} />
    </svg>
  );
}
