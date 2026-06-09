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

function KPICard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <View style={accent ? base.kpiCardAccent : base.kpiCard}>
      <Text style={accent ? base.kpiLabelWhite : base.kpiLabel}>{label}</Text>
      <Text style={accent ? base.kpiValueWhite : base.kpiValue}>{value}</Text>
      {sub && <Text style={accent ? base.kpiSubWhite : base.kpiSub}>{sub}</Text>}
    </View>
  );
}

function computeFullPL(plan: YearPlan, state: Props['state']) {
  const { assumptions, employees, investments, fixedCostItems, freelancers, taxConfig } = state;
  const r = plan.revenueTarget;

  const activeEmps = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const rawBase = activeEmps.reduce((s, e) => s + calculateEmployeeCalculations(e, assumptions).annualizedMonthlyCost, 0) * 12;
  const salaryFactor = 1 + ((plan.salaryGrowthPct ?? 0) / 100);
  const baseTeam = rawBase * salaryFactor;
  const extraTeam = plan.extraHeadcount > 0
    ? plan.extraHeadcount * plan.avgExtraSalary * (1 + assumptions.employerSocialSecurityRate) * assumptions.monthsPaidPerYear
    : 0;
  const teamCost = baseTeam + extraTeam;

  const baseFixed = fixedCostItems.length > 0
    ? fixedCostItems.reduce((s, i) => s + i.amount, 0)
    : assumptions.monthlyFixedCosts;
  const fixedCosts = (plan.fixedCostsOverride ?? 0) > 0 ? plan.fixedCostsOverride : baseFixed * 12;

  const freelancerCost = (freelancers ?? [])
    .filter(f => f.status === 'active' || f.status === 'planned')
    .reduce((s, f) => s + f.monthlyCost, 0) * 12;

  const autoCommRate = activeEmps.reduce((s, e) => s + e.variableCommission / 100, 0);
  const effCommRate = (plan.commissionRateOverride ?? 0) > 0 ? plan.commissionRateOverride / 100 : autoCommRate;
  const commissions = r * effCommRate;

  const rate = assumptions.baseInterestRate + assumptions.spread;
  const debtService = (plan.linkedInvestmentIds ?? []).reduce((s, id) => {
    const inv = investments.find(i => i.id === id);
    if (!inv || inv.financedAmount <= 0) return s;
    return s + calculateLoanPayment(inv.financedAmount, rate, 60) * 12;
  }, 0);
  const investOpex = (plan.linkedInvestmentIds ?? []).reduce((s, id) => {
    const inv = investments.find(i => i.id === id);
    return inv ? s + inv.monthlyOperatingCosts * 12 : s;
  }, 0);
  const investCapex = (plan.linkedInvestmentIds ?? []).reduce((s, id) => {
    const inv = investments.find(i => i.id === id);
    return inv ? s + inv.initialInvestment : s;
  }, 0);

  const ebitda = r - teamCost - freelancerCost - fixedCosts - commissions - debtService - investOpex;

  const ta = taxConfig.monthlyCarExpenses * 12 * taxConfig.autonomousTaxCarsRate
    + taxConfig.monthlyRepresentationExpenses * 12 * taxConfig.autonomousTaxRepresentationRate
    + taxConfig.monthlyMealsAboveLimit * 12 * taxConfig.autonomousTaxMealsRate;
  const ebit = ebitda - ta;
  const irc = ebit > 0
    ? (taxConfig.isPME
        ? Math.min(ebit, taxConfig.ircReducedThreshold) * taxConfig.ircReducedRate + Math.max(0, ebit - taxConfig.ircReducedThreshold) * taxConfig.ircStandardRate
        : ebit * taxConfig.ircStandardRate)
    : 0;
  const derrama = ebit > 0 ? ebit * taxConfig.derramaRate : 0;
  const netProfit = ebit - irc - derrama;
  const freeCash = netProfit - investCapex;
  const netMargin = r > 0 ? netProfit / r : 0;

  return { r, teamCost, baseTeam, extraTeam, freelancerCost, fixedCosts, commissions, debtService, investOpex, investCapex, ebitda, ta, ebit, irc, derrama, netProfit, freeCash, netMargin, salaryFactor, effCommRate };
}

