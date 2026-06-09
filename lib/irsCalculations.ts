/**
 * Tabelas de Retenção na Fonte IRS 2025 — Continente
 * Fonte: Despacho n.º 236-A/2025, de 6 de janeiro (DR n.º 3/2025, Série II)
 *
 * Fórmula geral:
 *   Retenção = max(0, R × taxa − parcela − (parcela_dep × n_dependentes))
 *   Para 3+ dependentes: taxa reduzida em 1 p.p.
 *
 * Tabela I  → Não casado (s/ dep) OU Casado 2 titulares (s/ dep)
 * Tabela II → Não casado (c/ dep)          — parcela_dep = 21,43 €
 * Tabela III→ Casado único titular          — parcela_dep = 42,86 €
 *
 * Nota: os dois primeiros escalões de cada tabela usam uma fórmula variável
 * (zona de transição de 0% para a taxa regular). Usamos aqui uma curva cúbica
 * calibrada pelos valores de taxa efetiva publicados na tabela oficial.
 */

export type MaritalStatus = 'single' | 'married_dual' | 'married_single';

interface Bracket {
  max: number;
  rate: number;   // taxa marginal máxima
  ded: number;    // parcela a abater (€)
}

// ─── Tabela I ─────────────────────────────────────────────────────────────────
// Não casado 0 dep OU Casado dois titulares 0 dep
// Zona variável: 870–1078 → cúbica calibrada: Ret(1078) = 37,73 € (3,5%)
const TRANSITION_I_START = 870;
const TRANSITION_I_END   = 1078;
const TRANSITION_I_TOP   = 87.06; // 1078 × 0.165 − 90.81 — garante continuidade com escalão 1

const BRACKETS_I: Bracket[] = [
  { max: 1136,     rate: 0.1650, ded:   90.81 },
  { max: 1187,     rate: 0.1320, ded:   53.39 },
  { max: 2076,     rate: 0.2500, ded:  193.46 },
  { max: 2432,     rate: 0.3000, ded:  297.26 },
  { max: 3223,     rate: 0.3572, ded:  436.37 },
  { max: 5865,     rate: 0.3872, ded:  533.06 },
  { max: 20221,    rate: 0.4170, ded:  707.84 },
  { max: Infinity, rate: 0.4717, ded: 1813.93 },
];
// Casado único titular
// Zona variável: 862–992 → cúbica calibrada: Ret(992) = 16,86 € (1,7%)
const TRANSITION_III_START = 862;
const TRANSITION_III_END   = 992;
const TRANSITION_III_TOP   = 30.21; // 992 × 0.13 − 98.75 — garante continuidade com escalão 1

