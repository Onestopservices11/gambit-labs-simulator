'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  calculateRevenueGoalRequirements,
  calculatePipelineWeightedValue,
  calculatePipelineTotal,
  calculateActualVsPlan,
  generateBusinessRecommendations,
  formatCurrency,
  formatPercent,
  formatNumber,
  calculateEmployeeCalculations,
} from '@/lib/financialCalculations';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import {
  Target, Users, TrendingUp, GitBranch,
  AlertCircle, CheckCircle2, XCircle, ChevronDown,
  ArrowUpRight, ArrowDownRight, Minus, DollarSign,
  BarChart3, Activity, CalendarRange, Info,
} from 'lucide-react';
import Link from 'next/link';

// ─── helpers ──────────────────────────────────────────────────────────────────
const MONTHS_PT: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};
function fmtMonth(s: string) { return MONTHS_PT[s.split('-')[1]] ?? s; }

// ─── sub-components ───────────────────────────────────────────────────────────
function MetricCard({
  label, value, sub, trend, trendVal, accent = false, large = false,
}: {
  label: string; value: string; sub?: string;
  trend?: 'up' | 'down' | 'flat'; trendVal?: string;
  accent?: boolean; large?: boolean;
}) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400';
  return (
    <div className={`rounded-2xl border p-5 flex flex-col justify-between gap-3 ${accent ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${accent ? 'text-indigo-200' : 'text-slate-500'}`}>{label}</p>
      <div>
        <p className={`font-bold leading-none ${large ? 'text-3xl' : 'text-2xl'} ${accent ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {trend && <TrendIcon className={`w-3.5 h-3.5 ${accent ? 'text-indigo-200' : trendColor}`} />}
          {trendVal && <span className={`text-xs font-semibold ${accent ? 'text-indigo-200' : trendColor}`}>{trendVal}</span>}
          {sub && <span className={`text-xs ${accent ? 'text-indigo-200' : 'text-slate-400'}`}>{trendVal ? `· ${sub}` : sub}</span>}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{title}</h2>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function PLRow({ label, value, bold, positive, negative, indent, muted }: {
  label: string; value: string; bold?: boolean; positive?: boolean;
  negative?: boolean; indent?: boolean; muted?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-slate-50 last:border-0 ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${bold ? 'font-bold text-slate-900' : muted ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-sm tabular-nums font-semibold ${bold ? 'text-base' : ''} ${positive ? 'text-emerald-600' : negative ? 'text-red-500' : muted ? 'text-slate-400' : 'text-slate-800'}`}>{value}</span>
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    assumptions, employees, investments, pipeline, monthlyResults,
    yearPlans, fixedCostItems, freelancers, financings,
  } = useAppStore();

  const currentYear = new Date().getFullYear();

  // Build year list: union of yearPlans years + years with actual data
  const availableYears = useMemo(() => {
    const years = new Set<number>(monthlyResults.map(r => parseInt(r.month.split('-')[0])));
    yearPlans.forEach(yp => years.add(yp.year));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [monthlyResults, yearPlans, currentYear]);

  const [selectedYear, setSelectedYear] = useState(() => {
    if (yearPlans.some(y => y.year === currentYear)) return currentYear;
    const sorted = [...yearPlans].sort((a, b) => a.year - b.year);
    return sorted[0]?.year ?? currentYear;
  });

  // Plan for selected year
  const yearPlan = useMemo(
    () => yearPlans.find(y => y.year === selectedYear) ?? null,
    [yearPlans, selectedYear]
  );

  // Annual goal from plan (fallback to 0)
  const annualGoal   = yearPlan?.revenueTarget ?? 0;
  const monthlyGoal  = annualGoal / 12;

  // Actual results for selected year
  const yearResults = useMemo(
    () => monthlyResults.filter(r => r.month.startsWith(`${selectedYear}-`)),
    [monthlyResults, selectedYear]
  );

  // Pipeline
  const weightedPipeline = useMemo(() => calculatePipelineWeightedValue(pipeline), [pipeline]);
  const totalPipeline    = useMemo(() => calculatePipelineTotal(pipeline), [pipeline]);

  // Actual P&L
  const totalActualRevenue = yearResults.reduce((s, r) => s + r.actualRevenue, 0);
  const totalActualCosts   = yearResults.reduce((s, r) => s + r.actualCosts, 0);
  const totalActualProfit  = totalActualRevenue - totalActualCosts;
  const actualMarginPct    = totalActualRevenue > 0 ? totalActualProfit / totalActualRevenue : 0;
  const monthsWithData     = yearResults.length;

  // Deviation vs plan
  const actualVsPlan = useMemo(() => calculateActualVsPlan(yearResults, monthlyGoal), [yearResults, monthlyGoal]);
  const dev = actualVsPlan.deviationPercent;

  // Goal progress
  const annualGoalProgress = annualGoal > 0 ? totalActualRevenue / annualGoal : 0;

  // ── Planned costs for selected year (mirrors computePL logic) ──
  const activeEmps = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const monthlyTeamCost = activeEmps.reduce((s, e) =>
    s + calculateEmployeeCalculations(e, assumptions).annualizedMonthlyCost, 0);

  const salaryGrowthFactor = 1 + ((yearPlan?.salaryGrowthPct ?? 0) / 100);
  const basePlannedTeamMonthly = monthlyTeamCost * salaryGrowthFactor;

  // Extra headcount from plan
  const extraHiresMonthly = ((yearPlan?.extraHeadcount ?? 0) * (yearPlan?.avgExtraSalary ?? 0))
    * (1 + assumptions.employerSocialSecurityRate) * (assumptions.monthsPaidPerYear / 12);

  const plannedTeamMonthlyTotal = basePlannedTeamMonthly + extraHiresMonthly;

  // Fixed costs
  const fixedMonthly = fixedCostItems.length > 0
    ? fixedCostItems.reduce((s, i) => s + i.amount, 0)
    : (yearPlan?.fixedCostsOverride && yearPlan.fixedCostsOverride > 0
        ? yearPlan.fixedCostsOverride / 12
        : assumptions.monthlyFixedCosts);

  // Freelancers
  const freelancerMonthly = (freelancers ?? [])
    .filter(f => f.status === 'active' || f.status === 'planned')
    .reduce((s, f) => s + f.monthlyCost, 0);

  // Debt service
  const debtMonthly = (financings ?? []).reduce((s, f) => {
    const rate = (f.baseInterestRate + f.spread) / 12;
    const n = f.termMonths - (f.capitalGracePeriodMonths ?? 0);
    if (n <= 0 || rate === 0) return s + (f.financedAmount / Math.max(f.termMonths, 1));
    return s + f.financedAmount * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
  }, 0);

  // Commissions
  const autoCommRate = activeEmps.reduce((s, e) => s + e.variableCommission / 100, 0);
  const effCommRate  = (yearPlan?.commissionRateOverride ?? 0) > 0
    ? (yearPlan!.commissionRateOverride / 100)
    : autoCommRate;
  const plannedCommissions = monthlyGoal * effCommRate;

  const plannedTotalMonthlyCosts = plannedTeamMonthlyTotal + fixedMonthly + freelancerMonthly + debtMonthly + plannedCommissions;
  const plannedGrossProfit       = monthlyGoal * (assumptions.grossMargin ?? 0.5);
  const plannedMonthlyProfit     = plannedGrossProfit - plannedTotalMonthlyCosts;
  const plannedMarginPct         = monthlyGoal > 0 ? plannedMonthlyProfit / monthlyGoal : 0;

  // Activity needs from plan goal
  const goalCalc = useMemo(
    () => annualGoal > 0 ? calculateRevenueGoalRequirements(annualGoal, assumptions) : null,
    [annualGoal, assumptions]
  );

  // Recommendations
  const recommendations = useMemo(
    () => generateBusinessRecommendations(assumptions, employees, investments, pipeline, yearResults),
    [assumptions, employees, investments, pipeline, yearResults]
  );

  // Chart
  const chartData = useMemo(() => {
    if (monthlyGoal === 0 && yearResults.length === 0) return [];
    // merge plan months (all 12) with actual data
    const map: Record<string, { month: string; Planeado: number; Real: number; Lucro: number }> = {};
    for (let m = 1; m <= 12; m++) {
      const key = `${selectedYear}-${String(m).padStart(2, '0')}`;
      map[key] = { month: fmtMonth(key), Planeado: Math.round(monthlyGoal / 1000), Real: 0, Lucro: 0 };
    }
    yearResults.forEach(r => {
      if (map[r.month]) {
        map[r.month].Real  = Math.round(r.actualRevenue / 1000);
        map[r.month].Lucro = Math.round((r.actualRevenue - r.actualCosts) / 1000);
      }
    });
    return Object.values(map);
  }, [yearResults, monthlyGoal, selectedYear]);

  // Pipeline funnel
  const STAGES = [
    { key: 'lead', label: 'Lead' }, { key: 'contacted', label: 'Contactado' },
    { key: 'meeting_scheduled', label: 'Reunião' }, { key: 'diagnosis_done', label: 'Diagnóstico' },
    { key: 'proposal_sent', label: 'Proposta' }, { key: 'negotiation', label: 'Negociação' },
    { key: 'closed_won', label: 'Fechado ✓' },
  ];
  const pipelineByStage = STAGES.map(s => ({
    name: s.label,
    Oportunidades: pipeline.filter(p => p.stage === s.key).length,
    Valor: Math.round(pipeline.filter(p => p.stage === s.key).reduce((a, p) => a + p.estimatedValue, 0) / 1000),
  })).filter(s => s.Oportunidades > 0);

  const status: 'green' | 'yellow' | 'red' = dev >= -5 ? 'green' : dev >= -15 ? 'yellow' : 'red';
  const statusLabel = status === 'green' ? 'Saudável' : status === 'yellow' ? 'Atenção' : 'Em Risco';
  const statusColor = {
    green:  'text-emerald-600 bg-emerald-50 border-emerald-200',
    yellow: 'text-amber-600 bg-amber-50 border-amber-200',
    red:    'text-red-600 bg-red-50 border-red-200',
  }[status];
  const StatusIcon = status === 'green' ? CheckCircle2 : status === 'yellow' ? AlertCircle : XCircle;

  const noPlan = !yearPlan;

  return (
    <div className="space-y-8 pb-6">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Visão executiva · Gambit Labs</p>
        </div>
        <div className="flex items-center gap-3">
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
          {monthsWithData > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold ${statusColor}`}>
              <StatusIcon className="w-4 h-4" />
              {statusLabel}
            </div>
          )}
        </div>
      </div>

      {/* ── Sem plano aviso ── */}
      {noPlan && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Não há plano definido para {selectedYear}.{' '}
            <Link href="/planeamento" className="font-semibold underline hover:text-amber-900">
              Define os objetivos no Planeamento 5 Anos
            </Link>
            {' '}para o dashboard mostrar metas e análise comparativa.
          </p>
        </div>
      )}

      {/* ── HERO METRICS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={`Meta ${selectedYear}`}
          value={annualGoal > 0 ? formatCurrency(annualGoal) : '—'}
          sub={annualGoal > 0 ? `${formatCurrency(monthlyGoal)}/mês` : 'Sem plano definido'}
          accent
          large
        />
        <MetricCard
          label="Faturação Real YTD"
          value={formatCurrency(totalActualRevenue)}
          trend={monthsWithData > 0 ? (dev >= 0 ? 'up' : 'down') : undefined}
          trendVal={monthsWithData > 0 ? `${dev >= 0 ? '+' : ''}${dev.toFixed(1)}%` : undefined}
          sub={monthsWithData > 0 ? 'vs plano' : 'sem dados inseridos'}
          large
        />
        <MetricCard
          label={monthsWithData > 0 ? (totalActualProfit >= 0 ? 'Lucro Acumulado' : 'Prejuízo Acumulado') : 'Lucro Planeado/mês'}
          value={monthsWithData > 0 ? formatCurrency(Math.abs(totalActualProfit)) : formatCurrency(Math.max(0, plannedMonthlyProfit))}
          trend={monthsWithData > 0 ? (totalActualProfit >= 0 ? 'up' : 'down') : undefined}
          trendVal={monthsWithData > 0 ? formatPercent(Math.abs(actualMarginPct)) : undefined}
          sub={monthsWithData > 0 ? 'margem líquida' : `margem ${formatPercent(plannedMarginPct)} planeada`}
          large
        />
        <MetricCard
          label="Pipeline Ponderado"
          value={formatCurrency(weightedPipeline)}
          trend={annualGoal > 0 ? (weightedPipeline >= monthlyGoal ? 'up' : 'down') : undefined}
          sub={`total: ${formatCurrency(totalPipeline)}`}
          large
        />
      </div>

      {/* ── ANNUAL GOAL PROGRESS ── */}
      {annualGoal > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <CalendarRange className="w-3.5 h-3.5 text-indigo-500" />
                Progresso para a Meta {selectedYear}
              </p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {formatCurrency(totalActualRevenue)}
                <span className="text-sm font-normal text-slate-400 ml-2">de {formatCurrency(annualGoal)}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{formatPercent(annualGoalProgress)}</p>
              <p className="text-xs text-slate-400">{monthsWithData} {monthsWithData === 1 ? 'mês' : 'meses'} inseridos</p>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-700"
              style={{ width: `${Math.min(100, annualGoalProgress * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-400">0</span>
            <span className="text-xs text-slate-400">Meta: {formatCurrency(annualGoal)}</span>
          </div>
          {/* Plan context pills */}
          {yearPlan && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
              {yearPlan.salaryGrowthPct > 0 && (
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                  +{yearPlan.salaryGrowthPct}% aumentos salariais
                </span>
              )}
              {yearPlan.extraHeadcount > 0 && (
                <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                  +{yearPlan.extraHeadcount} novas contratações
                </span>
              )}
              {yearPlan.commissionRateOverride > 0 && (
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                  {yearPlan.commissionRateOverride}% comissões (override)
                </span>
              )}
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                {activeEmps.length + (yearPlan.extraHeadcount ?? 0)} colaboradores planeados
              </span>
              <Link href="/planeamento" className="text-xs text-indigo-600 px-2.5 py-1 rounded-full font-medium hover:bg-indigo-50 flex items-center gap-1">
                <Target className="w-3 h-3" /> Ver plano completo →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <SectionTitle title="Receita Planeada vs Real" sub={`${selectedYear} · valores em k€`} />
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPlan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}k`} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, name: any) => [`${v}k€`, name ?? '']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                {monthlyGoal > 0 && (
                  <ReferenceLine y={Math.round(monthlyGoal / 1000)} stroke="#6366f1" strokeDasharray="4 3" strokeOpacity={0.5} />
                )}
                <Area type="monotone" dataKey="Planeado" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3" fill="url(#gPlan)" dot={false} />
                <Area type="monotone" dataKey="Real"     stroke="#10b981" strokeWidth={2.5} fill="url(#gReal)" dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
              <BarChart3 className="w-8 h-8 opacity-30" />
              <span>Sem dados para {selectedYear}</span>
              <span className="text-xs">Define o plano em <Link href="/planeamento" className="text-indigo-500 underline">Planeamento</Link> e insere resultados em <Link href="/resultados" className="text-indigo-500 underline">Resultados Reais</Link></span>
            </div>
          )}
        </div>

        {/* Sidebar KPIs */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">P&L Planeado/mês · {selectedYear}</p>
            {annualGoal > 0 ? (
              <div className="space-y-0">
                <PLRow label="Receita mensal meta"    value={formatCurrency(monthlyGoal)} bold />
                <PLRow label="Equipa (c/ aumentos)"  value={`− ${formatCurrency(plannedTeamMonthlyTotal)}`} indent negative={plannedTeamMonthlyTotal > 0} />
                <PLRow label="Custos fixos"           value={`− ${formatCurrency(fixedMonthly)}`} indent negative={fixedMonthly > 0} />
                {freelancerMonthly > 0 && <PLRow label="Freelancers"  value={`− ${formatCurrency(freelancerMonthly)}`} indent negative />}
                {debtMonthly > 0       && <PLRow label="Dívida/serviço" value={`− ${formatCurrency(debtMonthly)}`} indent negative />}
                {plannedCommissions > 0 && <PLRow label="Comissões"   value={`− ${formatCurrency(plannedCommissions)}`} indent negative />}
                <div className="my-2 border-t border-dashed border-slate-100" />
                <PLRow
                  label="Resultado estimado"
                  value={`${plannedMonthlyProfit >= 0 ? '+' : ''}${formatCurrency(plannedMonthlyProfit)}`}
                  bold positive={plannedMonthlyProfit >= 0} negative={plannedMonthlyProfit < 0}
                />
                <PLRow label="Margem planeada" value={formatPercent(plannedMarginPct)} muted />
              </div>
            ) : (
              <p className="text-xs text-slate-400">Sem plano para {selectedYear}.</p>
            )}
          </div>

          {goalCalc && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Actividade Comercial Necessária</p>
              <div className="space-y-3">
                {[
                  { label: 'Leads/mês',      value: formatNumber(goalCalc.leadsPerMonth) },
                  { label: 'Reuniões/mês',   value: formatNumber(goalCalc.meetingsPerMonth) },
                  { label: 'Propostas/mês',  value: formatNumber(goalCalc.proposalsPerMonth) },
                  { label: 'Clientes recorrentes', value: formatNumber(goalCalc.recurringClientsNeeded) },
                  { label: 'Comerciais nec.', value: `${goalCalc.salesPeopleNeeded.toFixed(1)}` },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{item.label}</span>
                    <span className="text-xs font-bold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── REAL P&L + PIPELINE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Real P&L */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <SectionTitle title={`P&L Real — ${selectedYear}`} sub={monthsWithData > 0 ? `${monthsWithData} meses com dados` : 'Sem dados inseridos'} />
          {monthsWithData > 0 ? (
            <div>
              <PLRow label="Receita Real Acumulada"  value={formatCurrency(totalActualRevenue)} bold />
              {annualGoal > 0 && <PLRow label="Meta YTD" value={formatCurrency(monthlyGoal * monthsWithData)} muted indent />}
              <PLRow label="Custos Reais Acumulados" value={`− ${formatCurrency(totalActualCosts)}`} negative indent />
              <PLRow
                label={totalActualProfit >= 0 ? 'Resultado Líquido' : 'Resultado (Prejuízo)'}
                value={`${totalActualProfit >= 0 ? '+' : ''}${formatCurrency(totalActualProfit)}`}
                bold positive={totalActualProfit >= 0} negative={totalActualProfit < 0}
              />
              <div className="my-3 border-t border-dashed border-slate-100" />
              <PLRow label="Margem líquida real" value={formatPercent(actualMarginPct)} />
              {annualGoal > 0 && (
                <PLRow
                  label="Desvio vs plano"
                  value={`${dev >= 0 ? '+' : ''}${dev.toFixed(1)}%`}
                  positive={dev >= 0} negative={dev < 0}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sem resultados para {selectedYear}</p>
              <p className="text-xs mt-1">
                <Link href="/resultados" className="text-indigo-500 underline">Ir a Resultados Reais →</Link>
              </p>
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <SectionTitle title="Pipeline Comercial" sub="Oportunidades por fase" />
          {pipelineByStage.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipelineByStage} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={82} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, name: any) => [name === 'Valor' ? `${v}k€` : String(v), name ?? '']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="Oportunidades" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sem oportunidades no pipeline</p>
              <p className="text-xs mt-1">
                <Link href="/pipeline" className="text-indigo-500 underline">Ir a Pipeline →</Link>
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Pipeline total</p>
              <p className="text-base font-bold text-slate-900">{formatCurrency(totalPipeline)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${monthlyGoal > 0 ? (weightedPipeline >= monthlyGoal ? 'bg-emerald-50' : 'bg-amber-50') : 'bg-indigo-50'}`}>
              <p className="text-xs text-slate-500">Valor ponderado</p>
              <p className={`text-base font-bold ${monthlyGoal > 0 ? (weightedPipeline >= monthlyGoal ? 'text-emerald-700' : 'text-amber-700') : 'text-indigo-700'}`}>
                {formatCurrency(weightedPipeline)}
              </p>
              {monthlyGoal > 0 && (
                <p className="text-[10px] text-slate-400 mt-0.5">meta/mês: {formatCurrency(monthlyGoal)}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── RECOMMENDATIONS ── */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <SectionTitle title="Recomendações" sub="Geradas automaticamente com base nos dados atuais" />
          <div className="space-y-3">
            {recommendations.slice(0, 5).map((rec, i) => {
              const colors = {
                danger:  'bg-red-50 border-red-200 text-red-700',
                warning: 'bg-amber-50 border-amber-200 text-amber-700',
                info:    'bg-blue-50 border-blue-200 text-blue-700',
                success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
              };
              const icons = {
                danger:  <XCircle className="w-4 h-4 flex-shrink-0" />,
                warning: <AlertCircle className="w-4 h-4 flex-shrink-0" />,
                info:    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />,
                success: <CheckCircle2 className="w-4 h-4 flex-shrink-0" />,
              };
              const cls  = colors[rec.type as keyof typeof colors] ?? colors.info;
              const icon = icons[rec.type as keyof typeof icons]   ?? icons.info;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${cls}`}>
                  {icon}
                  <div>
                    <p className="text-sm font-semibold">{rec.title}</p>
                    <p className="text-xs mt-0.5 opacity-80">{rec.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
