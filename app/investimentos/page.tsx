'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { calculateInvestmentCalculations, calculateLoanPayment, formatCurrency, formatPercent } from '@/lib/financialCalculations';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import DecisionBadge from '@/components/shared/DecisionBadge';
import type { Investment, Assumptions } from '@/lib/types';
import { Plus, TrendingUp, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const CATEGORIES: { value: Investment['category']; label: string }[] = [
  { value: 'team', label: 'Equipa' },
  { value: 'technology', label: 'Tecnologia' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'infrastructure', label: 'Infraestrutura' },
  { value: 'product', label: 'Produto' },
  { value: 'market_expansion', label: 'Expansão de Mercado' },
  { value: 'other', label: 'Outro' },
];

const CAT_LABELS: Record<Investment['category'], string> = {
  team: 'Equipa', technology: 'Tecnologia', marketing: 'Marketing',
  infrastructure: 'Infraestrutura', product: 'Produto', market_expansion: 'Expansão', other: 'Outro',
};

function InvestmentCard({ investment, assumptions, onRemove }: {
  investment: Investment;
  assumptions: Assumptions;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const calc = useMemo(() => calculateInvestmentCalculations(investment, assumptions), [investment, assumptions]);

  const cashFlowChartData = calc.cashFlowAccumulated.map((v, i) => ({
    month: `M${i + 1}`,
    value: Math.round(v / 1000),
  }));

  const paybackOk = isFinite(calc.paybackMonths);

  // Financing impact
  const isActive = investment.status === 'in_progress' || investment.status === 'approved';
  const hasFinancing = investment.financedAmount > 0;
  const finalRate = assumptions.baseInterestRate + assumptions.spread;
  const loanTermMonths = 60; // default 5 years
  const monthlyInstallment = hasFinancing
    ? calculateLoanPayment(investment.financedAmount, finalRate, loanTermMonths)
    : 0;
  const requiredRevenueForInstallment = hasFinancing && assumptions.grossMargin > 0
    ? monthlyInstallment / assumptions.grossMargin
    : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <p className="font-semibold text-slate-900">{investment.name}</p>
            <StatusBadge status={investment.status} />
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{CAT_LABELS[investment.category]}</span>
          </div>
          <p className="text-sm text-slate-500 line-clamp-1">{investment.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <DecisionBadge decision={calc.decision} />
          <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-5 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-500">Investimento Inicial</p>
          <p className="text-sm font-semibold text-slate-900">{formatCurrency(investment.initialInvestment)}</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
          <p className="text-xs text-slate-500">ROI Anual</p>
          <p className="text-sm font-semibold text-emerald-700">{formatPercent(calc.roi)}</p>
        </div>
        <div className={`p-3 rounded-lg ${paybackOk ? 'bg-indigo-50 border border-indigo-100' : 'bg-red-50 border border-red-100'}`}>
          <p className="text-xs text-slate-500">Payback</p>
          <p className={`text-sm font-semibold ${paybackOk ? 'text-indigo-700' : 'text-red-600'}`}>
            {paybackOk ? `${calc.paybackMonths} meses` : '∞'}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-500">NPV</p>
          <p className={`text-sm font-semibold ${calc.npv >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(calc.npv)}
          </p>
        </div>
      </div>

      {/* Financing alert — always visible when active + financed */}
      {isActive && hasFinancing && (
        <div className="mx-5 mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Impacto do Financiamento nas Vendas</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-slate-500">Valor Financiado</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(investment.financedAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Prestação Mensal</p>
              <p className="text-sm font-bold text-amber-700">{formatCurrency(monthlyInstallment)}</p>
              <p className="text-xs text-slate-400">a {((finalRate) * 100).toFixed(2)}% · {loanTermMonths}m</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Vendas extras necessárias/mês</p>
              <p className="text-sm font-bold text-red-700">{formatCurrency(requiredRevenueForInstallment)}</p>
              <p className="text-xs text-slate-400">para cobrir a prestação com {formatPercent(assumptions.grossMargin)} de margem</p>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="border-t border-slate-100 p-5 bg-slate-50">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Investimento Líquido', value: formatCurrency(calc.netInvestment) },
              { label: 'Receita Incremental/Ano', value: formatCurrency(calc.annualIncrementalRevenue) },
              { label: 'Poupança Anual', value: formatCurrency(calc.annualSavings) },
              { label: 'EBITDA Incremental/Ano', value: formatCurrency(calc.annualEBITDA) },
              { label: 'Múltiplo de Retorno', value: `${calc.returnMultiple.toFixed(2)}×` },
              { label: 'Nível de Risco', value: investment.riskLevel === 'low' ? 'Baixo' : investment.riskLevel === 'medium' ? 'Médio' : 'Alto' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className="text-sm font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          {cashFlowChartData.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-slate-100">
              <p className="text-xs font-semibold text-slate-600 mb-3">Cash Flow Acumulado (k€)</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={cashFlowChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: unknown) => [`${v}k€`, 'Cash Flow']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddInvestmentModal({ onAdd, onClose }: { onAdd: (i: Investment) => void; onClose: () => void }) {
  const [form, setForm] = useState<Partial<Investment>>({
    name: '',
    category: 'technology',
    description: '',
    initialInvestment: 10000,
    subsidyAmount: 0,
    financedAmount: 0,
    ownCapital: 10000,
    expectedMonthlyRevenue: 0,
    expectedMonthlySavings: 0,
    monthlyOperatingCosts: 0,
    startDate: new Date().toISOString().split('T')[0],
    durationMonths: 24,
    riskLevel: 'medium',
    status: 'analysis',
    notes: '',
  });

  function handleSubmit() {
    if (!form.name) return;
    onAdd({ ...form, id: `inv-${Date.now()}` } as Investment);
    onClose();
  }

  const setF = (key: string, value: unknown) => setForm(p => ({ ...p, [key]: value }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Novo Investimento</h2>
        </div>
        <div className="p-6 space-y-4">
          {[
            { key: 'name', label: 'Nome do Investimento', type: 'text' },
            { key: 'description', label: 'Descrição', type: 'text' },
            { key: 'initialInvestment', label: 'Investimento Inicial (€)', type: 'number' },
            { key: 'subsidyAmount', label: 'Subsídio/Apoio Recebido (€)', type: 'number' },
            { key: 'financedAmount', label: 'Valor Financiado (€)', type: 'number' },
            { key: 'expectedMonthlyRevenue', label: 'Receita Esperada/Mês (€)', type: 'number' },
            { key: 'expectedMonthlySavings', label: 'Poupança Esperada/Mês (€)', type: 'number' },
            { key: 'monthlyOperatingCosts', label: 'Custos Operacionais/Mês (€)', type: 'number' },
            { key: 'durationMonths', label: 'Duração Prevista (meses)', type: 'number' },
            { key: 'startDate', label: 'Data de Início', type: 'date' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
              <input
                type={f.type}
                value={(form as Record<string, unknown>)[f.key] as string ?? ''}
                onChange={e => setF(f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
            <select value={form.category} onChange={e => setF('category', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Risco</label>
            <select value={form.riskLevel} onChange={e => setF('riskLevel', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="low">Baixo</option>
              <option value="medium">Médio</option>
              <option value="high">Alto</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
            <select value={form.status} onChange={e => setF('status', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="idea">Ideia</option>
              <option value="analysis">Em Análise</option>
              <option value="approved">Aprovado</option>
              <option value="in_progress">Em Execução</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">Criar Investimento</button>
        </div>
      </div>
    </div>
  );
}

export default function InvestimentosPage() {
  const { assumptions, investments, addInvestment, removeInvestment } = useAppStore();
  const [showModal, setShowModal] = useState(false);

  const totalInvestment = investments.reduce((s, i) => s + i.initialInvestment, 0);
  const avgROI = useMemo(() => {
    if (!investments.length) return 0;
    return investments.reduce((s, i) => s + calculateInvestmentCalculations(i, assumptions).roi, 0) / investments.length;
  }, [investments, assumptions]);

  return (
    <div>
      <PageHeader
        title="Investimentos"
        description="Analise o ROI, payback e NPV de cada investimento antes de tomar decisões."
        badge={`${investments.length} investimentos`}
      >
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          Novo Investimento
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Investimento Total Planeado</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalInvestment)}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs text-slate-500 mb-1">ROI Médio dos Investimentos</p>
          <p className="text-2xl font-bold text-emerald-700">{formatPercent(avgROI)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Número de Investimentos</p>
          <p className="text-2xl font-bold text-slate-900">{investments.length}</p>
        </div>
      </div>

      {investments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum investimento criado</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            Criar Primeiro Investimento
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {investments.map(inv => (
            <InvestmentCard key={inv.id} investment={inv} assumptions={assumptions} onRemove={() => removeInvestment(inv.id)} />
          ))}
        </div>
      )}

      {showModal && <AddInvestmentModal onAdd={addInvestment} onClose={() => setShowModal(false)} />}
    </div>
  );
}
