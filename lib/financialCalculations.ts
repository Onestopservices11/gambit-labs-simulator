import type {
  Assumptions,
  Employee,
  EmployeeCalculations,
  Investment,
  InvestmentCalculations,
  Financing,
  FinancingCalculations,
  PipelineOpportunity,
  MonthlyResult,
  RevenueGoalCalculations,
  Scenario,
  ScenarioCalculations,
} from './types';

// ─── Employee Calculations ───────────────────────────────────────────────────

export function calculateEmployeeMonthlyDirectCost(
  employee: Employee,
  assumptions: Assumptions
): number {
  return employee.grossMonthlySalary * (1 + assumptions.employerSocialSecurityRate);
}

export function calculateEmployeeAnnualCost(
  employee: Employee,
  assumptions: Assumptions
): number {
  const baseSalaryAnnual =
    employee.grossMonthlySalary *
    assumptions.monthsPaidPerYear *
    (1 + assumptions.employerSocialSecurityRate);
  const annualMealAllowance = employee.monthlyMealAllowance * 11; // ~11 months
  const annualTools = employee.monthlyToolsCost * 12;
  const annualOther = employee.monthlyOtherCosts * 12;
  return (
    baseSalaryAnnual +
    annualMealAllowance +
    annualTools +
    annualOther +
    employee.annualBonus +
    employee.initialEquipmentCost +
    employee.trainingCost
  );
}

export function calculateAnnualizedMonthlyCost(
  employee: Employee,
  assumptions: Assumptions
): number {
  return calculateEmployeeAnnualCost(employee, assumptions) / 12;
}

export function calculateBreakEvenRevenue(annualizedMonthlyCost: number, grossMargin: number): number {
  if (grossMargin <= 0) return Infinity;
  return annualizedMonthlyCost / grossMargin;
}

export function calculateRequiredRevenueForTargetMargin(
  annualizedMonthlyCost: number,
  grossMargin: number,
  targetNetMargin: number
): number {
  const effectiveMargin = grossMargin - targetNetMargin;
  if (effectiveMargin <= 0) return Infinity;
  return annualizedMonthlyCost / effectiveMargin;
}

export function calculateEmployeeCalculations(
  employee: Employee,
  assumptions: Assumptions
): EmployeeCalculations {
  const monthlyDirectCost = calculateEmployeeMonthlyDirectCost(employee, assumptions);
  const monthlyRealCost =
    monthlyDirectCost +
    employee.monthlyMealAllowance +
    employee.monthlyToolsCost +
    employee.monthlyOtherCosts;
  const annualCost = calculateEmployeeAnnualCost(employee, assumptions);
  const annualizedMonthlyCost = annualCost / 12;
  const breakEvenRevenue = calculateBreakEvenRevenue(annualizedMonthlyCost, assumptions.grossMargin);
  const requiredRevenueForTargetMargin = calculateRequiredRevenueForTargetMargin(
    annualizedMonthlyCost,
    assumptions.grossMargin,
    assumptions.targetNetMargin
  );
  const requiredProjectsBreakEven = Math.ceil(breakEvenRevenue / assumptions.averageProjectTicket);
  const requiredClientsBreakEven = Math.ceil(
    breakEvenRevenue / assumptions.averageMonthlyRecurringRevenue
  );

  let decision: EmployeeCalculations['decision'] = 'wait';
  let decisionReason = '';

  // ── Capacity-based model (delivery / tech) ──────────────────────────────────
  const capacity = employee.monthlyBillableCapacity ?? 0;
  const grossMargin = assumptions.grossMargin;

  const breakEvenUtilizationRate = (capacity > 0 && grossMargin > 0)
    ? annualizedMonthlyCost / (capacity * grossMargin)
    : 0;

  const revenueAt70pct  = capacity * 0.7;
  const revenueAt100pct = capacity;
  const profitAt70pct   = revenueAt70pct * grossMargin - annualizedMonthlyCost;

  if (employee.hiringModel === 'capacity_based' && capacity > 0) {
    if (breakEvenUtilizationRate <= 0.60) {
      decision = 'hire';
      decisionReason = `Break-even a ${(breakEvenUtilizationRate * 100).toFixed(0)}% de ocupação — muito alcançável. A ${70}% gera ${formatCurrency(profitAt70pct)} de lucro/mês.`;
    } else if (breakEvenUtilizationRate <= 0.80) {
      decision = 'wait';
      decisionReason = `Break-even a ${(breakEvenUtilizationRate * 100).toFixed(0)}% de ocupação. Garante trabalho suficiente antes de contratar.`;
    } else {
      decision = 'dont_hire';
      decisionReason = `Break-even exige ${(breakEvenUtilizationRate * 100).toFixed(0)}% de ocupação — demasiado arriscado. Considera reduzir o salário ou aumentar a capacidade faturável.`;
    }
  } else {
    // ── Revenue-based model (commercial / management / admin) ─────────────────
    if (employee.expectedMonthlyRevenue >= requiredRevenueForTargetMargin) {
      decision = 'hire';
      decisionReason = 'A receita esperada cobre os custos e mantém a margem pretendida.';
    } else if (employee.expectedMonthlyRevenue >= breakEvenRevenue) {
      decision = 'wait';
      decisionReason = 'A receita esperada cobre os custos mas não mantém a margem líquida pretendida. Reforça o pipeline antes de contratar.';
    } else {
      decision = 'dont_hire';
      decisionReason = 'A receita esperada não cobre os custos desta contratação. Pipeline insuficiente.';
    }
  }

  return {
    monthlyDirectCost,
    monthlyRealCost,
    annualCost,
    annualizedMonthlyCost,
    breakEvenRevenue,
    requiredRevenueForTargetMargin,
    requiredProjectsBreakEven,
    requiredClientsBreakEven,
    decision,
    decisionReason,
    breakEvenUtilizationRate,
    revenueAt70pct,
    revenueAt100pct,
    profitAt70pct,
  };
}

