'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { PriceSimulation, PriceSimTeamMember, PriceSimCost, PriceSimStatus } from '@/lib/types';
import PageHeader from '@/components/shared/PageHeader';
import { Plus, Trash2, Pencil, Calculator, Users, Package, Building2, ChevronDown, ChevronUp, Copy, FileText } from 'lucide-react';

const COST_CATEGORIES: { value: PriceSimCost['category']; label: string }[] = [
  { value: 'materials',     label: 'Materiais' },
  { value: 'subcontractor', label: 'Subcontratado' },
  { value: 'travel',        label: 'Deslocações' },
  { value: 'software',      label: 'Software / Licenças' },
  { value: 'other',         label: 'Outro' },
];

const STATUS_LABELS: Record<PriceSimStatus, { label: string; cls: string }> = {
  draft:    { label: 'Rascunho',  cls: 'bg-slate-100 text-slate-600' },
  approved: { label: 'Aprovado',  cls: 'bg-emerald-100 text-emerald-700' },
  sent:     { label: 'Enviado',   cls: 'bg-indigo-100 text-indigo-700' },
};

function fmt(n: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);
}

function calcSim(sim: PriceSimulation, monthlyFixed: number) {
  const labor        = sim.team.reduce((s, m) => s + m.hours * m.hourlyRate, 0);
  const direct       = sim.directCosts.reduce((s, c) => s + c.amount, 0);
  const fixedAlloc   = monthlyFixed * sim.fixedCostPct * sim.fixedCostMonths;
  const totalCost    = labor + direct + fixedAlloc;
  const priceNoIVA   = sim.targetMarginPct < 1 ? totalCost / (1 - sim.targetMarginPct) : totalCost * 2;
  const iva          = sim.applyIVA ? priceNoIVA * 0.23 : 0;
  const priceTotal   = priceNoIVA + iva;
  const margin       = priceNoIVA > 0 ? (priceNoIVA - totalCost) / priceNoIVA : 0;
  const totalHours   = sim.team.reduce((s, m) => s + m.hours, 0);
  return { labor, direct, fixedAlloc, totalCost, priceNoIVA, iva, priceTotal, margin, totalHours };
}

const emptyMember = (): PriceSimTeamMember => ({ id: `m-${Date.now()}`, name: '', role: '', hours: 8, hourlyRate: 50 });
const emptyCost   = (): PriceSimCost => ({ id: `c-${Date.now()}`, label: '', amount: 0, category: 'other' });

