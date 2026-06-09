'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import PageHeader from '@/components/shared/PageHeader';
import SaveBar from '@/components/shared/SaveBar';
import type { Assumptions } from '@/lib/types';

interface FieldConfig {
  key: keyof Assumptions;
  label: string;
  description: string;
  type: 'currency' | 'percent' | 'number' | 'integer';
  step?: number;
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6 pb-3 border-b border-slate-100">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
    </div>
  );
}

function FieldInput({
  label,
  description,
  value,
  type,
  step,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  type: 'currency' | 'percent' | 'number' | 'integer';
  step?: number;
  onChange: (v: number) => void;
}) {
  const displayValue = type === 'percent' ? +(value * 100).toFixed(4) : value;
  const prefix = type === 'currency' ? '€' : type === 'percent' ? '%' : '';
  const inputStep = step ?? (type === 'percent' ? 0.1 : type === 'currency' ? 50 : 1);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseFloat(e.target.value);
    if (isNaN(raw)) return;
    const final = type === 'percent' ? raw / 100 : raw;
    onChange(final);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center py-4 border-b border-slate-50 last:border-0">
      <div className="lg:col-span-2">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <div className="relative">
        {prefix === '€' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">€</span>
        )}
        <input
          type="number"
          value={displayValue}
          step={inputStep}
          onChange={handleChange}
          className={`w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${prefix === '€' ? 'pl-7' : ''}`}
        />
        {prefix === '%' && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">%</span>
        )}
      </div>
    </div>
  );
}

