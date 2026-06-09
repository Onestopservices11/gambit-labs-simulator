'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/lib/financialCalculations';
import PageHeader from '@/components/shared/PageHeader';
import type { Freelancer } from '@/lib/types';
import { Plus, Trash2, Pencil, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_CONFIG = {
  active:   { label: 'Ativo',     color: 'bg-emerald-100 text-emerald-700' },
  planned:  { label: 'Planeado',  color: 'bg-blue-100 text-blue-700' },
  inactive: { label: 'Inativo',   color: 'bg-slate-100 text-slate-500' },
};

function FreelancerModal({
  existing,
  onSave,
  onClose,
}: {
  existing?: Freelancer;
  onSave: (f: Freelancer) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Freelancer>(existing ?? {
    id: '',
    name: '',
    service: '',
    monthlyCost: 0,
    status: 'active',
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [costStr, setCostStr] = useState(String(existing?.monthlyCost ?? ''));

  function handleSave() {
    if (!form.name.trim()) return;
    const cost = parseFloat(costStr) || 0;
    onSave({ ...form, monthlyCost: cost, id: existing?.id ?? `fl-${Date.now()}` });
    onClose();
  }

  const f = (key: keyof Freelancer) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{existing ? 'Editar Freelancer' : 'Adicionar Freelancer'}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Custos mensais entram automaticamente no P&L.</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nome / Empresa</label>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={f('name')}
              placeholder="Ex: João Silva"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Serviço / Área</label>
            <input
              type="text"
              value={form.service}
              onChange={f('service')}
              placeholder="Ex: Design gráfico, Dev backend, SEO..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Custo Mensal (€)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
              <input
                type="number"
                value={costStr}
                min={0}
                step={50}
                onChange={e => setCostStr(e.target.value)}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Freelancer['status'] }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="active">Ativo</option>
                <option value="planned">Planeado</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Data Início</label>
              <input
                type="date"
                value={form.startDate}
                onChange={f('startDate')}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={f('notes')}
              rows={2}
              placeholder="Detalhes, condições, renovação..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {existing ? 'Guardar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FreelancerCard({ fl, onEdit, onRemove }: {
  fl: Freelancer;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const st = STATUS_CONFIG[fl.status];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <UserCheck className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900">{fl.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
          </div>
          <p className="text-sm text-slate-500 truncate">{fl.service || '—'}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-slate-900">{formatCurrency(fl.monthlyCost)}</p>
          <p className="text-xs text-slate-400">/mês</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {open && fl.notes && (
        <div className="px-5 pb-4 pt-0">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500">{fl.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FreelancersPage() {
  const { freelancers, addFreelancer, updateFreelancer, removeFreelancer } = useAppStore();
  const [showModal, setShowModal]     = useState(false);
  const [editing, setEditing]         = useState<Freelancer | null>(null);

  const active  = freelancers.filter(f => f.status === 'active');
  const planned = freelancers.filter(f => f.status === 'planned');

  const totalActive  = active.reduce((s, f) => s + f.monthlyCost, 0);
  const totalPlanned = planned.reduce((s, f) => s + f.monthlyCost, 0);
  const totalAll     = freelancers.reduce((s, f) => s + f.monthlyCost, 0);

  function handleSave(f: Freelancer) {
    if (editing) {
      updateFreelancer(editing.id, f);
      setEditing(null);
    } else {
      addFreelancer(f);
      setShowModal(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Freelancers"
        description="Colaboradores externos e subcontratados. O custo mensal entra automaticamente no P&L como custo de equipa externa."
        badge={`${active.length} ativo(s)`}
      >
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Freelancer
        </button>
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Custo Mensal Ativos</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalActive)}</p>
          <p className="text-xs text-slate-400 mt-1">{active.length} freelancer(s) ativos</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-xs text-slate-500 mb-1">Custo Mensal Planeados</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalPlanned)}</p>
          <p className="text-xs text-slate-400 mt-1">{planned.length} freelancer(s) planeados</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Total Anual (ativos + planeados)</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency((totalActive + totalPlanned) * 12)}</p>
          <p className="text-xs text-slate-400 mt-1">× 12 meses</p>
        </div>
      </div>

      {/* Empty state */}
      {freelancers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum freelancer adicionado</p>
          <p className="text-slate-400 text-sm mb-4">Adiciona freelancers para incluir os seus custos no P&L automaticamente.</p>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            Adicionar Primeiro Freelancer
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">Ativos</p>
              {active.map(fl => (
                <FreelancerCard key={fl.id} fl={fl} onEdit={() => setEditing(fl)} onRemove={() => removeFreelancer(fl.id)} />
              ))}
            </>
          )}
          {planned.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1 mt-6">Planeados</p>
              {planned.map(fl => (
                <FreelancerCard key={fl.id} fl={fl} onEdit={() => setEditing(fl)} onRemove={() => removeFreelancer(fl.id)} />
              ))}
            </>
          )}
          {freelancers.filter(f => f.status === 'inactive').length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1 mt-6">Inativos</p>
              {freelancers.filter(f => f.status === 'inactive').map(fl => (
                <FreelancerCard key={fl.id} fl={fl} onEdit={() => setEditing(fl)} onRemove={() => removeFreelancer(fl.id)} />
              ))}
            </>
          )}
        </div>
      )}

      {(showModal) && (
        <FreelancerModal onSave={handleSave} onClose={() => setShowModal(false)} />
      )}
      {editing && (
        <FreelancerModal existing={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