// ─── Investment Calculations ──────────────────────────────────────────────────

export function calculateNPV(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((npv, cf, t) => {
    return npv + cf / Math.pow(1 + discountRate / 12, t + 1);
  }, 0);
}

export function calculateInvestmentCalculations(
  investment: Investment,
  assumptions: Assumptions
): InvestmentCalculations {
  const netInvestment = investment.initialInvestment - investment.subsidyAmount;
  const annualIncrementalRevenue = investment.expectedMonthlyRevenue * 12;
  const annualSavings = investment.expectedMonthlySavings * 12;
  const annualOperatingCosts = investment.monthlyOperatingCosts * 12;
  const annualEBITDA = annualIncrementalRevenue + annualSavings - annualOperatingCosts;

  const roi = netInvestment > 0 ? annualEBITDA / netInvestment : 0;
  const paybackMonths =
    annualEBITDA > 0 ? Math.ceil((netInvestment / annualEBITDA) * 12) : Infinity;

  const monthlyNetCashFlow =
    investment.expectedMonthlyRevenue +
    investment.expectedMonthlySavings -
    investment.monthlyOperatingCosts;

  const cashFlows = Array.from({ length: investment.durationMonths }, () => monthlyNetCashFlow);
  const npv = calculateNPV(cashFlows, assumptions.discountRate) - netInvestment;

  const cashFlowAccumulated: number[] = [];
  let accumulated = -netInvestment;
  for (let i = 0; i < investment.durationMonths; i++) {
    accumulated += monthlyNetCashFlow;
    cashFlowAccumulated.push(accumulated);
  }

  const returnMultiple = netInvestment > 0 ? (annualEBITDA * (investment.durationMonths / 12) + netInvestment) / netInvestment : 0;

  let decision: InvestmentCalculations['decision'] = 'risk';
  let decisionLabel = '';
  const paybackYears = paybackMonths / 12;

  if (roi > 0.5 && paybackYears <= 2) {
    decision = 'excellent';
    decisionLabel = 'Excelente';
  } else if (roi > 0.25 && paybackYears <= 3) {
    decision = 'interesting';
    decisionLabel = 'Interessante';
  } else if (roi > 0 && paybackYears <= 4) {
    decision = 'analyze';
    decisionLabel = 'A Analisar';
  } else {
    decision = 'risk';
    decisionLabel = 'Risco';
  }

  return {
    netInvestment,
    annualIncrementalRevenue,
    annualSavings,
    annualEBITDA,
    roi,
    paybackMonths,
    npv,
    cashFlowAccumulated,
    returnMultiple,
    decision,
    decisionLabel,
  };
}

// ─── Financing Calculations ───────────────────────────────────────────────────

export function calculateLoanPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (annualRate === 0) return principal / termMonths;
  const monthlyRate = annualRate / 12;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
}

export function calculateFinancingCalculations(financing: Financing): FinancingCalculations {
  const finalRate = financing.baseInterestRate + financing.spread;
  const monthlyRate = finalRate / 12;
  const effectiveTerm = financing.termMonths - financing.capitalGracePeriodMonths;

  const monthlyInstallment = calculateLoanPayment(
    financing.financedAmount,
    finalRate,
    effectiveTerm
  );

  const schedule: FinancingCalculations['monthlySchedule'] = [];
  let balance = financing.financedAmount;

  for (let m = 1; m <= financing.termMonths; m++) {
    const interest = balance * monthlyRate;
    let principal = 0;
    if (m > financing.capitalGracePeriodMonths) {
      principal = monthlyInstallment - interest;
    }
    balance = Math.max(0, balance - principal);
    schedule.push({ month: m, principal, interest, balance });
  }

  const totalPaid = schedule.reduce((s, r) => s + r.principal + r.interest, 0);
  const totalInterest = totalPaid - financing.financedAmount;

  return { finalRate, monthlyInstallment, totalInterest, totalPaid, monthlySchedule: schedule };
}

// ─── Pipeline Calculations ────────────────────────────────────────────────────

export function calculatePipelineWeightedValue(pipeline: PipelineOpportunity[]): number {
  return pipeline
    .filter(o => o.stage !== 'closed_lost')
    .reduce((sum, o) => sum + o.estimatedValue * (o.probability / 100), 0);
}

export function calculatePipelineTotal(pipeline: PipelineOpportunity[]): number {
  return pipeline
    .filter(o => o.stage !== 'closed_lost')
    .reduce((sum, o) => sum + o.estimatedValue, 0);
}

