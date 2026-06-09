'use client';
import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { base, BRAND } from './styles';
import { formatCurrency, formatPercent, calculateEmployeeCalculations } from '@/lib/financialCalculations';
import { calcPayslip } from '@/lib/irsCalculations';
import type { AppState } from '@/lib/types';

interface Props {
  state: AppState;
  generatedAt: string;
}

function Footer({ title }: { title: string }) {
  return (
    <View style={base.footer} fixed>
      <Text style={base.footerText}>Gambit Labs · Business Simulator</Text>
      <Text style={base.footerText}>{title}</Text>
      <Text style={base.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function KPICard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <View style={accent ? base.kpiCardAccent : base.kpiCard}>
      <Text style={accent ? base.kpiLabelWhite : base.kpiLabel}>{label}</Text>
      <Text style={accent ? base.kpiValueWhite : base.kpiValue}>{value}</Text>
      {sub && <Text style={accent ? base.kpiSubWhite : base.kpiSub}>{sub}</Text>}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={base.sectionTitle}>{children}</Text>;
}

const DEPT_LABELS: Record<string, string> = {
  commercial: 'Comercial', delivery: 'Delivery', management: 'Gestão', admin: 'Administrativo', tech: 'Tecnologia',
};

export function ReportEquipa({ state, generatedAt }: Props) {
  const { assumptions, employees, freelancers, fixedCostItems } = state;

  const activeEmps = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const allCalcs = activeEmps.map(e => ({ e, calc: calculateEmployeeCalculations(e, assumptions) }));

  const totalMonthlyCost = allCalcs.reduce((s, { calc }) => s + calc.annualizedMonthlyCost, 0);
  const totalAnnualCost  = allCalcs.reduce((s, { calc }) => s + calc.annualCost, 0);
  const totalBreakEven   = allCalcs.reduce((s, { calc }) => s + calc.breakEvenRevenue, 0);
  const totalGross       = activeEmps.reduce((s, e) => s + e.grossMonthlySalary, 0);
  const totalSS          = activeEmps.reduce((s, e) => s + e.grossMonthlySalary * assumptions.employerSocialSecurityRate, 0);

  const fixedMonthly = fixedCostItems.length > 0
    ? fixedCostItems.reduce((s, i) => s + i.amount, 0)
    : assumptions.monthlyFixedCosts;
  const freelancerMonthly = (freelancers ?? [])
    .filter(f => f.status === 'active' || f.status === 'planned')
    .reduce((s, f) => s + f.monthlyCost, 0);

  const decisionColors: Record<string, { style: Style; label: string }> = {
    hire:      { style: base.tdCellGreen, label: 'Contratar' },
    wait:      { style: base.tdCell,      label: 'Aguardar' },
    dont_hire: { style: base.tdCellRed,   label: 'Não contratar' },
  };

  return (
    <Document>
      {/* ── PAGE 1: Summary + Costs ── */}
      <Page size="A4" style={base.page}>
        <View style={base.headerBar}>
          <View>
            <Text style={base.headerTitle}>Relatório de Equipa</Text>
            <Text style={base.headerSub}>Custos e Break-Even por Colaborador · Gerado em {generatedAt}</Text>
          </View>
          <View>
            <Text style={[base.headerBrand, base.bold]}>GAMBIT LABS</Text>
            <Text style={base.headerBrand}>Business Simulator</Text>
          </View>
        </View>

        {/* KPIs */}
        <View style={base.kpiGrid}>
          <KPICard label="Total Colaboradores" value={String(activeEmps.length)} sub={`${employees.filter(e => e.status === 'active').length} ativos`} accent />
          <KPICard label="Custo Equipa/mês" value={formatCurrency(totalMonthlyCost)} sub="Inclui SS, subsídios, ferramentas" />
          <KPICard label="Custo Equipa/ano" value={formatCurrency(totalAnnualCost)} sub="Anualizado (14 meses)" />
          <KPICard label="Break-Even Equipa/mês" value={formatCurrency(totalBreakEven)} sub="Receita mínima para cobrir equipa" />
        </View>

        <View style={base.kpiGrid}>
          <KPICard label="Total Salários Brutos/mês" value={formatCurrency(totalGross)} />
          <KPICard label="SS Patronal Total/mês" value={formatCurrency(totalSS)} sub={formatPercent(assumptions.employerSocialSecurityRate)} />
          <KPICard label="Custos Fixos/mês" value={formatCurrency(fixedMonthly)} sub={fixedCostItems.length > 0 ? `${fixedCostItems.length} rúbricas` : 'De Pressupostos'} />
          <KPICard label="Freelancers/mês" value={formatCurrency(freelancerMonthly)} sub={`${(freelancers ?? []).filter(f => f.status !== 'inactive').length} ativos/planeados`} />
        </View>

        {/* Full cost table */}
        <SectionTitle>Custo Detalhado por Colaborador</SectionTitle>
        <View style={base.table}>
          <View style={base.tableHeader}>
            <Text style={[base.thCell, { flex: 2 }]}>Nome</Text>
            <Text style={[base.thCell, { flex: 1.5 }]}>Depto.</Text>
            <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Bruto/mês</Text>
            <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>SS Pat.</Text>
            <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Outros</Text>
            <Text style={[base.thCell, { flex: 1.8, textAlign: 'right' }]}>Custo Real/mês</Text>
            <Text style={[base.thCell, { flex: 1.2, textAlign: 'right' }]}>Custo/ano</Text>
          </View>
          {allCalcs.map(({ e, calc }, i) => {
            const ss = e.grossMonthlySalary * assumptions.employerSocialSecurityRate;
            const outros = e.monthlyMealAllowance + e.monthlyToolsCost + e.monthlyOtherCosts;
            return (
              <View key={e.id} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
                <Text style={[base.tdCellBold, { flex: 2 }]}>{e.name}</Text>
                <Text style={[base.tdCell, { flex: 1.5 }]}>{DEPT_LABELS[e.department] ?? e.department}</Text>
                <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(e.grossMonthlySalary)}</Text>
                <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(ss)}</Text>
                <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(outros)}</Text>
                <Text style={[base.tdCellBold, { flex: 1.8, textAlign: 'right' }]}>{formatCurrency(calc.annualizedMonthlyCost)}</Text>
                <Text style={[base.tdCellBold, { flex: 1.2, textAlign: 'right' }]}>{formatCurrency(calc.annualCost)}</Text>
              </View>
            );
          })}
          {/* Totals */}
          <View style={[base.tableRow, { backgroundColor: '#e0e7ff' }]}>
            <Text style={[base.tdCellBold, { flex: 2 }]}>TOTAL</Text>
            <Text style={[base.tdCell, { flex: 1.5 }]}></Text>
            <Text style={[base.tdCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(totalGross)}</Text>
            <Text style={[base.tdCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(totalSS)}</Text>
            <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}></Text>
            <Text style={[base.tdCellBold, { flex: 1.8, textAlign: 'right' }]}>{formatCurrency(totalMonthlyCost)}</Text>
            <Text style={[base.tdCellBold, { flex: 1.2, textAlign: 'right' }]}>{formatCurrency(totalAnnualCost)}</Text>
          </View>
        </View>

        <Footer title="Relatório de Equipa · Custos" />
      </Page>

      {/* ── PAGE 2: Break-even + Payslips ── */}
      <Page size="A4" style={base.page}>
        <View style={base.headerBar}>
          <View>
            <Text style={base.headerTitle}>Relatório de Equipa</Text>
            <Text style={base.headerSub}>Break-Even e Análise Salarial · Gerado em {generatedAt}</Text>
          </View>
        </View>

        <SectionTitle>Break-Even e Decisão por Colaborador</SectionTitle>
        <View style={base.table}>
          <View style={base.tableHeader}>
            <Text style={[base.thCell, { flex: 2.5 }]}>Nome</Text>
            <Text style={[base.thCell, { flex: 1.8, textAlign: 'right' }]}>Break-Even/mês</Text>
            <Text style={[base.thCell, { flex: 2, textAlign: 'right' }]}>Com Margem-Alvo</Text>
            <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Receita Esp./mês</Text>
            <Text style={[base.thCell, { flex: 1.5 }]}>Decisão</Text>
          </View>
          {allCalcs.map(({ e, calc }, i) => {
            const dc = decisionColors[calc.decision] ?? decisionColors.wait;
            return (
              <View key={e.id} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
                <Text style={[base.tdCellBold, { flex: 2.5 }]}>{e.name}</Text>
                <Text style={[base.tdCellBold, { flex: 1.8, textAlign: 'right' }]}>{formatCurrency(calc.breakEvenRevenue)}</Text>
                <Text style={[base.tdCell, { flex: 2, textAlign: 'right' }]}>{formatCurrency(calc.requiredRevenueForTargetMargin)}</Text>
                <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(e.expectedMonthlyRevenue)}</Text>
                <Text style={[dc.style, { flex: 1.5 }]}>{dc.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Payslip breakdown */}
        <SectionTitle>Recibo de Vencimento Detalhado (IRS 2025)</SectionTitle>
        <View style={base.table}>
          <View style={base.tableHeader}>
            <Text style={[base.thCell, { flex: 2.5 }]}>Nome</Text>
            <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Bruto/mês</Text>
            <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>SS Trab. (11%)</Text>
            <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>IRS Retido</Text>
            <Text style={[base.thCell, { flex: 1, textAlign: 'right' }]}>Taxa IRS</Text>
            <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Líquido/mês</Text>
            <Text style={[base.thCell, { flex: 1 }]}>Est. Civil</Text>
            <Text style={[base.thCell, { flex: 0.8, textAlign: 'right' }]}>Dep.</Text>
          </View>
          {activeEmps.map((e, i) => {
            const ps = calcPayslip(e.grossMonthlySalary, assumptions.employeeSocialSecurityRate, assumptions.employerSocialSecurityRate, e.maritalStatus ?? 'single', e.dependents ?? 0);
            const maritalLabels: Record<string, string> = { single: 'Solteiro', married_dual: 'Cas. 2T', married_single: 'Cas. 1T' };
            return (
              <View key={e.id} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
                <Text style={[base.tdCellBold, { flex: 2.5 }]}>{e.name}</Text>
                <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(ps.gross)}</Text>
                <Text style={[base.tdCellRed, { flex: 1.5, textAlign: 'right' }]}>−{formatCurrency(ps.ss_employee)}</Text>
                <Text style={[base.tdCellRed, { flex: 1.5, textAlign: 'right' }]}>−{formatCurrency(ps.irs)}</Text>
                <Text style={[base.tdCell, { flex: 1, textAlign: 'right' }]}>{formatPercent(ps.effectiveIRSRate)}</Text>
                <Text style={[base.tdCellGreen, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(ps.net)}</Text>
                <Text style={[base.tdCell, { flex: 1 }]}>{maritalLabels[e.maritalStatus ?? 'single']}</Text>
                <Text style={[base.tdCell, { flex: 0.8, textAlign: 'right' }]}>{e.dependents ?? 0}</Text>
              </View>
            );
          })}
        </View>

        {/* Fixed costs breakdown if available */}
        {fixedCostItems.length > 0 && (
          <>
            <SectionTitle>Custos Fixos Mensais</SectionTitle>
            <View style={base.table}>
              <View style={base.tableHeader}>
                <Text style={[base.thCell, { flex: 3 }]}>Rubrica</Text>
                <Text style={[base.thCell, { flex: 2 }]}>Categoria</Text>
                <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Mensal</Text>
                <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Anual</Text>
              </View>
              {fixedCostItems.map((item, i) => (
                <View key={item.id} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
                  <Text style={[base.tdCellBold, { flex: 3 }]}>{item.label}</Text>
                  <Text style={[base.tdCell, { flex: 2 }]}>{item.category}</Text>
                  <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(item.amount)}</Text>
                  <Text style={[base.tdCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(item.amount * 12)}</Text>
                </View>
              ))}
              <View style={[base.tableRow, { backgroundColor: '#e0e7ff' }]}>
                <Text style={[base.tdCellBold, { flex: 3 }]}>TOTAL</Text>
                <Text style={[base.tdCell, { flex: 2 }]}></Text>
                <Text style={[base.tdCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(fixedMonthly)}</Text>
                <Text style={[base.tdCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(fixedMonthly * 12)}</Text>
              </View>
            </View>
          </>
        )}

        <Footer title="Relatório de Equipa · Break-Even e Recibos" />
      </Page>
    </Document>
  );
}
