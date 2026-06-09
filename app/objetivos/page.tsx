'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import {
  calculateRevenueGoalRequirements,
  formatCurrency,
  formatPercent,
  formatNumber,
} from '@/lib/financialCalculations';
import PageHeader from '@/components/shared/PageHeader';
import MetricCard from '@/components/shared/MetricCard';
import SaveBar from '@/components/shared/SaveBar';
import type { Assumptions } from '@/lib/types';
import { CalendarRange } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';


function NumInput({
  label,
  hint,
  value,
  onChange,
  type = 'currency',
  step,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  type?: 'currency' | 'percent' | 'number';
  step?: number;
}) {
  const isPercent = type === 'percent';
  const displayVal = isPercent ? +(value * 100).toFixed(2) : value;
  const defaultStep = step ?? (isPercent ? 0.5 : type === 'currency' ? 1000 : 1);

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1.5 leading-snug">{hint}</p>}
      <div className="relative flex items-center">
        {type === 'currency' && (
          <span className="absolute left-3 text-sm text-slate-400 font-medium">€</span>
        )}
        <input
          type="number"
          value={displayVal}
          step={defaultStep}
          onChange={e => {
            const raw = parseFloat(e.target.value);
            if (isNaN(raw)) return;
            onChange(isPercent ? raw / 100 : raw);
          }}
          className={`w-full py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${type === 'currency' ? 'pl-7 pr-3' : isPercent ? 'pl-3 pr-7' : 'px-3'}`}
        />
        {isPercent && (
          <span className="absolute right-3 text-sm text-slate-400 font-medium">%</span>
        )}
      </div>
    </div>
  );
}

type Overrides = Pick<Assumptions,
  | 'averageProjectTicket' | 'averageMonthlyRecurringRevenue'
  | 'oneOffRevenueShare' | 'recurringRevenueShare' | 'leadToMeetingConversion'
  | 'meetingToProposalConversion' | 'proposalToCloseConversion' | 'grossMargin'
  | 'targetNetMargin' | 'salesCapacityPerPerson' | 'deliveryCapacityPerPerson'
>;

function pickOverrides(a: Assumptions): Overrides {
  return {
    averageProjectTicket: a.averageProjectTicket,
    averageMonthlyRecurringRevenue: a.averageMonthlyRecurringRevenue,
    oneOffRevenueShare: a.oneOffRevenueShare,
    recurringRevenueShare: a.recurringRevenueShare,
    leadToMeetingConversion: a.leadToMeetingConversion,
    meetingToProposalConversion: a.meetingToProposalConversion,
    proposalToCloseConversion: a.proposalToCloseConversion,
    grossMargin: a.grossMargin,
    targetNetMargin: a.targetNetMargin,
    salesCapacityPerPerson: a.salesCapacityPerPerson,
    deliveryCapacityPerPerson: a.deliveryCapacityPerPerson,
  };
}

