'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  formatCurrency, formatPercent,
  calculateEmployeeCalculations, calculateLoanPayment,
} from '@/lib/financialCalculations';
import type { YearPlan, TaxConfig } from '@/lib/types';
import SaveBar from '@/components/shared/SaveBar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  ChevronDown, ChevronUp, Settings, Calendar,
  Users, Wrench, TrendingUp, AlertTriangle, Info,
  ArrowRight, Lock,
} from 'lucide-react';

// ─── Tax helpers ──────────────────────────────────────────────────────────────
function calcIRC(ebit: number, tax: TaxConfig) {
  if (ebit <= 0) return 0;
  if (tax.isPME) {
    return Math.min(ebit, tax.ircReducedThreshold) * tax.ircReducedRate
         + Math.max(0, ebit - tax.ircReducedThreshold) * tax.ircStandardRate;
  }
  return ebit * tax.ircStandardRate;
}
function calcTA(tax: TaxConfig) {
  return tax.monthlyCarExpenses * 12 * tax.autonomousTaxCarsRate
       + tax.monthlyRepresentationExpenses * 12 * tax.autonomousTaxRepresentationRate
       + tax.monthlyMealsAboveLimit * 12 * tax.autonomousTaxMealsRate;
}

// ─── Auto P&L (all costs from store) ─────────────────────────────────────────
function computePL(
  plan: YearPlan,
  tax: TaxConfig,
  assumptions: ReturnType<typeof useAppStore.getState>['assumptions'],
  employees: ReturnType<typeof useAppStore.getState>['employees'],
  investments: ReturnType<typeof useAppStore.getState>['investments'],
  fixedCostItems: ReturnType<typeof useAppStore.getState>['fixedCostItems'],
  freelancers: ReturnType<typeof useAppStore.getState>['freelancers'],
) {
  const rev = plan.revenueTarget;

  // No direct delivery costs — team is internal, all revenue = gross profit
  const directCosts = 0;
  const grossProfit = rev;

  // Team cost — from actual employees (annualized) + planned extra headcount
  const activeEmps = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const rawBaseTeamCost = activeEmps.reduce((s, e) => {
    return s + calculateEmployeeCalculations(e, assumptions).annualizedMonthlyCost;
  }, 0) * 12;
  const salaryGrowthFactor = 1 + (plan.salaryGrowthPct ?? 0) / 100;
  const baseTeamCost = rawBaseTeamCost * salaryGrowthFactor;

  const extraTeamCost = plan.extraHeadcount > 0
    ? plan.extraHeadcount * plan.avgExtraSalary
        * (1 + assumptions.employerSocialSecurityRate)
        * assumptions.monthsPaidPerYear
    : 0;
  const teamCost = baseTeamCost + extraTeamCost;

  // Fixed costs — itemized Custos Fixos page, or override, or Pressupostos fallback
  const baseFixedMonthly = fixedCostItems.length > 0
    ? fixedCostItems.reduce((s, i) => s + i.amount, 0)
    : assumptions.monthlyFixedCosts;
  const fixedCosts = plan.fixedCostsOverride > 0
    ? plan.fixedCostsOverride
    : baseFixedMonthly * 12;

  // Freelancer costs (active + planned)
  const freelancerCost = freelancers
    .filter(f => f.status === 'active' || f.status === 'planned')
    .reduce((s, f) => s + f.monthlyCost, 0) * 12;

  // Commissions — override per year, or sum of per-employee rates
  const autoCommissionRate = activeEmps.reduce((s, e) => s + e.variableCommission / 100, 0);
  const effectiveCommissionRate = plan.commissionRateOverride > 0
    ? plan.commissionRateOverride / 100
    : autoCommissionRate;
  const commissions = rev * effectiveCommissionRate;

  // Debt service — from linked investments financing + existing active financings
  const rate = assumptions.baseInterestRate + assumptions.spread;
  const debtService = plan.linkedInvestmentIds.reduce((s, id) => {
    const inv = investments.find(i => i.id === id);
    if (!inv || inv.financedAmount <= 0) return s;
    return s + calculateLoanPayment(inv.financedAmount, rate, 60) * 12;
  }, 0);

  const investmentOpex = plan.linkedInvestmentIds.reduce((s, id) => {
    const inv = investments.find(i => i.id === id);
    return inv ? s + inv.monthlyOperatingCosts * 12 : s;
  }, 0);
  const investmentCapex = plan.linkedInvestmentIds.reduce((s, id) => {
    const inv = investments.find(i => i.id === id);
    return inv ? s + inv.initialInvestment : s;
  }, 0);

  const ebitda = grossProfit - teamCost - freelancerCost - fixedCosts - commissions - debtService - investmentOpex;
  const ta     = calcTA(tax);
  const ebit   = ebitda - ta;
  const irc    = calcIRC(ebit, tax);
  const derrama = ebit > 0 ? ebit * tax.derramaRate : 0;
  const netProfit = ebit - irc - derrama;
  const netMarginPct = rev > 0 ? netProfit / rev : 0;
  const freeCash = netProfit - investmentCapex;
  const ivaCollected = rev * tax.ivaRate;

  return {
    rev, directCosts, grossProfit,
    teamCost, rawBaseTeamCost, baseTeamCost, extraTeamCost, freelancerCost, fixedCosts,
    commissions, effectiveCommissionRate, autoCommissionRate,
    debtService, investmentOpex, investmentCapex,
    ebitda, ta, ebit, irc, derrama,
    netProfit, netMarginPct, freeCash, ivaCollected,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PLRow({ label, value, bold, indent, sub, green, red, separator }: {
  label: string; value: string; bold?: boolean; indent?: boolean;
  sub?: string; green?: boolean; red?: boolean; separator?: boolean;
}) {
  return (
    <>
      {separator && <div className="my-2 border-t border-slate-200" />}
      <div className={`flex items-center justify-between py-2 border-b border-slate-50 last:border-0 ${indent ? 'pl-4 border-l-2 border-l-slate-100' : ''} ${bold ? 'bg-slate-50 px-2 rounded-lg' : ''}`}>
        <div>
          <span className={`text-sm ${bold ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{label}</span>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <span className={`text-sm tabular-nums font-semibold ${bold ? 'text-base' : ''} ${green ? 'text-emerald-600' : red ? 'text-red-500' : 'text-slate-800'}`}>
          {value}
        </span>
      </div>
    </>
  );
}

function AutoTag() {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
      <Lock className="w-2.5 h-2.5" /> Auto
    </span>
  );
}

function SourceRow({ label, source, value }: { label: string; source: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <div>
        <span className="text-sm text-slate-700">{label}</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="text-xs text-slate-400">{source}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-800">{value}</span>
        <AutoTag />
      </div>
    </div>
  );
}

function InputField({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className="w-40">{children}</div>
    </div>
  );
}

function PctToggle({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={0} max={100} step={0.5}
        value={+(value * 100).toFixed(1)}
        onChange={e => onChange(parseFloat(e.target.value) / 100)}
        className="flex-1 accent-indigo-600"
      />
      <div className="relative w-16">
        <input type="number" min={0} max={100} step={0.5}
          value={+(value * 100).toFixed(1)}
          onChange={e => onChange((parseFloat(e.target.value) || 0) / 100)}
          className="w-full pl-2 pr-5 py-1.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
      </div>
    </div>
  );
}

// ─── defaults ─────────────────────────────────────────────────────────────────
function defaultPlan(year: number, annualGoal: number): YearPlan {
  return {
    year,
    revenueTarget: annualGoal,
    extraHeadcount: 0,
    avgExtraSalary: 1500,
    fixedCostsOverride: 0,
    commissionRateOverride: 0,
    salaryGrowthPct: 0,
    linkedInvestmentIds: [],
    notes: '',
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PlaneamentoPage() {
  const { assumptions, employees, investments, freelancers, fixedCostItems, taxConfig, yearPlans, updateTaxConfig, setYearPlan } = useAppStore();

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3, currentYear + 4];

  const [localTax, setLocalTax]     = useState<TaxConfig>({ ...taxConfig });
  const [localPlans, setLocalPlans] = useState<Record<number, YearPlan>>(() => {
    const map: Record<number, YearPlan> = {};
    years.forEach(y => {
      map[y] = yearPlans.find(p => p.year === y) ?? defaultPlan(y, assumptions.annualRevenueGoal);
    });
    return map;
  });

  const [taxOpen, setTaxOpen]   = useState(false);
  const [activeYear, setActiveYear] = useState(currentYear);

  const isDirty = useMemo(() => {
    if (JSON.stringify(localTax) !== JSON.stringify(taxConfig)) return true;
    return years.some(y => {
      const saved = yearPlans.find(p => p.year === y) ?? defaultPlan(y, assumptions.annualRevenueGoal);
      return JSON.stringify(localPlans[y]) !== JSON.stringify(saved);
    });
  }, [localTax, taxConfig, localPlans, yearPlans, years, assumptions.annualRevenueGoal]);

  function handleSave() {
    updateTaxConfig(localTax);
    years.forEach(y => setYearPlan(localPlans[y]));
  }
  function handleDiscard() {
    setLocalTax({ ...taxConfig });
    const map: Record<number, YearPlan> = {};
    years.forEach(y => { map[y] = yearPlans.find(p => p.year === y) ?? defaultPlan(y, assumptions.annualRevenueGoal); });
    setLocalPlans(map);
  }

  function setPlan(year: number, patch: Partial<YearPlan>) {
    setLocalPlans(prev => ({ ...prev, [year]: { ...prev[year], ...patch } }));
  }

  const plResults = useMemo(() =>
    Object.fromEntries(years.map(y => [y, computePL(localPlans[y], localTax, assumptions, employees, investments, fixedCostItems, freelancers)])),
    [localPlans, localTax, assumptions, employees, investments, fixedCostItems, freelancers, years]
  );

  const chartData = years.map(y => ({
    year: String(y),
    Receita:          Math.round(plResults[y].rev / 1000),
    EBITDA:           Math.round(plResults[y].ebitda / 1000),
    'Lucro Líquido':  Math.round(plResults[y].netProfit / 1000),
    'Cash Livre':     Math.round(plResults[y].freeCash / 1000),
  }));

  const activePlan = localPlans[activeYear];
  const pl         = plResults[activeYear];

  const activeEmps = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const availableInvestments = investments.filter(i => i.status !== 'cancelled' && i.status !== 'completed');

  // Commission breakdown per employee
  const commissionBreakdown = activeEmps
    .filter(e => e.variableCommission > 0)
    .map(e => ({
      name: e.name,
      role: e.role,
      rate: e.variableCommission,
      amount: activePlan.revenueTarget * (e.variableCommission / 100),
    }));

  return (
    <div className="pb-24 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Planeamento 5 Anos</h1>
        <p className="text-sm text-slate-500 mt-1">
          Define a meta de receita — todos os custos são calculados automaticamente a partir das tuas definições.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Users className="w-4 h-4 text-indigo-600" />, title: 'Custos de Equipa', sub: 'Vêm de Contratações', desc: 'Salários + SS patronal + subsídios + ferramentas, calculados por colaborador.' },
          { icon: <Wrench className="w-4 h-4 text-emerald-600" />, title: 'Custos Fixos', sub: 'Vêm de Pressupostos', desc: 'Rendas, utilities, seguros e outros custos fixos mensais definidos em Pressupostos.' },
          { icon: <TrendingUp className="w-4 h-4 text-amber-600" />, title: 'Comissões', sub: 'Vêm de Contratações', desc: 'Percentagem por colaborador definida em Contratações → aplicada sobre a receita.' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">{item.icon}</div>
            <div>
              <p className="text-sm font-bold text-slate-900">{item.title}</p>
              <p className="text-xs font-medium text-indigo-600 mt-0.5">{item.sub}</p>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── FISCAL CONFIG ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <button onClick={() => setTaxOpen(o => !o)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Settings className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">Configuração Fiscal</p>
              <p className="text-xs text-slate-500">IRC {localTax.isPME ? `PME ${formatPercent(localTax.ircReducedRate)}/${formatPercent(localTax.ircStandardRate)}` : formatPercent(localTax.ircStandardRate)} · Derrama {formatPercent(localTax.derramaRate)} · IVA {formatPercent(localTax.ivaRate)}</p>
            </div>
          </div>
          {taxOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {taxOpen && (
          <div className="border-t border-slate-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* IRC */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">IRC</p>
              <div className="space-y-0 divide-y divide-slate-50">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-slate-700">Regime PME</p>
                    <p className="text-xs text-slate-400">Taxa reduzida nos primeiros {formatCurrency(localTax.ircReducedThreshold)}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={localTax.isPME} onChange={e => setLocalTax(p => ({ ...p, isPME: e.target.checked }))} className="sr-only peer" />
                    <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
                {localTax.isPME && (
                  <div className="py-3">
                    <p className="text-xs text-slate-600 mb-2">Taxa reduzida PME</p>
                    <PctToggle value={localTax.ircReducedRate} onChange={v => setLocalTax(p => ({ ...p, ircReducedRate: v }))} />
                  </div>
                )}
                <div className="py-3">
                  <p className="text-xs text-slate-600 mb-2">Taxa normal</p>
                  <PctToggle value={localTax.ircStandardRate} onChange={v => setLocalTax(p => ({ ...p, ircStandardRate: v }))} />
                </div>
                <div className="py-3">
                  <p className="text-xs text-slate-600 mb-2">Derrama municipal (máx. 1,5%)</p>
                  <PctToggle value={localTax.derramaRate} onChange={v => setLocalTax(p => ({ ...p, derramaRate: v }))} />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-slate-700">Pagamentos por conta</p>
                    <p className="text-xs text-slate-400">Adiantamentos trimestrais IRC</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={localTax.pagamentosPorConta} onChange={e => setLocalTax(p => ({ ...p, pagamentosPorConta: e.target.checked }))} className="sr-only peer" />
                    <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
              </div>
            </div>

            {/* IVA */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">IVA</p>
              <div className="divide-y divide-slate-50">
                <div className="py-3">
                  <p className="text-xs text-slate-600 mb-2">Taxa IVA</p>
                  <PctToggle value={localTax.ivaRate} onChange={v => setLocalTax(p => ({ ...p, ivaRate: v }))} />
                </div>
                <div className="flex items-center justify-between py-3">
                  <p className="text-sm text-slate-700">Periodicidade</p>
                  <select value={localTax.ivaFrequency}
                    onChange={e => setLocalTax(p => ({ ...p, ivaFrequency: e.target.value as 'monthly' | 'quarterly' }))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="monthly">Mensal</option>
                    <option value="quarterly">Trimestral</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
                O IVA é cobrado ao cliente e entregue à AT. Não é custo da empresa — aparece no cash flow mas não no P&L.
              </div>
            </div>

            {/* Tributações autónomas */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Tributações Autónomas</p>
              <div className="divide-y divide-slate-50">
                <div className="py-3">
                  <p className="text-xs text-slate-600 mb-1">Gastos c/ viaturas/mês</p>
                  <p className="text-xs text-slate-400 mb-2">Taxa: <span className="font-semibold">{formatPercent(localTax.autonomousTaxCarsRate)}</span></p>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                    <input type="number" min={0} step={100}
                      value={localTax.monthlyCarExpenses || ''}
                      onChange={e => setLocalTax(p => ({ ...p, monthlyCarExpenses: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="py-3">
                  <p className="text-xs text-slate-600 mb-1">Gastos representação/mês</p>
                  <p className="text-xs text-slate-400 mb-2">Taxa: <span className="font-semibold">{formatPercent(localTax.autonomousTaxRepresentationRate)}</span></p>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                    <input type="number" min={0} step={100}
                      value={localTax.monthlyRepresentationExpenses || ''}
                      onChange={e => setLocalTax(p => ({ ...p, monthlyRepresentationExpenses: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="py-3">
                  <p className="text-xs text-slate-600 mb-1">Refeições acima limite/mês</p>
                  <p className="text-xs text-slate-400 mb-2">Taxa: <span className="font-semibold">{formatPercent(localTax.autonomousTaxMealsRate)}</span></p>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                    <input type="number" min={0} step={50}
                      value={localTax.monthlyMealsAboveLimit || ''}
                      onChange={e => setLocalTax(p => ({ ...p, monthlyMealsAboveLimit: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
              {calcTA(localTax) > 0 && (
                <div className="mt-3 p-3 bg-amber-50 rounded-xl text-xs text-amber-700 font-medium">
                  Total trib. autónomas/ano: {formatCurrency(calcTA(localTax))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── YEAR TABS ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {years.map(y => {
            const p = plResults[y];
            const isActive = y === activeYear;
            return (
              <button key={y} onClick={() => setActiveYear(y)}
                className={`flex-1 px-2 py-3 text-center transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
                <p className="text-sm font-bold">{y}</p>
                <p className={`text-xs mt-0.5 ${isActive ? 'text-indigo-200' : p.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(p.netProfit)}
                </p>
              </button>
            );
          })}
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── LEFT: only revenue + optional adjustments ── */}
          <div className="space-y-6">

            {/* Revenue — only editable field */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">Meta de Receita — {activeYear}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Único valor que defines. Tudo o resto é calculado.</p>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                <input type="number" step={10000} min={0}
                  value={activePlan.revenueTarget || ''}
                  onChange={e => setPlan(activeYear, { revenueTarget: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-indigo-200 text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Auto-calculated costs — read only display */}
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Custos calculados automaticamente</p>

              <SourceRow
                label="Equipa"
                source={[
                  `${activeEmps.length} colaboradores em Contratações`,
                  (activePlan.salaryGrowthPct ?? 0) > 0 ? `+${activePlan.salaryGrowthPct}% aumentos` : null,
                  activePlan.extraHeadcount > 0 ? `+${activePlan.extraHeadcount} novos` : null,
                ].filter(Boolean).join(' · ')}
                value={formatCurrency(pl.teamCost) + '/ano'}
              />
              <SourceRow
                label="Custos fixos"
                source={fixedCostItems.length > 0 ? `Custos Fixos (${fixedCostItems.length} rúbricas)` : 'Pressupostos'}
                value={formatCurrency(fixedCostItems.length > 0
                  ? fixedCostItems.reduce((s, i) => s + i.amount, 0)
                  : assumptions.monthlyFixedCosts) + '/mês'}
              />
              <SourceRow
                label="Comissões"
                source={activePlan.commissionRateOverride > 0
                  ? `Override: ${activePlan.commissionRateOverride}% (definido acima)`
                  : commissionBreakdown.length > 0
                    ? `${commissionBreakdown.length} colaborador(es) · auto ${(pl.autoCommissionRate * 100).toFixed(1)}%`
                    : 'Nenhuma definida — configura acima'}
                value={formatCurrency(pl.commissions) + '/ano'}
              />
            </div>

            {/* Team adjustments — salary growth + extra headcount */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Equipa — {activeYear}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Base atual: {formatCurrency(pl.rawBaseTeamCost)}/ano
                  {(activePlan.salaryGrowthPct ?? 0) > 0 && (
                    <span className="text-indigo-600 font-semibold"> → com aumentos: {formatCurrency(pl.baseTeamCost)}/ano</span>
                  )}
                </p>
              </div>

              {/* Salary growth */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Aumento salarial vs hoje (%)
                </label>
                <div className="flex gap-2 items-center">
                  <input type="range" min={0} max={30} step={0.5}
                    value={activePlan.salaryGrowthPct ?? 0}
                    onChange={e => setPlan(activeYear, { salaryGrowthPct: parseFloat(e.target.value) || 0 })}
                    className="flex-1 accent-indigo-600"
                  />
                  <div className="relative w-20 flex-shrink-0">
                    <input type="number" min={0} max={50} step={0.5}
                      value={activePlan.salaryGrowthPct ?? 0}
                      onChange={e => setPlan(activeYear, { salaryGrowthPct: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-2 pr-6 py-1.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                  </div>
                </div>
                {(activePlan.salaryGrowthPct ?? 0) > 0 && (
                  <p className="text-xs text-indigo-600 mt-1">
                    +{formatCurrency(pl.baseTeamCost - pl.rawBaseTeamCost)}/ano de aumentos salariais
                  </p>
                )}
              </div>

              {/* Extra headcount */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Novas Contratações</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nº de pessoas</label>
                    <input type="number" min={0} step={1}
                      value={activePlan.extraHeadcount || ''}
                      placeholder="0"
                      onChange={e => setPlan(activeYear, { extraHeadcount: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Bruto médio/mês (€)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                      <input type="number" min={0} step={100}
                        value={activePlan.avgExtraSalary || ''}
                        placeholder="1500"
                        onChange={e => setPlan(activeYear, { avgExtraSalary: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                {activePlan.extraHeadcount > 0 && (
                  <div className="flex justify-between text-xs bg-indigo-50 rounded-lg px-3 py-2">
                    <span className="text-slate-600">{activePlan.extraHeadcount} pessoa(s) × {formatCurrency(activePlan.avgExtraSalary)}/mês c/ SS</span>
                    <span className="font-bold text-indigo-700">{formatCurrency(pl.extraTeamCost)}/ano</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-700">Custo Total Equipa {activeYear}</span>
                <span className="text-sm font-bold text-indigo-700">{formatCurrency(pl.teamCost)}/ano</span>
              </div>
            </div>

            {/* Commissions override */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">Comissões — {activeYear}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Auto: {formatPercent(pl.autoCommissionRate)} sobre receita
                    {commissionBreakdown.length > 0 ? ` (${commissionBreakdown.length} colaborador(es))` : ' (nenhum definido)'}
                  </p>
                </div>
                {activePlan.commissionRateOverride > 0 && (
                  <button
                    onClick={() => setPlan(activeYear, { commissionRateOverride: 0 })}
                    className="text-xs text-indigo-600 hover:underline"
                  >Repor auto</button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Taxa de comissão para {activeYear} (%)
                </label>
                <div className="relative">
                  <input type="number" min={0} max={50} step={0.5}
                    value={activePlan.commissionRateOverride > 0
                      ? +(activePlan.commissionRateOverride).toFixed(2)
                      : ''}
                    placeholder={`0 (auto: ${(pl.autoCommissionRate * 100).toFixed(1)}%)`}
                    onChange={e => setPlan(activeYear, { commissionRateOverride: parseFloat(e.target.value) || 0 })}
                    className="w-full pr-8 pl-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {activePlan.commissionRateOverride > 0
                    ? `Override ativo: ${formatPercent(pl.effectiveCommissionRate)} → ${formatCurrency(pl.commissions)}/ano`
                    : 'Deixa em 0 para usar as taxas por colaborador de Contratações'}
                </p>
              </div>

              {commissionBreakdown.length > 0 && activePlan.commissionRateOverride === 0 && (
                <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                  {commissionBreakdown.map((c, i) => (
                    <div key={i} className="flex justify-between text-xs text-slate-500">
                      <span>{c.name} — {c.rate}%</span>
                      <span className="font-medium">{formatCurrency(c.amount)}/ano</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold text-slate-700 border-t border-slate-200 pt-1 mt-1">
                    <span>Total comissões</span>
                    <span>{formatCurrency(pl.commissions)}/ano</span>
                  </div>
                </div>
              )}
            </div>

            {/* Override fixed costs */}
            <div>
              <p className="text-sm font-bold text-slate-900 mb-1">Override Custos Fixos <span className="text-xs font-normal text-slate-400">(opcional)</span></p>
              <p className="text-xs text-slate-400 mb-2">Deixa em 0 para usar {formatCurrency(assumptions.monthlyFixedCosts)}/mês dos Pressupostos.</p>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                <input type="number" min={0} step={500}
                  value={activePlan.fixedCostsOverride || ''}
                  placeholder={`0 (usa ${formatCurrency(assumptions.monthlyFixedCosts * 12)}/ano)`}
                  onChange={e => setPlan(activeYear, { fixedCostsOverride: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Linked investments */}
            <div>
              <p className="text-sm font-bold text-slate-900 mb-1">Investimentos neste ano</p>
              <p className="text-xs text-slate-400 mb-3">CAPEX, OPEX e dívida dos investimentos selecionados entram automaticamente na DR.</p>
              {availableInvestments.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl">Sem investimentos. Vai a <strong>Investimentos</strong> para criar.</p>
              ) : (
                <div className="space-y-2">
                  {availableInvestments.map(inv => {
                    const linked = activePlan.linkedInvestmentIds.includes(inv.id);
                    return (
                      <label key={inv.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${linked ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={linked}
                          onChange={e => {
                            const ids = e.target.checked
                              ? [...activePlan.linkedInvestmentIds, inv.id]
                              : activePlan.linkedInvestmentIds.filter(id => id !== inv.id);
                            setPlan(activeYear, { linkedInvestmentIds: ids });
                          }}
                          className="mt-0.5 accent-indigo-600"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{inv.name}</p>
                          <p className="text-xs text-slate-500">
                            CAPEX: {formatCurrency(inv.initialInvestment)}
                            {inv.financedAmount > 0 && ` · Financiado: ${formatCurrency(inv.financedAmount)}`}
                            {inv.monthlyOperatingCosts > 0 && ` · OPEX: ${formatCurrency(inv.monthlyOperatingCosts)}/mês`}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Notas</label>
              <textarea value={activePlan.notes} onChange={e => setPlan(activeYear, { notes: e.target.value })}
                rows={2} placeholder="Premissas e contexto..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* ── RIGHT: Auto P&L ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Demonstração de Resultados — {activeYear}</p>
                <p className="text-xs text-slate-400 mt-0.5">Calculada automaticamente. Não é editável.</p>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-semibold">Auto</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <PLRow label="Receita" value={formatCurrency(pl.rev)} bold />

              <PLRow label="Custos de Equipa" value={`− ${formatCurrency(pl.teamCost)}`}
                sub={[
                  `${activeEmps.length} colaboradores`,
                  (activePlan.salaryGrowthPct ?? 0) > 0 ? `+${activePlan.salaryGrowthPct}% aumentos` : null,
                  pl.extraTeamCost > 0 ? `+${activePlan.extraHeadcount} novas contratações` : null,
                ].filter(Boolean).join(' · ')}
                red indent />
              {pl.freelancerCost > 0 && (
                <PLRow label="Freelancers" value={`− ${formatCurrency(pl.freelancerCost)}`}
                  sub={`${freelancers.filter(f => f.status === 'active' || f.status === 'planned').length} freelancer(s) · de Freelancers`}
                  red indent />
              )}
              <PLRow label="Custos Fixos" value={`− ${formatCurrency(pl.fixedCosts)}`}
                sub={fixedCostItems.length > 0
                  ? `${fixedCostItems.length} rúbrica(s) · de Custos Fixos${activePlan.fixedCostsOverride > 0 ? ' (override)' : ''}`
                  : `de Pressupostos${activePlan.fixedCostsOverride > 0 ? ' (override)' : ''}`}
                red indent />
              {pl.commissions > 0 && (
                <PLRow label="Comissões" value={`− ${formatCurrency(pl.commissions)}`}
                  sub={activePlan.commissionRateOverride > 0
                    ? `Override: ${activePlan.commissionRateOverride}% sobre ${formatCurrency(pl.rev)}`
                    : `${(pl.effectiveCommissionRate * 100).toFixed(1)}% · ${commissionBreakdown.length} colaborador(es)`}
                  red indent />
              )}
              {pl.debtService > 0 && (
                <PLRow label="Serviço de Dívida" value={`− ${formatCurrency(pl.debtService)}`}
                  sub="Financiamento dos investimentos" red indent />
              )}
              {pl.investmentOpex > 0 && (
                <PLRow label="OPEX Investimentos" value={`− ${formatCurrency(pl.investmentOpex)}`} red indent />
              )}

              <PLRow label="EBITDA" value={formatCurrency(pl.ebitda)} bold
                green={pl.ebitda > 0} red={pl.ebitda < 0} separator />

              {pl.ta > 0 && (
                <PLRow label="Tributações Autónomas" value={`− ${formatCurrency(pl.ta)}`}
                  sub="Viaturas, representação, refeições" red indent />
              )}
              <PLRow label="EBIT (base tributável)" value={formatCurrency(pl.ebit)} bold />

              {localTax.isPME ? (
                <PLRow label={`IRC PME (${formatPercent(localTax.ircReducedRate)} / ${formatPercent(localTax.ircStandardRate)})`}
                  value={`− ${formatCurrency(pl.irc)}`}
                  sub={`Taxa reduzida nos primeiros ${formatCurrency(localTax.ircReducedThreshold)}`}
                  red={pl.irc > 0} indent />
              ) : (
                <PLRow label={`IRC (${formatPercent(localTax.ircStandardRate)})`}
                  value={`− ${formatCurrency(pl.irc)}`} red={pl.irc > 0} indent />
              )}
              {pl.derrama > 0 && (
                <PLRow label={`Derrama (${formatPercent(localTax.derramaRate)})`}
                  value={`− ${formatCurrency(pl.derrama)}`} red indent />
              )}

              <div className="my-2 border-t-2 border-slate-300" />
              <PLRow label="Lucro Líquido" value={formatCurrency(pl.netProfit)}
                sub={`margem: ${formatPercent(pl.netMarginPct)}`}
                bold green={pl.netProfit > 0} red={pl.netProfit < 0} />

              {pl.investmentCapex > 0 && (
                <PLRow label="CAPEX Investimentos" value={`− ${formatCurrency(pl.investmentCapex)}`} red indent />
              )}
              <PLRow label="💰 Cash Livre" value={formatCurrency(pl.freeCash)}
                bold green={pl.freeCash > 0} red={pl.freeCash < 0} />

              <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                <PLRow label="IVA cobrado ao mercado" value={formatCurrency(pl.ivaCollected)}
                  sub={`${formatPercent(localTax.ivaRate)} — entregue à AT, não é custo`} />
              </div>
            </div>

            {pl.freeCash < 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">O plano para {activeYear} resulta em cash negativo. Aumenta a meta de receita ou reduz custos/investimentos.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CHART ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Projeção 5 Anos</p>
        <p className="text-xs text-slate-400 mb-5">Valores em k€ · Custos sempre atualizados a partir das definições</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}k`} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${v}k€`]}
              contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey="Receita"        fill="#e0e7ff" radius={[4,4,0,0]} />
            <Bar dataKey="EBITDA"         fill="#6366f1" radius={[4,4,0,0]} />
            <Bar dataKey="Lucro Líquido"  fill="#10b981" radius={[4,4,0,0]} />
            <Bar dataKey="Cash Livre"     fill="#f59e0b" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── SUMMARY TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Resumo Comparativo 5 Anos</p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
            <Lock className="w-3 h-3" /> Calculado automaticamente
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase">Rubrica</th>
                {years.map(y => <th key={y} className="text-right px-4 py-3 text-xs font-bold text-slate-700 min-w-[110px]">{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Receita',         key: 'rev',       bold: true },
                { label: 'Margem Bruta',    key: 'grossProfit' },
                { label: 'Equipa',          key: 'teamCost',  neg: true },
                { label: 'Fixos',           key: 'fixedCosts',neg: true },
                { label: 'Comissões',       key: 'commissions', neg: true },
                { label: 'EBITDA',          key: 'ebitda',    bold: true },
                { label: 'IRC + Derrama',   key: '_tax',      neg: true },
                { label: 'Lucro Líquido',   key: 'netProfit', bold: true },
                { label: 'Cash Livre',      key: 'freeCash',  bold: true },
              ].map((row, ri) => (
                <tr key={row.label} className={`border-b border-slate-50 ${ri % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                  <td className={`px-6 py-3 ${row.bold ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{row.label}</td>
                  {years.map(y => {
                    const p = plResults[y];
                    const val = row.key === '_tax' ? p.irc + p.derrama : (p as Record<string, number>)[row.key] ?? 0;
                    const disp = row.neg ? `− ${formatCurrency(Math.abs(val))}` : formatCurrency(val);
                    return (
                      <td key={y} className={`text-right px-4 py-3 tabular-nums ${row.bold ? 'font-bold' : 'font-medium'} ${val < 0 ? 'text-red-500' : row.bold && val > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {disp}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SaveBar isDirty={isDirty} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
}
