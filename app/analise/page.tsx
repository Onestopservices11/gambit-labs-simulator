'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  calculateCompanyBreakEven,
  calculateRunway,
  calculateCustomerLTV,
  calculateRiskScore,
  calculateSensitivity,
  calculateGrowthTrajectory,
  calculateEmployeeCalculations,
  calculateLoanPayment,
  formatCurrency,
  formatPercent,
} from '@/lib/financialCalculations';
import PageHeader from '@/components/shared/PageHeader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LineChart, Line,
} from 'recharts';
import {
  ShieldCheck, ShieldAlert, ShieldX, Flame, TrendingUp,
  Clock, Users, Target, AlertTriangle, CheckCircle2, Info,
} from 'lucide-react';

// ── Risk gauge ───────────────────────────────────────────────────────────────

function RiskGauge({ score }: { score: number }) {
  const level = score >= 70 ? 'low' : score >= 50 ? 'medium' : score >= 30 ? 'high' : 'critical';
  const cfg = {
    low:      { label: 'Baixo',    color: 'text-emerald-600', bg: 'bg-emerald-100', fill: '#10b981', Icon: ShieldCheck },
    medium:   { label: 'Médio',    color: 'text-amber-600',   bg: 'bg-amber-100',   fill: '#f59e0b', Icon: ShieldAlert },
    high:     { label: 'Alto',     color: 'text-orange-600',  bg: 'bg-orange-100',  fill: '#f97316', Icon: ShieldX },
    critical: { label: 'Crítico',  color: 'text-red-600',     bg: 'bg-red-100',     fill: '#ef4444', Icon: Flame },
  }[level];
  const { Icon } = cfg;

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl ${cfg.bg}`}>
      <Icon className={`w-8 h-8 ${cfg.color} flex-shrink-0`} />
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Risco Global</p>
        <p className={`text-3xl font-black ${cfg.color}`}>{score.toFixed(0)}<span className="text-lg">/100</span></p>
        <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
      </div>
    </div>
  );
}

function FactorBar({ name, score, status, note }: { name: string; score: number; status: string; note: string }) {
  const color = status === 'good' ? '#10b981' : status === 'warn' ? '#f59e0b' : '#ef4444';
  const textColor = status === 'good' ? 'text-emerald-700' : status === 'warn' ? 'text-amber-700' : 'text-red-600';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-700">{name}</span>
        <span className={`text-sm font-bold ${textColor}`}>{score.toFixed(0)}/100</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <p className="text-xs text-slate-400">{note}</p>
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">{icon}</div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function KpiCard({ label, value, sub, color = 'text-slate-900', bg = 'bg-white' }: {
  label: string; value: string; sub?: string; color?: string; bg?: string;
}) {
  return (
    <div className={`${bg} rounded-xl border border-slate-200 p-4`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnaliseFinanceiraPage() {
  const {
    assumptions, employees, investments, pipeline, monthlyResults,
    fixedCostItems, freelancers, yearPlans,
  } = useAppStore();

  // Current year plan or assumptions goal
  const currentYear = new Date().getFullYear();
  const currentYearPlan = yearPlans.find(y => y.year === currentYear);
  const annualGoal = currentYearPlan?.revenueTarget ?? assumptions.annualRevenueGoal;
  const monthlyGoal = annualGoal / 12;

  // Current monthly revenue from last 3 results avg
  const recentResults = [...monthlyResults].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 3);
  const currentMonthlyRevenue = recentResults.length > 0
    ? recentResults.reduce((s, r) => s + r.actualRevenue, 0) / recentResults.length
    : monthlyGoal * 0.8;

  // Fixed costs total
  const fixedCostItemsTotal = fixedCostItems.reduce((s, i) => s + i.amount, 0);
  const monthlyDebtService = investments
    .filter(i => (i.status === 'in_progress' || i.status === 'approved') && i.financedAmount > 0)
    .reduce((s, inv) => s + calculateLoanPayment(inv.financedAmount, assumptions.baseInterestRate + assumptions.spread, 60), 0);

  const activeEmps = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const monthlySalaries = activeEmps.reduce((s, e) => s + calculateEmployeeCalculations(e, assumptions).annualizedMonthlyCost, 0);
  const monthlyFreelancers = freelancers.filter(f => f.status === 'active' || f.status === 'planned').reduce((s, f) => s + f.monthlyCost, 0);
  const fixedBase = fixedCostItemsTotal > 0 ? fixedCostItemsTotal : assumptions.monthlyFixedCosts;
  const totalMonthlyFixed = monthlySalaries + monthlyFreelancers + fixedBase + monthlyDebtService;

  // ── Calculations ─────────────────────────────────────────────────────────
  const breakEven = useMemo(() => calculateCompanyBreakEven(
    assumptions, employees, freelancers, fixedCostItemsTotal, monthlyDebtService, currentMonthlyRevenue
  ), [assumptions, employees, freelancers, fixedCostItemsTotal, monthlyDebtService, currentMonthlyRevenue]);

  const risk = useMemo(() => calculateRiskScore(
    assumptions, employees, pipeline, monthlyResults, currentMonthlyRevenue, totalMonthlyFixed
  ), [assumptions, employees, pipeline, monthlyResults, currentMonthlyRevenue, totalMonthlyFixed]);

  const sensitivity = useMemo(() => calculateSensitivity(assumptions), [assumptions]);

  // Growth: from current annualized to goal
  const currentAnnual = currentMonthlyRevenue * 12;
  const growth = useMemo(() => calculateGrowthTrajectory(
    currentAnnual, annualGoal, assumptions.annualGrowthRate, 5
  ), [currentAnnual, annualGoal, assumptions.annualGrowthRate]);

  // Runway state
  const [cashBalance, setCashBalance] = useState(0);
  const runway = useMemo(() => calculateRunway(cashBalance, currentMonthlyRevenue, totalMonthlyFixed),
    [cashBalance, currentMonthlyRevenue, totalMonthlyFixed]);

  // LTV state
  const [monthlyChurnRate, setMonthlyChurnRate] = useState(0.05);
  const [cac, setCac] = useState(500);
  const ltv = useMemo(() => calculateCustomerLTV(
    assumptions.averageMonthlyRecurringRevenue, monthlyChurnRate, cac, assumptions.grossMargin
  ), [assumptions.averageMonthlyRecurringRevenue, monthlyChurnRate, cac, assumptions.grossMargin]);

  // Growth chart data
  const growthChartData = [
    { year: 'Atual', receita: Math.round(currentAnnual / 1000), meta: Math.round(annualGoal / 1000) },
    ...growth.yearByYear.map(y => ({
      year: String(y.year),
      receita: Math.round(y.revenue / 1000),
      meta: Math.round(annualGoal / 1000),
    })),
  ];

  // Sensitivity chart
  const sensitivityChartData = sensitivity.map(s => ({
    name: s.variable.length > 25 ? s.variable.slice(0, 25) + '…' : s.variable,
    fullName: s.variable,
    downside: Math.round(s.revenueImpactLow / 1000),
    upside: Math.round(s.revenueImpactHigh / 1000),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análise Financeira"
        description="Break-even, runway, risco, sensibilidade e trajetória de crescimento."
      />

      {/* ── 1. RISK SCORE ─────────────────────────────────────────────────── */}
      <Section title="Score de Risco" icon={<ShieldAlert className="w-4 h-4" />}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <RiskGauge score={risk.overallScore} />
            <div className={`p-3 rounded-xl text-sm font-medium ${
              risk.level === 'low' ? 'bg-emerald-50 text-emerald-800' :
              risk.level === 'medium' ? 'bg-amber-50 text-amber-800' :
              'bg-red-50 text-red-800'
            }`}>
              {risk.topRisk}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            {risk.factors.map((f, i) => (
              <FactorBar key={i} name={f.name} score={f.score} status={f.status} note={f.note} />
            ))}
          </div>
        </div>
      </Section>

      {/* ── 2. BREAK-EVEN ─────────────────────────────────────────────────── */}
      <Section title="Break-Even da Empresa" icon={<Target className="w-4 h-4" />}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Break-Even Mensal"
            value={formatCurrency(breakEven.breakEvenMonthlyRevenue)}
            sub="mínimo para cobrir todos os custos"
            color={currentMonthlyRevenue >= breakEven.breakEvenMonthlyRevenue ? 'text-emerald-700' : 'text-red-600'}
          />
          <KpiCard
            label="Break-Even Anual"
            value={formatCurrency(breakEven.breakEvenAnnualRevenue)}
            sub={`Meta anual: ${formatCurrency(annualGoal)}`}
          />
          <KpiCard
            label="Margem de Segurança"
            value={`${(breakEven.safetyMargin * 100).toFixed(1)}%`}
            sub="receita acima do break-even"
            color={breakEven.safetyMargin > 0.2 ? 'text-emerald-700' : breakEven.safetyMargin > 0 ? 'text-amber-700' : 'text-red-600'}
            bg={breakEven.safetyMargin > 0.2 ? 'bg-emerald-50' : breakEven.safetyMargin > 0 ? 'bg-amber-50' : 'bg-red-50'}
          />
          <KpiCard
            label="Rácio de Cobertura"
            value={`${breakEven.coverageRatio.toFixed(2)}×`}
            sub={breakEven.coverageRatio >= 1 ? 'acima do break-even' : 'abaixo do break-even'}
            color={breakEven.coverageRatio >= 1.2 ? 'text-emerald-700' : breakEven.coverageRatio >= 1 ? 'text-amber-700' : 'text-red-600'}
          />
        </div>

        {/* Breakdown dos custos fixos */}
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Composição dos Custos Fixos Mensais</p>
          <div className="space-y-2">
            {[
              { label: 'Salários + encargos', value: monthlySalaries },
              { label: 'Freelancers', value: monthlyFreelancers },
              { label: 'Custos fixos operacionais', value: fixedBase },
              { label: 'Serviço de dívida', value: monthlyDebtService },
            ].filter(r => r.value > 0).map((row, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-48 flex-shrink-0">{row.label}</span>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full"
                    style={{ width: `${(row.value / totalMonthlyFixed) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-800 w-28 text-right">{formatCurrency(row.value)}</span>
                <span className="text-xs text-slate-400 w-10 text-right">{((row.value / totalMonthlyFixed) * 100).toFixed(0)}%</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-800">Total (break-even a {formatPercent(assumptions.grossMargin)} margem)</span>
              <span className="text-sm font-bold text-indigo-700">{formatCurrency(breakEven.breakEvenMonthlyRevenue)}/mês</span>
            </div>
          </div>
        </div>

        {breakEven.monthsToBreakEven !== null && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <strong>Ao crescimento atual ({formatPercent(assumptions.annualGrowthRate)}/ano):</strong> atingirá o break-even em ~{breakEven.monthsToBreakEven} meses.
          </div>
        )}
      </Section>

      {/* ── 3. RUNWAY ─────────────────────────────────────────────────────── */}
      <Section title="Cash Runway" icon={<Clock className="w-4 h-4" />}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Saldo de caixa atual (€)</label>
              <p className="text-xs text-slate-400 mb-2">Insere o cash disponível em conta.</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                <input
                  type="number" min={0} step={1000}
                  value={cashBalance || ''}
                  placeholder="0"
                  onChange={e => setCashBalance(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-slate-200 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className={`p-4 rounded-xl border-2 ${
              runway.isOperationallyPositive ? 'bg-emerald-50 border-emerald-300' :
              runway.runwayMonths < 6 ? 'bg-red-50 border-red-300' :
              'bg-amber-50 border-amber-300'
            }`}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Diagnóstico</p>
              <p className={`text-sm font-semibold ${
                runway.isOperationallyPositive ? 'text-emerald-800' :
                runway.runwayMonths < 6 ? 'text-red-800' : 'text-amber-800'
              }`}>{runway.recommendation}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Burn Rate Mensal" value={formatCurrency(runway.monthlyBurn)} sub="custos − receita" color={runway.monthlyBurn > 0 ? 'text-red-600' : 'text-emerald-700'} />
            <KpiCard
              label="Runway"
              value={runway.runwayMonths === Infinity ? '∞' : `${runway.runwayMonths.toFixed(1)} meses`}
              sub={runway.isOperationallyPositive ? 'operacionalmente positivo' : `até ${runway.criticalDate}`}
              color={runway.runwayMonths === Infinity || runway.runwayMonths > 12 ? 'text-emerald-700' : runway.runwayMonths > 6 ? 'text-amber-700' : 'text-red-600'}
            />
            <KpiCard label="Receita Mensal (média)" value={formatCurrency(currentMonthlyRevenue)} sub="últimos 3 meses" />
            <KpiCard label="Custos Fixos Mensais" value={formatCurrency(totalMonthlyFixed)} sub="equipa + fixos + dívida" />
          </div>
        </div>
      </Section>

      {/* ── 4. LTV ────────────────────────────────────────────────────────── */}
      <Section title="Lifetime Value do Cliente (LTV)" icon={<Users className="w-4 h-4" />}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Churn mensal (%)</label>
                <p className="text-xs text-slate-400 mb-1">% clientes que cancelam/mês</p>
                <div className="flex items-center gap-2">
                  <input type="range" min={0.5} max={20} step={0.5}
                    value={monthlyChurnRate * 100}
                    onChange={e => setMonthlyChurnRate(parseFloat(e.target.value) / 100)}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="text-sm font-bold text-slate-700 w-12 text-right">{(monthlyChurnRate * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">CAC (€)</label>
                <p className="text-xs text-slate-400 mb-1">Custo de aquisição por cliente</p>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                  <input type="number" min={0} step={50}
                    value={cac || ''}
                    placeholder="500"
                    onChange={e => setCac(parseFloat(e.target.value) || 0)}
                    className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-sm font-semibold ${
              ltv.ltvCacRatio >= 3 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              ltv.ltvCacRatio >= 1 ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-red-50 border-red-200 text-red-800'
            }`}>
              {ltv.recommendation}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="LTV por Cliente"
              value={formatCurrency(ltv.ltv)}
              sub={`vida média ${ltv.expectedLifetimeMonths.toFixed(0)} meses`}
              color="text-indigo-700"
            />
            <KpiCard
              label="LTV / CAC"
              value={`${ltv.ltvCacRatio.toFixed(1)}×`}
              sub="meta: ≥3×"
              color={ltv.ltvCacRatio >= 3 ? 'text-emerald-700' : ltv.ltvCacRatio >= 1 ? 'text-amber-700' : 'text-red-600'}
              bg={ltv.ltvCacRatio >= 3 ? 'bg-emerald-50' : ltv.ltvCacRatio >= 1 ? 'bg-amber-50' : 'bg-red-50'}
            />
            <KpiCard
              label="Payback do CAC"
              value={ltv.paybackMonths === Infinity ? '∞' : `${ltv.paybackMonths.toFixed(1)} meses`}
              sub="tempo para recuperar aquisição"
            />
            <KpiCard
              label="MRR por Cliente"
              value={formatCurrency(assumptions.averageMonthlyRecurringRevenue)}
              sub="de Pressupostos"
            />
          </div>
        </div>
      </Section>

      {/* ── 5. SENSITIVITY ────────────────────────────────────────────────── */}
      <Section title="Análise de Sensibilidade" icon={<Info className="w-4 h-4" />}>
        <p className="text-xs text-slate-500 mb-4">Impacto na receita anual de uma variação de ±20–30% em cada variável, mantendo tudo o resto constante.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sensitivityChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v > 0 ? '+' : ''}${v}k€`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                formatter={(v: unknown, name: unknown) => { const n = v as number; return [`${n > 0 ? '+' : ''}${n}k€`, name === 'upside' ? 'Cenário +' : 'Cenário −'] as [string, string]; }}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
              <Bar dataKey="downside" name="downside" radius={[0, 4, 4, 0]}>
                {sensitivityChartData.map((_, i) => <Cell key={i} fill="#fca5a5" />)}
              </Bar>
              <Bar dataKey="upside" name="upside" radius={[0, 4, 4, 0]}>
                {sensitivityChartData.map((_, i) => <Cell key={i} fill="#6ee7b7" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="space-y-3">
            {sensitivity.map((s, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-bold text-slate-700 mb-2">{s.variable}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Cenário −</p>
                    <p className="text-xs font-bold text-red-700">{formatCurrency(s.revenueImpactLow)}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Base</p>
                    <p className="text-xs font-bold text-slate-700">{formatCurrency(s.revenueAtBase)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2">
                    <p className="text-xs text-slate-500">Cenário +</p>
                    <p className="text-xs font-bold text-emerald-700">+{formatCurrency(s.revenueImpactHigh)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 6. GROWTH TRAJECTORY ──────────────────────────────────────────── */}
      <Section title="Trajetória de Crescimento" icon={<TrendingUp className="w-4 h-4" />}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="CAGR Necessário para Meta"
            value={formatPercent(growth.cagr)}
            sub={`para atingir ${formatCurrency(annualGoal)}/ano em 5 anos`}
            color={growth.cagr <= assumptions.annualGrowthRate ? 'text-emerald-700' : 'text-amber-700'}
          />
          <KpiCard
            label="Anos para a Meta"
            value={growth.yearsToGoal <= 0 ? 'Já atingido' : `${growth.yearsToGoal.toFixed(1)} anos`}
            sub={`ao crescimento atual de ${formatPercent(assumptions.annualGrowthRate)}/ano`}
            color={growth.yearsToGoal <= 5 ? 'text-emerald-700' : 'text-amber-700'}
          />
          <KpiCard
            label="Receita Atual Anualizada"
            value={formatCurrency(currentAnnual)}
            sub="média dos últimos meses × 12"
          />
          <KpiCard
            label="Tempo para Duplicar"
            value={growth.doubleTime === Infinity ? '∞' : `${growth.doubleTime.toFixed(0)} meses`}
            sub={`à taxa de ${formatPercent(assumptions.annualGrowthRate)}/ano`}
          />
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={growthChartData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}k`} />
            <Tooltip formatter={(v: unknown) => [`${v}k€`]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <ReferenceLine y={Math.round(annualGoal / 1000)} stroke="#6366f1" strokeDasharray="4 4"
              label={{ value: 'Meta', position: 'right', fontSize: 10, fill: '#6366f1' }} />
            <Line dataKey="receita" name="Receita Projetada" type="monotone" stroke="#10b981" strokeWidth={2.5}
              dot={{ r: 4, fill: '#10b981' }} />
            <Line dataKey="meta" name="Meta Anual" type="monotone" stroke="#6366f1" strokeWidth={1.5}
              strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-xs font-bold text-slate-500">Ano</th>
                <th className="text-right py-2 px-3 text-xs font-bold text-slate-500">Receita Projetada</th>
                <th className="text-right py-2 px-3 text-xs font-bold text-slate-500">vs Meta</th>
                <th className="text-right py-2 px-3 text-xs font-bold text-slate-500">Crescimento</th>
                <th className="text-right py-2 px-3 text-xs font-bold text-slate-500">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {growth.yearByYear.map((y, i) => {
                const prev = i === 0 ? currentAnnual : growth.yearByYear[i - 1].revenue;
                const growthPct = prev > 0 ? ((y.revenue - prev) / prev) * 100 : 0;
                const vsGoal = (y.revenue / annualGoal) * 100;
                return (
                  <tr key={y.year} className="border-b border-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-800">{y.year}</td>
                    <td className={`py-2 px-3 text-right font-bold ${y.revenue >= annualGoal ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {formatCurrency(y.revenue)}
                    </td>
                    <td className={`py-2 px-3 text-right text-xs font-semibold ${vsGoal >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {vsGoal.toFixed(0)}%
                    </td>
                    <td className="py-2 px-3 text-right text-xs text-slate-500">+{growthPct.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right text-xs text-slate-500">{formatCurrency(y.cumulative)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {growth.yearsToGoal > 5 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Ao crescimento atual de <strong>{formatPercent(assumptions.annualGrowthRate)}/ano</strong>, demorará <strong>{growth.yearsToGoal.toFixed(1)} anos</strong> a atingir a meta.
              Para chegar em 5 anos, precisas de crescer <strong>{formatPercent(growth.cagr)}/ano</strong>.
              Ajusta o crescimento em <a href="/pressupostos" className="underline font-semibold">Pressupostos</a>.
            </p>
          </div>
        )}

        {growth.yearsToGoal <= 0 && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800">A receita atual já supera a meta anual definida. Considera aumentar a meta em <a href="/planeamento" className="underline font-semibold">Planeamento</a>.</p>
          </div>
        )}
      </Section>
    </div>
  );
}
