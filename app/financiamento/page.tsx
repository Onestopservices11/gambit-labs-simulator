'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { calculateLoanPayment, formatCurrency, formatPercent } from '@/lib/financialCalculations';
import PageHeader from '@/components/shared/PageHeader';
import type { Financing } from '@/lib/types';
import { Plus, Trash2, Banknote, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Calculations ─────────────────────────────────────────────────────────────
function calcFinancing(f: Financing) {
  const finalRate = f.baseInterestRate + f.spread;
  const effectiveMonths = f.termMonths - f.capitalGracePeriodMonths;
  const monthlyInstallment = calculateLoanPayment(f.financedAmount, finalRate, effectiveMonths);
  const graceCost = f.financedAmount * (finalRate / 12) * f.capitalGracePeriodMonths;
  const totalPaid = monthlyInstallment * effectiveMonths + graceCost;
  const totalInterest = totalPaid - f.financedAmount;
  return { finalRate, monthlyInstallment, totalPaid, totalInterest, graceCost };
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function FinancingModal({ existing, onSave, onClose }: {
  existing?: Financing;
  onSave: (f: Financing) => void;
  onClose: () => void;
}) {
  const { assumptions } = useAppStore();
  const isEdit = !!existing;

  const [form, setForm] = useState<Financing>(existing ?? {
    id: '',
    name: '',
    financedAmount: 30000,
    termMonths: 60,
    baseInterestRate: assumptions.baseInterestRate,
    spread: assumptions.spread,
    capitalGracePeriodMonths: 0,
    paymentType: 'constant_installment',
  });

  const set = (key: keyof Financing) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const calc = calcFinancing(form);
  const canSave = form.name.trim().length > 0 && form.financedAmount > 0;

  function handleSubmit() {
    if (!canSave) return;
    onSave({ ...form, id: existing?.id ?? `fin-${Date.now()}` });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Editar Financiamento' : 'Novo Financiamento'}</h2>
          <p className="text-sm text-slate-500">Os valores ficam guardados e impactam o P&L automaticamente.</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nome / Descrição</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="ex: Empréstimo BPI equipamento"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'financedAmount' as const, label: 'Valor Financiado (€)', step: 1000, min: 0 },
              { key: 'termMonths' as const, label: 'Prazo (meses)', step: 6, min: 6 },
              { key: 'capitalGracePeriodMonths' as const, label: 'Carência de Capital (meses)', step: 1, min: 0 },
            ].map(f => (
              <div key={f.key} className={f.key === 'financedAmount' ? 'col-span-2' : ''}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
                <input
                  type="number"
                  value={form[f.key] as number}
                  step={f.step}
                  min={f.min}
                  onChange={set(f.key)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Taxa Base (%)</label>
              <input
                type="number"
                value={+(form.baseInterestRate * 100).toFixed(3)}
                step={0.1}
                min={0}
                onChange={e => setForm(prev => ({ ...prev, baseInterestRate: (parseFloat(e.target.value) || 0) / 100 }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Spread (%)</label>
              <input
                type="number"
                value={+(form.spread * 100).toFixed(3)}
                step={0.1}
                min={0}
                onChange={e => setForm(prev => ({ ...prev, spread: (parseFloat(e.target.value) || 0) / 100 }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Prestação</label>
            <select
              value={form.paymentType}
              onChange={set('paymentType')}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="constant_installment">Prestação Constante (sistema francês)</option>
              <option value="constant_amortization">Amortização Constante (sistema alemão)</option>
            </select>
          </div>

          {/* Preview */}
          <div className="bg-indigo-600 rounded-xl p-4 text-white space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200 mb-3">Simulação</p>
            <div className="flex justify-between text-xs text-indigo-200">
              <span>Taxa Final</span>
              <span className="font-semibold text-white">{formatPercent(calc.finalRate)}/ano</span>
            </div>
            <div className="flex justify-between text-xs text-indigo-200">
              <span>Prestação Mensal</span>
              <span className="text-xl font-bold text-white">{formatCurrency(calc.monthlyInstallment)}</span>
            </div>
            <div className="flex justify-between text-xs text-indigo-200">
              <span>Total de Juros</span>
              <span className="font-semibold text-amber-300">{formatCurrency(calc.totalInterest)}</span>
            </div>
            <div className="flex justify-between text-xs text-indigo-200 border-t border-indigo-500 pt-2 mt-1">
              <span>Total a Pagar</span>
              <span className="font-semibold text-white">{formatCurrency(calc.totalPaid)}</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={!canSave}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? 'Guardar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Financing Card ───────────────────────────────────────────────────────────
function FinancingCard({ financing, onEdit, onRemove }: {
  financing: Financing;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const calc = calcFinancing(financing);
  const effortRate = financing.financedAmount > 0 ? (calc.monthlyInstallment / financing.financedAmount) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Banknote className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{financing.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatCurrency(financing.financedAmount)} · {financing.termMonths} meses · Taxa {formatPercent(calc.finalRate)}/ano
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-indigo-700">{formatCurrency(calc.monthlyInstallment)}/mês</p>
            <p className="text-xs text-slate-400">prestação</p>
          </div>
          <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-500" title="Editar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Remover">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="px-5 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-500">Prestação Mensal</p>
          <p className="text-sm font-bold text-indigo-700">{formatCurrency(calc.monthlyInstallment)}</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
          <p className="text-xs text-slate-500">Total de Juros</p>
          <p className="text-sm font-bold text-amber-700">{formatCurrency(calc.totalInterest)}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-500">Total a Pagar</p>
          <p className="text-sm font-bold text-slate-900">{formatCurrency(calc.totalPaid)}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-500">Prazo Efetivo</p>
          <p className="text-sm font-bold text-slate-900">{financing.termMonths - financing.capitalGracePeriodMonths} meses</p>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 p-5 bg-slate-50">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Valor Financiado', value: formatCurrency(financing.financedAmount) },
              { label: 'Taxa Base', value: formatPercent(financing.baseInterestRate) },
              { label: 'Spread', value: formatPercent(financing.spread) },
              { label: 'Taxa Final', value: `${formatPercent(calc.finalRate)}/ano` },
              { label: 'Carência', value: financing.capitalGracePeriodMonths > 0 ? `${financing.capitalGracePeriodMonths} meses` : 'Sem carência' },
              { label: 'Custo dos Juros/Faturação', value: `${effortRate.toFixed(1)}%` },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className="text-sm font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FinanciamentoPage() {
  const { financings, addFinancing, updateFinancing, removeFinancing } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingFinancing = editingId ? financings.find(f => f.id === editingId) : undefined;

  const totalMonthlyDebt = financings.reduce((s, f) => s + calcFinancing(f).monthlyInstallment, 0);
  const totalFinanced = financings.reduce((s, f) => s + f.financedAmount, 0);
  const totalInterest = financings.reduce((s, f) => s + calcFinancing(f).totalInterest, 0);

  return (
    <div>
      <PageHeader
        title="Financiamento"
        description="Registe os financiamentos bancários da empresa. As prestações mensais são deduzidas automaticamente no P&L."
        badge={`${financings.length} financiamento(s)`}
      >
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Financiamento
        </button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Serviço da Dívida / Mês</p>
          <p className="text-2xl font-bold text-indigo-700">{formatCurrency(totalMonthlyDebt)}</p>
          <p className="text-xs text-slate-400 mt-1">Soma de todas as prestações mensais</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Total Financiado</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalFinanced)}</p>
          <p className="text-xs text-slate-400 mt-1">Capital total em dívida</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Total de Juros (vida do empréstimo)</p>
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalInterest)}</p>
          <p className="text-xs text-slate-400 mt-1">Custo total do dinheiro</p>
        </div>
      </div>

      {/* List */}
      {financings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <Banknote className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum financiamento registado</p>
          <p className="text-slate-400 text-sm mb-4">Adicione um financiamento para simular o impacto no P&L.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Adicionar Financiamento
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {financings.map(f => (
            <FinancingCard
              key={f.id}
              financing={f}
              onEdit={() => setEditingId(f.id)}
              onRemove={() => removeFinancing(f.id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <FinancingModal
          onSave={addFinancing}
          onClose={() => setShowModal(false)}
        />
      )}

      {editingFinancing && (
        <FinancingModal
          existing={editingFinancing}
          onSave={(updated) => { updateFinancing(updated.id, updated); setEditingId(null); }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
