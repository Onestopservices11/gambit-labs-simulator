import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Employee, Assumptions } from '../types';
import type { AjudasCustoCalc } from '../financialCalculations';

// ─── Colors ───────────────────────────────────────────────────────────────────
const indigo  = '#4f46e5';
const slate9  = '#0f172a';
const slate7  = '#334155';
const slate5  = '#64748b';
const slate3  = '#cbd5e1';
const emerald = '#059669';
const red     = '#dc2626';
const amber   = '#d97706';
const bgLight = '#f1f5f9';
const border  = '#e2e8f0';
const white   = '#ffffff';

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', fontSize: 9, color: slate7,
    backgroundColor: white, padding: 32, paddingBottom: 60,
  },

  // Header
  headerWrap: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 20, paddingBottom: 16,
    borderBottomWidth: 1.5, borderBottomColor: indigo, borderBottomStyle: 'solid',
  },
  badge: {
    backgroundColor: indigo, color: white, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, fontSize: 8, fontFamily: 'Helvetica-Bold',
  },
  h1:   { fontSize: 18, fontFamily: 'Helvetica-Bold', color: slate9, marginTop: 4 },
  sub:  { fontSize: 9, color: slate5, marginTop: 2 },

  // Two-column layout — widths defined explicitly
  twoCol: { flexDirection: 'row', marginBottom: 14 },
  colL:   { width: '48%', backgroundColor: bgLight, borderRadius: 4, padding: 10, marginRight: '4%' },
  colR:   { width: '48%', backgroundColor: bgLight, borderRadius: 4, padding: 10 },
  colTitle: {
    fontSize: 7, fontFamily: 'Helvetica-Bold', color: slate5,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
  },

  // Row inside a column
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 3,
    borderBottomWidth: 0.5, borderBottomColor: bgLight, borderBottomStyle: 'solid',
  },
  rowIndent: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 3, paddingLeft: 8,
    borderBottomWidth: 0.5, borderBottomColor: bgLight, borderBottomStyle: 'solid',
  },
  rowDivider: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 3, marginTop: 4,
    borderTopWidth: 0.5, borderTopColor: border, borderTopStyle: 'solid',
    borderBottomWidth: 0.5, borderBottomColor: bgLight, borderBottomStyle: 'solid',
  },

  // Labels / values
  label:      { flex: 1, fontSize: 9, color: slate7 },
  labelBold:  { flex: 1, fontSize: 9, color: slate7, fontFamily: 'Helvetica-Bold' },
  labelSub:   { fontSize: 7.5, color: slate5 },
  note:       { fontSize: 7, color: slate5 },
  val:        { fontSize: 9, fontFamily: 'Helvetica-Bold', color: slate9 },
  valGreen:   { fontSize: 9, fontFamily: 'Helvetica-Bold', color: emerald },
  valRed:     { fontSize: 9, fontFamily: 'Helvetica-Bold', color: red },
  valAmber:   { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: amber },

  // Tags
  tagGreen: {
    backgroundColor: '#dcfce7', color: emerald, fontSize: 7,
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3,
    fontFamily: 'Helvetica-Bold',
  },
  tagAmber: {
    backgroundColor: '#fef3c7', color: amber, fontSize: 7,
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3,
    fontFamily: 'Helvetica-Bold',
  },

  // Net salary box
  netBox:   { marginTop: 8, backgroundColor: '#dcfce7', borderRadius: 4, padding: 8 },
  netRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netDiv:   {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 4, paddingTop: 4,
    borderTopWidth: 0.5, borderTopColor: '#86efac', borderTopStyle: 'solid',
  },

  // Cost section
  sectionTitle: {
    fontSize: 7, fontFamily: 'Helvetica-Bold', color: slate5,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.5, borderBottomColor: border, borderBottomStyle: 'solid',
  },
  costGrid: { flexDirection: 'row', marginBottom: 4 },
  costCell: { flex: 1, backgroundColor: bgLight, borderRadius: 4, padding: 5, alignItems: 'center' },
  totalBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 8,
    backgroundColor: indigo, borderRadius: 4, marginTop: 4,
  },

  // Info box
  infoBox: {
    backgroundColor: '#eff6ff', padding: 8, borderRadius: 3, marginTop: 10,
    borderLeftWidth: 3, borderLeftColor: indigo, borderLeftStyle: 'solid',
  },
  infoText: { fontSize: 7.5, color: '#3730a3' },

  // Footer (absolute)
  footer: {
    position: 'absolute', bottom: 20, left: 32, right: 32,
    flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6,
    borderTopWidth: 0.5, borderTopColor: border, borderTopStyle: 'solid',
  },
  footerText: { fontSize: 7, color: slate3 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt    = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

const TIPO_LABELS: Record<string, string> = {
  national_day:       'Nacional (sem pernoita)',
  national_overnight: 'Nacional (com pernoita)',
  international:      'Internacional (UE)',
};
const DEPT_LABELS: Record<string, string> = {
  commercial: 'Comercial', delivery: 'Delivery', management: 'Gestao',
  admin: 'Administrativo', tech: 'Tecnologia',
};
const MARITAL_LABELS: Record<string, string> = {
  single: 'Nao casado(a)', married_dual: 'Casado(a) - 2 titulares',
  married_single: 'Casado(a) - titular unico',
};

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  employee: Employee;
  assumptions: Assumptions;
  payslip: {
    gross: number; ss_employee: number; irs: number; net: number;
    ss_employer: number; totalCostEmployer: number; effectiveIRSRate: number;
  };
  ajudas: AjudasCustoCalc;
  month?: string;
}