export default function ObjetivosPage() {
  const { assumptions, yearPlans, updateAssumptions } = useAppStore();
  const [local, setLocal] = useState<Overrides>(() => pickOverrides(assumptions));

  const isDirty = JSON.stringify(local) !== JSON.stringify(pickOverrides(assumptions));

  // Meta vem do Planeamento 5 Anos — ano atual ou próximo ano disponível
  const currentYear = new Date().getFullYear();
  const planForYear = yearPlans.find(y => y.year === currentYear)
    ?? yearPlans.sort((a, b) => a.year - b.year)[0];
  const annualGoalFromPlan = planForYear?.revenueTarget ?? assumptions.annualRevenueGoal;

  const set = (key: keyof Overrides) => (value: number) => {
    setLocal(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'oneOffRevenueShare') next.recurringRevenueShare = Math.max(0, 1 - value);
      if (key === 'recurringRevenueShare') next.oneOffRevenueShare = Math.max(0, 1 - value);
      return next;
    });
  };

  function handleSave() {
    updateAssumptions(local);
  }

  function handleDiscard() {
    setLocal(pickOverrides(assumptions));
  }

  const mergedAssumptions = { ...assumptions, ...local };

  const calc = useMemo(
    () => calculateRevenueGoalRequirements(annualGoalFromPlan, mergedAssumptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(local), annualGoalFromPlan]
  );

  const marginOk = local.grossMargin > local.targetNetMargin;

  const funnelData = [
    { name: 'Leads/mês', value: calc.leadsPerMonth, color: '#e0e7ff' },
    { name: 'Reuniões/mês', value: calc.meetingsPerMonth, color: '#c7d2fe' },
    { name: 'Propostas/mês', value: calc.proposalsPerMonth, color: '#a5b4fc' },
    { name: 'Vendas/mês', value: calc.closingsPerMonth, color: '#6366f1' },
  ];

  const teamData = [
    { name: 'Comerciais', value: calc.salesPeopleNeeded, color: '#6366f1' },
    { name: 'Delivery', value: calc.deliveryPeopleNeeded, color: '#10b981' },
  ];

  const effectiveConversion = local.leadToMeetingConversion * local.meetingToProposalConversion * local.proposalToCloseConversion;

  return (
    <div className="pb-20">
      <PageHeader
        title="Objetivos de Faturação"
        description="Ajuste os valores e veja os cálculos em tempo real. Clique em Guardar para aplicar as alterações em toda a aplicação."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── LEFT: inputs ── */}
        <div className="lg:col-span-1 space-y-5">

          {/* Meta — vinda do Planeamento */}
          <Link href="/planeamento" className="block">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 hover:bg-indigo-100 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <CalendarRange className="w-4 h-4 text-indigo-600" />
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Meta {planForYear?.year ?? currentYear}</p>
              </div>
              <p className="text-2xl font-bold text-indigo-900">{formatCurrency(annualGoalFromPlan)}</p>
              <p className="text-xs text-indigo-600 mt-1">Definida no Planeamento 5 Anos → clique para editar</p>
            </div>
          </Link>

          {/* Mix de receita */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Mix de Receita</p>
            <div className="space-y-4">
              <NumInput
                label="% Receita One-Off (projetos)"
                hint="Fatia da receita de projetos pontuais."
                value={local.oneOffRevenueShare}
                onChange={set('oneOffRevenueShare')}
                type="percent"
              />
              <NumInput
                label="% Receita Recorrente (retainers)"
                hint="Atualiza automaticamente como complemento."
                value={local.recurringRevenueShare}
                onChange={set('recurringRevenueShare')}
                type="percent"
              />
              <NumInput
                label="Ticket Médio por Projeto One-Off (€)"
                hint="Valor médio de cada projeto fechado."
                value={local.averageProjectTicket}
                onChange={set('averageProjectTicket')}
                step={1000}
              />
              <NumInput
                label="Mensalidade Média por Cliente Recorrente (€)"
                hint="Valor médio de um retainer ou contrato mensal."
                value={local.averageMonthlyRecurringRevenue}
                onChange={set('averageMonthlyRecurringRevenue')}
                step={100}
              />
            </div>
          </div>

          {/* Funil comercial */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Taxas de Conversão do Funil</p>
            <div className="space-y-4">
              <NumInput
                label="Lead → Reunião"
                hint="% de leads que chegam a marcar uma reunião."
                value={local.leadToMeetingConversion}
                onChange={set('leadToMeetingConversion')}
                type="percent"
              />
              <NumInput
                label="Reunião → Proposta"
                hint="% de reuniões que resultam em proposta enviada."
                value={local.meetingToProposalConversion}
                onChange={set('meetingToProposalConversion')}
                type="percent"
              />
              <NumInput
                label="Proposta → Venda"
                hint="% de propostas que fecham contrato."
                value={local.proposalToCloseConversion}
                onChange={set('proposalToCloseConversion')}
                type="percent"
              />
            </div>
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500">Conversão global lead → venda</p>
              <p className="text-lg font-bold text-slate-900">{(effectiveConversion * 100).toFixed(2)}%</p>
              <p className="text-xs text-slate-400 mt-0.5">
                De cada 100 leads, fecham {(effectiveConversion * 100).toFixed(1)} projetos
              </p>
            </div>
          </div>

          {/* Capacidade da equipa */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Capacidade da Equipa</p>
            <div className="space-y-4">
              <NumInput
                label="Receita máxima por Comercial/mês (€)"
                hint="Volume de vendas que cada comercial consegue gerar."
                value={local.salesCapacityPerPerson}
                onChange={set('salesCapacityPerPerson')}
                step={5000}
              />
              <NumInput
                label="Receita máxima por pessoa de Delivery/mês (€)"
                hint="Quanto consegue faturar cada pessoa de entrega."
                value={local.deliveryCapacityPerPerson}
                onChange={set('deliveryCapacityPerPerson')}
                step={1000}
              />
            </div>
          </div>

          {/* Margens */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Margens e Rentabilidade</p>
            {!marginOk && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                ⚠️ A margem bruta tem de ser superior à margem líquida pretendida.
              </div>
            )}
            <div className="space-y-4">
              <NumInput
                label="Margem Bruta"
                hint="% da receita que fica após custos diretos de entrega."
                value={local.grossMargin}
                onChange={set('grossMargin')}
                type="percent"
              />
              <NumInput
                label="Margem Líquida Pretendida"
                hint="% de lucro que quer gerar após todos os custos."
                value={local.targetNetMargin}
                onChange={set('targetNetMargin')}
                type="percent"
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT: results ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Summary banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Resumo Executivo</p>
              <span className="text-xs text-indigo-300">Meta: {formatCurrency(annualGoalFromPlan)}/ano</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{calc.executiveSummary}</p>
          </div>

          {/* Main metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title="Faturação Mensal Necessária"
              value={formatCurrency(calc.monthlyGoal)}
              description={`${formatCurrency(calc.weeklyGoal)}/semana`}
              highlight
            />
            <MetricCard
              title="One-Off / Mês"
              value={formatCurrency(calc.oneOffMonthlyRevenue)}
              description={`${calc.oneOffProjectsPerMonth} projetos × ${formatCurrency(local.averageProjectTicket)}`}
              state={`${formatPercent(local.oneOffRevenueShare)} do total`}
              stateType="info"
            />
            <MetricCard
              title="Recorrente / Mês"
              value={formatCurrency(calc.recurringMonthlyRevenue)}
              description={`${calc.recurringClientsNeeded} clientes × ${formatCurrency(local.averageMonthlyRecurringRevenue)}`}
              state={`${formatPercent(local.recurringRevenueShare)} do total`}
              stateType="info"
            />
          </div>

          {/* Funnel chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Funil Comercial Necessário / Mês</h3>
            <p className="text-xs text-slate-400 mb-4">
              Com conversão global de {(effectiveConversion * 100).toFixed(2)}%, são necessárias {formatNumber(calc.leadsPerMonth)} leads para fechar {calc.closingsPerMonth} projetos.
            </p>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {funnelData.map((item) => (
                <div key={item.name} className="text-center p-3 rounded-lg" style={{ background: item.color }}>
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(item.value)}</p>
                  <p className="text-xs text-slate-600 mt-1">{item.name}</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Quantidade">
                  {funnelData.map((entry, i) => <Cell key={i} fill={entry.color === '#e0e7ff' ? '#c7d2fe' : entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Team needed */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Equipa Necessária</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 text-center">
                <p className="text-3xl font-bold text-indigo-700">{calc.salesPeopleNeeded}</p>
                <p className="text-sm text-slate-600 mt-1">Comerciais</p>
                <p className="text-xs text-slate-400">{formatCurrency(local.salesCapacityPerPerson)}/pessoa/mês</p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                <p className="text-3xl font-bold text-emerald-700">{calc.deliveryPeopleNeeded}</p>
                <p className="text-sm text-slate-600 mt-1">Delivery</p>
                <p className="text-xs text-slate-400">{formatCurrency(local.deliveryCapacityPerPerson)}/pessoa/mês</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={teamData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Pessoas">
                  {teamData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Margin & profit */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Rentabilidade Estimada / Mês</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500 mb-1">Receita Mensal</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(calc.monthlyGoal)}</p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-xs text-slate-500 mb-1">Margem Bruta / Mês</p>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(calc.estimatedMargin)}</p>
                <p className="text-xs text-emerald-600">{formatPercent(local.grossMargin)}</p>
              </div>
              <div className={`p-4 rounded-lg border ${marginOk ? 'bg-indigo-50 border-indigo-100' : 'bg-red-50 border-red-100'}`}>
                <p className="text-xs text-slate-500 mb-1">Lucro Líquido / Mês</p>
                <p className={`text-lg font-bold ${marginOk ? 'text-indigo-700' : 'text-red-600'}`}>{formatCurrency(calc.estimatedProfit)}</p>
                <p className={`text-xs ${marginOk ? 'text-indigo-600' : 'text-red-500'}`}>{formatPercent(local.targetNetMargin)}</p>
              </div>
            </div>
          </div>

          {/* Full detail table */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Detalhe Completo</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Meta Anual', value: formatCurrency(calc.annualGoal) },
                { label: 'Meta Mensal', value: formatCurrency(calc.monthlyGoal) },
                { label: 'Meta Semanal', value: formatCurrency(calc.weeklyGoal) },
                { label: 'Projetos One-Off/Mês', value: `${calc.oneOffProjectsPerMonth} projetos` },
                { label: 'Clientes Recorrentes Necessários', value: `${calc.recurringClientsNeeded} clientes` },
                { label: 'Leads Necessárias/Mês', value: formatNumber(calc.leadsPerMonth) },
                { label: 'Reuniões Necessárias/Mês', value: formatNumber(calc.meetingsPerMonth) },
                { label: 'Propostas Necessárias/Mês', value: formatNumber(calc.proposalsPerMonth) },
                { label: 'Vendas Necessárias/Mês', value: formatNumber(calc.closingsPerMonth) },
                { label: 'Comerciais Necessários', value: `${calc.salesPeopleNeeded} pessoas` },
                { label: 'Delivery Necessários', value: `${calc.deliveryPeopleNeeded} pessoas` },
                { label: 'Custo Estimado Equipa/Ano', value: formatCurrency(calc.estimatedTeamCost) },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SaveBar isDirty={isDirty} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
}
