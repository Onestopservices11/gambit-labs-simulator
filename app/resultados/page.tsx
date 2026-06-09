'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  calculateEmployeeCalculations,
  calculateLoanPayment,
  formatCurrency,
  formatPercent,
} from '@/lib/financialCalculations';
import PageHeader from '@/components/shared/PageHeader';
import type { MonthlyResult } from '@/lib/types';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Area,
} from 'recharts';
import { ChevronDown, ChevronUp, CheckCircle2, Edit3, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MONTHS_PT: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
};
const MONTHS_SHORT: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return `${MONTHS_PT[mo] ?? mo} ${y}`;
}
function monthShort(m: string) {
  const [, mo] = m.split('-');
  return MONTHS_SHORT[mo] ?? mo;
}
function generateYearMonths(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
}

// ── Pre-filled defaults for a month ─────────────────────────────────────────

function usePrefilledDefaults(month: string, plannedRevenue: number) {
  const { assumptions, employees, investments } = useAppStore();

  return useMemo(() => {
    const salaries = employees
      .filter(e => e.status === 'active' || e.status === 'planned')
      .reduce((s, e) => s + calculateEmployeeCalculations(e, assumptions).annualizedMonthlyCost, 0);

    const activeInvestments = investments.filter(
      i => i.status === 'in_progress' || i.status === 'approved'
    );
    let investmentOps = 0;
    let debtService = 0;
    activeInvestments.forEach(inv => {
      investmentOps += inv.monthlyOperatingCosts;
      if (inv.financedAmount > 0) {
        debtService += calculateLoanPayment(
          inv.financedAmount,
          assumptions.baseInterestRate + assumptions.spread,
          60
        );
      }
    });

    const software = employees
      .filter(e => e.status === 'active' || e.status === 'planned')
      .reduce((s, e) => s + e.monthlyToolsCost, 0);

    const otherCosts = assumptions.monthlyFixedCosts + investmentOps + debtService;

    return {
      month,
      plannedRevenue,
      salaries,
      software,
      otherCosts,
      totalCosts: salaries + software + otherCosts,
    };
  }, [month, plannedRevenue, assumptions, employees, investments]);
}

// ── Month entry modal ────────────────────────────────────────────────────────

