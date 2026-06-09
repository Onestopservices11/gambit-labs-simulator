'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { calculateEmployeeCalculations, formatCurrency, formatPercent } from '@/lib/financialCalculations';
import { calcIRSWithholding, netToGrossAccurate, calcPayslip } from '@/lib/irsCalculations';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import DecisionBadge from '@/components/shared/DecisionBadge';
import type { Employee, Assumptions, HiringModel } from '@/lib/types';
import type { MaritalStatus } from '@/lib/irsCalculations';
import { Plus, Users, ChevronDown, ChevronUp, Trash2, Calculator, Info, Pencil, Zap, TrendingUp, FileDown } from 'lucide-react';
import { calculateAjudasCusto, AT_AJUDAS_LIMITS } from '@/lib/financialCalculations';
import dynamic from 'next/dynamic';

const PDFDownloadButtonSalario = dynamic(
  () => import('@/lib/pdf/PDFDownloadButtonSalario'),
  { ssr: false, loading: () => <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-100 text-slate-400 cursor-wait"><FileDown className="w-3 h-3" />PDF...</button> }
);

// suppress unused import warning
void calcIRSWithholding;

const DEPARTMENTS: { value: Employee['department']; label: string }[] = [
  { value: 'commercial', label: 'Comercial' },
  { value: 'delivery',   label: 'Delivery' },
  { value: 'management', label: 'Gestão' },
  { value: 'admin',      label: 'Administrativo' },
  { value: 'tech',       label: 'Tecnologia' },
];

const DEPT_LABELS: Record<Employee['department'], string> = {
  commercial: 'Comercial', delivery: 'Delivery', management: 'Gestão',
  admin: 'Administrativo', tech: 'Tecnologia',
};

const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: 'single',          label: 'Solteiro(a) / Não casado(a)' },
  { value: 'married_dual',    label: 'Casado(a) — 2 titulares' },
  { value: 'married_single',  label: 'Casado(a) — titular único' },
];

// Departments that default to capacity model
const CAPACITY_DEPTS: Employee['department'][] = ['delivery', 'tech'];

