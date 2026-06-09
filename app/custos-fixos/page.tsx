'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/lib/financialCalculations';
import PageHeader from '@/components/shared/PageHeader';
import type { FixedCostItem } from '@/lib/types';
import { Plus, Trash2, Pencil, Building2, Zap, Shield, BookOpen, Monitor, Megaphone, MoreHorizontal, Check, X } from 'lucide-react';

const CATEGORIES: { value: FixedCostItem['category']; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'rent',       label: 'Renda / Espaço',       icon: <Building2 className="w-4 h-4" />,    color: 'text-blue-600 bg-blue-50' },
  { value: 'utilities',  label: 'Utilities',             icon: <Zap className="w-4 h-4" />,          color: 'text-yellow-600 bg-yellow-50' },
  { value: 'insurance',  label: 'Seguros',               icon: <Shield className="w-4 h-4" />,       color: 'text-emerald-600 bg-emerald-50' },
  { value: 'accounting', label: 'Contabilidade',         icon: <BookOpen className="w-4 h-4" />,     color: 'text-indigo-600 bg-indigo-50' },
  { value: 'software',   label: 'Software / Licenças',   icon: <Monitor className="w-4 h-4" />,      color: 'text-purple-600 bg-purple-50' },
  { value: 'marketing',  label: 'Marketing',             icon: <Megaphone className="w-4 h-4" />,    color: 'text-pink-600 bg-pink-50' },
  { value: 'other',      label: 'Outros',                icon: <MoreHorizontal className="w-4 h-4" />, color: 'text-slate-600 bg-slate-100' },
];

function getCat(cat: FixedCostItem['category']) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

function InlineForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: FixedCostItem;
  onSave: (item: Omit<FixedCostItem, 'id'>) => void;
  onCancel: () => void;
}) {
  const [label, setLabel]       = useState(initial?.label ?? '');
  const [amount, setAmountStr]  = useState(String(initial?.amount ?? ''));
  const [category, setCategory] = useState<FixedCostItem['category']>(initial?.category ?? 'other');

  function handleSave() {
    const a = parseFloat(amount);
    if (!label.trim() || isNaN(a) || a <= 0) return;
    onSave({ label: label.trim(), amount: a, category });
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
      <input
        autoFocus
        type="text"
        placeholder="Descrição (ex: Renda escritório)"
        value={label}
        onChange={e => setLabel(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <select
        value={category}
        onChange={e => setCategory(e.target.value as FixedCostItem['category'])}
        className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <div className="relative w-36">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
        <input
          type="number"
          placeholder="0"
          value={amount}
          min={0}
          step={10}
          onChange={e => setAmountStr(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 flex items-center gap-1">
          <Check className="w-4 h-4" />
          {initial ? 'Guardar' : 'Adicionar'}
        </button>
        <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 flex items-center gap-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function CustosFixosPage() {
  const { assumptions, fixedCostItems, addFixedCostItem, updateFixedCostItem, removeFixedCostItem } = useAppStore();
  const [adding, setAdding]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const totalFromItems = fixedCostItems.reduce((s, i) => s + i.amount, 0);
  const effectiveTotal = fixedCostItems.length > 0 ? totalFromItems : assumptions.monthlyFixedCosts;

  // Group by category for summary
  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    items: fixedCostItems.filter(i => i.category === cat.value),
    total: fixedCostItems.filter(i => i.category === cat.value).reduce((s, i) => s + i.amount, 0),
  })).filter(c => c.items.length > 0);

  function handleAdd(data: Omit<FixedCostItem, 'id'>) {
    addFixedCostItem({ ...data, id: `fc-${Date.now()}` });
    setAdding(false);
  }

  function handleUpdate(id: string, data: Omit<FixedCostItem, 'id'>) {
    updateFixedCostItem(id, data);
    setEditingId(null);
  }

  return (
    <div>
      <PageHeader
        title="Custos Fixos"
        description="Despesas mensais recorrentes independentes da faturação. Alimentam automaticamente o P&L em Comissões e Planeamento."
        badge={`${formatCurrency(effectiveTotal)}/mês`}
      >
        <button
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Custo
        </button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-1">
          <p className="text-xs text-slate-500 mb-1">Total Mensal</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(effectiveTotal)}</p>
          <p className="text-xs text-slate-400 mt-1">{fixedCostItems.length} rúbrica(s)</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Total Anual</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(effectiveTotal * 12)}</p>
          <p className="text-xs text-slate-400 mt-1">× 12 meses</p>
        </div>
        {byCategory.slice(0, 2).map(cat => (
          <div key={cat.value} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${cat.color}`}>
              {cat.icon}
              <span>{cat.label}</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(cat.total)}</p>
            <p className="text-xs text-slate-400 mt-1">{cat.items.length} item(s)</p>
          </div>
        ))}
      </div>

      {/* No items — show fallback info */}
      {fixedCostItems.length === 0 && !adding && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm font-semibold text-amber-800">A usar valor global dos Pressupostos</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Sem rubricas definidas aqui, o P&L usa {formatCurrency(assumptions.monthlyFixedCosts)}/mês de Pressupostos.
            Adiciona rubricas para teres o detalhe completo.
          </p>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="mb-4">
          <InlineForm onSave={handleAdd} onCancel={() => setAdding(false)} />
        </div>
      )}

      {/* List */}
      {fixedCostItems.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rúbricas</p>
            <p className="text-xs text-slate-400">Mensal</p>
          </div>
          <div className="divide-y divide-slate-50">
            {fixedCostItems.map(item => {
              const cat = getCat(item.category);
              if (editingId === item.id) {
                return (
                  <div key={item.id} className="p-3">
                    <InlineForm
                      initial={item}
                      onSave={(data) => handleUpdate(item.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                );
              }
              return (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-400">{cat.label}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(item.amount)}</p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(item.id); setAdding(false); }}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFixedCostItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Total row */}
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
            <p className="text-sm font-bold text-slate-900">Total</p>
            <p className="text-lg font-bold text-indigo-700">{formatCurrency(totalFromItems)}</p>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {byCategory.length > 1 && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Por Categoria</p>
          <div className="space-y-3">
            {byCategory.map(cat => (
              <div key={cat.value} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                  {cat.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{cat.label}</span>
                    <span className="font-bold text-slate-900">{formatCurrency(cat.total)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${totalFromItems > 0 ? (cat.total / totalFromItems) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-400 w-10 text-right">
                  {totalFromItems > 0 ? ((cat.total / totalFromItems) * 100).toFixed(0) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