function MonthEntryModal({
  month,
  existing,
  plannedRevenue,
  onSave,
  onClose,
}: {
  month: string;
  existing: MonthlyResult | null;
  plannedRevenue: number;
  onSave: (r: MonthlyResult) => void;
  onClose: () => void;
}) {
  const defaults = usePrefilledDefaults(month, plannedRevenue);
  const { assumptions } = useAppStore();

  const [actualRevenue, setActualRevenue] = useState(existing?.actualRevenue ?? 0);
  const [overrideCosts, setOverrideCosts] = useState(false);
  const [costs, setCosts] = useState({
    salaries: existing?.salaries ?? defaults.salaries,
    software: existing?.software ?? defaults.software,
    marketing: existing?.marketing ?? 0,
    otherCosts: existing?.otherCosts ?? defaults.otherCosts,
  });
  const [commercial, setCommercial] = useState({
    newClients: existing?.newClients ?? 0,
    proposalsSent: existing?.proposalsSent ?? 0,
    meetingsHeld: existing?.meetingsHeld ?? 0,
    leadsGenerated: existing?.leadsGenerated ?? 0,
    projectsClosed: existing?.projectsClosed ?? 0,
  });

  const totalCosts = costs.salaries + costs.software + costs.marketing + costs.otherCosts;
  const margin = actualRevenue - totalCosts;
  const marginPct = actualRevenue > 0 ? (margin / actualRevenue) * 100 : 0;
  const deviationPct = plannedRevenue > 0 ? ((actualRevenue - plannedRevenue) / plannedRevenue) * 100 : 0;

  function handleSave() {
    onSave({
      id: existing?.id ?? `mr-${Date.now()}`,
      month,
      plannedRevenue,
      actualRevenue,
      recurringRevenue: Math.round(actualRevenue * assumptions.recurringRevenueShare),
      oneOffRevenue: Math.round(actualRevenue * assumptions.oneOffRevenueShare),
      actualCosts: totalCosts,
      ...costs,
      investmentExecuted: 0,
      ...commercial,
      churn: 0,
      cashReceived: Math.round(actualRevenue * 0.9),
      overdueCash: Math.round(actualRevenue * 0.1),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Resultados do Mês</p>
          <h2 className="text-xl font-bold text-slate-900">{monthLabel(month)}</h2>
          <p className="text-sm text-slate-500 mt-1">Meta: <strong>{formatCurrency(plannedRevenue)}</strong></p>
        </div>

        <div className="p-6 space-y-5">
          {/* Revenue — the only required field */}
          <div className="p-5 rounded-xl bg-indigo-50 border-2 border-indigo-200">
            <label className="block text-sm font-bold text-indigo-900 mb-1">Quanto faturou este mês? *</label>
            <p className="text-xs text-slate-500 mb-3">O único campo obrigatório. Custos são pré-calculados.</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-indigo-400">€</span>
              <input
                type="number" value={actualRevenue || ''} step={1000} autoFocus placeholder="0"
                onChange={e => setActualRevenue(parseFloat(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-indigo-900 rounded-xl border-2 border-indigo-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {actualRevenue > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg text-center border ${deviationPct >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-xs text-slate-500">vs Plano</p>
                <p className={`text-base font-bold ${deviationPct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {deviationPct >= 0 ? '+' : ''}{deviationPct.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg text-center bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Custos Estimados</p>
                <p className="text-base font-bold text-slate-900">{formatCurrency(totalCosts)}</p>
              </div>
              <div className={`p-3 rounded-lg text-center border ${margin >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-xs text-slate-500">Margem</p>
                <p className={`text-base font-bold ${margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {marginPct.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Costs section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setOverrideCosts(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-slate-700"
            >
              <span>Custos pré-preenchidos (opcional alterar)</span>
              {overrideCosts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {!overrideCosts ? (
              <div className="px-4 py-3 grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: 'Salários equipa', value: defaults.salaries },
                  { label: 'Software / Ferramentas', value: defaults.software },
                  { label: 'Custos fixos + outros', value: defaults.otherCosts },
                  { label: 'Total estimado', value: defaults.totalCosts, bold: true },
                ].map((item, i) => (
                  <div key={i} className={`flex justify-between ${item.bold ? 'col-span-2 pt-2 border-t border-slate-100 font-bold' : ''}`}>
                    <span className="text-slate-500">{item.label}</span>
                    <span className="text-slate-900">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {([
                  { key: 'salaries', label: 'Salários reais (€)' },
                  { key: 'software', label: 'Software / Ferramentas (€)' },
                  { key: 'marketing', label: 'Marketing (€)' },
                  { key: 'otherCosts', label: 'Outros custos (€)' },
                ] as { key: keyof typeof costs; label: string }[]).map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
                    <input
                      type="number" value={costs[f.key]} step={100}
                      onChange={e => setCosts(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commercial data */}
          <details className="border border-slate-200 rounded-xl overflow-hidden">
            <summary className="px-4 py-3 bg-slate-50 cursor-pointer text-sm font-semibold text-slate-700 hover:bg-slate-100 list-none">
              Dados comerciais do mês (opcional)
            </summary>
            <div className="p-4 grid grid-cols-2 gap-3">
              {([
                { key: 'leadsGenerated', label: 'Leads geradas' },
                { key: 'meetingsHeld', label: 'Reuniões realizadas' },
                { key: 'proposalsSent', label: 'Propostas enviadas' },
                { key: 'projectsClosed', label: 'Projetos fechados' },
                { key: 'newClients', label: 'Novos clientes' },
              ] as { key: keyof typeof commercial; label: string }[]).map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
                  <input
                    type="number" value={commercial[f.key]} min={0}
                    onChange={e => setCommercial(p => ({ ...p, [f.key]: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
          </details>
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={actualRevenue === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4" /> Guardar Mês
          </button>
        </div>
      </div>
    </div>
  );
}

// ── P&L table ────────────────────────────────────────────────────────────────

function PLTable({ months, resultsByMonth, plannedRevenue }: {
  months: string[];
  resultsByMonth: Record<string, MonthlyResult>;
  plannedRevenue: number;
}) {
  const rows = [
    { label: 'Faturação Real', key: 'actualRevenue' as const, bold: true, color: (v: number) => v > 0 ? 'text-slate-900' : 'text-slate-300' },
    { label: 'Meta', key: null as null, bold: false, isGoal: true },
    { label: 'Custos Totais', key: 'actualCosts' as const, bold: false, color: () => 'text-slate-700' },
    { label: '  Salários', key: 'salaries' as const, bold: false, indent: true, color: () => 'text-slate-600' },
    { label: '  Marketing', key: 'marketing' as const, bold: false, indent: true, color: () => 'text-slate-600' },
    { label: '  Outros', key: 'otherCosts' as const, bold: false, indent: true, color: () => 'text-slate-600' },
    { label: 'Margem €', key: null as null, bold: true, isMarginEur: true },
    { label: 'Margem %', key: null as null, bold: true, isMarginPct: true },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 font-semibold text-slate-600 w-36 sticky left-0 bg-white">Métrica</th>
            {months.map(m => (
              <th key={m} className="text-right py-2 px-3 font-semibold text-slate-600 min-w-[80px]">
                {monthShort(m)}
              </th>
            ))}
            <th className="text-right py-2 px-3 font-bold text-slate-700 min-w-[90px]">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const values = months.map(m => {
              const r = resultsByMonth[m];
              if (!r) return null;
              if (row.isGoal) return plannedRevenue;
              if (row.isMarginEur) return r.actualRevenue - r.actualCosts;
              if (row.isMarginPct) return r.actualRevenue > 0 ? ((r.actualRevenue - r.actualCosts) / r.actualRevenue) * 100 : null;
              if (row.key) return (r as unknown as Record<string, number>)[row.key] ?? null;
              return null;
            });
            const total = values.reduce((s: number, v) => s + (v ?? 0), 0);
            const isPct = row.isMarginPct;

            return (
              <tr key={ri} className={`border-b border-slate-100 ${ri === 0 || row.isMarginEur || row.isMarginPct ? 'bg-slate-50' : ''}`}>
                <td className={`py-2 px-3 sticky left-0 ${ri === 0 || row.bold ? 'bg-slate-50' : 'bg-white'} ${row.bold ? 'font-bold text-slate-800' : row.indent ? 'text-slate-500 pl-5' : 'text-slate-700'}`}>
                  {row.label}
                </td>
                {values.map((v, ci) => {
                  if (v === null) return <td key={ci} className="text-right py-2 px-3 text-slate-300">—</td>;
                  const colorClass = row.isMarginEur || row.isMarginPct
                    ? (v >= 0 ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold')
                    : row.isGoal ? 'text-indigo-600'
                    : row.color ? row.color(v) : 'text-slate-700';
                  return (
                    <td key={ci} className={`text-right py-2 px-3 font-mono ${colorClass}`}>
                      {isPct ? `${v.toFixed(1)}%` : formatCurrency(v)}
                    </td>
                  );
                })}
                <td className={`text-right py-2 px-3 font-mono font-bold ${
                  row.isMarginEur || row.isMarginPct
                    ? (total >= 0 ? 'text-emerald-700' : 'text-red-600')
                    : row.isGoal ? 'text-indigo-600' : 'text-slate-900'
                }`}>
                  {isPct
                    ? (values.filter(v => v !== null).length > 0
                        ? `${(values.filter(v => v !== null).reduce((s: number, v) => s + (v ?? 0), 0) / values.filter(v => v !== null).length).toFixed(1)}%`
                        : '—')
                    : formatCurrency(total)
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Commercial funnel ─────────────────────────────────────────────────────────

function CommercialFunnel({ results, assumptions }: {
  results: MonthlyResult[];
  assumptions: import('@/lib/types').Assumptions;
}) {
  const totals = useMemo(() => results.reduce((acc, r) => ({
    leads: acc.leads + r.leadsGenerated,
    meetings: acc.meetings + r.meetingsHeld,
    proposals: acc.proposals + r.proposalsSent,
    closed: acc.closed + r.projectsClosed,
    newClients: acc.newClients + r.newClients,
  }), { leads: 0, meetings: 0, proposals: 0, closed: 0, newClients: 0 }), [results]);

  if (totals.leads === 0 && totals.meetings === 0) return null;

  const realL2M = totals.leads > 0 ? totals.meetings / totals.leads : 0;
  const realM2P = totals.meetings > 0 ? totals.proposals / totals.meetings : 0;
  const realP2C = totals.proposals > 0 ? totals.closed / totals.proposals : 0;

  const stages = [
    { label: 'Leads', value: totals.leads, assumed: null, real: null },
    { label: 'Reuniões', value: totals.meetings, assumed: assumptions.leadToMeetingConversion, real: realL2M },
    { label: 'Propostas', value: totals.proposals, assumed: assumptions.meetingToProposalConversion, real: realM2P },
    { label: 'Fechados', value: totals.closed, assumed: assumptions.proposalToCloseConversion, real: realP2C },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-4">Funil Comercial Real vs Assumido</h3>
      <div className="flex items-end gap-2">
        {stages.map((s, i) => {
          const maxVal = stages[0].value || 1;
          const barH = Math.max(12, Math.round((s.value / maxVal) * 100));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              {s.real !== null && s.assumed !== null && (
                <div className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  s.real >= s.assumed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {formatPercent(s.real)}
                </div>
              )}
              <div
                className="w-full rounded-t-lg bg-indigo-500 transition-all flex items-end justify-center"
                style={{ height: `${barH}px` }}
              />
              <p className="text-xs font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 text-center">{s.label}</p>
              {s.assumed !== null && (
                <p className="text-xs text-slate-400">meta {formatPercent(s.assumed)}</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-slate-500">Leads → Reunião</p>
          <p className={`text-sm font-bold ${realL2M >= assumptions.leadToMeetingConversion ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatPercent(realL2M)} <span className="text-slate-400 font-normal text-xs">/ meta {formatPercent(assumptions.leadToMeetingConversion)}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Reunião → Proposta</p>
          <p className={`text-sm font-bold ${realM2P >= assumptions.meetingToProposalConversion ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatPercent(realM2P)} <span className="text-slate-400 font-normal text-xs">/ meta {formatPercent(assumptions.meetingToProposalConversion)}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Proposta → Fecho</p>
          <p className={`text-sm font-bold ${realP2C >= assumptions.proposalToCloseConversion ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatPercent(realP2C)} <span className="text-slate-400 font-normal text-xs">/ meta {formatPercent(assumptions.proposalToCloseConversion)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Month card ───────────────────────────────────────────────────────────────

function MonthCard({ month, result, plannedRevenue, onEdit, isCurrent }: {
  month: string;
  result: MonthlyResult | null;
  plannedRevenue: number;
  onEdit: () => void;
  isCurrent: boolean;
}) {
  const hasData = result !== null;
  const deviationPct = hasData && plannedRevenue > 0 ? ((result.actualRevenue - plannedRevenue) / plannedRevenue) * 100 : null;
  const margin = hasData ? result.actualRevenue - result.actualCosts : null;
  const marginPct = hasData && result.actualRevenue > 0 ? ((margin ?? 0) / result.actualRevenue) * 100 : null;

  const status = !hasData ? 'empty'
    : (deviationPct ?? 0) >= -5 ? 'good'
    : (deviationPct ?? 0) >= -15 ? 'warn'
    : 'bad';

  const borderColor = {
    empty: isCurrent ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-slate-200',
    good: 'border-emerald-200',
    warn: 'border-amber-200',
    bad: 'border-red-200',
  }[status];
  const bg = { empty: 'bg-white', good: 'bg-emerald-50', warn: 'bg-amber-50', bad: 'bg-red-50' }[status];

  const TrendIcon = deviationPct === null ? null : deviationPct > 0 ? TrendingUp : deviationPct < -5 ? TrendingDown : Minus;
  const trendColor = deviationPct === null ? '' : deviationPct > 0 ? 'text-emerald-600' : deviationPct < -5 ? 'text-red-500' : 'text-amber-500';

  return (
    <div className={`rounded-xl border p-4 transition-all ${borderColor} ${bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{monthLabel(month)}</p>
          <p className="text-xs text-slate-500">Meta {formatCurrency(plannedRevenue)}</p>
        </div>
        <div className="flex items-center gap-1">
          {TrendIcon && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            {hasData ? 'Editar' : 'Inserir'}
          </button>
        </div>
      </div>

      {hasData ? (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <div>
              <p className="text-xs text-slate-500">Faturado</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(result.actualRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">vs Plano</p>
              <p className={`text-sm font-bold ${{ good: 'text-emerald-700', warn: 'text-amber-700', bad: 'text-red-700', empty: '' }[status]}`}>
                {(deviationPct ?? 0) >= 0 ? '+' : ''}{(deviationPct ?? 0).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Margem</p>
              <p className={`text-sm font-semibold ${(marginPct ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatCurrency(margin ?? 0)} ({(marginPct ?? 0).toFixed(1)}%)
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Custos</p>
              <p className="text-sm font-semibold text-slate-700">{formatCurrency(result.actualCosts)}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${{ good: 'bg-emerald-500', warn: 'bg-amber-400', bad: 'bg-red-400', empty: '' }[status]}`}
                style={{ width: `${Math.min(100, plannedRevenue > 0 ? (result.actualRevenue / plannedRevenue) * 100 : 0)}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-400 italic mt-1">
          {isCurrent ? 'Mês atual — clique para inserir' : 'Sem dados'}
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ResultadosPage() {
  const { assumptions, employees, investments, monthlyResults, yearPlans, addMonthlyResult, updateMonthlyResult } = useAppStore();

  const currentYear = new Date().getFullYear();
  const currentMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const planYears = yearPlans.map(y => y.year);
  const allYears = Array.from(new Set([
    ...planYears,
    ...monthlyResults.map(r => parseInt(r.month.split('-')[0])),
    currentYear,
  ])).sort();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);

  const yearPlan = yearPlans.find(y => y.year === selectedYear);
  const annualGoal = yearPlan?.revenueTarget ?? assumptions.annualRevenueGoal;
  const monthlyGoal = annualGoal / 12;

  const months = generateYearMonths(selectedYear);

  const resultsByMonth = useMemo(() => {
    const map: Record<string, MonthlyResult> = {};
    monthlyResults.forEach(r => { map[r.month] = r; });
    return map;
  }, [monthlyResults]);

  const yearResults = months.map(m => resultsByMonth[m]).filter(Boolean) as MonthlyResult[];

  const totalActual = yearResults.reduce((s, r) => s + r.actualRevenue, 0);
  const totalPlanned = monthlyGoal * yearResults.length;
  const totalCosts = yearResults.reduce((s, r) => s + r.actualCosts, 0);
  const totalMargin = totalActual - totalCosts;
  const totalMarginPct = totalActual > 0 ? (totalMargin / totalActual) * 100 : 0;
  const deviationPct = totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned) * 100 : 0;

  const remainingMonths = Math.max(0, 12 - yearResults.length);
  const remainingNeeded = Math.max(0, annualGoal - totalActual);
  const requiredPerMonth = remainingMonths > 0 ? remainingNeeded / remainingMonths : 0;

  const teamCost = employees
    .filter(e => e.status === 'active' || e.status === 'planned')
    .reduce((s, e) => s + calculateEmployeeCalculations(e, assumptions).annualizedMonthlyCost, 0);

  const activeFinancing = useMemo(() => {
    const rate = assumptions.baseInterestRate + assumptions.spread;
    return investments
      .filter(i => (i.status === 'in_progress' || i.status === 'approved') && i.financedAmount > 0)
      .map(inv => ({
        name: inv.name,
        installment: calculateLoanPayment(inv.financedAmount, rate, 60),
      }));
  }, [investments, assumptions]);
  const totalDebtService = activeFinancing.reduce((s, f) => s + f.installment, 0);

  // Chart data
  const chartData = months.map(m => {
    const r = resultsByMonth[m];
    const marginVal = r ? Math.round((r.actualRevenue - r.actualCosts) / 1000) : null;
    return {
      month: monthShort(m),
      Plano: Math.round(monthlyGoal / 1000),
      Real: r ? Math.round(r.actualRevenue / 1000) : null,
      Custos: r ? Math.round(r.actualCosts / 1000) : null,
      Margem: marginVal,
    };
  });

  function handleSave(result: MonthlyResult) {
    const existing = resultsByMonth[result.month];
    if (existing) updateMonthlyResult(existing.id, result);
    else addMonthlyResult(result);
  }

  return (
    <div>
      <PageHeader
        title="Resultados Reais"
        description="Registe a faturação mensal e acompanhe o desempenho real vs plano."
      >
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {allYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </PageHeader>

      {/* Goal source banner */}
      {!yearPlan && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
          Sem plano definido para {selectedYear}. A usar meta dos Pressupostos ({formatCurrency(annualGoal)}/ano). Configure o Planeamento para metas por ano.
        </div>
      )}

      {/* Auto-calculated context */}
      <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">Custos pré-calculados automaticamente</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Meta mensal', value: monthlyGoal, highlight: true },
            { label: 'Salários equipa ativa', value: teamCost },
            { label: 'Custos fixos mensais', value: assumptions.monthlyFixedCosts },
            { label: 'Serviço de dívida', value: totalDebtService, warn: totalDebtService > 0 },
          ].map((item, i) => (
            <div key={i} className={`rounded-lg p-3 border ${item.highlight ? 'bg-indigo-100 border-indigo-200' : item.warn && item.value > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-indigo-100'}`}>
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className={`text-sm font-bold ${item.highlight ? 'text-indigo-800' : item.warn && item.value > 0 ? 'text-amber-700' : item.value === 0 ? 'text-slate-400' : 'text-slate-900'}`}>
                {item.value > 0 ? formatCurrency(item.value) : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI summary */}
      {yearResults.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Faturado Acumulado', value: formatCurrency(totalActual), sub: null, color: 'text-slate-900' },
            { label: 'Plano Acumulado', value: formatCurrency(totalPlanned), sub: null, color: 'text-indigo-700' },
            { label: 'Desvio vs Plano', value: `${deviationPct >= 0 ? '+' : ''}${deviationPct.toFixed(1)}%`, sub: formatCurrency(totalActual - totalPlanned), color: deviationPct >= -5 ? 'text-emerald-700' : deviationPct >= -15 ? 'text-amber-700' : 'text-red-700' },
            { label: 'Margem Acumulada', value: `${totalMarginPct.toFixed(1)}%`, sub: formatCurrency(totalMargin), color: totalMargin >= 0 ? 'text-emerald-700' : 'text-red-600' },
            { label: 'Necessário/Mês para Meta', value: formatCurrency(requiredPerMonth), sub: `${remainingMonths} meses restantes`, color: 'text-indigo-700' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              {kpi.sub && <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Recovery alert */}
      {deviationPct < -5 && remainingMonths > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm font-semibold text-amber-800">
            Está {Math.abs(deviationPct).toFixed(1)}% abaixo da meta acumulada. Para recuperar até ao final de {selectedYear}, precisa de faturar {formatCurrency(requiredPerMonth)}/mês nos próximos {remainingMonths} meses.
          </p>
        </div>
      )}

      {/* Chart */}
      {yearResults.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Receita, Custos e Margem — {selectedYear} (k€)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: unknown) => v !== null ? `${v}k€` : '—'}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={Math.round(monthlyGoal / 1000)} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'Meta', position: 'right', fontSize: 10, fill: '#6366f1' }} />
              <Bar dataKey="Plano" fill="#e0e7ff" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Real" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Custos" fill="#fca5a5" radius={[3, 3, 0, 0]} />
              <Line dataKey="Margem" type="monotone" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* P&L Table */}
      {yearResults.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">P&L Mensal — {selectedYear}</h3>
          <PLTable months={months} resultsByMonth={resultsByMonth} plannedRevenue={monthlyGoal} />
        </div>
      )}

      {/* Commercial funnel */}
      {yearResults.length > 0 && (
        <div className="mb-6">
          <CommercialFunnel results={yearResults} assumptions={assumptions} />
        </div>
      )}

      {/* Month grid */}
      <h3 className="text-sm font-bold text-slate-900 mb-3">Meses de {selectedYear}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {months.map(m => (
          <MonthCard
            key={m}
            month={m}
            result={resultsByMonth[m] ?? null}
            plannedRevenue={monthlyGoal}
            onEdit={() => setEditingMonth(m)}
            isCurrent={m === currentMonth}
          />
        ))}
      </div>

      {editingMonth && (
        <MonthEntryModal
          month={editingMonth}
          existing={resultsByMonth[editingMonth] ?? null}
          plannedRevenue={monthlyGoal}
          onSave={handleSave}
          onClose={() => setEditingMonth(null)}
        />
      )}
    </div>
  );
}
