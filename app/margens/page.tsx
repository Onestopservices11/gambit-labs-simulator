'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatPercent } from '@/lib/financialCalculations';
import PageHeader from '@/components/shared/PageHeader';
import SaveBar from '@/components/shared/SaveBar';
import { Plus, Trash2, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CostItem {
  id: string;
  label: string;
  amount: number;
  category: 'labor' | 'subcontractor' | 'tools' | 'materials' | 'other';
}

interface Scenario {
  id: string;
  name: string;
  revenue: number;
  costs: CostItem[];
}

const CATEGORY_LABELS: Record<CostItem['category'], string> = {
  labor: 'Equipa / Salários',
  subcontractor: 'Subcontratados / Freelancers',
  tools: 'Ferramentas e licenças',
  materials: 'Materiais / Stock',
  other: 'Outros custos mensais',
};

const CATEGORY_COLORS: Record<CostItem['category'], string> = {
  labor: 'bg-blue-100 text-blue-700',
  subcontractor: 'bg-purple-100 text-purple-700',
  tools: 'bg-amber-100 text-amber-700',
  materials: 'bg-green-100 text-green-700',
  other: 'bg-slate-100 text-slate-600',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newCost(): CostItem {
  return { id: `c-${Date.now()}-${Math.random()}`, label: '', amount: 0, category: 'subcontractor' };
}

function calcMargin(revenue: number, costs: CostItem[]) {
  const totalCosts = costs.reduce((s, c) => s + c.amount, 0);
  const grossProfit = revenue - totalCosts;
  const margin = revenue > 0 ? grossProfit / revenue : 0;
  return { totalCosts, grossProfit, margin };
}

// ─── Scenario card ───────────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  onChange,
  onRemove,
  onApply,
  isOnly,
}: {
  scenario: Scenario;
  onChange: (s: Scenario) => void;
  onRemove: () => void;
  onApply: (margin: number, costs: CostItem[], revenue: number) => void;
  isOnly: boolean;
}) {
  const [open, setOpen] = useState(true);
  const { totalCosts, grossProfit, margin } = useMemo(
    () => calcMargin(scenario.revenue, scenario.costs),
    [scenario]
  );

  const status = margin >= 0.4 ? 'good' : margin >= 0.2 ? 'warn' : 'bad';
  const StatusIcon = status === 'good' ? CheckCircle2 : status === 'warn' ? AlertTriangle : XCircle;
  const statusColor = status === 'good' ? 'text-emerald-600' : status === 'warn' ? 'text-amber-600' : 'text-red-600';

  function setRevenue(v: number) { onChange({ ...scenario, revenue: v }); }
  function setName(v: string) { onChange({ ...scenario, name: v }); }
  function addCost() { onChange({ ...scenario, costs: [...scenario.costs, newCost()] }); }
  function removeCost(id: string) { onChange({ ...scenario, costs: scenario.costs.filter(c => c.id !== id) }); }
  function updateCost(id: string, patch: Partial<CostItem>) {
    onChange({ ...scenario, costs: scenario.costs.map(c => c.id === id ? { ...c, ...patch } : c) });
  }

  // Group costs by category for summary
  const byCategory = scenario.costs.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + c.amount;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <input
          value={scenario.name}
          onChange={e => setName(e.target.value)}
          className="flex-1 text-base font-bold text-slate-900 bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-300"
          placeholder="Nome do cenário (ex: Projeto típico)"
        />
        <StatusIcon className={`w-4 h-4 ${statusColor}`} />
        <span className={`text-sm font-bold ${statusColor}`}>{formatPercent(margin)}</span>
        <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {!isOnly && (
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Summary strip (always visible) */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50">
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500">Receita Mensal</p>
          <p className="text-base font-bold text-slate-900">{formatCurrency(scenario.revenue)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500">Custos Mensais</p>
          <p className="text-base font-bold text-red-600">{formatCurrency(totalCosts)}</p>
        </div>
        <div className={`px-4 py-3 ${status === 'good' ? 'bg-emerald-50' : status === 'warn' ? 'bg-amber-50' : 'bg-red-50'}`}>
          <p className="text-xs text-slate-500">Margem Bruta</p>
          <p className={`text-base font-bold ${statusColor}`}>{formatPercent(margin)} ({formatCurrency(grossProfit)})</p>
        </div>
      </div>

      {open && (
        <div className="p-5 space-y-5">
          {/* Revenue */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Receita Mensal (€)</label>
            <p className="text-xs text-slate-400 mb-2">O que recebes por mês (faturação mensal esperada).</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">€</span>
              <input
                type="number"
                value={scenario.revenue || ''}
                step={500}
                placeholder="0"
                onChange={e => setRevenue(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Cost items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">Custos que pagas por mês</label>
              <button
                onClick={addCost}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                <Plus className="w-3 h-3" /> Adicionar custo
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">Mete aqui tudo o que pagas mensalmente: salários, subcontratados, ferramentas, rendas, licenças, etc.</p>

            {scenario.costs.length === 0 && (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
                <p className="text-sm text-slate-400">Sem custos mensais — a margem é 100%</p>
                <p className="text-xs text-slate-300 mt-1">Clica em "Adicionar custo" para começar</p>
              </div>
            )}

            <div className="space-y-2">
              {scenario.costs.map(cost => (
                <div key={cost.id} className="flex items-center gap-2">
                  <select
                    value={cost.category}
                    onChange={e => updateCost(cost.id, { category: e.target.value as CostItem['category'] })}
                    className="px-2 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={cost.label}
                    placeholder="Descrição (ex: Designer freelancer)"
                    onChange={e => updateCost(cost.id, { label: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                    <input
                      type="number"
                      value={cost.amount || ''}
                      step={50}
                      placeholder="0"
                      onChange={e => updateCost(cost.id, { amount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-5 pr-2 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button onClick={() => removeCost(cost.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(byCategory).length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">Por categoria</p>
              <div className="space-y-2">
                {Object.entries(byCategory).map(([cat, amt]) => {
                  const pct = scenario.revenue > 0 ? amt / scenario.revenue : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-40 text-center ${CATEGORY_COLORS[cat as CostItem['category']]}`}>
                        {CATEGORY_LABELS[cat as CostItem['category']]}
                      </span>
                      <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, pct * 100)}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-28 text-right">
                        {formatCurrency(amt)} ({formatPercent(pct)})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Apply button */}
          <div className={`p-4 rounded-xl border ${status === 'good' ? 'bg-emerald-50 border-emerald-200' : status === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-bold ${statusColor}`}>
                  Margem Bruta: {formatPercent(margin)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {status === 'good' ? 'Boa margem — acima de 40%.' :
                   status === 'warn' ? 'Margem aceitável mas baixa — entre 20% e 40%.' :
                   'Margem baixa — abaixo de 20%. Revê os custos.'}
                </p>
              </div>
              <button
                onClick={() => onApply(margin, scenario.costs, scenario.revenue)}
                disabled={scenario.revenue === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Usar nos Pressupostos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MargensPage() {
  const { assumptions, updateAssumptions, setMonthlyExpenses } = useAppStore();

  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: 's-1',
      name: 'Mês típico',
      revenue: assumptions.annualRevenueGoal / 12,
      costs: [],
    },
  ]);

  const [pendingMargin, setPendingMargin] = useState<number | null>(null);
  const [pendingExpenses, setPendingExpenses] = useState<{ costs: CostItem[]; revenue: number } | null>(null);
  const isDirty = pendingMargin !== null && pendingMargin !== assumptions.grossMargin;

  function addScenario() {
    setScenarios(prev => [...prev, {
      id: `s-${Date.now()}`,
      name: `Cenário ${prev.length + 1}`,
      revenue: assumptions.annualRevenueGoal / 12,
      costs: [],
    }]);
  }

  function handleApply(margin: number, costs: CostItem[], revenue: number) {
    setPendingMargin(margin);
    setPendingExpenses({ costs, revenue });
  }

  function handleSave() {
    if (pendingMargin !== null) {
      updateAssumptions({ grossMargin: pendingMargin });
      if (pendingExpenses) {
        setMonthlyExpenses(pendingExpenses.costs, pendingExpenses.revenue);
      }
      setPendingMargin(null);
      setPendingExpenses(null);
    }
  }

  function handleDiscard() {
    setPendingMargin(null);
    setPendingExpenses(null);
  }

  // Average margin across all scenarios
  const avgMargin = useMemo(() => {
    const margins = scenarios.map(s => calcMargin(s.revenue, s.costs).margin);
    return margins.reduce((a, b) => a + b, 0) / margins.length;
  }, [scenarios]);

  const currentMargin = pendingMargin ?? assumptions.grossMargin;

  return (
    <div className="pb-20">
      <PageHeader
        title="Calculadora de Margens"
        description="Mete a tua receita e custos mensais para calcular a margem real. Depois aplica nos Pressupostos com um clique."
      >
        <button
          onClick={addScenario}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Novo Cenário
        </button>
      </PageHeader>

      {/* Context banner */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
        <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Como usar esta calculadora?</p>
        <p className="text-sm text-blue-700 leading-relaxed">
          Mete a tua <strong>receita mensal</strong> e todos os <strong>custos que pagas por mês</strong> — salários, subcontratados, ferramentas, rendas, licenças.
          A calculadora mostra quanto sobra (margem) e aplica esse valor nos Pressupostos para toda a app usar o número real.
        </p>
      </div>

      {/* Current vs calculated */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Margem nos Pressupostos (atual)</p>
          <p className="text-2xl font-bold text-slate-900">{formatPercent(assumptions.grossMargin)}</p>
          <p className="text-xs text-slate-400 mt-1">valor guardado e usado em toda a app</p>
        </div>
        <div className="bg-white rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-xs text-slate-500 mb-1">Margem média calculada aqui</p>
          <p className="text-2xl font-bold text-indigo-700">{formatPercent(avgMargin)}</p>
          <p className="text-xs text-slate-400 mt-1">média dos {scenarios.length} cenário(s)</p>
        </div>
        {pendingMargin !== null ? (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
            <p className="text-xs text-slate-500 mb-1">A aplicar nos Pressupostos</p>
            <p className="text-2xl font-bold text-amber-700">{formatPercent(pendingMargin)}</p>
            <p className="text-xs text-slate-400 mt-1">clica Guardar na barra abaixo</p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-5 flex items-center justify-center">
            <p className="text-xs text-slate-400 text-center">Clica "Usar nos Pressupostos"<br />num cenário para actualizar</p>
          </div>
        )}
      </div>

      {/* Scenarios */}
      <div className="space-y-5">
        {scenarios.map(s => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            onChange={updated => setScenarios(prev => prev.map(x => x.id === s.id ? updated : x))}
            onRemove={() => setScenarios(prev => prev.filter(x => x.id !== s.id))}
            onApply={(margin, costs, revenue) => handleApply(margin, costs, revenue)}
            isOnly={scenarios.length === 1}
          />
        ))}
      </div>

      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