export function ReportSalario({ employee, assumptions, payslip, ajudas, month }: Props) {
  const now = new Date();
  const monthLabel = month
    ? new Date(month + '-01').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
    : now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  const hasAjudas        = ajudas.monthlyTotal > 0;
  const hasDiaria        = ajudas.diasPerMonth > 0;
  const hasKm            = ajudas.kmPerMonth > 0;
  const totalLiquido     = payslip.net + ajudas.netBenefitEmployee;
  const totalCustoEmpresa = payslip.totalCostEmployer
    + employee.monthlyMealAllowance + employee.monthlyToolsCost
    + employee.monthlyOtherCosts + ajudas.monthlyTotal + ajudas.employerExtraSS;

  const costCells = [
    { l: 'Salario Bruto',                                         v: employee.grossMonthlySalary },
    { l: `SS Patronal (${fmtPct(assumptions.employerSocialSecurityRate)})`, v: payslip.ss_employer },
    { l: 'Subsidio Alim.',                                        v: employee.monthlyMealAllowance },
    { l: 'Ferramentas',                                           v: employee.monthlyToolsCost },
    ...(hasDiaria          ? [{ l: 'Ajudas diarias', v: ajudas.monthlyDiaria }]   : []),
    ...(hasKm              ? [{ l: 'Ajudas km',      v: ajudas.monthlyKm }]        : []),
    ...(ajudas.employerExtraSS > 0 ? [{ l: 'SS pat. trib.', v: ajudas.employerExtraSS }] : []),
  ];

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerWrap}>
          <View style={{ flex: 1 }}>
            <Text style={s.badge}>RECIBO DE VENCIMENTO</Text>
            <Text style={s.h1}>{employee.name}</Text>
            <Text style={s.sub}>{employee.role} · {DEPT_LABELS[employee.department] ?? employee.department}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: slate9 }}>{monthLabel}</Text>
            <Text style={s.sub}>Data: {now.toLocaleDateString('pt-PT')}</Text>
            <Text style={{ fontSize: 9, color: slate5, marginTop: 6 }}>
              {MARITAL_LABELS[employee.maritalStatus ?? 'single']} · {employee.dependents ?? 0} dependente(s)
            </Text>
          </View>
        </View>

        {/* ── Two columns ── */}
        <View style={s.twoCol}>

          {/* LEFT — Remuneracoes */}
          <View style={s.colL}>
            <Text style={s.colTitle}>Remuneracoes</Text>

            <View style={s.row}>
              <Text style={s.label}>Salario Base (bruto)</Text>
              <Text style={s.val}>{fmt(employee.grossMonthlySalary)}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.labelSub}>Subsidio de Alimentacao</Text>
              <Text style={s.val}>{fmt(employee.monthlyMealAllowance)}</Text>
            </View>
            {employee.monthlyToolsCost > 0 ? (
              <View style={s.row}>
                <Text style={s.labelSub}>Ferramentas / Software</Text>
                <Text style={s.val}>{fmt(employee.monthlyToolsCost)}</Text>
              </View>
            ) : null}
            {employee.monthlyOtherCosts > 0 ? (
              <View style={s.row}>
                <Text style={s.labelSub}>Outros Beneficios</Text>
                <Text style={s.val}>{fmt(employee.monthlyOtherCosts)}</Text>
              </View>
            ) : null}

            {/* Ajudas diarias */}
            {hasDiaria ? (
              <View>
                <View style={s.rowDivider}>
                  <Text style={s.labelBold}>Ajudas Diarias</Text>
                  <Text style={s.val}>{fmt(ajudas.monthlyDiaria)}</Text>
                </View>
                <View style={s.rowIndent}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.labelSub}>
                      {TIPO_LABELS[ajudas.tipo] ?? ajudas.tipo}
                    </Text>
                    <Text style={s.note}>{ajudas.diasPerMonth} dias x {fmt(ajudas.valorDia)} · Limite AT: {fmt(ajudas.atLimitDia)}/dia</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 4 }}>
                    <Text style={s.tagGreen}>Isento {fmt(ajudas.monthlyDiariaExempt)}</Text>
                    {ajudas.monthlyDiariaTaxable > 0 ? (
                      <Text style={{ ...s.tagAmber, marginTop: 2 }}>Trib. {fmt(ajudas.monthlyDiariaTaxable)}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : null}

            {/* Ajudas km */}
            {hasKm ? (
              <View>
                <View style={s.rowDivider}>
                  <Text style={s.labelBold}>Ajudas por Km</Text>
                  <Text style={s.val}>{fmt(ajudas.monthlyKm)}</Text>
                </View>
                <View style={s.rowIndent}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.note}>{ajudas.kmPerMonth} km x {fmt(ajudas.ratePerKm)}/km · Limite AT: {fmt(ajudas.atLimitKm)}/km</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 4 }}>
                    <Text style={s.tagGreen}>Isento {fmt(ajudas.monthlyKmExempt)}</Text>
                    {ajudas.monthlyKmTaxable > 0 ? (
                      <Text style={{ ...s.tagAmber, marginTop: 2 }}>Trib. {fmt(ajudas.monthlyKmTaxable)}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          {/* RIGHT — Descontos */}
          <View style={s.colR}>
            <Text style={s.colTitle}>Descontos do Trabalhador</Text>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Seguranca Social ({fmtPct(assumptions.employeeSocialSecurityRate)})</Text>
                <Text style={s.note}>sobre salario bruto</Text>
              </View>
              <Text style={s.valRed}>-{fmt(payslip.ss_employee)}</Text>
            </View>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>IRS - Retencao na Fonte ({fmtPct(payslip.effectiveIRSRate)} ef.)</Text>
                <Text style={s.note}>Tabelas 2025 · Despacho 236-A/2025</Text>
              </View>
              <Text style={s.valRed}>-{fmt(payslip.irs)}</Text>
            </View>

            {ajudas.monthlyTaxable > 0 ? (
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>SS Trabalhador s/ ajudas trib.</Text>
                  <Text style={s.note}>excesso sobre limite AT</Text>
                </View>
                <Text style={s.valAmber}>-{fmt(ajudas.monthlyTaxable * assumptions.employeeSocialSecurityRate)}</Text>
              </View>
            ) : null}

            {/* Net box */}
            <View style={s.netBox}>
              <View style={s.netRow}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: emerald }}>Salario Liquido</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: emerald }}>{fmt(payslip.net)}</Text>
              </View>
              {hasAjudas ? (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 8, color: emerald }}>+ Ajudas de custo (liquido)</Text>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: emerald }}>+{fmt(ajudas.netBenefitEmployee)}</Text>
                  </View>
                  <View style={s.netDiv}>
                    <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#14532d' }}>Total a Receber</Text>
                    <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#14532d' }}>{fmt(totalLiquido)}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Custo empresa ── */}
        <View style={{ marginBottom: 14 }}>
          <Text style={s.sectionTitle}>Custo Total para a Empresa / Mes</Text>
          <View style={s.costGrid}>
            {costCells.map((item, i) => (
              <View key={i} style={[s.costCell, i < costCells.length - 1 ? { marginRight: 5 } : {}]}>
                <Text style={{ fontSize: 7, color: slate5, textAlign: 'center', marginBottom: 2 }}>{item.l}</Text>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: slate9 }}>{fmt(item.v)}</Text>
              </View>
            ))}
          </View>
          <View style={s.totalBar}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: white }}>Custo Mensal Total</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: white }}>{fmt(totalCustoEmpresa)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
            <Text style={{ fontSize: 8, color: slate5 }}>Custo anual estimado: {fmt(totalCustoEmpresa * 12)}</Text>
          </View>
        </View>

        {/* ── Info box ── */}
        <View style={s.infoBox}>
          <Text style={s.infoText}>
            {'Tabelas IRS 2025 - Despacho n.o 236-A/2025, de 6 de janeiro (Continente).'}
            {hasDiaria ? ` Ajudas diarias AT - Portaria n.o 1553-D/2008 (${fmt(ajudas.atLimitDia)}/dia).` : ''}
            {hasKm     ? ` Ajudas km AT - Portaria n.o 1553-D/2008 (${fmt(ajudas.atLimitKm)}/km).` : ''}
            {'\nDocumento gerado automaticamente pelo Gambit Labs Business Simulator.'}
          </Text>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Gambit Labs Business Simulator</Text>
          <Text style={s.footerText}>{employee.name} · {monthLabel}</Text>
          <Text style={s.footerText}>Gerado em {now.toLocaleDateString('pt-PT')}</Text>
        </View>

      </Page>
    </Document>
  );
}