// ─── EmployeeCard ─────────────────────────────────────────────────────────────
function EmployeeCard({ employee, assumptions, onRemove, onEdit }: {
  employee: Employee; assumptions: Assumptions; onRemove: () => void; onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const calc = useMemo(() => calculateEmployeeCalculations(employee, assumptions), [employee, assumptions]);
  const isCapacity = (employee.hiringModel ?? 'revenue_based') === 'capacity_based';
  const ajudas = useMemo(() => calculateAjudasCusto(employee, assumptions), [employee, assumptions]);

  const payslip = calcPayslip(
    employee.grossMonthlySalary, assumptions.employeeSocialSecurityRate,
    assumptions.employerSocialSecurityRate,
    employee.maritalStatus ?? 'single', employee.dependents ?? 0,
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isCapacity ? 'bg-purple-100' : 'bg-indigo-100'}`}>
          {isCapacity ? <Zap className="w-5 h-5 text-purple-600" /> : <TrendingUp className="w-5 h-5 text-indigo-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <p className="font-semibold text-slate-900">{employee.name}</p>
            <StatusBadge status={employee.status} />
            <span className="text-xs text-slate-400">{DEPT_LABELS[employee.department]}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isCapacity ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {isCapacity ? 'Capacidade' : 'Receita directa'}
            </span>
          </div>
          <p className="text-sm text-slate-500">{employee.role}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DecisionBadge decision={calc.decision} />
          <PDFDownloadButtonSalario employee={employee} assumptions={assumptions} payslip={payslip} ajudas={ajudas} />
          <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-500"><Pencil className="w-4 h-4" /></button>
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Summary row */}
      <div className="px-5 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-500">Líquido</p>
          <p className="text-sm font-semibold text-slate-900">{formatCurrency(payslip.net)}/mês</p>
          <p className="text-xs text-slate-400 mt-0.5">Bruto: {formatCurrency(employee.grossMonthlySalary)}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50">
          <p className="text-xs text-slate-500">Custo Real p/ Empresa/Mês</p>
          <p className="text-sm font-semibold text-slate-900">{formatCurrency(calc.annualizedMonthlyCost)}</p>
        </div>
        {isCapacity ? (
          <>
            <div className={`p-3 rounded-lg border ${calc.breakEvenUtilizationRate <= 0.6 ? 'bg-emerald-50 border-emerald-100' : calc.breakEvenUtilizationRate <= 0.8 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
              <p className="text-xs text-slate-500">Break-Even (ocupação)</p>
              <p className={`text-sm font-semibold ${calc.breakEvenUtilizationRate <= 0.6 ? 'text-emerald-700' : calc.breakEvenUtilizationRate <= 0.8 ? 'text-amber-700' : 'text-red-700'}`}>
                {(calc.breakEvenUtilizationRate * 100).toFixed(0)}% ocupação
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
              <p className="text-xs text-slate-500">Capacidade máx./mês</p>
              <p className="text-sm font-semibold text-purple-700">{formatCurrency(calc.revenueAt100pct)}</p>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <p className="text-xs text-slate-500">Receita Break-Even/Mês</p>
              <p className="text-sm font-semibold text-amber-700">{formatCurrency(calc.breakEvenRevenue)}</p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <p className="text-xs text-slate-500">Receita c/ Margem/Mês</p>
              <p className="text-sm font-semibold text-indigo-700">{formatCurrency(calc.requiredRevenueForTargetMargin)}</p>
            </div>
          </>
        )}
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-slate-100 p-5 bg-slate-50 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Detalhe de Custos</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Salário Bruto Mensal',           value: formatCurrency(employee.grossMonthlySalary) },
              { label: `SS Patronal (${formatPercent(assumptions.employerSocialSecurityRate)})`, value: formatCurrency(employee.grossMonthlySalary * assumptions.employerSocialSecurityRate) },
              { label: 'Custo Médio Mensal Anualizado',  value: formatCurrency(calc.annualizedMonthlyCost) },
              { label: 'Custo Anual Total',              value: formatCurrency(calc.annualCost) },
              { label: 'Subsídio Alimentação',           value: formatCurrency(employee.monthlyMealAllowance) },
              { label: 'Ferramentas + Outros',           value: formatCurrency(employee.monthlyToolsCost + employee.monthlyOtherCosts) },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className="text-sm font-bold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Capacity model: utilization table */}
          {isCapacity && (employee.monthlyBillableCapacity ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Análise de Utilização</p>
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-3 py-2 font-semibold text-slate-500">Ocupação</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500">Receita/mês</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500">Margem bruta</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500">Resultado líq.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[0.5, 0.6, 0.7, 0.8, 1.0].map(pct => {
                      const rev    = (employee.monthlyBillableCapacity ?? 0) * pct;
                      const gross  = rev * assumptions.grossMargin;
                      const profit = gross - calc.annualizedMonthlyCost;
                      const isBreakEven = Math.abs(calc.breakEvenUtilizationRate - pct) < 0.05;
                      return (
                        <tr key={pct} className={isBreakEven ? 'bg-amber-50' : ''}>
                          <td className="px-3 py-2 font-semibold text-slate-700">
                            {(pct * 100).toFixed(0)}%
                            {isBreakEven && <span className="ml-1 text-amber-600 text-[10px]">≈ break-even</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(rev)}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(gross)}</td>
                          <td className={`px-3 py-2 text-right font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Revenue model: projects needed */}
          {!isCapacity && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Projetos One-Off p/ Break-Even</p>
                <p className="text-sm font-bold text-slate-900">{calc.requiredProjectsBreakEven} projetos</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Clientes Recorrentes p/ Break-Even</p>
                <p className="text-sm font-bold text-slate-900">{calc.requiredClientsBreakEven} clientes</p>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <p className="text-xs font-semibold text-slate-600 mb-1">Recomendação Automática</p>
            <p className="text-sm text-slate-600">{calc.decisionReason}</p>
          </div>

          {/* Ajudas de custo */}
          {ajudas.diasPerMonth > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Ajudas de Custo (AT 2025)</p>
              <div className="bg-white rounded-xl border border-slate-100 p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Diária/dia</p>
                    <p className="font-bold text-slate-800">{formatCurrency(ajudas.valorDia)}</p>
                    <p className="text-slate-400">Limite AT: {formatCurrency(ajudas.atLimitDia)}</p>
                    {ajudas.kmPerMonth > 0 && <>
                      <p className="text-slate-500 mt-1.5">Km/mês</p>
                      <p className="font-bold text-slate-800">{ajudas.kmPerMonth} km × {formatCurrency(ajudas.ratePerKm)}</p>
                      <p className="text-slate-400">Limite AT: {formatCurrency(ajudas.atLimitKm)}/km</p>
                    </>}
                  </div>
                  <div>
                    <p className="text-slate-500">Total mensal</p>
                    <p className="font-bold text-slate-800">{formatCurrency(ajudas.monthlyTotal)}</p>
                    <p className="text-emerald-600 font-medium">Isento: {formatCurrency(ajudas.monthlyExempt)}</p>
                    {ajudas.monthlyTaxable > 0 && <p className="text-amber-600">Tributável: {formatCurrency(ajudas.monthlyTaxable)}</p>}
                  </div>
                  <div>
                    <p className="text-slate-500">Benefício líquido</p>
                    <p className="font-bold text-emerald-700">{formatCurrency(ajudas.netBenefitEmployee)}/mês</p>
                    <p className="text-slate-400">{ajudas.diasPerMonth} dias/mês</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EmployeeModal ────────────────────────────────────────────────────────────
function EmployeeModal({ assumptions, existing, onSave, onClose }: {
  assumptions: Assumptions; existing?: Employee; onSave: (e: Employee) => void; onClose: () => void;
}) {
  const isEdit     = !!existing;
  const ssEmployee = assumptions.employeeSocialSecurityRate;
  const ssEmployer = assumptions.employerSocialSecurityRate;
  const mealAllowance = assumptions.monthlyMealAllowance;
  const toolsCost     = assumptions.monthlyToolsCostPerEmployee;
  const otherCosts    = assumptions.monthlyOtherCostsPerEmployee;

  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>(existing?.maritalStatus ?? 'single');
  const [dependents,    setDependents]    = useState(existing?.dependents ?? 0);
  const [department,    setDepartment]    = useState<Employee['department']>(existing?.department ?? 'commercial');

  // Auto-detect model from department, allow override
  const defaultModel: HiringModel = CAPACITY_DEPTS.includes(existing?.department ?? department)
    ? 'capacity_based' : 'revenue_based';
  const [hiringModel, setHiringModel] = useState<HiringModel>(existing?.hiringModel ?? defaultModel);

  // When department changes, auto-switch model (but only if user hasn't manually overridden)
  function handleDeptChange(d: Employee['department']) {
    setDepartment(d);
    setHiringModel(CAPACITY_DEPTS.includes(d) ? 'capacity_based' : 'revenue_based');
  }

  const initialNet = existing
    ? Math.round(calcPayslip(existing.grossMonthlySalary, ssEmployee, ssEmployer, existing.maritalStatus ?? 'single', existing.dependents ?? 0).net)
    : 1200;

  const [netSalaryStr, setNetSalaryStr] = useState(String(initialNet));
  const netSalary  = parseFloat(netSalaryStr) || 0;
  const grossSalary = netToGrossAccurate(netSalary, ssEmployee, maritalStatus, dependents);
  const payslip    = calcPayslip(grossSalary, ssEmployee, ssEmployer, maritalStatus, dependents);
  const totalMonthlyCost = grossSalary + payslip.ss_employer + mealAllowance + toolsCost + otherCosts;

  const [form, setForm] = useState<Partial<Employee>>(existing ? { ...existing } : {
    name: '', role: '', monthlyToolsCost: toolsCost, monthlyOtherCosts: otherCosts,
    monthlyMealAllowance: mealAllowance, annualBonus: 0,
    initialEquipmentCost: assumptions.averageEquipmentCost, trainingCost: 500,
    variableCommission: 0, expectedMonthlyRevenue: 0, monthlyBillableCapacity: 0,
    ajudasCustoDiasPerMonth: 0, ajudasCustoTipo: 'none' as const, ajudasCustoValorDiaCustom: 0,
    ajudasKmPerMonth: 0, ajudasKmRateCustom: 0, ajudasKmVehicle: 'car' as const,
    status: 'planned', startDate: new Date().toISOString().split('T')[0], notes: '',
  });

  // Live ajudas de custo preview
  const liveAjudas = useMemo(() => calculateAjudasCusto({
    ...form,
    grossMonthlySalary: grossSalary,
    maritalStatus, dependents,
  } as Employee, assumptions), [form, grossSalary, maritalStatus, dependents, assumptions]);

  // Live capacity analysis
  const capacity = parseFloat(String(form.monthlyBillableCapacity ?? 0)) || 0;
  const grossMargin = assumptions.grossMargin;
  const annualizedCost = totalMonthlyCost * (assumptions.monthsPaidPerYear / 12);
  const breakEvenUtil  = capacity > 0 && grossMargin > 0 ? annualizedCost / (capacity * grossMargin) : null;

  function handleSubmit() {
    if (!form.name) return;
    onSave({
      ...form,
      id:               existing?.id ?? `emp-${Date.now()}`,
      grossMonthlySalary: grossSalary,
      department,
      maritalStatus,
      dependents,
      hiringModel,
      monthlyBillableCapacity: form.monthlyBillableCapacity ?? 0,
      ajudasCustoDiasPerMonth:  form.ajudasCustoDiasPerMonth  ?? 0,
      ajudasCustoTipo:          form.ajudasCustoTipo          ?? 'none',
      ajudasCustoValorDiaCustom: form.ajudasCustoValorDiaCustom ?? 0,
      ajudasKmPerMonth:         form.ajudasKmPerMonth         ?? 0,
      ajudasKmRateCustom:       form.ajudasKmRateCustom       ?? 0,
      ajudasKmVehicle:          form.ajudasKmVehicle          ?? 'car',
      monthlyToolsCost:        form.monthlyToolsCost    ?? toolsCost,
      monthlyOtherCosts:       form.monthlyOtherCosts   ?? otherCosts,
      monthlyMealAllowance:    form.monthlyMealAllowance ?? mealAllowance,
    } as Employee);
    onClose();
  }

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Editar Colaborador' : 'Adicionar Colaborador'}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Introduz o salário líquido — o bruto e IRS são calculados pelas tabelas 2025.</p>
        </div>

        <div className="p-6 space-y-5">

          {/* Identificação */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Identificação</p>
            {(['name', 'role'] as const).map(key => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{key === 'name' ? 'Nome' : 'Cargo detalhado'}</label>
                <input type="text" value={(form[key] as string) ?? ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Departamento</label>
                <select value={department} onChange={e => handleDeptChange(e.target.value as Employee['department'])}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Employee['status'] }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="planned">Planeado</option>
                  <option value="active">Ativo</option>
                  <option value="suspended">Suspenso</option>
                  <option value="terminated">Terminado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modelo de contratação */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Modelo de Análise de Contratação</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setHiringModel('revenue_based')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${hiringModel === 'revenue_based' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <TrendingUp className={`w-4 h-4 mb-1 ${hiringModel === 'revenue_based' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <p className={`text-xs font-bold ${hiringModel === 'revenue_based' ? 'text-indigo-900' : 'text-slate-700'}`}>Receita Directa</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Comercial, Gestão — traz clientes/receita</p>
              </button>
              <button
                type="button"
                onClick={() => setHiringModel('capacity_based')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${hiringModel === 'capacity_based' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <Zap className={`w-4 h-4 mb-1 ${hiringModel === 'capacity_based' ? 'text-purple-600' : 'text-slate-400'}`} />
                <p className={`text-xs font-bold ${hiringModel === 'capacity_based' ? 'text-purple-900' : 'text-slate-700'}`}>Capacidade / Execução</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Programadores, Delivery — executa o trabalho</p>
              </button>
            </div>
          </div>

          {/* Perfil fiscal */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Perfil Fiscal IRS 2025</p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Estado Civil</label>
              <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value as MaritalStatus)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {MARITAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nº de Dependentes</label>
              <input type="number" value={dependents} min={0} max={10} step={1}
                onChange={e => setDependents(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Calculadora líquido → bruto */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <p className="text-sm font-semibold text-indigo-900">Salário: Líquido → Bruto</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Salário Líquido desejado (€/mês)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">€</span>
                <input type="number" value={netSalaryStr} step={50} min={0}
                  onChange={e => setNetSalaryStr(e.target.value)}
                  onBlur={() => { const v = parseFloat(netSalaryStr); if (!isNaN(v) && v > 0) setNetSalaryStr(String(Math.round(v))); }}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-indigo-100 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recibo de Vencimento</p>
              <div className="flex justify-between text-xs text-slate-600">
                <span className="font-medium">Salário Bruto</span>
                <span className="font-bold text-slate-900">{formatCurrency(grossSalary)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>− SS Trabalhador ({formatPercent(ssEmployee)})</span>
                <span className="text-red-500">− {formatCurrency(payslip.ss_employee)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>− IRS Retido ({formatPercent(payslip.effectiveIRSRate)} efetivo)</span>
                <span className="text-red-500">− {formatCurrency(payslip.irs)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-700 border-t border-slate-100 pt-1.5 mt-1">
                <span>= Salário Líquido</span>
                <span>{formatCurrency(payslip.net)} /mês</span>
              </div>
            </div>
            <div className="bg-indigo-600 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">Custo Total para a Empresa / Mês</p>
              {[
                ['Salário Bruto', grossSalary],
                [`+ SS Patronal (${formatPercent(ssEmployer)})`, payslip.ss_employer],
                ['+ Subsídio alimentação', mealAllowance],
                ['+ Ferramentas + outros', toolsCost + otherCosts],
              ].map(([l, v]) => (
                <div key={String(l)} className="flex justify-between text-xs text-indigo-200">
                  <span>{l}</span><span>{formatCurrency(Number(v))}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold text-white border-t border-indigo-500 pt-1.5 mt-1">
                <span>Total / Mês</span><span>{formatCurrency(totalMonthlyCost)}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-indigo-700">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Tabelas IRS 2025 — Despacho n.º 236-A/2025, de 6 de janeiro (Continente)</span>
            </div>
          </div>

          {/* ── Ajudas de Custo ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ajudas de Custo (AT 2025)</p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Deslocação</label>
              <select
                value={form.ajudasCustoTipo ?? 'none'}
                onChange={e => setForm(p => ({ ...p, ajudasCustoTipo: e.target.value as Employee['ajudasCustoTipo'] }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="none">Sem ajudas de custo</option>
                <option value="national_day">Nacional — sem pernoita (limite AT: {formatCurrency(AT_AJUDAS_LIMITS.national_day)}/dia)</option>
                <option value="national_overnight">Nacional — com pernoita (limite AT: {formatCurrency(AT_AJUDAS_LIMITS.national_overnight)}/dia)</option>
                <option value="international">Internacional — UE (limite AT: {formatCurrency(AT_AJUDAS_LIMITS.international)}/dia)</option>
              </select>
            </div>

            {(form.ajudasCustoTipo ?? 'none') !== 'none' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Dias por mês</label>
                    <input type="number" min={0} max={22} step={1}
                      value={form.ajudasCustoDiasPerMonth ?? 0}
                      onChange={e => setForm(p => ({ ...p, ajudasCustoDiasPerMonth: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Valor/dia (€) <span className="text-slate-400 font-normal">— 0 = limite AT</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                      <input type="number" min={0} step={5}
                        value={form.ajudasCustoValorDiaCustom ?? 0}
                        placeholder={String(AT_AJUDAS_LIMITS[form.ajudasCustoTipo ?? 'national_day'] ?? 0)}
                        onChange={e => setForm(p => ({ ...p, ajudasCustoValorDiaCustom: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {(form.ajudasCustoDiasPerMonth ?? 0) > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-1.5">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Breakdown Ajudas Diárias/mês</p>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>{liveAjudas.diasPerMonth} dias × {formatCurrency(liveAjudas.valorDia)}/dia</span>
                      <span className="font-bold text-slate-800">{formatCurrency(liveAjudas.monthlyDiaria)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-700">
                      <span>✓ Isento AT ({liveAjudas.diasPerMonth} dias × {formatCurrency(liveAjudas.atLimitDia)})</span>
                      <span className="font-semibold">{formatCurrency(liveAjudas.monthlyDiariaExempt)}</span>
                    </div>
                    {liveAjudas.monthlyDiariaTaxable > 0 && (
                      <div className="flex justify-between text-xs text-amber-700">
                        <span>⚠ Tributável (excede limite AT)</span>
                        <span className="font-semibold">{formatCurrency(liveAjudas.monthlyDiariaTaxable)}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Ajudas de Custo por Km ── */}
            <div className="space-y-3 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ajudas por Km — Viatura Própria (AT 2025)</p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Viatura</label>
                <select
                  value={form.ajudasKmVehicle ?? 'car'}
                  onChange={e => setForm(p => ({ ...p, ajudasKmVehicle: e.target.value as Employee['ajudasKmVehicle'] }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="car">Automóvel (limite AT: €0,40/km)</option>
                  <option value="motorcycle">Motociclo (limite AT: €0,24/km)</option>
                  <option value="bicycle">Bicicleta/Ciclomotor (limite AT: €0,15/km)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Km por mês</label>
                  <input type="number" min={0} step={50}
                    value={form.ajudasKmPerMonth ?? 0}
                    onChange={e => setForm(p => ({ ...p, ajudasKmPerMonth: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Valor/km (€) <span className="text-slate-400 font-normal">— 0 = limite AT</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                    <input type="number" min={0} step={0.01}
                      value={form.ajudasKmRateCustom ?? 0}
                      onChange={e => setForm(p => ({ ...p, ajudasKmRateCustom: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Km + total summary */}
              {(liveAjudas.monthlyTotal > 0) && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-1.5">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Total Ajudas de Custo/mês</p>
                  {liveAjudas.monthlyDiaria > 0 && (
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Ajudas diárias ({liveAjudas.diasPerMonth} dias)</span>
                      <span className="font-semibold">{formatCurrency(liveAjudas.monthlyDiaria)}</span>
                    </div>
                  )}
                  {liveAjudas.monthlyKm > 0 && (
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Ajudas km ({liveAjudas.kmPerMonth} km × {formatCurrency(liveAjudas.ratePerKm)})</span>
                      <span className="font-semibold">{formatCurrency(liveAjudas.monthlyKm)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-emerald-700 border-t border-emerald-200 pt-1.5 mt-1">
                    <span>✓ Total isento AT</span>
                    <span className="font-semibold">{formatCurrency(liveAjudas.monthlyExempt)}</span>
                  </div>
                  {liveAjudas.monthlyTaxable > 0 && (
                    <div className="flex justify-between text-xs text-amber-700">
                      <span>⚠ Total tributável</span>
                      <span className="font-semibold">{formatCurrency(liveAjudas.monthlyTaxable)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold text-emerald-800 border-t border-emerald-200 pt-1.5 mt-1">
                    <span>Benefício líquido p/ colaborador</span>
                    <span>{formatCurrency(liveAjudas.netBenefitEmployee)}/mês</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Total a receber (líquido + ajudas)</span>
                    <span className="font-bold text-slate-800">{formatCurrency(payslip.net + liveAjudas.netBenefitEmployee)}/mês</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Campos específicos do modelo */}
          {hiringModel === 'capacity_based' ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Modelo de Capacidade</p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Capacidade Faturável Máxima (€/mês a 100% ocupação)</label>
                <p className="text-xs text-slate-400 mb-1">Ex: 160h × 75€/h = 12.000€ · ou valor de projetos que consegue executar/mês</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">€</span>
                  <input type="number" value={form.monthlyBillableCapacity ?? 0} min={0} step={1000}
                    onChange={f('monthlyBillableCapacity')}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              {/* Live utilization preview */}
              {capacity > 0 && breakEvenUtil !== null && (
                <div className={`rounded-xl p-4 border ${breakEvenUtil <= 0.6 ? 'bg-emerald-50 border-emerald-200' : breakEvenUtil <= 0.8 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-sm font-bold mb-2 ${breakEvenUtil <= 0.6 ? 'text-emerald-800' : breakEvenUtil <= 0.8 ? 'text-amber-800' : 'text-red-800'}`}>
                    Break-even a {(breakEvenUtil * 100).toFixed(0)}% de ocupação
                    {breakEvenUtil <= 0.6 ? ' ✓ Seguro' : breakEvenUtil <= 0.8 ? ' ⚠ Atenção' : ' ✗ Arriscado'}
                  </p>
                  <div className="space-y-1.5">
                    {[0.5, 0.7, 1.0].map(pct => {
                      const rev = capacity * pct;
                      const profit = rev * grossMargin - annualizedCost;
                      return (
                        <div key={pct} className="flex justify-between text-xs">
                          <span className="text-slate-600">{(pct * 100).toFixed(0)}% ocupação → {formatCurrency(rev)}/mês faturado</span>
                          <span className={`font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit)} resultado
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Receita e Comissões</p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Receita Mensal Esperada (€)</label>
                <p className="text-xs text-slate-400 mb-1">Volume de negócio que esta pessoa traz/gere por mês</p>
                <input type="number" value={form.expectedMonthlyRevenue ?? 0} min={0} step={1000}
                  onChange={f('expectedMonthlyRevenue')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Comissão sobre Receita (%)</label>
                <input type="number" value={form.variableCommission ?? 0} min={0} max={30} step={0.5}
                  onChange={f('variableCommission')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          )}

          {/* Outros custos */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outros Custos (opcionais)</p>
            {[
              { key: 'monthlyToolsCost'     as const, label: 'Ferramentas / Software (€/mês)',  dflt: toolsCost },
              { key: 'monthlyMealAllowance' as const, label: 'Subsídio Alimentação (€/mês)',    dflt: mealAllowance },
              { key: 'monthlyOtherCosts'    as const, label: 'Outros Custos Mensais (€/mês)',   dflt: otherCosts },
              { key: 'annualBonus'          as const, label: 'Bónus Anual (€)',                 dflt: 0 },
              { key: 'initialEquipmentCost' as const, label: 'Equipamento Inicial (€)',         dflt: assumptions.averageEquipmentCost },
              { key: 'trainingCost'         as const, label: 'Custo de Formação (€)',           dflt: 500 },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{field.label}</label>
                <input type="number" value={(form[field.key] as number) ?? field.dflt} onChange={f(field.key)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Entrada</label>
              <input type="date" value={(form.startDate as string) ?? new Date().toISOString().split('T')[0]}
                onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={handleSubmit} disabled={!form.name}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {isEdit ? 'Guardar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ContratacoesPage() {
  const { assumptions, employees, addEmployee, updateEmployee, removeEmployee } = useAppStore();
  const [showModal,       setShowModal]       = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const allCalcs = useMemo(
    () => employees.map(e => calculateEmployeeCalculations(e, assumptions)),
    [employees, assumptions]
  );

  const totalMonthlyCost = allCalcs.reduce((s, c) => s + c.annualizedMonthlyCost, 0);
  const totalCapacity    = employees
    .filter(e => (e.hiringModel ?? 'revenue_based') === 'capacity_based')
    .reduce((s, e) => s + (e.monthlyBillableCapacity ?? 0), 0);
  const totalBreakEven   = allCalcs
    .filter((_, i) => (employees[i].hiringModel ?? 'revenue_based') === 'revenue_based')
    .reduce((s, c) => s + c.breakEvenRevenue, 0);

  function handleSave(emp: Employee) {
    if (editingEmployee) { updateEmployee(emp.id, emp); setEditingEmployee(null); }
    else { addEmployee(emp); setShowModal(false); }
  }

  return (
    <div>
      <PageHeader
        title="Contratações"
        description="Dois modelos de análise: receita directa (comercial) e capacidade/utilização (programadores, delivery)."
        badge={`${employees.length} colaboradores`}
      >
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" />Adicionar Colaborador
        </button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Colaboradores</p>
          <p className="text-2xl font-bold text-slate-900">{employees.filter(e => e.status === 'active' || e.status === 'planned').length}</p>
          <p className="text-xs text-slate-400 mt-1">{employees.filter(e => e.status === 'active').length} ativos</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 mb-1">Custo Equipa/Mês</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalMonthlyCost)}</p>
          <p className="text-xs text-slate-400 mt-1">anualizado (14 meses)</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs text-slate-500 mb-1">Break-Even Equipa (receita)</p>
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalBreakEven)}</p>
          <p className="text-xs text-slate-400 mt-1">só modelo receita directa</p>
        </div>
        <div className="bg-white rounded-xl border border-purple-200 bg-purple-50 p-5">
          <p className="text-xs text-slate-500 mb-1">Capacidade Total/Mês</p>
          <p className="text-2xl font-bold text-purple-700">{totalCapacity > 0 ? formatCurrency(totalCapacity) : '—'}</p>
          <p className="text-xs text-slate-400 mt-1">100% utilização · delivery+tech</p>
        </div>
      </div>

      <div className="space-y-4">
        {employees.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhum colaborador adicionado</p>
            <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              Adicionar Colaborador
            </button>
          </div>
        ) : (
          employees.map(emp => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              assumptions={assumptions}
              onRemove={() => removeEmployee(emp.id)}
              onEdit={() => setEditingEmployee(emp)}
            />
          ))
        )}
      </div>

      {(showModal || editingEmployee) && (
        <EmployeeModal
          assumptions={assumptions}
          existing={editingEmployee ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingEmployee(null); }}
        />
      )}
    </div>
  );
}