export function ReportPlaneamento({ state, generatedAt }: Props) {
  const { yearPlans, taxConfig, assumptions, employees, fixedCostItems, freelancers } = state;
  const plans = [...yearPlans].sort((a, b) => a.year - b.year).slice(0, 5);
  const activeEmps = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const baseMonthlyCost = activeEmps.reduce((s, e) => s + calculateEmployeeCalculations(e, assumptions).annualizedMonthlyCost, 0);

  if (plans.length === 0) {
    return (
      <Document>
        <Page size="A4" style={base.page}>
          <Text style={base.headerTitle}>Planeamento 5 Anos</Text>
          <Text style={[base.muted, { marginTop: 20 }]}>Sem planos definidos. Vai ao Planeamento 5 Anos para criar.</Text>
          <Footer title="Planeamento 5 Anos" />
        </Page>
      </Document>
    );
  }

  const plResults = plans.map(p => ({ plan: p, pl: computeFullPL(p, state) }));

  const rows: { label: string; key: string; neg?: boolean; bold?: boolean; indent?: boolean }[] = [
    { label: 'Receita', key: 'r', bold: true },
    { label: 'Equipa', key: 'teamCost', neg: true, indent: true },
    { label: 'Freelancers', key: 'freelancerCost', neg: true, indent: true },
    { label: 'Custos Fixos', key: 'fixedCosts', neg: true, indent: true },
    { label: 'Comissões', key: 'commissions', neg: true, indent: true },
    { label: 'Serv. Dívida', key: 'debtService', neg: true, indent: true },
    { label: 'EBITDA', key: 'ebitda', bold: true },
    { label: 'Trib. Autón.', key: 'ta', neg: true, indent: true },
    { label: 'EBIT', key: 'ebit', bold: true },
    { label: 'IRC', key: 'irc', neg: true, indent: true },
    { label: 'Derrama', key: 'derrama', neg: true, indent: true },
    { label: 'Lucro Líquido', key: 'netProfit', bold: true },
    { label: 'CAPEX Invest.', key: 'investCapex', neg: true, indent: true },
    { label: 'Cash Livre', key: 'freeCash', bold: true },
  ];

  return (
    <Document>
      {/* ── PAGE 1: P&L Comparativa ── */}
      <Page size="A4" style={base.page}>
        <View style={base.headerBar}>
          <View>
            <Text style={base.headerTitle}>Planeamento 5 Anos</Text>
            <Text style={base.headerSub}>Demonstração de Resultados Projetada · Gerado em {generatedAt}</Text>
          </View>
          <View>
            <Text style={[base.headerBrand, base.bold]}>GAMBIT LABS</Text>
            <Text style={base.headerBrand}>Business Simulator</Text>
          </View>
        </View>

        {/* Summary KPIs — best year */}
        {(() => {
          const best = plResults.reduce((b, x) => x.pl.netProfit > b.pl.netProfit ? x : b, plResults[0]);
          const totalRev = plResults.reduce((s, x) => s + x.pl.r, 0);
          return (
            <View style={base.kpiGrid}>
              <KPICard label="Receita Total 5 Anos" value={formatCurrency(totalRev)} accent />
              <KPICard label="Melhor Lucro" value={formatCurrency(best.pl.netProfit)} sub={`em ${best.plan.year}`} />
              <KPICard label="Equipa Atual" value={`${activeEmps.length} colaboradores`} sub={`${formatCurrency(baseMonthlyCost)}/mês base`} />
              <KPICard label="Regime Fiscal" value={taxConfig.isPME ? 'PME' : 'Geral'} sub={taxConfig.isPME ? `${formatPercent(taxConfig.ircReducedRate)}/${formatPercent(taxConfig.ircStandardRate)}` : formatPercent(taxConfig.ircStandardRate)} />
            </View>
          );
        })()}

        {/* P&L table */}
        <Text style={base.sectionTitle}>Demonstração de Resultados por Ano</Text>
        <View style={base.table}>
          <View style={base.tableHeader}>
            <Text style={[base.thCell, { flex: 2.5 }]}>Rubrica</Text>
            {plans.map(p => <Text key={p.year} style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>{p.year}</Text>)}
          </View>
          {rows.map((row, ri) => {
            const alt = ri % 2 !== 0;
            return (
              <View key={row.label} style={row.bold ? base.plRowBold : alt ? base.tableRowAlt : base.tableRow}>
                <Text style={[row.bold ? base.plLabelBold : row.indent ? base.plLabelIndent : base.plLabel, { flex: 2.5 }]}>{row.label}</Text>
                {plResults.map(({ plan, pl }) => {
                  const map = pl as unknown as Record<string, number>;
                  const val = map[row.key] ?? 0;
                  const display = row.neg && val > 0 ? `−${formatCurrency(val)}` : formatCurrency(val);
                  const color = val < 0 ? base.tdCellRed : row.bold && val > 0 ? base.tdCellGreen : row.bold ? base.tdCellBold : base.tdCell;
                  return <Text key={plan.year} style={[color, { flex: 1.5, textAlign: 'right' }]}>{display}</Text>;
                })}
              </View>
            );
          })}
          {/* Margin row */}
          <View style={base.plRowBold}>
            <Text style={[base.plLabelBold, { flex: 2.5 }]}>Margem Líquida</Text>
            {plResults.map(({ plan, pl }) => (
              <Text key={plan.year} style={[pl.netMargin >= 0 ? base.tdCellGreen : base.tdCellRed, { flex: 1.5, textAlign: 'right' }]}>
                {formatPercent(pl.netMargin)}
              </Text>
            ))}
          </View>
        </View>

        <Footer title="Planeamento 5 Anos · P&L" />
      </Page>

      {/* ── PAGE 2: Adjustments & Tax ── */}
      <Page size="A4" style={base.page}>
        <View style={base.headerBar}>
          <View>
            <Text style={base.headerTitle}>Planeamento 5 Anos</Text>
            <Text style={base.headerSub}>Ajustes por Ano e Configuração Fiscal · Gerado em {generatedAt}</Text>
          </View>
        </View>

        {/* Adjustments table */}
        <Text style={base.sectionTitle}>Ajustes por Ano</Text>
        <View style={base.table}>
          <View style={base.tableHeader}>
            <Text style={[base.thCell, { flex: 3 }]}>Parâmetro</Text>
            {plans.map(p => <Text key={p.year} style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>{p.year}</Text>)}
          </View>
          {[
            { label: 'Meta Receita', fn: (p: typeof plResults[0]) => formatCurrency(p.plan.revenueTarget) },
            { label: 'Aumento Salarial', fn: (p: typeof plResults[0]) => `+${p.plan.salaryGrowthPct ?? 0}%` },
            { label: 'Novas Contratações', fn: (p: typeof plResults[0]) => p.plan.extraHeadcount > 0 ? `${p.plan.extraHeadcount} × ${formatCurrency(p.plan.avgExtraSalary)}` : '—' },
            { label: 'Taxa Comissões', fn: (p: typeof plResults[0]) => (p.plan.commissionRateOverride ?? 0) > 0 ? `${p.plan.commissionRateOverride}% (override)` : 'Auto' },
            { label: 'Custo Equipa/ano', fn: (p: typeof plResults[0]) => formatCurrency(p.pl.teamCost) },
            { label: 'Comissões/ano', fn: (p: typeof plResults[0]) => formatCurrency(p.pl.commissions) },
            { label: 'Invest. Linkados', fn: (p: typeof plResults[0]) => p.plan.linkedInvestmentIds.length > 0 ? `${p.plan.linkedInvestmentIds.length} invest.` : '—' },
          ].map((row, ri) => (
            <View key={row.label} style={ri % 2 === 0 ? base.tableRow : base.tableRowAlt}>
              <Text style={[base.tdCellBold, { flex: 3 }]}>{row.label}</Text>
              {plResults.map(p => (
                <Text key={p.plan.year} style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{row.fn(p)}</Text>
              ))}
            </View>
          ))}
        </View>

        {/* Tax config */}
        <Text style={[base.sectionTitle, { marginTop: 16 }]}>Configuração Fiscal Aplicada</Text>
        <View style={base.kpiGrid}>
          <KPICard label="Regime IRC" value={taxConfig.isPME ? 'PME' : 'Geral'} sub={taxConfig.isPME ? `${formatPercent(taxConfig.ircReducedRate)} primeiros ${formatCurrency(taxConfig.ircReducedThreshold)}` : undefined} />
          <KPICard label="IRC Normal" value={formatPercent(taxConfig.ircStandardRate)} />
          <KPICard label="Derrama" value={formatPercent(taxConfig.derramaRate)} />
          <KPICard label="IVA" value={formatPercent(taxConfig.ivaRate)} sub={taxConfig.ivaFrequency === 'monthly' ? 'Mensal' : 'Trimestral'} />
        </View>

        {taxConfig.monthlyCarExpenses > 0 || taxConfig.monthlyRepresentationExpenses > 0 || taxConfig.monthlyMealsAboveLimit > 0 ? (
          <>
            <Text style={[base.sectionTitle, { marginTop: 12 }]}>Tributações Autónomas</Text>
            <View style={base.kpiGrid}>
              {taxConfig.monthlyCarExpenses > 0 && (
                <KPICard label="Viaturas/mês" value={formatCurrency(taxConfig.monthlyCarExpenses)} sub={`Taxa ${formatPercent(taxConfig.autonomousTaxCarsRate)}`} />
              )}
              {taxConfig.monthlyRepresentationExpenses > 0 && (
                <KPICard label="Representação/mês" value={formatCurrency(taxConfig.monthlyRepresentationExpenses)} sub={`Taxa ${formatPercent(taxConfig.autonomousTaxRepresentationRate)}`} />
              )}
              {taxConfig.monthlyMealsAboveLimit > 0 && (
                <KPICard label="Refeições acima limite/mês" value={formatCurrency(taxConfig.monthlyMealsAboveLimit)} sub={`Taxa ${formatPercent(taxConfig.autonomousTaxMealsRate)}`} />
              )}
            </View>
          </>
        ) : null}

        {/* Freelancers summary */}
        {(freelancers ?? []).filter(f => f.status !== 'inactive').length > 0 && (
          <>
            <Text style={[base.sectionTitle, { marginTop: 12 }]}>Freelancers (Custo Fixo)</Text>
            <View style={base.table}>
              <View style={base.tableHeader}>
                <Text style={[base.thCell, { flex: 2 }]}>Nome</Text>
                <Text style={[base.thCell, { flex: 2 }]}>Serviço</Text>
                <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Custo/mês</Text>
                <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Custo/ano</Text>
                <Text style={[base.thCell, { flex: 1 }]}>Estado</Text>
              </View>
              {(freelancers ?? []).filter(f => f.status !== 'inactive').map((f, i) => (
                <View key={f.id} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
                  <Text style={[base.tdCellBold, { flex: 2 }]}>{f.name}</Text>
                  <Text style={[base.tdCell, { flex: 2 }]}>{f.service}</Text>
                  <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(f.monthlyCost)}</Text>
                  <Text style={[base.tdCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(f.monthlyCost * 12)}</Text>
                  <Text style={[base.tdCell, { flex: 1 }]}>{f.status === 'active' ? 'Ativo' : 'Planeado'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Footer title="Planeamento 5 Anos · Ajustes e Fiscal" />
      </Page>
    </Document>
  );
}