const BRACKETS_III: Bracket[] = [
  { max: 1081,     rate: 0.1300, ded:   98.75 },
  { max: 1430,     rate: 0.1320, ded:  100.91 },
  { max: 2075,     rate: 0.1920, ded:  186.91 },
  { max: 3377,     rate: 0.2450, ded:  296.91 },
  { max: 5665,     rate: 0.3240, ded:  563.81 },
  { max: 7045,     rate: 0.4040, ded: 1016.61 },
  { max: 20085,    rate: 0.4170, ded: 1108.25 },
  { max: Infinity, rate: 0.4717, ded: 2206.57 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cubic ramp for the transition zone (0% → first regular bracket). */
function cubicRamp(R: number, start: number, end: number, topValue: number): number {
  if (R <= start) return 0;
  if (R >= end) return topValue;
  const t = (R - start) / (end - start);
  return topValue * t * t; // quadratic: derivada máx. 2×top/(end−start) ≤ 0.89 → sem cliff
}

/** Apply bracket table (regular zone only). */
function applyBrackets(
  R: number,
  brackets: Bracket[],
  nDeps: number,
  depDeduction: number,
): number {
  const b = brackets.find(br => R <= br.max);
  if (!b) return 0;
  const rateAdj = nDeps >= 3 ? Math.max(0, b.rate - 0.01) : b.rate;
  const totalDed = b.ded + depDeduction * nDeps;
  return Math.max(0, R * rateAdj - totalDed);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns the monthly IRS withholding (retenção na fonte) for a Portuguese
 * employee on the Continent (Continente), using the 2025 official tables.
 *
 * @param grossMonthly  Gross monthly salary (salário bruto mensal, €)
 * @param maritalStatus 'single' | 'married_dual' | 'married_single'
 * @param dependents    Number of dependents (0–6+)
 */
export function calcIRSWithholding(
  grossMonthly: number,
  maritalStatus: MaritalStatus,
  dependents: number,
): number {
  const R    = grossMonthly;
  const deps = Math.max(0, Math.round(dependents));

  if (maritalStatus === 'married_single') {
    // ── Tabela III ──
    if (R <= TRANSITION_III_START) return 0;
    if (R <= TRANSITION_III_END) {
      return cubicRamp(R, TRANSITION_III_START, TRANSITION_III_END, TRANSITION_III_TOP);
    }
    // depDeduction = 42,86 € for CUT
    return applyBrackets(R, BRACKETS_III, deps, 42.86);
  } else {
    // ── Tabela I (single) or CDT with dep deductions ──
    // CDT with dependents uses Tabela I + 21,43 € / dep deduction
    if (R <= TRANSITION_I_START) return 0;
    if (R <= TRANSITION_I_END) {
      // In transition zone, no dependent deduction yet (table I zero zone)
      return cubicRamp(R, TRANSITION_I_START, TRANSITION_I_END, TRANSITION_I_TOP);
    }
    // depDeduction = 21,43 € for NC and CDT
    return applyBrackets(R, BRACKETS_I, deps, 21.43);
  }
}

/**
 * Returns the effective IRS rate (0–1) for display purposes.
 */
export function effectiveIRSRate(
  grossMonthly: number,
  maritalStatus: MaritalStatus,
  dependents: number,
): number {
  if (grossMonthly <= 0) return 0;
  return calcIRSWithholding(grossMonthly, maritalStatus, dependents) / grossMonthly;
}

/**
 * Given net (take-home) salary, derive gross using iterative convergence.
 * Net = Gross - SS_employee (11%) - IRS_withheld
 * → solve for Gross iteratively (converges in ~10 steps).
 *
 * @param net            Desired net monthly salary (€)
 * @param ssEmployeeRate Employee SS rate (default 0.11)
 * @param maritalStatus
 * @param dependents
 * @returns Estimated gross monthly salary (€)
 */
export function netToGrossAccurate(
  net: number,
  ssEmployeeRate: number,
  maritalStatus: MaritalStatus,
  dependents: number,
): number {
  if (net <= 0) return 0;

  // Initial estimate ignoring IRS
  let gross = net / (1 - ssEmployeeRate);

  for (let i = 0; i < 30; i++) {
    const irs  = calcIRSWithholding(gross, maritalStatus, dependents);
    const ss   = gross * ssEmployeeRate;
    const netEst = gross - ss - irs;
    const error  = netEst - net;

    if (Math.abs(error) < 0.01) break; // converged

    // Newton-step approximation
    // d(netEst)/d(gross) ≈ 1 - ssRate - marginalIRSRate
    const marginalRate = 0.25; // conservative estimate for step size
    gross -= error / (1 - ssEmployeeRate - marginalRate);
    gross = Math.max(gross, net); // gross cannot be less than net
  }

  return Math.round(gross);
}

/**
 * Full payslip breakdown for a given gross salary.
 */
export function calcPayslip(
  grossMonthly: number,
  ssEmployeeRate: number,
  ssEmployerRate: number,
  maritalStatus: MaritalStatus,
  dependents: number,
) {
  const ss_employee = grossMonthly * ssEmployeeRate;
  const irs         = calcIRSWithholding(grossMonthly, maritalStatus, dependents);
  const net         = grossMonthly - ss_employee - irs;
  const ss_employer = grossMonthly * ssEmployerRate;
  const totalCostEmployer = grossMonthly + ss_employer;
  const effectiveRate = grossMonthly > 0 ? irs / grossMonthly : 0;

  return {
    gross: grossMonthly,
    ss_employee,
    irs,
    net: Math.max(0, net),
    ss_employer,
    totalCostEmployer,
    effectiveIRSRate: effectiveRate,
  };
}