// ─── Revenue Goal Calculations ────────────────────────────────────────────────

export function calculateRevenueGoalRequirements(
  annualGoal: number,
  assumptions: Assumptions
): RevenueGoalCalculations {
  const monthlyGoal = annualGoal / 12;
  const weeklyGoal = annualGoal / 52;

  const oneOffMonthlyRevenue = monthlyGoal * assumptions.oneOffRevenueShare;
  const recurringMonthlyRevenue = monthlyGoal * assumptions.recurringRevenueShare;

  const oneOffProjectsPerMonth = Math.ceil(
    oneOffMonthlyRevenue / assumptions.averageProjectTicket
  );
  const recurringClientsNeeded = Math.ceil(
    recurringMonthlyRevenue / assumptions.averageMonthlyRecurringRevenue
  );

  const totalClosingsPerMonth = oneOffProjectsPerMonth;
  const proposalsPerMonth = Math.ceil(
    totalClosingsPerMonth / assumptions.proposalToCloseConversion
  );
  const meetingsPerMonth = Math.ceil(
    proposalsPerMonth / assumptions.meetingToProposalConversion
  );
  const leadsPerMonth = Math.ceil(meetingsPerMonth / assumptions.leadToMeetingConversion);
  const closingsPerMonth = totalClosingsPerMonth;

  const salesPeopleNeeded = Math.ceil(monthlyGoal / assumptions.salesCapacityPerPerson);
  const deliveryPeopleNeeded = Math.ceil(monthlyGoal / assumptions.deliveryCapacityPerPerson);

  // Simplified team cost
  const avgSalary = 2500;
  const estimatedTeamCost =
    (salesPeopleNeeded + deliveryPeopleNeeded) *
    avgSalary *
    (1 + assumptions.employerSocialSecurityRate) *
    12;

  const estimatedMargin = monthlyGoal * assumptions.grossMargin;
  const estimatedProfit = monthlyGoal * assumptions.targetNetMargin;

  const executiveSummary =
    `Para atingir ${formatCurrency(annualGoal)}/ano, com os pressupostos atuais, precisa de gerar ` +
    `${formatCurrency(monthlyGoal)}/mês, fechar ${oneOffProjectsPerMonth} projetos one-off, manter ` +
    `${recurringClientsNeeded} clientes recorrentes, gerar ${leadsPerMonth} leads/mês e ter ` +
    `aproximadamente ${salesPeopleNeeded} comerciais e ${deliveryPeopleNeeded} pessoas de delivery produtivos.`;

  return {
    annualGoal,
    monthlyGoal,
    weeklyGoal,
    oneOffMonthlyRevenue,
    recurringMonthlyRevenue,
    oneOffProjectsPerMonth,
    recurringClientsNeeded,
    leadsPerMonth,
    meetingsPerMonth,
    proposalsPerMonth,
    closingsPerMonth,
    salesPeopleNeeded,
    deliveryPeopleNeeded,
    estimatedTeamCost,
    estimatedMargin,
    estimatedProfit,
    executiveSummary,
  };
}

// ─── Monthly Results ──────────────────────────────────────────────────────────

export function calculateActualVsPlan(results: MonthlyResult[], monthlyGoal?: number) {
  const totalActual = results.reduce((s, r) => s + r.actualRevenue, 0);
  // Always use the current monthly goal if provided, so stale stored values don't pollute the result
  const totalPlanned = monthlyGoal != null
    ? monthlyGoal * results.length
    : results.reduce((s, r) => s + r.plannedRevenue, 0);
  const deviation = totalActual - totalPlanned;
  const deviationPercent = totalPlanned > 0 ? (deviation / totalPlanned) * 100 : 0;
  return { totalPlanned, totalActual, deviation, deviationPercent };
}

// ─── Scenario Calculations ────────────────────────────────────────────────────