function SimModal({
  initial, monthlyFixed, onSave, onClose,
}: {
  initial?: PriceSimulation;
  monthlyFixed: number;
  onSave: (sim: PriceSimulation) => void;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<PriceSimulation>(initial ?? {
    id: `ps-${Date.now()}`,
    name: '',
    client: '',
    description: '',
    createdAt: new Date().toISOString().split('T')[0],
    status: 'draft',
    team: [emptyMember()],
    directCosts: [],
    fixedCostPct: 0.1,
    fixedCostMonths: 1,
    targetMarginPct: 0.35,
    applyIVA: true,
    notes: '',
  });

  const calc = useMemo(() => calcSim(form, monthlyFixed), [form, monthlyFixed]);

  function setField<K extends keyof PriceSimulation>(k: K, v: PriceSimulation[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  function addMember() {
    setForm(p => ({ ...p, team: [...p.team, { ...emptyMember(), id: `m-${Date.now()}` }] }));
  }
  function updateMember(id: string, upd: Partial<PriceSimTeamMember>) {
    setForm(p => ({ ...p, team: p.team.map(m => m.id === id ? { ...m, ...upd } : m) }));
  }
  function removeMember(id: string) {
    setForm(p => ({ ...p, team: p.team.filter(m => m.id !== id) }));
  }

  function addCost() {
    setForm(p => ({ ...p, directCosts: [...p.directCosts, { ...emptyCost(), id: `c-${Date.now()}` }] }));
  }
  function updateCost(id: string, upd: Partial<PriceSimCost>) {
    setForm(p => ({ ...p, directCosts: p.directCosts.map(c => c.id === id ? { ...c, ...upd } : c) }));
  }
  function removeCost(id: string) {
    setForm(p => ({ ...p, directCosts: p.directCosts.filter(c => c.id !== id) }));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Editar Simulação' : 'Nova Simulação de Preço'}</h2>
          <select
            value={form.status}
            onChange={e => setField('status', e.target.value as PriceSimStatus)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Object.entries(STATUS_LABELS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Left — inputs */}
          <div className="lg:col-span-2 p-6 space-y-6 border-r border-slate-100">

            {/* Info básica */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Projeto</label>
                <input value={form.name} onChange={e => setField('name', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: App Mobile XYZ" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente</label>
                <input value={form.client} onChange={e => setField('client', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nome do cliente" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
                <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Breve descrição do projeto..." />
              </div>
            </div>

            {/* Equipa */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Equipa</h3>
                <button onClick={addMember} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100">
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-1 mb-1">
                  <span className="col-span-4 text-xs text-slate-400 font-semibold">Nome</span>
                  <span className="col-span-3 text-xs text-slate-400 font-semibold">Função</span>
                  <span className="col-span-2 text-xs text-slate-400 font-semibold text-right">Horas</span>
                  <span className="col-span-2 text-xs text-slate-400 font-semibold text-right">€/hora</span>
                  <span className="col-span-1"></span>
                </div>
                {form.team.map(m => (
                  <div key={m.id} className="grid grid-cols-12 gap-2 items-center">
                    <input value={m.name} onChange={e => updateMember(m.id, { name: e.target.value })}
                      className="col-span-4 px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nome" />
                    <input value={m.role} onChange={e => updateMember(m.id, { role: e.target.value })}
                      className="col-span-3 px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Função" />
                    <input type="number" value={m.hours} onChange={e => updateMember(m.id, { hours: parseFloat(e.target.value) || 0 })}
                      className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="number" value={m.hourlyRate} onChange={e => updateMember(m.id, { hourlyRate: parseFloat(e.target.value) || 0 })}
                      className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={() => removeMember(m.id)} className="col-span-1 flex justify-center p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {form.team.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Nenhum membro adicionado</p>}
              </div>
            </div>

            {/* Custos diretos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Package className="w-4 h-4 text-amber-500" /> Custos Diretos</h3>
                <button onClick={addCost} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100">
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {form.directCosts.map(c => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 items-center">
                    <input value={c.label} onChange={e => updateCost(c.id, { label: e.target.value })}
                      className="col-span-5 px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Descrição" />
                    <select value={c.category} onChange={e => updateCost(c.id, { category: e.target.value as PriceSimCost['category'] })}
                      className="col-span-4 px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {COST_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                    </select>
                    <input type="number" value={c.amount} onChange={e => updateCost(c.id, { amount: parseFloat(e.target.value) || 0 })}
                      className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={() => removeCost(c.id)} className="col-span-1 flex justify-center p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {form.directCosts.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Sem custos diretos</p>}
              </div>
            </div>

            {/* Custos fixos + margem */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> % Custos Fixos Mensais Alocados
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={100} value={Math.round(form.fixedCostPct * 100)}
                    onChange={e => setField('fixedCostPct', (parseFloat(e.target.value) || 0) / 100)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-500">%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Fixos mensais: {fmt(monthlyFixed)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Duração (meses)</label>
                <input type="number" min={1} value={form.fixedCostMonths}
                  onChange={e => setField('fixedCostMonths', parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="text-xs text-slate-400 mt-1">Alocado: {fmt(calc.fixedAlloc)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Margem Alvo (%)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={95} value={Math.round(form.targetMarginPct * 100)}
                    onChange={e => setField('targetMarginPct', (parseFloat(e.target.value) || 0) / 100)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-500">%</span>
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.applyIVA} onChange={e => setField('applyIVA', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-medium text-slate-700">Aplicar IVA (23%)</span>
                </label>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notas Internas</label>
              <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
          </div>

          {/* Right — resultados */}
          <div className="p-6 bg-slate-50 rounded-r-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-500" /> Resultado
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Mão-de-obra ({calc.totalHours}h)</span>
                <span className="font-medium text-slate-800">{fmt(calc.labor)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Custos diretos</span>
                <span className="font-medium text-slate-800">{fmt(calc.direct)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Custos fixos alocados</span>
                <span className="font-medium text-slate-800">{fmt(calc.fixedAlloc)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-semibold">
                <span className="text-slate-700">Custo Total</span>
                <span className="text-slate-900">{fmt(calc.totalCost)}</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Margem alvo</span>
                <span className="font-medium text-indigo-600">{(form.targetMarginPct * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-700">Preço s/ IVA</span>
                <span className="text-slate-900">{fmt(calc.priceNoIVA)}</span>
              </div>
              {form.applyIVA && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">IVA (23%)</span>
                  <span className="font-medium text-slate-800">{fmt(calc.iva)}</span>
                </div>
              )}
            </div>

            <div className="bg-indigo-600 rounded-xl p-4 mt-auto">
              <p className="text-xs font-semibold text-indigo-200 mb-1">Preço Final ao Cliente</p>
              <p className="text-2xl font-bold text-white">{fmt(calc.priceTotal)}</p>
              <p className="text-xs text-indigo-200 mt-1">Margem real: {(calc.margin * 100).toFixed(1)}%</p>
            </div>

            {calc.totalHours > 0 && (
              <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                <p className="text-xs text-slate-500">Preço médio / hora</p>
                <p className="text-lg font-bold text-slate-800">{fmt(calc.priceNoIVA / calc.totalHours)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.name}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40">
            {isEdit ? 'Guardar' : 'Criar Simulação'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SimuladorPrecoPage() {
  const { priceSimulations, fixedCostItems, freelancers, addPriceSim, updatePriceSim, removePriceSim } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [editSim, setEditSim]     = useState<PriceSimulation | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);

  const monthlyFixed = useMemo(() => {
    const fc = fixedCostItems.reduce((s, i) => s + i.amount, 0);
    const fl = freelancers.filter(f => f.status === 'active').reduce((s, f) => s + f.monthlyCost, 0);
    return fc + fl;
  }, [fixedCostItems, freelancers]);

  function handleSave(sim: PriceSimulation) {
    if (priceSimulations.find(s => s.id === sim.id)) {
      updatePriceSim(sim.id, sim);
    } else {
      addPriceSim(sim);
    }
    setShowModal(false);
    setEditSim(null);
  }

  function duplicate(sim: PriceSimulation) {
    addPriceSim({ ...sim, id: `ps-${Date.now()}`, name: `${sim.name} (cópia)`, status: 'draft', createdAt: new Date().toISOString().split('T')[0] });
  }

  const sorted = [...priceSimulations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <PageHeader
        title="Simulador de Preço"
        description="Calcula custos, margens e impostos para orçamentar projetos de digitalização e programação."
        badge={`${priceSimulations.length} simulações`}
      >
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Nova Simulação
        </button>
      </PageHeader>

      {priceSimulations.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
          <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-lg mb-1">Nenhuma simulação ainda</p>
          <p className="text-slate-400 text-sm mb-6">Cria a primeira simulação para calcular o preço de um projeto</p>
          <button onClick={() => setShowModal(true)} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            Criar Primeira Simulação
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(sim => {
            const calc = calcSim(sim, monthlyFixed);
            const st   = STATUS_LABELS[sim.status];
            const open = expanded === sim.id;
            return (
              <div key={sim.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Card header */}
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(open ? null : sim.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-slate-900 truncate">{sim.name}</p>
                      <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-slate-400">{sim.client || 'Sem cliente'} · {sim.createdAt} · {calc.totalHours}h</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-indigo-700">{fmt(calc.priceTotal)}</p>
                    <p className="text-xs text-slate-400">Margem: {(calc.margin * 100).toFixed(1)}%</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); setEditSim(sim); }} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-300 hover:text-indigo-500">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); duplicate(sim); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-600">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); removePriceSim(sim.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {open ? <ChevronUp className="w-4 h-4 text-slate-400 ml-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {open && (
                  <div className="border-t border-slate-100 px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50">
                    {/* Equipa */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Equipa</p>
                      {sim.team.length === 0 ? <p className="text-xs text-slate-400">—</p> : sim.team.map(m => (
                        <div key={m.id} className="flex justify-between text-sm py-0.5">
                          <span className="text-slate-700">{m.name || '—'} <span className="text-slate-400 text-xs">({m.role})</span></span>
                          <span className="text-slate-500">{m.hours}h × {fmt(m.hourlyRate)} = <span className="font-semibold text-slate-700">{fmt(m.hours * m.hourlyRate)}</span></span>
                        </div>
                      ))}
                    </div>
                    {/* Custos */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Package className="w-3 h-3" /> Custos Diretos</p>
                      {sim.directCosts.length === 0 ? <p className="text-xs text-slate-400">—</p> : sim.directCosts.map(c => (
                        <div key={c.id} className="flex justify-between text-sm py-0.5">
                          <span className="text-slate-700">{c.label || '—'}</span>
                          <span className="font-semibold text-slate-700">{fmt(c.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm py-0.5 border-t border-slate-200 mt-1">
                        <span className="text-slate-500">Custos fixos alocados</span>
                        <span className="font-semibold text-slate-700">{fmt(calc.fixedAlloc)}</span>
                      </div>
                    </div>
                    {/* Resumo */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Calculator className="w-3 h-3" /> Resumo</p>
                      <div className="space-y-1">
                        {[
                          { label: 'Custo total', val: calc.totalCost },
                          { label: 'Preço s/ IVA', val: calc.priceNoIVA },
                          ...(sim.applyIVA ? [{ label: 'IVA (23%)', val: calc.iva }] : []),
                        ].map(r => (
                          <div key={r.label} className="flex justify-between text-sm">
                            <span className="text-slate-500">{r.label}</span>
                            <span className="font-semibold text-slate-800">{fmt(r.val)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1">
                          <span className="text-indigo-700">Preço Final</span>
                          <span className="text-indigo-700">{fmt(calc.priceTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Margem real</span>
                          <span className={`font-semibold ${calc.margin >= 0.3 ? 'text-emerald-600' : calc.margin >= 0.15 ? 'text-amber-600' : 'text-red-500'}`}>
                            {(calc.margin * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    {sim.notes && (
                      <div className="md:col-span-3 text-xs text-slate-500 bg-white rounded-lg p-3 border border-slate-200">
                        <span className="font-semibold">Notas: </span>{sim.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(showModal || editSim) && (
        <SimModal
          initial={editSim ?? undefined}
          monthlyFixed={monthlyFixed}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditSim(null); }}
        />
      )}
    </div>
  );
}