export default function PressupostosPage() {
  const { assumptions, updateAssumptions } = useAppStore();
  const [local, setLocal] = useState<Assumptions>({ ...assumptions });

  const isDirty = JSON.stringify(local) !== JSON.stringify(assumptions);

  const set = (key: keyof Assumptions) => (value: number) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  function handleSave() {
    updateAssumptions(local);
  }

  function handleDiscard() {
    setLocal({ ...assumptions });
  }

  return (
    <div className="pb-20">
      <PageHeader
        title="Pressupostos"
        description="Defina os pressupostos globais que alimentam todos os cálculos da aplicação. As margens são calculadas automaticamente a partir dos custos reais."
      />

      <div className="space-y-8">

        {/* Custos Fixos */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <SectionTitle
            title="Custos Fixos da Empresa"
            description="Despesas mensais que não variam com a faturação. Excluem salários (definidos nas Contratações)."
          />
          <FieldInput
            label="Custo Fixo Mensal (€)"
            description="Rendas, utilities, seguros de empresa, contabilidade, software de gestão e outros fixos mensais."
            value={local.monthlyFixedCosts}
            type="currency"
            step={500}
            onChange={set('monthlyFixedCosts')}
          />
        </div>

        {/* Pressupostos Laborais */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <SectionTitle title="Encargos Laborais" description="Taxas e custos associados à contratação em Portugal. Aplicados automaticamente em Contratações." />
          <FieldInput
            label="Taxa de Segurança Social da Empresa"
            description="Percentagem que a empresa paga sobre o salário bruto do trabalhador (default: 23,75%)."
            value={local.employerSocialSecurityRate}
            type="percent"
            onChange={set('employerSocialSecurityRate')}
          />
          <FieldInput
            label="Taxa de Segurança Social do Trabalhador"
            description="Percentagem que o trabalhador desconta sobre o salário bruto (default: 11%)."
            value={local.employeeSocialSecurityRate}
            type="percent"
            onChange={set('employeeSocialSecurityRate')}
          />
          <FieldInput
            label="Número de Meses Pagos por Ano"
            description="Inclui subsídio de férias e subsídio de Natal (default: 14)."
            value={local.monthsPaidPerYear}
            type="integer"
            step={1}
            onChange={set('monthsPaidPerYear')}
          />
          <FieldInput
            label="Subsídio de Alimentação Mensal (€)"
            description="Valor médio mensal do subsídio de alimentação por colaborador (default: 167,07€)."
            value={local.monthlyMealAllowance}
            type="currency"
            step={10}
            onChange={set('monthlyMealAllowance')}
          />
          <FieldInput
            label="Ferramentas / Software por Colaborador (€/mês)"
            description="Licenças, software, subscrições mensais por pessoa."
            value={local.monthlyToolsCostPerEmployee}
            type="currency"
            step={10}
            onChange={set('monthlyToolsCostPerEmployee')}
          />
          <FieldInput
            label="Seguros por Colaborador (€/mês)"
            description="Acidentes de trabalho e outros seguros obrigatórios."
            value={local.monthlyInsuranceCostPerEmployee}
            type="currency"
            step={5}
            onChange={set('monthlyInsuranceCostPerEmployee')}
          />
          <FieldInput
            label="Equipamento Inicial (€)"
            description="Computador, monitor e periféricos no momento da contratação."
            value={local.averageEquipmentCost}
            type="currency"
            step={100}
            onChange={set('averageEquipmentCost')}
          />
          <FieldInput
            label="Outros Custos Mensais por Colaborador (€/mês)"
            description="Despesas diversas: transporte, material de escritório, etc."
            value={local.monthlyOtherCostsPerEmployee}
            type="currency"
            step={10}
            onChange={set('monthlyOtherCostsPerEmployee')}
          />
        </div>

        {/* Pressupostos Comerciais */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <SectionTitle title="Pressupostos Comerciais" description="Métricas do funil de vendas e do modelo de negócio." />
          <FieldInput
            label="Ticket Médio por Projeto (€)"
            description="Valor médio de um projeto one-off. Usado para calcular quantos projetos são necessários."
            value={local.averageProjectTicket}
            type="currency"
            step={1000}
            onChange={set('averageProjectTicket')}
          />
          <FieldInput
            label="Receita Recorrente Média por Cliente (€/mês)"
            description="Mensalidade média de clientes recorrentes (retainer, SaaS, suporte)."
            value={local.averageMonthlyRecurringRevenue}
            type="currency"
            step={100}
            onChange={set('averageMonthlyRecurringRevenue')}
          />
          <FieldInput
            label="Conversão Lead → Reunião"
            description="Percentagem de leads que chegam a marcar reunião (default: 20%)."
            value={local.leadToMeetingConversion}
            type="percent"
            onChange={set('leadToMeetingConversion')}
          />
          <FieldInput
            label="Conversão Reunião → Proposta"
            description="Percentagem de reuniões que resultam em proposta (default: 60%)."
            value={local.meetingToProposalConversion}
            type="percent"
            onChange={set('meetingToProposalConversion')}
          />
          <FieldInput
            label="Conversão Proposta → Venda"
            description="Percentagem de propostas que fecham (default: 25%)."
            value={local.proposalToCloseConversion}
            type="percent"
            onChange={set('proposalToCloseConversion')}
          />
          <FieldInput
            label="Ciclo Médio de Venda (dias)"
            description="Tempo médio desde o primeiro contacto até ao fecho."
            value={local.averageSaleCycleDays}
            type="integer"
            step={5}
            onChange={set('averageSaleCycleDays')}
          />
          <FieldInput
            label="Percentagem de Receita One-Off"
            description="Fatia da receita total que provém de projetos pontuais (default: 70%)."
            value={local.oneOffRevenueShare}
            type="percent"
            onChange={set('oneOffRevenueShare')}
          />
          <FieldInput
            label="Percentagem de Receita Recorrente"
            description="Fatia da receita total que é recorrente (default: 30%)."
            value={local.recurringRevenueShare}
            type="percent"
            onChange={set('recurringRevenueShare')}
          />
        </div>

        {/* Pressupostos Financeiros — apenas taxas e instrumentos */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <SectionTitle title="Taxas e Instrumentos Financeiros" description="Parâmetros para cálculo de financiamentos, NPV e projeções." />
          <FieldInput
            label="IVA"
            description="Taxa de IVA aplicável (default: 23%)."
            value={local.vatRate}
            type="percent"
            onChange={set('vatRate')}
          />
          <FieldInput
            label="Taxa de Juro Base"
            description="Euribor ou outra taxa de referência para financiamentos (default: 3,5%)."
            value={local.baseInterestRate}
            type="percent"
            onChange={set('baseInterestRate')}
          />
          <FieldInput
            label="Spread"
            description="Margem adicional aplicada pelo banco sobre a taxa base (default: 2%)."
            value={local.spread}
            type="percent"
            onChange={set('spread')}
          />
          <FieldInput
            label="Taxa de Atualização (NPV)"
            description="Taxa usada para descontar cash flows futuros na análise de investimentos (default: 10%)."
            value={local.discountRate}
            type="percent"
            onChange={set('discountRate')}
          />
          <FieldInput
            label="Inflação Anual Esperada"
            description="Taxa de inflação anual para atualização de valores (default: 2,5%)."
            value={local.inflation}
            type="percent"
            onChange={set('inflation')}
          />
          <FieldInput
            label="Crescimento Anual Esperado"
            description="Taxa de crescimento anual da empresa para projeções (default: 20%)."
            value={local.annualGrowthRate}
            type="percent"
            onChange={set('annualGrowthRate')}
          />
        </div>

      </div>

      <SaveBar isDirty={isDirty} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
}