export function calculateScenario(
  scenario: Scenario,
  baseAssumptions: Assumptions
): ScenarioCalculations {
  const a = { ...baseAssumptions, ...scenario.assumptionsOverride };

  const annualRevenue = a.annualRevenueGoal;
  const estimatedProfit = annualRevenue * a.targetNetMargin;

  const monthlyGoal = annualRevenue / 12;
  const salesPeople = Math.ceil(monthlyGoal / a.salesCapacityPerPerson);
  const deliveryPeople = Math.ceil(monthlyGoal / a.deliveryCapacityPerPerson);
  const requiredPeople = salesPeople + deliveryPeople;

  const avgAnnualEmployeeCost = 30000 * (1 + a.employerSocialSecurityRate) * a.monthsPaidPerYear / 12 * 12;
  const requiredInvestment = requiredPeople * avgAnnualEmployeeCost;

  const roi = requiredInvestment > 0 ? estimatedProfit / requiredInvestment : 0;
  const paybackMonths = estimatedProfit > 0 ? Math.ceil((requiredInvestment / estimatedProfit) * 12) : Infinity;

  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  let executionProbability = 0.6;

  if (scenario.type === 'conservative') {
    riskLevel = 'low';
    executionProbability = 0.8;
  } else if (scenario.type === 'base') {
    riskLevel = 'medium';
    executionProbability = 0.6;
  } else if (scenario.type === 'aggressive') {
    riskLevel = 'high';
    executionProbability = 0.35;
  }

  return { annualRevenue, estimatedProfit, requiredInvestment, requiredPeople, roi, paybackMonths, riskLevel, executionProbability };
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export interface Recommendation {
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  area: string;
}

export function generateBusinessRecommendations(
  assumptions: Assumptions,
  employees: Employee[],
  investments: Investment[],
  pipeline: PipelineOpportunity[],
  monthlyResults: MonthlyResult[]
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Margin check
  if (assumptions.grossMargin <= assumptions.targetNetMargin) {
    recs.push({
      type: 'danger',
      title: 'Pressupostos inválidos',
      message: 'A margem bruta tem de ser superior à margem líquida pretendida. Corrija os pressupostos.',
      area: 'Pressupostos',
    });
  }

  // Pipeline vs goal
  const weightedPipeline = calculatePipelineWeightedValue(pipeline);
  const monthlyGoal = assumptions.annualRevenueGoal / 12;
  if (weightedPipeline < monthlyGoal * 2) {
    recs.push({
      type: 'warning',
      title: 'Pipeline insuficiente',
      message: `O pipeline ponderado (${formatCurrency(weightedPipeline)}) é inferior a 2× a meta mensal (${formatCurrency(monthlyGoal * 2)}). Reforce a geração de leads.`,
      area: 'Pipeline Comercial',
    });
  }

  // Team cost vs revenue
  const activeEmployees = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const totalTeamCost = activeEmployees.reduce((s, e) => {
    const monthlyDirectCost = e.grossMonthlySalary * (1 + assumptions.employerSocialSecurityRate);
    return s + monthlyDirectCost + e.monthlyToolsCost + e.monthlyOtherCosts + e.monthlyMealAllowance;
  }, 0);

  const teamCostAsRevenuePercent = monthlyGoal > 0 ? totalTeamCost / monthlyGoal : 0;
  if (teamCostAsRevenuePercent > 0.5) {
    recs.push({
      type: 'warning',
      title: 'Custo de equipa elevado',
      message: `Os custos com equipa representam ${(teamCostAsRevenuePercent * 100).toFixed(0)}% da meta mensal. O ideal é manter abaixo de 50%.`,
      area: 'Contratações',
    });
  }

  // Conversion rate check
  const effectiveConversion =
    assumptions.leadToMeetingConversion *
    assumptions.meetingToProposalConversion *
    assumptions.proposalToCloseConversion;

  if (effectiveConversion < 0.02) {
    recs.push({
      type: 'warning',
      title: 'Taxa de conversão baixa',
      message: `A taxa de conversão global (lead→venda) é de ${(effectiveConversion * 100).toFixed(1)}%. Analise onde está o maior ponto de fuga no funil.`,
      area: 'Pipeline Comercial',
    });
  }

  // Results tracking
  if (monthlyResults.length > 0) {
    const { deviationPercent } = calculateActualVsPlan(monthlyResults);
    if (deviationPercent < -15) {
      recs.push({
        type: 'danger',
        title: 'Desvio crítico face ao plano',
        message: `A faturação acumulada está ${Math.abs(deviationPercent).toFixed(1)}% abaixo do plano. Reveja a estratégia comercial urgentemente.`,
        area: 'Resultados Reais',
      });
    } else if (deviationPercent > 10) {
      recs.push({
        type: 'success',
        title: 'Acima do plano',
        message: `Está ${deviationPercent.toFixed(1)}% acima da meta acumulada. Excelente execução. Considere aumentar a meta anual ou reinvestir.`,
        area: 'Resultados Reais',
      });
    }
  }

  // Investment ROI check
  const riskyInvestments = investments.filter(inv => {
    const calc = calculateInvestmentCalculations(inv, assumptions);
    return calc.decision === 'risk' && inv.status === 'in_progress';
  });
  if (riskyInvestments.length > 0) {
    recs.push({
      type: 'warning',
      title: 'Investimentos com risco elevado em execução',
      message: `${riskyInvestments.length} investimento(s) em execução têm ROI baixo ou payback superior a 48 meses. Reveja a execução.`,
      area: 'Investimentos',
    });
  }

  if (recs.length === 0) {
    recs.push({
      type: 'success',
      title: 'Situação geral saudável',
      message: 'Os pressupostos, pipeline e indicadores estão alinhados. Continue a monitorizar mensalmente.',
      area: 'Geral',
    });
  }

  return recs;
}

// ─── Ajudas de Custo (AT 2025) ────────────────────────────────────────────────

/** AT 2025 daily limits per type (Portaria n.º 1553-D/2008 actualizada) */
export const AT_AJUDAS_LIMITS: Record<string, number> = {
  national_day:       50.20,   // deslocação nacional, sem pernoita
  national_overnight: 69.19,   // deslocação nacional, com pernoita
  international:      89.35,   // deslocação internacional (taxa UE de referência)
};

/** AT 2025 km rate limits (viatura própria) */
export const AT_KM_LIMITS: Record<string, number> = {
  car:         0.40,  // automóvel
  motorcycle:  0.24,  // motociclo > 50cc
  bicycle:     0.15,  // ciclomotor / bicicleta
};

export interface AjudasCustoCalc {
  // Diária
  tipo: string;
  diasPerMonth: number;
  valorDia: number;
  atLimitDia: number;
  monthlyDiaria: number;
  monthlyDiariaExempt: number;
  monthlyDiariaTaxable: number;
  // Km
  kmPerMonth: number;
  ratePerKm: number;
  atLimitKm: number;
  monthlyKm: number;
  monthlyKmExempt: number;
  monthlyKmTaxable: number;
  // Totals
  monthlyTotal: number;
  monthlyExempt: number;
  monthlyTaxable: number;
  annualTotal: number;
  annualExempt: number;
  annualTaxable: number;
  employerExtraSS: number;
  netBenefitEmployee: number;
}

export function calculateAjudasCusto(
  employee: import('./types').Employee,
  assumptions: Assumptions,
): AjudasCustoCalc {
  const tipo      = employee.ajudasCustoTipo ?? 'none';
  const dias      = employee.ajudasCustoDiasPerMonth ?? 0;
  const customVal = employee.ajudasCustoValorDiaCustom ?? 0;
  const km        = employee.ajudasKmPerMonth ?? 0;
  const customKm  = employee.ajudasKmRateCustom ?? 0;
  const vehicle   = employee.ajudasKmVehicle ?? 'car';

  // ── Diária ────────────────────────────────────────────────────────────────
  const atLimitDia = tipo !== 'none' ? (AT_AJUDAS_LIMITS[tipo] ?? 0) : 0;
  const valorDia   = (tipo !== 'none' && dias > 0) ? (customVal > 0 ? customVal : atLimitDia) : 0;
  const monthlyDiaria         = tipo !== 'none' ? dias * valorDia : 0;
  const monthlyDiariaExempt   = tipo !== 'none' ? dias * Math.min(valorDia, atLimitDia) : 0;
  const monthlyDiariaTaxable  = Math.max(0, monthlyDiaria - monthlyDiariaExempt);

  // ── Km ────────────────────────────────────────────────────────────────────
  const atLimitKm     = AT_KM_LIMITS[vehicle] ?? 0.40;
  const ratePerKm     = customKm > 0 ? customKm : atLimitKm;
  const monthlyKm         = km * ratePerKm;
  const monthlyKmExempt   = km * Math.min(ratePerKm, atLimitKm);
  const monthlyKmTaxable  = Math.max(0, monthlyKm - monthlyKmExempt);

  // ── Totals ────────────────────────────────────────────────────────────────
  const monthlyTotal   = monthlyDiaria + monthlyKm;
  const monthlyExempt  = monthlyDiariaExempt + monthlyKmExempt;
  const monthlyTaxable = monthlyDiariaTaxable + monthlyKmTaxable;

  const annualTotal   = monthlyTotal   * 11;
  const annualExempt  = monthlyExempt  * 11;
  const annualTaxable = monthlyTaxable * 11;

  const employerExtraSS = monthlyTaxable * assumptions.employerSocialSecurityRate;
  const taxableNet = monthlyTaxable * (1 - assumptions.employeeSocialSecurityRate - 0.28);
  const netBenefitEmployee = monthlyExempt + Math.max(0, taxableNet);

  return {
    tipo, diasPerMonth: dias, valorDia, atLimitDia,
    monthlyDiaria, monthlyDiariaExempt, monthlyDiariaTaxable,
    kmPerMonth: km, ratePerKm, atLimitKm,
    monthlyKm, monthlyKmExempt, monthlyKmTaxable,
    monthlyTotal, monthlyExempt, monthlyTaxable,
    annualTotal, annualExempt, annualTaxable,
    employerExtraSS, netBenefitEmployee,
  };
}

// ─── Company Break-Even ───────────────────────────────────────────────────────

export interface CompanyBreakEven {
  monthlyFixedCosts: number;       // salaries + fixed costs + debt
  annualFixedCosts: number;
  breakEvenMonthlyRevenue: number; // fixedCosts / grossMargin
  breakEvenAnnualRevenue: number;
  safetyMargin: number;            // (currentRevenue - breakEven) / currentRevenue
  coverageRatio: number;           // currentRevenue / breakEven
  monthsToBreakEven: number | null; // if growing from 0, months to reach break-even at current growth rate
}

export function calculateCompanyBreakEven(
  assumptions: Assumptions,
  employees: Employee[],
  freelancers: { monthlyCost: number; status: string }[],
  fixedCostItemsTotal: number,
  monthlyDebtService: number,
  currentMonthlyRevenue: number,
): CompanyBreakEven {
  const activeEmps = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const monthlySalaries = activeEmps.reduce((s, e) => s + calculateAnnualizedMonthlyCost(e, assumptions), 0);
  const monthlyFreelancers = freelancers
    .filter(f => f.status === 'active' || f.status === 'planned')
    .reduce((s, f) => s + f.monthlyCost, 0);
  const fixedBase = fixedCostItemsTotal > 0 ? fixedCostItemsTotal : assumptions.monthlyFixedCosts;
  const monthlyFixedCosts = monthlySalaries + monthlyFreelancers + fixedBase + monthlyDebtService;
  const annualFixedCosts = monthlyFixedCosts * 12;

  const gm = assumptions.grossMargin > 0 ? assumptions.grossMargin : 0.01;
  const breakEvenMonthlyRevenue = monthlyFixedCosts / gm;
  const breakEvenAnnualRevenue = breakEvenMonthlyRevenue * 12;

  const safetyMargin = currentMonthlyRevenue > 0
    ? (currentMonthlyRevenue - breakEvenMonthlyRevenue) / currentMonthlyRevenue
    : -1;
  const coverageRatio = breakEvenMonthlyRevenue > 0
    ? currentMonthlyRevenue / breakEvenMonthlyRevenue
    : 0;

  const monthlyGrowth = assumptions.annualGrowthRate / 12;
  let monthsToBreakEven: number | null = null;
  if (currentMonthlyRevenue < breakEvenMonthlyRevenue && monthlyGrowth > 0) {
    monthsToBreakEven = Math.ceil(
      Math.log(breakEvenMonthlyRevenue / Math.max(currentMonthlyRevenue, 1)) / Math.log(1 + monthlyGrowth)
    );
  }

  return { monthlyFixedCosts, annualFixedCosts, breakEvenMonthlyRevenue, breakEvenAnnualRevenue, safetyMargin, coverageRatio, monthsToBreakEven };
}

// ─── Cash Runway ─────────────────────────────────────────────────────────────

export interface RunwayAnalysis {
  monthlyBurn: number;      // total monthly cash out (costs - revenue)
  runwayMonths: number;     // cashBalance / monthlyBurn
  criticalDate: string;     // ISO date when cash runs out
  isOperationallyPositive: boolean;
  recommendation: string;
}

export function calculateRunway(
  currentCashBalance: number,
  monthlyRevenue: number,
  monthlyFixedCosts: number,
): RunwayAnalysis {
  const monthlyBurn = Math.max(0, monthlyFixedCosts - monthlyRevenue);
  const isOperationallyPositive = monthlyRevenue >= monthlyFixedCosts;

  let runwayMonths = Infinity;
  if (!isOperationallyPositive && monthlyBurn > 0) {
    runwayMonths = currentCashBalance / monthlyBurn;
  }

  const criticalDate = new Date();
  criticalDate.setMonth(criticalDate.getMonth() + Math.floor(runwayMonths === Infinity ? 999 : runwayMonths));

  let recommendation = '';
  if (isOperationallyPositive) {
    recommendation = 'Empresa operacionalmente positiva — receita cobre todos os custos.';
  } else if (runwayMonths < 3) {
    recommendation = `CRÍTICO: Apenas ${runwayMonths.toFixed(1)} meses de runway. Ação imediata necessária.`;
  } else if (runwayMonths < 6) {
    recommendation = `Runway curto (${runwayMonths.toFixed(1)} meses). Acelera vendas ou reduz custos.`;
  } else if (runwayMonths < 12) {
    recommendation = `${runwayMonths.toFixed(1)} meses de runway. Monitoriza de perto.`;
  } else {
    recommendation = `${runwayMonths.toFixed(1)} meses de runway. Situação confortável.`;
  }

  return { monthlyBurn, runwayMonths, criticalDate: criticalDate.toISOString().slice(0, 7), isOperationallyPositive, recommendation };
}

// ─── Customer LTV ─────────────────────────────────────────────────────────────

export interface CustomerLTV {
  averageMRR: number;         // avg recurring revenue per client
  ltv: number;                // MRR / monthlyChurnRate
  ltvCacRatio: number;        // LTV / CAC
  paybackMonths: number;      // CAC / MRR
  expectedLifetimeMonths: number;
  recommendation: string;
}

export function calculateCustomerLTV(
  averageMRR: number,
  monthlyChurnRate: number,  // 0–1 (e.g. 0.05 = 5%)
  cac: number,               // Customer Acquisition Cost
  grossMargin: number,
): CustomerLTV {
  const safeChurn = Math.max(monthlyChurnRate, 0.001);
  const expectedLifetimeMonths = 1 / safeChurn;
  const ltv = (averageMRR * grossMargin) * expectedLifetimeMonths;
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;
  const paybackMonths = averageMRR > 0 && grossMargin > 0 ? cac / (averageMRR * grossMargin) : Infinity;

  let recommendation = '';
  if (ltvCacRatio >= 3) recommendation = 'LTV/CAC excelente (≥3×). Escala aquisição de clientes.';
  else if (ltvCacRatio >= 1) recommendation = 'LTV/CAC positivo. Há margem para crescer.';
  else recommendation = 'LTV/CAC < 1. Custos de aquisição superiores ao valor gerado. Reduz CAC ou aumenta retenção.';

  return { averageMRR, ltv, ltvCacRatio, paybackMonths, expectedLifetimeMonths, recommendation };
}

// ─── Risk Score ───────────────────────────────────────────────────────────────

export interface RiskFactor {
  name: string;
  score: number;     // 0–100 (100 = best)
  weight: number;
  status: 'good' | 'warn' | 'bad';
  note: string;
}

export interface RiskAnalysis {
  overallScore: number;    // weighted average 0–100
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  topRisk: string;
}

export function calculateRiskScore(
  assumptions: Assumptions,
  employees: Employee[],
  pipeline: PipelineOpportunity[],
  monthlyResults: MonthlyResult[],
  currentMonthlyRevenue: number,
  monthlyFixedCosts: number,
): RiskAnalysis {
  const factors: RiskFactor[] = [];

  // 1. Pipeline coverage (pipeline weighted / monthly goal × 3)
  const monthlyGoal = assumptions.annualRevenueGoal / 12;
  const weightedPipeline = calculatePipelineWeightedValue(pipeline);
  const pipelineCoverage = monthlyGoal > 0 ? weightedPipeline / (monthlyGoal * 3) : 0;
  factors.push({
    name: 'Cobertura do Pipeline',
    score: Math.min(100, pipelineCoverage * 100),
    weight: 0.25,
    status: pipelineCoverage >= 1 ? 'good' : pipelineCoverage >= 0.5 ? 'warn' : 'bad',
    note: `Pipeline ponderado cobre ${(pipelineCoverage * 100).toFixed(0)}% de 3× meta mensal`,
  });

  // 2. Revenue vs break-even
  const breakEven = monthlyFixedCosts / Math.max(assumptions.grossMargin, 0.01);
  const coverageRatio = breakEven > 0 ? currentMonthlyRevenue / breakEven : 0;
  factors.push({
    name: 'Cobertura do Break-Even',
    score: Math.min(100, coverageRatio * 80),
    weight: 0.25,
    status: coverageRatio >= 1.2 ? 'good' : coverageRatio >= 1 ? 'warn' : 'bad',
    note: `Receita cobre ${(coverageRatio * 100).toFixed(0)}% do break-even`,
  });

  // 3. Team cost as % of revenue
  const activeEmps = employees.filter(e => e.status === 'active' || e.status === 'planned');
  const teamCostMonthly = activeEmps.reduce((s, e) => s + calculateAnnualizedMonthlyCost(e, assumptions), 0);
  const teamPct = currentMonthlyRevenue > 0 ? teamCostMonthly / currentMonthlyRevenue : 1;
  const teamScore = Math.max(0, 100 - teamPct * 100);
  factors.push({
    name: 'Peso da Equipa na Receita',
    score: teamScore,
    weight: 0.20,
    status: teamPct <= 0.4 ? 'good' : teamPct <= 0.6 ? 'warn' : 'bad',
    note: `Custos de equipa = ${(teamPct * 100).toFixed(0)}% da receita`,
  });

  // 4. Conversion funnel
  const effectiveConv = assumptions.leadToMeetingConversion
    * assumptions.meetingToProposalConversion
    * assumptions.proposalToCloseConversion;
  const convScore = Math.min(100, effectiveConv * 1000);
  factors.push({
    name: 'Eficiência do Funil',
    score: convScore,
    weight: 0.15,
    status: effectiveConv >= 0.03 ? 'good' : effectiveConv >= 0.015 ? 'warn' : 'bad',
    note: `Taxa global lead→fecho: ${(effectiveConv * 100).toFixed(2)}%`,
  });

  // 5. Revenue stability (variance from plan)
  let stabilityScore = 60; // default if no data
  if (monthlyResults.length >= 3) {
    const avgDev = monthlyResults.slice(-3).reduce((s, r) => {
      return s + Math.abs((r.actualRevenue - r.plannedRevenue) / Math.max(r.plannedRevenue, 1));
    }, 0) / 3;
    stabilityScore = Math.max(0, 100 - avgDev * 200);
  }
  factors.push({
    name: 'Estabilidade da Receita',
    score: stabilityScore,
    weight: 0.15,
    status: stabilityScore >= 70 ? 'good' : stabilityScore >= 40 ? 'warn' : 'bad',
    note: monthlyResults.length >= 3 ? 'Baseado nos últimos 3 meses' : 'Dados insuficientes — usando estimativa',
  });

  const overallScore = factors.reduce((s, f) => s + f.score * f.weight, 0);
  const level: RiskAnalysis['level'] = overallScore >= 70 ? 'low' : overallScore >= 50 ? 'medium' : overallScore >= 30 ? 'high' : 'critical';

  const worstFactor = [...factors].sort((a, b) => a.score - b.score)[0];
  const topRisk = worstFactor.status === 'bad'
    ? `Risco principal: ${worstFactor.name} — ${worstFactor.note}`
    : 'Sem riscos críticos identificados.';

  return { overallScore, level, factors, topRisk };
}

// ─── Sensitivity Analysis ─────────────────────────────────────────────────────

export interface SensitivityResult {
  variable: string;
  baseValue: number;
  low: number;
  high: number;
  revenueAtLow: number;
  revenueAtBase: number;
  revenueAtHigh: number;
  revenueImpactLow: number;   // delta vs base
  revenueImpactHigh: number;
}

export function calculateSensitivity(assumptions: Assumptions): SensitivityResult[] {
  const base = calculateRevenueGoalRequirements(assumptions.annualRevenueGoal, assumptions);
  const baseRevenue = base.annualGoal;

  function revenueWith(patch: Partial<Assumptions>) {
    return calculateRevenueGoalRequirements(
      (patch.annualRevenueGoal ?? assumptions.annualRevenueGoal),
      { ...assumptions, ...patch }
    ).annualGoal;
  }

  // For each variable, compute revenue sensitivity by showing impact of ±20% change
  const vars: { variable: string; key: keyof Assumptions; low: number; high: number; isRevenue?: boolean }[] = [
    { variable: 'Taxa de Fecho (Proposta→Venda)', key: 'proposalToCloseConversion',
      low: assumptions.proposalToCloseConversion * 0.7, high: assumptions.proposalToCloseConversion * 1.3 },
    { variable: 'Ticket Médio Projeto', key: 'averageProjectTicket',
      low: assumptions.averageProjectTicket * 0.8, high: assumptions.averageProjectTicket * 1.2, isRevenue: true },
    { variable: 'Margem Bruta', key: 'grossMargin',
      low: Math.max(0.1, assumptions.grossMargin - 0.1), high: Math.min(0.95, assumptions.grossMargin + 0.1) },
    { variable: 'Leads por Mês (via meta)', key: 'annualRevenueGoal',
      low: assumptions.annualRevenueGoal * 0.7, high: assumptions.annualRevenueGoal * 1.3, isRevenue: true },
    { variable: 'Receita Recorrente por Cliente', key: 'averageMonthlyRecurringRevenue',
      low: assumptions.averageMonthlyRecurringRevenue * 0.7, high: assumptions.averageMonthlyRecurringRevenue * 1.3, isRevenue: true },
  ];

  return vars.map(v => {
    // For revenue-direct variables, we simulate changing the goal
    // For conversion rates, we compute how many closings change
    const patchLow = { [v.key]: v.low } as Partial<Assumptions>;
    const patchHigh = { [v.key]: v.high } as Partial<Assumptions>;

    // Estimate revenue impact
    let revLow = baseRevenue;
    let revHigh = baseRevenue;

    if (v.key === 'proposalToCloseConversion') {
      const closeRatioLow = v.low / assumptions.proposalToCloseConversion;
      const closeRatioHigh = v.high / assumptions.proposalToCloseConversion;
      revLow = baseRevenue * closeRatioLow;
      revHigh = baseRevenue * closeRatioHigh;
    } else if (v.key === 'averageProjectTicket') {
      revLow = baseRevenue * (v.low / assumptions.averageProjectTicket);
      revHigh = baseRevenue * (v.high / assumptions.averageProjectTicket);
    } else if (v.key === 'grossMargin') {
      // Margin change doesn't change revenue directly but affects profit
      revLow = baseRevenue * (v.low / assumptions.grossMargin);
      revHigh = baseRevenue * (v.high / assumptions.grossMargin);
    } else if (v.key === 'annualRevenueGoal') {
      revLow = v.low;
      revHigh = v.high;
    } else if (v.key === 'averageMonthlyRecurringRevenue') {
      revLow = baseRevenue * (v.low / assumptions.averageMonthlyRecurringRevenue);
      revHigh = baseRevenue * (v.high / assumptions.averageMonthlyRecurringRevenue);
    }

    return {
      variable: v.variable,
      baseValue: assumptions[v.key] as number,
      low: v.low,
      high: v.high,
      revenueAtLow: revLow,
      revenueAtBase: baseRevenue,
      revenueAtHigh: revHigh,
      revenueImpactLow: revLow - baseRevenue,
      revenueImpactHigh: revHigh - baseRevenue,
    };
  });
}

// ─── Growth Trajectory ────────────────────────────────────────────────────────

export interface GrowthTrajectory {
  cagr: number;              // needed CAGR to hit goal from current revenue
  yearsToGoal: number;
  monthsToGoal: number;
  yearByYear: { year: number; revenue: number; cumulative: number }[];
  doubleTime: number;        // months to double at given growth rate
  requiredMonthlyGrowth: number;
}

export function calculateGrowthTrajectory(
  currentAnnualRevenue: number,
  targetAnnualRevenue: number,
  annualGrowthRate: number,
  horizonYears = 5,
): GrowthTrajectory {
  const safeCurrentRev = Math.max(currentAnnualRevenue, 1);
  const yearsToGoal = targetAnnualRevenue > safeCurrentRev
    ? Math.log(targetAnnualRevenue / safeCurrentRev) / Math.log(1 + annualGrowthRate)
    : 0;
  const monthsToGoal = yearsToGoal * 12;

  const requiredCAGR = targetAnnualRevenue > safeCurrentRev && horizonYears > 0
    ? Math.pow(targetAnnualRevenue / safeCurrentRev, 1 / horizonYears) - 1
    : 0;

  const cagr = requiredCAGR;
  const requiredMonthlyGrowth = Math.pow(1 + cagr, 1 / 12) - 1;
  const doubleTime = annualGrowthRate > 0 ? Math.log(2) / Math.log(1 + annualGrowthRate) * 12 : Infinity;

  let cumulative = 0;
  const yearByYear = Array.from({ length: horizonYears }, (_, i) => {
    const revenue = safeCurrentRev * Math.pow(1 + annualGrowthRate, i + 1);
    cumulative += revenue;
    return { year: new Date().getFullYear() + i + 1, revenue, cumulative };
  });

  return { cagr, yearsToGoal, monthsToGoal, yearByYear, doubleTime, requiredMonthlyGrowth };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function formatCurrency(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-PT').format(Math.round(value));
}
