import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { base, BRAND } from './styles';
import { formatCurrency, formatPercent, calculateEmployeeCalculations } from '@/lib/financialCalculations';
import type { AppState, TaxConfig, YearPlan } from '@/lib/types';

interface Props {
  state: AppState & { taxConfig: TaxConfig; yearPlans: YearPlan[]; financings: AppState['financings']; monthlyExpenses: []; monthlyExpensesRevenue: number };
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

function PLRow({ label, value, bold, indent, green, red }: { label: string; value: string; bold?: boolean; indent?: boolean; green?: boolean; red?: boolean }) {
  return (
    <View style={bold ? base.plRowBold : base.plRow}>
      <Text style={indent ? base.plLabelIndent : bold ? base.plLabelBold : base.plLabel}>{label}</Text>
      <Text style={green ? base.plValueGreen : red ? base.plValueRed : base.plValue}>{value}</Text>
    </View>
  );
}

// ─── Helper: compute full P&L for a YearPlan ────────────────────────────────
function computeYearPL(plan: YearPlan, state: AppState & { taxConfig: TaxConfig; yearPlans: YearPlan[] }) {
  const { assumptions, employees, taxConfig } = state;
  const r = plan.revenueTarget;
  const directCosts = 0;
  const grossProfit = r;

  // Team cost from active/planned employees
  const activeEmps = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const empAnnualCost = activeEmps.reduce((s, e) => {
    const calc = calculateEmployeeCalculations(e, assumptions);
    return s + calc.annualizedMonthlyCost * 12;
  }, 0);
  const extraCost = plan.extraHeadcount > 0
    ? plan.extraHeadcount * plan.avgExtraSalary * (1 + assumptions.employerSocialSecurityRate) * 14 * 12
    : 0;
  const teamCosts = empAnnualCost + extraCost;

  const fixedCosts = plan.fixedCostsOverride > 0
    ? plan.fixedCostsOverride
    : assumptions.monthlyFixedCosts * 12;

  const commissions = activeEmps.reduce((s, e) => s + r * (e.variableCommission / 100), 0);

  const ebitda = grossProfit - teamCosts - fixedCosts - commissions;

  const ta = (taxConfig.monthlyCarExpenses * 12 * taxConfig.autonomousTaxCarsRate)
    + (taxConfig.monthlyRepresentationExpenses * 12 * taxConfig.autonomousTaxRepresentationRate)
    + (taxConfig.monthlyMealsAboveLimit * 12 * taxConfig.autonomousTaxMealsRate);
  const ebit = ebitda - ta;
  const irc = ebit > 0
    ? (taxConfig.isPME
        ? Math.min(ebit, taxConfig.ircReducedThreshold) * taxConfig.ircReducedRate
          + Math.max(0, ebit - taxConfig.ircReducedThreshold) * taxConfig.ircStandardRate
        : ebit * taxConfig.ircStandardRate)
    : 0;
  const derrama = ebit > 0 ? ebit * taxConfig.derramaRate : 0;
  const netProfit = ebit - irc - derrama;
  const freeCash = netProfit;

  return { revenue: r, directCosts, grossProfit, teamCosts, fixedCosts, commissions, otherCosts: 0, debtService: 0, ebitda, ta, irc, derrama, netProfit, investmentCapex: 0, freeCash };
}

export function ReportExecutivo({ state, generatedAt }: Props) {
  const { assumptions, employees, investments, pipeline, monthlyResults, yearPlans, taxConfig } = state;

  const currentYear = new Date().getFullYear();
  const yearResults = monthlyResults.filter(r => r.month.startsWith(`${currentYear}-`));
  const totalRevenue = yearResults.reduce((s, r) => s + r.actualRevenue, 0);
  const totalCosts   = yearResults.reduce((s, r) => s + r.actualCosts, 0);
  const totalProfit  = totalRevenue - totalCosts;
  const marginPct    = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const monthlyGoal  = assumptions.annualRevenueGoal / 12;
  const totalPlanned = monthlyGoal * yearResults.length;
  const deviation    = totalRevenue - totalPlanned;
  const devPct       = totalPlanned > 0 ? deviation / totalPlanned : 0;

  const activeEmployees = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const pipelineTotal   = pipeline.reduce((s, p) => s + p.estimatedValue, 0);
  const pipelineWeighted = pipeline.reduce((s, p) => s + p.estimatedValue * p.probability / 100, 0);

  return (
    <Document>
      {/* ── PAGE 1: Executive Summary ── */}
      <Page size="A4" style={base.page}>
        <View style={base.headerBar}>
          <View>
            <Text style={base.headerTitle}>Relatório Executivo</Text>
            <Text style={base.headerSub}>Gambit Labs · {currentYear} · Gerado em {generatedAt}</Text>
          </View>
          <View>
            <Text style={[base.headerBrand, base.bold]}>GAMBIT LABS</Text>
            <Text style={base.headerBrand}>Business Simulator</Text>
          </View>
        </View>

        {/* KPIs */}
        <Text style={base.sectionTitle}>Indicadores Chave</Text>
        <View style={base.kpiGrid}>
          <KPICard label="Meta Anual" value={formatCurrency(assumptions.annualRevenueGoal)} sub={`${formatCurrency(monthlyGoal)}/mês`} accent />
          <KPICard label="Faturação Real YTD" value={formatCurrency(totalRevenue)} sub={`${devPct >= 0 ? '+' : ''}${formatPercent(Math.abs(devPct))} vs plano`} />
          <KPICard label={totalProfit >= 0 ? 'Lucro Acumulado' : 'Prejuízo Acumulado'} value={formatCurrency(Math.abs(totalProfit))} sub={`Margem: ${formatPercent(Math.abs(marginPct))}`} />
          <KPICard label="Pipeline Ponderado" value={formatCurrency(pipelineWeighted)} sub={`Total: ${formatCurrency(pipelineTotal)}`} />
        </View>

        <View style={base.kpiGrid}>
          <KPICard label="Margem Bruta" value={formatPercent(assumptions.grossMargin)} />
          <KPICard label="Equipa" value={`${activeEmployees.length} colaboradores`} />
          <KPICard label="Meta Mensal" value={formatCurrency(monthlyGoal)} />
          <KPICard label="Meses c/ dados" value={`${yearResults.length} / 12`} />
        </View>

        {/* Monthly results table */}
        {yearResults.length > 0 && (
          <>
            <Text style={base.sectionTitle}>Resultados Mensais — {currentYear}</Text>
            <View style={base.table}>
              <View style={base.tableHeader}>
                <Text style={[base.thCell, { flex: 1 }]}>Mês</Text>
                <Text style={[base.thCell, { flex: 2, textAlign: 'right' }]}>Receita Real</Text>
                <Text style={[base.thCell, { flex: 2, textAlign: 'right' }]}>Planeado</Text>
                <Text style={[base.thCell, { flex: 2, textAlign: 'right' }]}>Desvio</Text>
                <Text style={[base.thCell, { flex: 2, textAlign: 'right' }]}>Custos</Text>
                <Text style={[base.thCell, { flex: 2, textAlign: 'right' }]}>Resultado</Text>
              </View>
              {yearResults.map((r, i) => {
                const dev = r.actualRevenue - monthlyGoal;
                const profit = r.actualRevenue - r.actualCosts;
                const monthName = r.month.split('-')[1];
                const months: Record<string, string> = { '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez' };
                return (
                  <View key={r.id} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
                    <Text style={[base.tdCell, { flex: 1 }]}>{months[monthName] ?? r.month}</Text>
                    <Text style={[base.tdCellBold, { flex: 2, textAlign: 'right' }]}>{formatCurrency(r.actualRevenue)}</Text>
                    <Text style={[base.tdCell, { flex: 2, textAlign: 'right' }]}>{formatCurrency(monthlyGoal)}</Text>
                    <Text style={[dev >= 0 ? base.tdCellGreen : base.tdCellRed, { flex: 2, textAlign: 'right' }]}>{dev >= 0 ? '+' : ''}{formatCurrency(dev)}</Text>
                    <Text style={[base.tdCell, { flex: 2, textAlign: 'right' }]}>{formatCurrency(r.actualCosts)}</Text>
                    <Text style={[profit >= 0 ? base.tdCellGreen : base.tdCellRed, { flex: 2, textAlign: 'right' }]}>{profit >= 0 ? '+' : ''}{formatCurrency(profit)}</Text>
                  </View>
                );
              })}
              {/* Totals */}
              <View style={[base.tableRow, { backgroundColor: '#e0e7ff' }]}>
                <Text style={[base.tdCellBold, { flex: 1 }]}>TOTAL</Text>
                <Text style={[base.tdCellBold, { flex: 2, textAlign: 'right' }]}>{formatCurrency(totalRevenue)}</Text>
                <Text style={[base.tdCellBold, { flex: 2, textAlign: 'right' }]}>{formatCurrency(totalPlanned)}</Text>
                <Text style={[deviation >= 0 ? base.tdCellGreen : base.tdCellRed, { flex: 2, textAlign: 'right' }]}>{deviation >= 0 ? '+' : ''}{formatCurrency(deviation)}</Text>
                <Text style={[base.tdCellBold, { flex: 2, textAlign: 'right' }]}>{formatCurrency(totalCosts)}</Text>
                <Text style={[totalProfit >= 0 ? base.tdCellGreen : base.tdCellRed, { flex: 2, textAlign: 'right' }]}>{totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Pipeline */}
        {pipeline.length > 0 && (
          <>
            <Text style={base.sectionTitle}>Pipeline Comercial</Text>
            <View style={base.table}>
              <View style={base.tableHeader}>
                <Text style={[base.thCell, { flex: 3 }]}>Oportunidade</Text>
                <Text style={[base.thCell, { flex: 2 }]}>Cliente</Text>
                <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Valor</Text>
                <Text style={[base.thCell, { flex: 1, textAlign: 'right' }]}>Prob.</Text>
                <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Val. Pond.</Text>
                <Text style={[base.thCell, { flex: 2 }]}>Fase</Text>
              </View>
              {pipeline.slice(0, 15).map((p, i) => {
                const stageLabels: Record<string, string> = { lead: 'Lead', contacted: 'Contactado', meeting_scheduled: 'Reunião', diagnosis_done: 'Diagnóstico', proposal_sent: 'Proposta', negotiation: 'Negociação', closed_won: 'Fechado ✓', closed_lost: 'Perdido' };
                return (
                  <View key={p.id} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
                    <Text style={[base.tdCell, { flex: 3 }]}>{p.opportunityName}</Text>
                    <Text style={[base.tdCell, { flex: 2 }]}>{p.clientName}</Text>
                    <Text style={[base.tdCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(p.estimatedValue)}</Text>
                    <Text style={[base.tdCell, { flex: 1, textAlign: 'right' }]}>{p.probability}%</Text>
                    <Text style={[base.tdCellGreen, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(p.estimatedValue * p.probability / 100)}</Text>
                    <Text style={[base.tdCell, { flex: 2 }]}>{stageLabels[p.stage] ?? p.stage}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Footer title="Relatório Executivo" />
      </Page>

      {/* ── PAGE 2: P&L Projetada 5 Anos ── */}
      {yearPlans.length > 0 && (
        <Page size="A4" style={base.page}>
          <View style={base.headerBar}>
            <View>
              <Text style={base.headerTitle}>Planeamento 5 Anos</Text>
              <Text style={base.headerSub}>Projeção P&L com impostos · Gerado em {generatedAt}</Text>
            </View>
          </View>

          <Text style={base.sectionTitle}>Demonstração de Resultados Projetada</Text>

          {/* Header row */}
          <View style={[base.tableHeader, { marginBottom: 0 }]}>
            <Text style={[base.thCell, { flex: 3 }]}>Rubrica</Text>
            {yearPlans.slice(0, 5).map(p => (
              <Text key={p.year} style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>{p.year}</Text>
            ))}
          </View>

          {[
            { label: 'Receita', key: 'revenue', bold: true },
            { label: '  Equipa', key: 'teamCosts', neg: true },
            { label: '  Custos Fixos', key: 'fixedCosts', neg: true },
            { label: '  Comissões', key: 'commissions', neg: true },
            { label: '  Outros', key: 'otherCosts', neg: true },
            { label: '  Serviço Dívida', key: 'debtService', neg: true },
            { label: 'EBITDA', key: 'ebitda', bold: true },
            { label: '  Trib. Autónomas', key: 'ta', neg: true },
            { label: '  IRC', key: 'irc', neg: true },
            { label: '  Derrama', key: 'derrama', neg: true },
            { label: 'Lucro Líquido', key: 'netProfit', bold: true },
            { label: '  CAPEX Investimentos', key: 'investmentCapex', neg: true },
            { label: '💰 Cash Livre', key: 'freeCash', bold: true },
          ].map((row, ri) => {
            const isAlt = ri % 2 === 0;
            return (
              <View key={row.label} style={row.bold ? base.plRowBold : isAlt ? base.tableRow : base.tableRowAlt}>
                <Text style={[row.bold ? base.plLabelBold : row.label.startsWith('  ') ? base.plLabelIndent : base.plLabel, { flex: 3 }]}>{row.label.trim()}</Text>
                {yearPlans.slice(0, 5).map(p => {
                  const pl = computeYearPL(p, state);
                  const map: Record<string, number> = pl as unknown as Record<string, number>;
                  const val = map[row.key] ?? 0;
                  const isNeg = val < 0;
                  const isPos = val > 0 && row.bold;
                  const display = row.neg && val > 0 ? `− ${formatCurrency(val)}` : formatCurrency(val);
                  return (
                    <Text key={p.year} style={[isPos ? base.tdCellGreen : isNeg ? base.tdCellRed : row.bold ? base.tdCellBold : base.tdCell, { flex: 1.5, textAlign: 'right' }]}>
                      {display}
                    </Text>
                  );
                })}
              </View>
            );
          })}

          {/* Tax config summary */}
          <Text style={[base.sectionTitle, { marginTop: 24 }]}>Configuração Fiscal Aplicada</Text>
          <View style={base.kpiGrid}>
            <KPICard label="IRC PME" value={`${formatPercent(taxConfig.ircReducedRate)} / ${formatPercent(taxConfig.ircStandardRate)}`} sub={`Reduzido nos primeiros ${formatCurrency(taxConfig.ircReducedThreshold)}`} />
            <KPICard label="Derrama" value={formatPercent(taxConfig.derramaRate)} />
            <KPICard label="IVA" value={formatPercent(taxConfig.ivaRate)} sub={taxConfig.ivaFrequency === 'monthly' ? 'Entrega mensal' : 'Entrega trimestral'} />
            <KPICard label="SS Patronal" value={formatPercent(taxConfig.employerSSRate)} />
          </View>

          <Footer title="Planeamento 5 Anos" />
        </Page>
      )}

      {/* ── PAGE 3: Team & Investments ── */}
      <Page size="A4" style={base.page}>
        <View style={base.headerBar}>
          <View>
            <Text style={base.headerTitle}>Equipa e Investimentos</Text>
            <Text style={base.headerSub}>Gerado em {generatedAt}</Text>
          </View>
        </View>

        {/* Employees */}
        <Text style={base.sectionTitle}>Colaboradores ({activeEmployees.length})</Text>
        {activeEmployees.length > 0 ? (
          <View style={base.table}>
            <View style={base.tableHeader}>
              <Text style={[base.thCell, { flex: 2 }]}>Nome</Text>
              <Text style={[base.thCell, { flex: 2 }]}>Cargo</Text>
              <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Salário Bruto</Text>
              <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Custo Total/mês</Text>
              <Text style={[base.thCell, { flex: 1 }]}>Estado</Text>
            </View>
            {activeEmployees.map((e, i) => {
              const totalCost = e.grossMonthlySalary * (1 + assumptions.employerSocialSecurityRate) + e.monthlyToolsCost + e.monthlyOtherCosts + e.monthlyMealAllowance;
              return (
                <View key={e.id} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
                  <Text style={[base.tdCellBold, { flex: 2 }]}>{e.name}</Text>
                  <Text style={[base.tdCell, { flex: 2 }]}>{e.role}</Text>
                  <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(e.grossMonthlySalary)}</Text>
                  <Text style={[base.tdCellBold, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(totalCost)}</Text>
                  <Text style={[base.tdCell, { flex: 1 }]}>{e.status === 'active' ? 'Ativo' : 'Planeado'}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[base.muted, { fontSize: 8, marginBottom: 12 }]}>Sem colaboradores registados.</Text>
        )}

        {/* Investments */}
        <Text style={base.sectionTitle}>Investimentos</Text>
        {investments.length > 0 ? (
          <View style={base.table}>
            <View style={base.tableHeader}>
              <Text style={[base.thCell, { flex: 3 }]}>Investimento</Text>
              <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>CAPEX</Text>
              <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Financiado</Text>
              <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>OPEX/mês</Text>
              <Text style={[base.thCell, { flex: 1.5, textAlign: 'right' }]}>Receita Esp./mês</Text>
              <Text style={[base.thCell, { flex: 1.5 }]}>Estado</Text>
            </View>
            {investments.map((inv, i) => {
              const statusLabels: Record<string, string> = { idea: 'Ideia', analysis: 'Análise', approved: 'Aprovado', in_progress: 'Em curso', completed: 'Concluído', cancelled: 'Cancelado' };
              return (
                <View key={inv.id} style={i % 2 === 0 ? base.tableRow : base.tableRowAlt}>
                  <Text style={[base.tdCellBold, { flex: 3 }]}>{inv.name}</Text>
                  <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(inv.initialInvestment)}</Text>
                  <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(inv.financedAmount)}</Text>
                  <Text style={[base.tdCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(inv.monthlyOperatingCosts)}</Text>
                  <Text style={[base.tdCellGreen, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(inv.expectedMonthlyRevenue)}</Text>
                  <Text style={[base.tdCell, { flex: 1.5 }]}>{statusLabels[inv.status] ?? inv.status}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[base.muted, { fontSize: 8 }]}>Sem investimentos registados.</Text>
        )}

        <Footer title="Equipa e Investimentos" />
      </Page>
    </Document>
  );
}
