'use client';
import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { base, BRAND } from './styles';
import { formatCurrency, formatPercent, calculateEmployeeCalculations, calculateLoanPayment } from '@/lib/financialCalculations';
import type { AppState, TaxConfig, YearPlan } from '@/lib/types';

interface Props {
  state: AppState & { taxConfig: TaxConfig; yearPlans: YearPlan[] };
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

function KPICard({ label, value, sub, accent, warn }: { label: string; value: string; sub?: string; accent?: boolean; warn?: boolean }) {
  const cardStyle = accent ? base.kpiCardAccent : warn ? { ...base.kpiCard, backgroundColor: '#fef3c7' } : base.kpiCard;
  return (
    <View style={cardStyle}>
      <Text style={accent ? base.kpiLabelWhite : base.kpiLabel}>{label}</Text>
      <Text style={accent ? base.kpiValueWhite : base.kpiValue}>{value}</Text>
      {sub && <Text style={accent ? base.kpiSubWhite : base.kpiSub}>{sub}</Text>}
    </View>
  );
}

function PLRow({ label, value, bold, indent, green, red }: { label: string; value: string; bold?: boolean; indent?: boolean; green?: boolean; red?: boolean }) {
  return (
    <View style={bold ? base.plRowBold : base.plRow}>
      <Text style={indent ? base.plLabelIndent : bold ? base.plLabelBold : base.plLabel}>{label}</Text>
      <Text style={green ? base.plValueGreen : red ? base.plValueRed : base.plValue}>{value}</Text>
    </View>
  );
}

export function ReportComissoes({ state, generatedAt }: Props) {
  const { assumptions, employees, freelancers, investments, fixedCostItems, taxConfig, monthlyResults, yearPlans } = state;

  const activeEmps = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const empWithComm = activeEmps.filter(e => e.variableCommission > 0);

  // Base monthly costs
  const teamCost = activeEmps.reduce((s, e) => s + calculateEmployeeCalculations(e, assumptions).annualizedMonthlyCost, 0);
  const fixedMonthly = fixedCostItems.length > 0
    ? fixedCostItems.reduce((s, i) => s + i.amount, 0)
    : assumptions.monthlyFixedCosts;
  const freelancerCost = (freelancers ?? []).filter(f => f.status === 'active' || f.status === 'planned').reduce((s, f) => s + f.monthlyCost, 0);
  const rate = assumptions.baseInterestRate + assumptions.spread;
  const debtService = investments
    .filter(i => (i.status === 'in_progress' || i.status === 'approved') && i.financedAmount > 0)
    .reduce((s, inv) => s + calculateLoanPayment(inv.financedAmount, rate, 60), 0);

  const totalFixedCosts = teamCost + fixedMonthly + freelancerCost + debtService;

  // Current commission structure
  const autoCommRate = empWithComm.reduce((s, e) => s + e.variableCommission / 100, 0);

  // Reference revenue — last month actual or from yearPlans current year
  const lastResult = [...monthlyResults].sort((a, b) => b.month.localeCompare(a.month))[0];
  const currentYear = new Date().getFullYear();
  const currentPlan = yearPlans.find(y => y.year === currentYear);
  const refMonthlyRevenue = lastResult?.actualRevenue ?? (currentPlan ? currentPlan.revenueTarget / 12 : assumptions.annualRevenueGoal / 12);

  // Commission scenarios
  const scenarios = [0, 0.02, 0.03, 0.05, 0.07, 0.10, 0.12, 0.15, 0.20].map(rate => {
    const comm = refMonthlyRevenue * rate;
    const ebitda = refMonthlyRevenue - totalFixedCosts - comm;
    const irc = ebitda > 0 ? (taxConfig.isPME
      ? Math.min(ebitda * 12, taxConfig.ircReducedThreshold) * taxConfig.ircReducedRate / 12 + Math.max(0, ebitda * 12 - taxConfig.ircReducedThreshold) * taxConfig.ircStandardRate / 12
      : ebitda * taxConfig.ircStandardRate)
      : 0;
    const net = ebitda - irc;
    const margin = refMonthlyRevenue > 0 ? net / refMonthlyRevenue : 0;
    return { rate, comm, ebitda, net, margin };
  });

  // Current scenario
  const currentComm = refMonthlyRevenue * autoCommRate;
  const currentEbitda = refMonthlyRevenue - totalFixedCosts - currentComm;
  const currentIrc = currentEbitda > 0 ? (taxConfig.isPME
    ? Math.min(currentEbitda * 12, taxConfig.ircReducedThreshold) * taxConfig.ircReducedRate / 12 + Math.max(0, currentEbitda * 12 - taxConfig.ircReducedThreshold) * taxConfig.ircStandardRate / 12
    : currentEbitda * taxConfig.ircStandardRate)
    : 0;
  const currentNet = currentEbitda - currentIrc;
  const currentMargin = refMonthlyRevenue > 0 ? currentNet / refMonthlyRevenue : 0;

  // Max sustainable commission
  const maxComm = Math.max(0, refMonthlyRevenue - totalFixedCosts);
  const maxCommRate = refMonthlyRevenue > 0 ? maxComm / refMonthlyRevenue : 0;
  const safetyMargin = maxComm - currentComm;
  const isHealthy = currentNet > 0 && safetyMargin > currentComm * 0.5;
  const isWarning = currentNet >= 0 && !isHealthy;

  // Per-year commission from yearPlans
  const yearCommissions = yearPlans.map(p => {
    const effRate = (p.commissionRateOverride ?? 0) > 0 ? p.commissionRateOverride / 100 : autoCommRate;
    const annualComm = p.revenueTarget * effRate;
    return { year: p.year, revenue: p.revenueTarget, rate: effRate, amount: annualComm, isOverride: (p.commissionRateOverride ?? 0) > 0 };
  }).sort((a, b) => a.year - b.year);

  return (
    <Document>
      {/* ── PAGE 1: Current Structure & Sustainability ── */}
      <Page size="A4" style={base.page}>
        <View style={base.headerBar}>
          <View>
            <Text style={base.headerTitle}>Análise de Comissões</Text>
            <Text style={base.headerSub}>Sustentabilidade e Ponto de Equilíbrio · Gerado em {generatedAt}</Text>
          </View>
          <View>
            <Text style={[base.headerBrand, base.bold]}>GAMBIT LABS</Text>
            <Text style={base.headerBrand}>Business Simulator</Text>
          </View>
        </View>

        {/* KPIs */}
        <View style={base.kpiGrid}>
          <KPICard label="Receita de Referência/mês" value={formatCurrency(refMonthlyRevenue)}
            sub={lastResult ? `Real: ${lastResult.month}` : (currentPlan ? `Plano ${currentYear}` : 'Pressuposto')} accent />
          <KPICard label="Taxa Atual Comissões" value={formatPercent(autoCommRate)}
            sub={`${empWithComm.length} colaborador(es) com comissão`} />
          <KPICard label="Comissões/mês" value={formatCurrency(currentComm)}
            sub={`${formatCurrency(currentComm * 12)}/ano`} />
          <KPICard label="Máximo Sustentável" value={formatPercent(maxCommRate)}
            sub={`${formatCurrency(maxComm)}/mês`}
            warn={autoCommRate > maxCommRate * 0.8} />
        </View>

        <View style={base.kpiGrid}>
          <KPICard label="Custos Fixos Totais/mês" value={formatCurrency(totalFixedCosts)} sub="Equipa + Fixos + Freelancers + Dívida" />
          <KPICard label="Lucro após Comissões/mês" value={formatCurrency(currentNet)} sub={`Margem: ${formatPercent(currentMargin)}`} />
          <KPICard label="Margem de Segurança" value={formatCurrency(safetyMargin)} sub="Pode aumentar comissões em..." />
          <KPICard label="Situação Atual" value={isHealthy ? 'Sustentável' : isWarning ? 'Atenção' : 'Crítico'}
            sub={isHealthy ? 'Comissões em zona segura' : isWarning ? 'Margem de segurança baixa' : 'Resultado negativo'} />
        </View>

        {/* P&L with current commissions */}
        <Text style={base.sectionTitle}>P&L Mensal — Estrutura Atual</Text>
        <View>
          <PLRow label="Receita" value={formatCurrency(refMonthlyRevenue)} bold />
          <PLRow label="Custos de Equipa" value={`− ${formatCurrency(teamCost)}`} indent red />
          {freelancerCost > 0 && <PLRow label="Freelancers" value={`− ${formatCurrency(freelancerCost)}`} indent red />}
          <PLRow label="Custos Fixos" value={`− ${formatCurrency(fixedMonthly)}`} indent red />
          {debtService > 0 && <PLRow label="Serviço da Dívida" value={`− ${formatCurrency(debtService)}`} indent red />}
          <PLRow label="Comissões" value={`− ${formatCurrency(currentComm)}`} indent red />
          <PLRow label="EBITDA" value={formatCurrency(currentEbitda)} bold green={currentEbitda > 0} red={currentEbitda < 0} />
          <PLRow label={`IRC (${taxConfig.isPME ? 'PME' : formatPercent(taxConfig.ircStandardRate)})`} value={`− ${formatCurrency(currentIrc)}`} indent red={currentIrc > 0} />
          <PLRow label="Lucro Líquido" value={formatCurrency(currentNet)} bold green={currentNet > 0} red={currentNet < 0} />
        </View>

        {/* Per-employee commissions */}
        {empWithComm.length > 0 && (
          <>
            <Text style={[base.sectionTitle, { marginTop: 16 }]}>Comissões por Colaborador</Text>
            <View style={base.table}>
              <View style={base.tableHeader}>
                <Text style={[base.thCell, { flex: 2.5 }]}>Colaborador</Text>
                <Text style={[base.thCell, { flex: 1.5 }]}>Cargo</Text>
                <Text style={[base.thCell, { flex: 1, textAlign: 'right' }]}>Taxa</Text>
                <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Comissão/mês</Text>
                <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Comissão/ano</Text>
                <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>% do Custo Total</Text>
              </View>
              {empWithComm.map((e, i) => {
                const monthly = refMonthlyRevenue * (e.variableCommission / 100);
                const totalCostE = calculateEmployeeCalculations(e, assumptions).annualizedMonthlyCost;
                const pct = totalCostE > 0 ? monthly / totalCostE : 0;
                return (
                  <View key={e.id} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
                    <Text style={[base.tdCellBold, { flex: 2.5 }]}>{e.name}</Text>
                    <Text style={[base.tdCell, { flex: 1.5 }]}>{e.role}</Text>
                    <Text style={[base.tdCell, { flex: 1, textAlign: 'right' }]}>{e.variableCommission}%</Text>
                    <Text style={[base.tdCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(monthly)}</Text>
                    <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(monthly * 12)}</Text>
                    <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatPercent(pct)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Footer title="Análise de Comissões · Estrutura Atual" />
      </Page>

      {/* ── PAGE 2: Scenarios + 5-Year Plan ── */}
      <Page size="A4" style={base.page}>
        <View style={base.headerBar}>
          <View>
            <Text style={base.headerTitle}>Análise de Comissões</Text>
            <Text style={base.headerSub}>Cenários e Planeamento · Gerado em {generatedAt}</Text>
          </View>
        </View>

        {/* Scenario table */}
        <Text style={base.sectionTitle}>Cenários de Comissão — {formatCurrency(refMonthlyRevenue)}/mês</Text>
        <View style={base.table}>
          <View style={base.tableHeader}>
            <Text style={[base.thCell, { flex: 1.2 }]}>Taxa</Text>
            <Text style={[base.thCell, { flex: 1.8, textAlign: 'right' }]}>Comissões/mês</Text>
            <Text style={[base.thCell, { flex: 1.8, textAlign: 'right' }]}>EBITDA/mês</Text>
            <Text style={[base.thCell, { flex: 1.8, textAlign: 'right' }]}>Lucro/mês</Text>
            <Text style={[base.thCell, { flex: 1.2, textAlign: 'right' }]}>Margem</Text>
            <Text style={[base.thCell, { flex: 1.5 }]}>Estado</Text>
          </View>
          {scenarios.map((s, i) => {
            const isCurrent = Math.abs(s.rate - autoCommRate) < 0.001;
            const status = s.net > 0 ? (s.margin > 0.15 ? 'Excelente' : 'OK') : s.net > -totalFixedCosts * 0.1 ? 'Atenção' : 'Insustentável';
            const rowStyle = isCurrent ? [base.tableRow, { backgroundColor: '#e0e7ff' }] : i % 2 === 0 ? base.tableRow : base.tableRowAlt;
            return (
              <View key={s.rate} style={rowStyle}>
                <Text style={[isCurrent ? base.tdCellBold : base.tdCell, { flex: 1.2 }]}>
                  {formatPercent(s.rate)}{isCurrent ? ' ←' : ''}
                </Text>
                <Text style={[base.tdCell, { flex: 1.8, textAlign: 'right' }]}>{formatCurrency(s.comm)}</Text>
                <Text style={[s.ebitda >= 0 ? base.tdCellGreen : base.tdCellRed, { flex: 1.8, textAlign: 'right' }]}>{formatCurrency(s.ebitda)}</Text>
                <Text style={[s.net >= 0 ? base.tdCellGreen : base.tdCellRed, { flex: 1.8, textAlign: 'right' }]}>{formatCurrency(s.net)}</Text>
                <Text style={[s.margin >= 0 ? base.tdCellGreen : base.tdCellRed, { flex: 1.2, textAlign: 'right' }]}>{formatPercent(s.margin)}</Text>
                <Text style={[s.net > 0 ? base.tdCellGreen : s.net > -100 ? base.tdCell : base.tdCellRed, { flex: 1.5 }]}>{status}</Text>
              </View>
            );
          })}
        </View>

        {/* 5-year commission plan */}
        {yearCommissions.length > 0 && (
          <>
            <Text style={[base.sectionTitle, { marginTop: 16 }]}>Plano de Comissões — 5 Anos</Text>
            <View style={base.table}>
              <View style={base.tableHeader}>
                <Text style={[base.thCell, { flex: 1 }]}>Ano</Text>
                <Text style={[base.thCell, { flex: 2, textAlign: 'right' }]}>Receita Planeada</Text>
                <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Taxa</Text>
                <Text style={[base.thCell, { flex: 2, textAlign: 'right' }]}>Comissões/ano</Text>
                <Text style={[base.thCell, { flex: 2, textAlign: 'right' }]}>% da Receita</Text>
                <Text style={[base.thCell, { flex: 1.5 }]}>Fonte</Text>
              </View>
              {yearCommissions.map((y, i) => (
                <View key={y.year} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
                  <Text style={[base.tdCellBold, { flex: 1 }]}>{y.year}</Text>
                  <Text style={[base.tdCell, { flex: 2, textAlign: 'right' }]}>{formatCurrency(y.revenue)}</Text>
                  <Text style={[base.tdCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatPercent(y.rate)}</Text>
                  <Text style={[base.tdCellBold, { flex: 2, textAlign: 'right' }]}>{formatCurrency(y.amount)}</Text>
                  <Text style={[base.tdCell, { flex: 2, textAlign: 'right' }]}>{y.revenue > 0 ? formatPercent(y.amount / y.revenue) : '—'}</Text>
                  <Text style={[y.isOverride ? base.tdCellBold : base.tdCell, { flex: 1.5 }]}>{y.isOverride ? 'Override' : 'Auto'}</Text>
                </View>
              ))}
              {/* Totals */}
              <View style={[base.tableRow, { backgroundColor: '#e0e7ff' }]}>
                <Text style={[base.tdCellBold, { flex: 1 }]}>TOTAL</Text>
                <Text style={[base.tdCellBold, { flex: 2, textAlign: 'right' }]}>{formatCurrency(yearCommissions.reduce((s, y) => s + y.revenue, 0))}</Text>
                <Text style={[base.tdCell, { flex: 1.5 }]}></Text>
                <Text style={[base.tdCellBold, { flex: 2, textAlign: 'right' }]}>{formatCurrency(yearCommissions.reduce((s, y) => s + y.amount, 0))}</Text>
                <Text style={[base.tdCell, { flex: 2 }]}></Text>
                <Text style={[base.tdCell, { flex: 1.5 }]}></Text>
              </View>
            </View>
          </>
        )}

        {/* Summary box */}
        <View style={[base.infoBox, { marginTop: 12, borderLeftWidth: 3, borderLeftColor: isHealthy ? BRAND.emerald : isWarning ? BRAND.amber : BRAND.red }]}>
          <Text style={[base.infoBoxText, base.bold, { marginBottom: 4 }]}>
            {isHealthy ? '✓ Estrutura de comissões sustentável' : isWarning ? '⚠ Atenção: margem de segurança baixa' : '✗ Comissões insustentáveis — rever estrutura'}
          </Text>
          <Text style={base.infoBoxText}>
            Com receita de {formatCurrency(refMonthlyRevenue)}/mês e custos fixos de {formatCurrency(totalFixedCosts)}/mês,
            a taxa atual de {formatPercent(autoCommRate)} representa {formatCurrency(currentComm)}/mês em comissões.
            {currentNet >= 0
              ? ` O resultado após comissões e impostos é ${formatCurrency(currentNet)}/mês (margem ${formatPercent(currentMargin)}).`
              : ` O resultado após comissões é negativo em ${formatCurrency(Math.abs(currentNet))}/mês.`
            }
            {' '}Taxa máxima sustentável: {formatPercent(maxCommRate)}.
          </Text>
        </View>

        <Footer title="Análise de Comissões · Cenários" />
      </Page>
    </Document>
  );
}
