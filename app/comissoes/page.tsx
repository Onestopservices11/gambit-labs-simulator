'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import SaveBar from '@/components/shared/SaveBar';
import {
  calculateLoanPayment,
  calculateEmployeeCalculations,
  formatCurrency,
  formatPercent,
} from '@/lib/financialCalculations';
import PageHeader from '@/components/shared/PageHeader';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from 'recharts';
import { TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';

// ─── P&L Waterfall row ───────────────────────────────────────────────────────
function PLRow({
  label, value, sub, highlight, negative, muted, indent,
}: {
  label: string; value: number; sub?: string;
  highlight?: boolean; negative?: boolean; muted?: boolean; indent?: boolean;
}) {
  const color = highlight
    ? value >= 0 ? 'text-emerald-700 font-bold text-base' : 'text-red-600 font-bold text-base'
    : negative ? 'text-red-600 font-semibold' : muted ? 'text-slate-400' : 'text-slate-800 font-medium';

  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 ${indent ? 'pl-4' : ''}`}>
      <div>
        <p className={`text-sm ${muted ? 'text-slate-400' : 'text-slate-700'}`}>{label}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
      <p className={`text-sm tabular-nums ${color}`}>
        {value >= 0 && !negative ? '+' : ''}{formatCurrency(value)}
      </p>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  labor: 'Equipa / Salários',
  subcontractor: 'Subcontratados',
  tools: 'Ferramentas e licenças',
  materials: 'Materiais / Stock',
  other: 'Outros custos',
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ComissoesPage() {
  const { assumptions, employees, freelancers, investments, monthlyResults, fixedCostItems, yearPlans, updateAssumptions } = useAppStore();

  // Base revenue for simulation — use last month's actual if available, else monthly goal
  const lastResult = [...monthlyResults].sort((a, b) => b.month.localeCompare(a.month))[0];
  const baseMonthlyRevenue = lastResult?.actualRevenue ?? assumptions.annualRevenueGoal / 12;

  const [simRevenue, setSimRevenue] = useState(Math.round(baseMonthlyRevenue));
  const storedRate = assumptions.defaultCommissionRate ?? 0.05;
  const [globalCommissionPct, setGlobalCommissionPct] = useState(+(storedRate * 100).toFixed(2));
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setIsDirty(Math.abs(globalCommissionPct / 100 - (assumptions.defaultCommissionRate ?? 0.05)) > 0.0001);
  }, [globalCommissionPct, assumptions.defaultCommissionRate]);

  function handleSave() {
    updateAssumptions({ defaultCommissionRate: globalCommissionPct / 100 });
    setIsDirty(false);
  }

  function handleDiscard() {
    setGlobalCommissionPct(+((assumptions.defaultCommissionRate ?? 0.05) * 100).toFixed(2));
    setIsDirty(false);
  }

  // Per-employee commissions (using their variableCommission field)
  const activeEmployees = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const employeeCommissions = useMemo(() => {
    return activeEmployees.map(e => {
      const comm = simRevenue * (e.variableCommission / 100);
      return { name: e.name, role: e.role, rate: e.variableCommission, amount: comm };
    }).filter(e => e.rate > 0);
  }, [activeEmployees, simRevenue]);

  const totalEmployeeCommissions = employeeCommissions.reduce((s, e) => s + e.amount, 0);

  // Use global % if no per-employee commissions defined
  const useGlobal = employeeCommissions.length === 0;
  const totalCommissions = useGlobal
    ? simRevenue * (globalCommissionPct / 100)
    : totalEmployeeCommissions;
  const effectiveCommissionPct = simRevenue > 0 ? (totalCommissions / simRevenue) * 100 : 0;

  // Costs — always from their source (no direct delivery costs, no subcontractors)
  const teamCost = useMemo(() => activeEmployees.reduce((s, e) => {
    return s + calculateEmployeeCalculations(e, assumptions).annualizedMonthlyCost;
  }, 0), [activeEmployees, assumptions]);

  const fixedCosts = fixedCostItems.length > 0
    ? fixedCostItems.reduce((s, i) => s + i.amount, 0)
    : assumptions.monthlyFixedCosts;

  const freelancerCost = useMemo(() =>
    freelancers.filter(f => f.status === 'active' || f.status === 'planned')
      .reduce((s, f) => s + f.monthlyCost, 0),
    [freelancers]
  );

  const debtService = useMemo(() => {
    const rate = assumptions.baseInterestRate + assumptions.spread;
    return investments
      .filter(i => (i.status === 'in_progress' || i.status === 'approved') && i.financedAmount > 0)
      .reduce((s, inv) => s + calculateLoanPayment(inv.financedAmount, rate, 60), 0);
  }, [investments, assumptions]);

  // P&L — revenue goes directly to covering costs (no direct delivery costs)
  const ebitdaBeforeComm = simRevenue - teamCost - freelancerCost - fixedCosts - debtService;
  const ebitda           = ebitdaBeforeComm - totalCommissions;
  const irc              = ebitda > 0 ? ebitda * assumptions.corporateTaxRate : 0;
  const netProfit        = ebitda - irc;
  const netMarginPct     = simRevenue > 0 ? netProfit / simRevenue : 0;

  const maxCommissions   = Math.max(0, ebitdaBeforeComm);
  const maxCommissionPct = simRevenue > 0 ? (maxCommissions / simRevenue) * 100 : 0;
  const remainingAfterComm = maxCommissions - totalCommissions;
  const safetyMargin     = maxCommissions > 0 ? (remainingAfterComm / maxCommissions) * 100 : 0;

  // Chart: Lucro líquido vs % comissão — varre de 0% até 1.5× o break-even
  const commissionCurveData = useMemo(() => {
    const maxPct = Math.max(maxCommissionPct * 1.5, 10);
    const steps  = 40;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const pct  = (i / steps) * maxPct;
      const comm = simRevenue * (pct / 100);
      const eb   = ebitdaBeforeComm - comm;
      const tax  = eb > 0 ? eb * assumptions.corporateTaxRate : 0;
      const np   = eb - tax;
      return { commPct: +pct.toFixed(1), Lucro: Math.round(np) };
    });
  }, [ebitdaBeforeComm, simRevenue, maxCommissionPct, assumptions.corporateTaxRate]);

  // Waterfall — da receita ao lucro
  const waterfallData = [
    { name: 'Receita',      value: simRevenue,         fill: '#6366f1' },
    { name: 'Salários',     value: -teamCost,           fill: '#f59e0b' },
    ...(freelancerCost > 0 ? [{ name: 'Freelancers', value: -freelancerCost, fill: '#fb923c' }] : []),
    { name: 'Custos Fixos', value: -fixedCosts,         fill: '#f59e0b' },
    ...(debtService > 0 ? [{ name: 'Dívida', value: -debtService, fill: '#ef4444' }] : []),
    ...(totalCommissions > 0 ? [{ name: 'Comissões', value: -totalCommissions, fill: '#8b5cf6' }] : []),
    ...(irc > 0 ? [{ name: 'IRC', value: -irc, fill: '#64748b' }] : []),
    { name: 'Lucro',        value: netProfit,           fill: netProfit >= 0 ? '#10b981' : '#ef4444' },
  ];

  const isHealthy = netProfit > 0 && safetyMargin > 20;
  const isWarning = netProfit > 0 && safetyMargin <= 20;
  const isDanger = netProfit <= 0;

  return (
    <div>
      <PageHeader
        title="Comissões"
        description="Simula o impacto das comissões no resultado líquido. Vê até que percentagem podes pagar sem entrar em prejuízo."
        badge={`${formatPercent(effectiveCommissionPct / 100)} em comissões`}
      />

      {/* Planeamento link banner */}
      {(() => {
        const currentYear = new Date().getFullYear();
        const plan = yearPlans.find(y => y.year === currentYear);
        if (!plan) return null;
        const hasOverride = (plan.commissionRateOverride ?? 0) > 0;
        return (
          <Link href="/planeamento" className="block mb-4">
            <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-800">
                  Planeamento {currentYear}: meta {plan.revenueTarget > 0 ? formatCurrency(plan.revenueTarget) : 'não definida'}
                  {hasOverride ? ` · comissões: ${plan.commissionRateOverride}% (override)` : ' · comissões: por colaborador (auto)'}
                </p>
                <p className="text-xs text-indigo-600 mt-0.5">Clique para definir taxas de comissão por ano no Planeamento 5 Anos →</p>
              </div>
            </div>
          </Link>
        );
      })()}

      {/* Status banner */}
      <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
        isHealthy ? 'bg-emerald-50 border-emerald-200' :
        isWarning ? 'bg-amber-50 border-amber-200' :
        'bg-red-50 border-red-200'
      }`}>
        {isHealthy ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" /> :
         isWarning ? <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" /> :
         <TrendingDown className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
        <div>
          <p className={`text-sm font-bold ${isHealthy ? 'text-emerald-800' : isWarning ? 'text-amber-800' : 'text-red-800'}`}>
            {isHealthy ? 'Comissões sustentáveis — negócio rentável' :
             isWarning ? 'Atenção: margem de segurança baixa após comissões' :
             'Comissões acima do ponto de equilíbrio — resultado negativo'}
          </p>
          <p className={`text-xs mt-0.5 ${isHealthy ? 'text-emerald-700' : isWarning ? 'text-amber-700' : 'text-red-700'}`}>
            {isDanger
              ? `Com estas comissões há um prejuízo de ${formatCurrency(Math.abs(netProfit))}/mês. Máximo sustentável: ${formatPercent(maxCommissionPct / 100)}.`
              : `Após pagar todas as responsabilidades e comissões, sobram ${formatCurrency(netProfit)}/mês (${formatPercent(netMarginPct)}).`
            }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── LEFT: controls ── */}
        <div className="space-y-5">

          {/* Revenue input */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-4">Receita para Simulação</p>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Faturação mensal (€)</label>
            <p className="text-xs text-slate-400 mb-2">Por defeito usa o último resultado real inserido.</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">€</span>
              <input
                type="number"
                value={simRevenue}
                step={1000}
                onChange={e => setSimRevenue(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Commission config */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Comissões</p>

            {employeeCommissions.length > 0 ? (
              <>
                <p className="text-xs text-slate-500 mb-3">Configuradas por colaborador (em Contratações):</p>
                <div className="space-y-2">
                  {employeeCommissions.map((e, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{e.name}</p>
                        <p className="text-xs text-slate-400">{formatPercent(e.rate / 100)} sobre a receita</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-purple-700">{formatCurrency(e.amount)}</p>
                        <p className="text-xs text-slate-400">/mês</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between">
                  <span className="text-xs font-semibold text-slate-600">Total comissões</span>
                  <span className="text-sm font-bold text-purple-700">{formatCurrency(totalCommissions)}</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-3">
                  Nenhum colaborador com comissão definida. A usar simulação global:
                </p>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Comissão global (%)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(20, maxCommissionPct * 1.5)}
                    step={0.5}
                    value={globalCommissionPct}
                    onChange={e => setGlobalCommissionPct(parseFloat(e.target.value))}
                    className="flex-1 accent-indigo-600"
                  />
                  <div className="relative w-20">
                    <input
                      type="number"
                      value={globalCommissionPct}
                      step={0.5}
                      min={0}
                      onChange={e => setGlobalCommissionPct(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 pr-6 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  = {formatCurrency(totalCommissions)}/mês para {formatCurrency(simRevenue)} de faturação
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Para definir por colaborador, vai a <strong>Contratações</strong> e edita o campo "Comissão variável".
                </p>
              </>
            )}
          </div>

          {/* Break-even box */}
          <div className={`rounded-xl border p-5 ${maxCommissionPct > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3">Ponto de Equilíbrio</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Máximo em comissões (antes de prejuízo)</p>
                <p className="text-2xl font-bold text-indigo-700">{formatCurrency(maxCommissions)}/mês</p>
                <p className="text-sm text-indigo-600">{formatPercent(maxCommissionPct / 100)} da receita</p>
              </div>
              <div className="pt-3 border-t border-indigo-200">
                <p className="text-xs text-slate-500">Comissões atuais</p>
                <p className="text-lg font-bold text-purple-700">{formatCurrency(totalCommissions)}/mês</p>
              </div>
              <div className="pt-3 border-t border-indigo-200">
                <p className="text-xs text-slate-500">Margem de segurança</p>
                <p className={`text-lg font-bold ${safetyMargin > 30 ? 'text-emerald-700' : safetyMargin > 10 ? 'text-amber-700' : 'text-red-600'}`}>
                  {formatCurrency(remainingAfterComm)}/mês ({safetyMargin.toFixed(0)}%)
                </p>
              </div>
            </div>
          </div>

          {/* Tax note */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">Impostos considerados</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">IRC (sobre lucro positivo)</span>
                <span className="text-slate-700 font-medium">{formatPercent(assumptions.corporateTaxRate)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">SS Entidade Patronal</span>
                <span className="text-slate-700 font-medium">{formatPercent(assumptions.employerSocialSecurityRate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: results ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* P&L Waterfall */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-900">Demonstração de Resultados Mensal</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Com {formatCurrency(simRevenue)} de faturação e {formatPercent(effectiveCommissionPct / 100)} em comissões
            </p>

            <div className="space-y-0">
              <PLRow label="Receita" value={simRevenue} />
              <div className="my-1 border-t border-slate-100" />

              <PLRow
                label="Salários e Encargos"
                value={-teamCost}
                sub={`${activeEmployees.length} colaborador(es) — custo real anualizado · de Contratações`}
                negative indent
              />
              {freelancerCost > 0 && (
                <PLRow
                  label="Freelancers"
                  value={-freelancerCost}
                  sub={`${freelancers.filter(f => f.status === 'active' || f.status === 'planned').length} ativo(s)/planeado(s) · de Freelancers`}
                  negative indent
                />
              )}
              <PLRow
                label="Custos Fixos"
                value={-fixedCosts}
                sub={fixedCostItems.length > 0 ? `${fixedCostItems.length} rúbrica(s) · de Custos Fixos` : 'de Pressupostos'}
                negative indent
              />
              {debtService > 0 && (
                <PLRow label="Serviço de Dívida" value={-debtService} sub="financiamentos ativos" negative indent />
              )}
              <PLRow
                label={`Comissões (${formatPercent(effectiveCommissionPct / 100)})`}
                value={-totalCommissions}
                sub={employeeCommissions.length > 0
                  ? `${employeeCommissions.length} colaborador(es) com comissão · de Contratações`
                  : 'simulação global'}
                negative={totalCommissions > 0}
                muted={totalCommissions === 0}
                indent
              />
              <div className="my-1 border-t border-slate-200" />
              <PLRow label="EBITDA" value={ebitda} />
              <PLRow
                label="IRC"
                value={-irc}
                sub={irc > 0 ? `${formatPercent(assumptions.corporateTaxRate)} sobre o lucro` : 'sem lucro tributável'}
                negative={irc > 0} muted={irc === 0} indent
              />
              <div className="my-2 border-t-2 border-slate-200" />
              <PLRow label="Lucro Líquido" value={netProfit} sub={`margem líquida: ${formatPercent(netMarginPct)}`} highlight />
            </div>
          </div>

          {/* Profit curve chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Lucro Líquido vs % de Comissão</h3>
            <p className="text-xs text-slate-500 mb-4">
              A linha vermelha marca o ponto de equilíbrio ({formatPercent(maxCommissionPct / 100)}).
              Comissão atual: <strong>{formatPercent(effectiveCommissionPct / 100)}</strong>
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={commissionCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="commPct"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v}%`}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  formatter={(v: unknown) => [formatCurrency(v as number), 'Lucro Líquido']}
                  labelFormatter={l => `Comissão: ${l}%`}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" label={{ value: 'Break-even', position: 'right', fontSize: 10, fill: '#ef4444' }} />
                <ReferenceLine
                  x={+effectiveCommissionPct.toFixed(1)}
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  label={{ value: 'Atual', position: 'top', fontSize: 10, fill: '#8b5cf6' }}
                />
                <Line
                  type="monotone"
                  dataKey="Lucro"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Waterfall bar chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Decomposição do Resultado</h3>
            <p className="text-xs text-slate-500 mb-4">Da receita ao lucro — onde vai cada euro</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={waterfallData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${Math.round(v / 1000)}k€`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(v: unknown) => [formatCurrency(v as number), '']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {waterfallData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Receita Simulada', value: formatCurrency(simRevenue), color: 'text-indigo-700' },
              { label: 'Total Comissões', value: formatCurrency(totalCommissions), color: 'text-purple-700' },
              { label: 'Máx. Sustentável', value: formatCurrency(maxCommissions), color: 'text-amber-700' },
              { label: 'Lucro Líquido', value: formatCurrency(netProfit), color: netProfit >= 0 ? 'text-emerald-700' : 'text-red-600' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 mb-1">{m.label}</p>
                <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SaveBar isDirty={isDirty} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
}
