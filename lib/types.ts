// Core TypeScript models for Gambit Labs Business Simulator

export interface Assumptions {
  id: string;
  name: string;
  // Labor
  employerSocialSecurityRate: number; // 0.2375
  employeeSocialSecurityRate: number; // 0.11
  monthsPaidPerYear: number; // 14
  monthlyMealAllowance: number; // 167.07
  monthlyToolsCostPerEmployee: number; // 100
  monthlyInsuranceCostPerEmployee: number; // 30
  averageEquipmentCost: number; // 1500
  monthlyOtherCostsPerEmployee: number; // 50
  // Commercial
  averageProjectTicket: number; // 15000
  averageMonthlyRecurringRevenue: number; // 1800
  leadToMeetingConversion: number; // 0.20
  meetingToProposalConversion: number; // 0.60
  proposalToCloseConversion: number; // 0.25
  averageSaleCycleDays: number; // 60
  oneOffRevenueShare: number; // 0.70
  recurringRevenueShare: number; // 0.30
  // Financial
  grossMargin: number; // 0.50
  targetNetMargin: number; // 0.20
  vatRate: number; // 0.23
  corporateTaxRate: number; // 0.21
  baseInterestRate: number; // 0.035
  spread: number; // 0.02
  discountRate: number; // 0.10
  inflation: number; // 0.025
  annualGrowthRate: number; // 0.20
  defaultCommissionRate: number; // 0.05
  // Operational
  deliveryCapacityPerPerson: number; // 25000 (max revenue per delivery person/month)
  salesCapacityPerPerson: number; // 80000 (max revenue per sales person/month)
  avgProjectsPerManager: number; // 8
  monthlyFixedCosts: number; // 5000
  annualRevenueGoal: number; // 5000000
}

export type HiringModel = 'revenue_based' | 'capacity_based';

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: 'commercial' | 'delivery' | 'management' | 'admin' | 'tech';
  grossMonthlySalary: number;
  monthlyToolsCost: number;
  monthlyOtherCosts: number;
  monthlyMealAllowance: number;
  annualBonus: number;
  initialEquipmentCost: number;
  trainingCost: number;
  variableCommission: number; // percentage
  expectedMonthlyRevenue: number;
  status: 'planned' | 'active' | 'suspended' | 'terminated';
  startDate: string;
  notes: string;
  // IRS profile (Portugal 2025)
  maritalStatus: 'single' | 'married_dual' | 'married_single';
  dependents: number;
  // Hiring model
  hiringModel: HiringModel;        // 'revenue_based' = commercial; 'capacity_based' = delivery/tech
  monthlyBillableCapacity: number; // max revenue/month at 100% utilization (capacity_based only)
  // Ajudas de custo (AT 2025)
  ajudasCustoDiasPerMonth: number;   // days/month with travel allowance
  ajudasCustoTipo: 'none' | 'national_day' | 'national_overnight' | 'international';
  ajudasCustoValorDiaCustom: number; // 0 = use AT standard limit
  // Ajudas de custo por km (viatura própria)
  ajudasKmPerMonth: number;          // km driven per month
  ajudasKmRateCustom: number;        // €/km — 0 = use AT limit (€0.40/km car)
  ajudasKmVehicle: 'car' | 'motorcycle' | 'bicycle'; // vehicle type for AT limit lookup
}

export interface EmployeeCalculations {
  monthlyDirectCost: number;
  monthlyRealCost: number;
  annualCost: number;
  annualizedMonthlyCost: number;
  breakEvenRevenue: number;
  requiredRevenueForTargetMargin: number;
  requiredProjectsBreakEven: number;
  requiredClientsBreakEven: number;
  decision: 'hire' | 'wait' | 'dont_hire';
  decisionReason: string;
  // Capacity model extras
  breakEvenUtilizationRate: number;   // fraction (0-1) — only meaningful for capacity_based
  revenueAt70pct: number;
  revenueAt100pct: number;
  profitAt70pct: number;
}

export interface Investment {
  id: string;
  name: string;
  category: 'team' | 'technology' | 'marketing' | 'infrastructure' | 'product' | 'market_expansion' | 'other';
  description: string;
  initialInvestment: number;
  subsidyAmount: number;
  financedAmount: number;
  ownCapital: number;
  expectedMonthlyRevenue: number;
  expectedMonthlySavings: number;
  monthlyOperatingCosts: number;
  startDate: string;
  durationMonths: number;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'idea' | 'analysis' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
}

export interface InvestmentCalculations {
  netInvestment: number;
  annualIncrementalRevenue: number;
  annualSavings: number;
  annualEBITDA: number;
  roi: number;
  paybackMonths: number;
  npv: number;
  cashFlowAccumulated: number[];
  returnMultiple: number;
  decision: 'excellent' | 'interesting' | 'analyze' | 'risk';
  decisionLabel: string;
}

export interface SubProject {
  id: string;
  investmentId: string;
  name: string;
  category: string;
  initialCost: number;
  monthlyCost: number;
  expectedMonthlyRevenue: number;
  expectedMonthlySavings: number;
  owner: string;
  startDate: string;
  endDate: string;
  executionPercentage: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
}

export interface Financing {
  id: string;
  name: string;
  financedAmount: number;
  termMonths: number;
  baseInterestRate: number;
  spread: number;
  capitalGracePeriodMonths: number;
  paymentType: 'constant_installment' | 'constant_amortization';
  linkedInvestmentId?: string;
}

export interface FinancingCalculations {
  finalRate: number;
  monthlyInstallment: number;
  totalInterest: number;
  totalPaid: number;
  monthlySchedule: { month: number; principal: number; interest: number; balance: number }[];
}

export type PipelineStage =
  | 'lead'
  | 'contacted'
  | 'meeting_scheduled'
  | 'diagnosis_done'
  | 'proposal_sent'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export interface PipelineOpportunity {
  id: string;
  clientName: string;
  opportunityName: string;
  service: string;
  estimatedValue: number;
  probability: number;
  expectedCloseDate: string;
  responsible: string;
  stage: PipelineStage;
  nextAction: string;
  source: 'linkedin' | 'referral' | 'outbound' | 'inbound' | 'event' | 'other';
  notes: string;
  createdAt: string;
}

export interface MonthlyResult {
  id: string;
  month: string; // "2024-01"
  plannedRevenue: number;
  actualRevenue: number;
  recurringRevenue: number;
  oneOffRevenue: number;
  actualCosts: number;
  salaries: number;
  marketing: number;
  software: number;
  otherCosts: number;
  investmentExecuted: number;
  newClients: number;
  proposalsSent: number;
  meetingsHeld: number;
  leadsGenerated: number;
  projectsClosed: number;
  churn: number;
  cashReceived: number;
  overdueCash: number;
}

export interface Scenario {
  id: string;
  name: string;
  type: 'conservative' | 'base' | 'aggressive' | 'custom';
  color: string;
  assumptionsOverride: Partial<Assumptions>;
  notes: string;
}

export interface ScenarioCalculations {
  annualRevenue: number;
  estimatedProfit: number;
  requiredInvestment: number;
  requiredPeople: number;
  roi: number;
  paybackMonths: number;
  riskLevel: 'low' | 'medium' | 'high';
  executionProbability: number;
}

export interface RevenueGoalCalculations {
  annualGoal: number;
  monthlyGoal: number;
  weeklyGoal: number;
  oneOffMonthlyRevenue: number;
  recurringMonthlyRevenue: number;
  oneOffProjectsPerMonth: number;
  recurringClientsNeeded: number;
  leadsPerMonth: number;
  meetingsPerMonth: number;
  proposalsPerMonth: number;
  closingsPerMonth: number;
  salesPeopleNeeded: number;
  deliveryPeopleNeeded: number;
  estimatedTeamCost: number;
  estimatedMargin: number;
  estimatedProfit: number;
  executiveSummary: string;
}

// ─── Tax Configuration ────────────────────────────────────────────────────────
export interface TaxConfig {
  // IRC
  isPME: boolean;
  ircStandardRate: number;       // 0.21
  ircReducedRate: number;        // 0.17 (PME, primeiros 25k)
  ircReducedThreshold: number;   // 25000
  derramaRate: number;           // 0–0.015
  // Tributações autónomas
  monthlyCarExpenses: number;
  autonomousTaxCarsRate: number; // 0.10
  monthlyRepresentationExpenses: number;
  autonomousTaxRepresentationRate: number; // 0.10
  monthlyMealsAboveLimit: number;
  autonomousTaxMealsRate: number; // 0.05
  // IVA
  ivaRate: number;               // 0.23
  ivaFrequency: 'monthly' | 'quarterly';
  // SS
  employerSSRate: number;        // 0.2375
  employeeSSRate: number;        // 0.11
  // Pagamentos por conta
  pagamentosPorConta: boolean;
}

// ─── 5-Year Plan ──────────────────────────────────────────────────────────────
// Costs come automatically from Contratações + Pressupostos — only revenue & headcount are set here
export interface YearPlan {
  year: number;
  revenueTarget: number;
  // Headcount changes vs current (e.g. plan to hire 2 more people in 2027)
  extraHeadcount: number;
  avgExtraSalary: number;     // gross monthly salary of extra hires
  // Optional overrides (leave 0 to use auto-calculated values)
  fixedCostsOverride: number;      // 0 = use assumptions.monthlyFixedCosts × 12
  commissionRateOverride: number;  // 0 = use per-employee rates from Contratações; >0 = override total % on revenue
  salaryGrowthPct: number;         // % increase on base team cost vs today (e.g. 5 = +5% raises)
  linkedInvestmentIds: string[];
  notes: string;
}

export interface FixedCostItem {
  id: string;
  label: string;
  amount: number; // monthly €
  category: 'rent' | 'utilities' | 'insurance' | 'accounting' | 'software' | 'marketing' | 'other';
}

export interface Freelancer {
  id: string;
  name: string;
  service: string;
  monthlyCost: number;
  status: 'active' | 'planned' | 'inactive';
  startDate: string;
  notes: string;
}

export interface MonthlyExpense {
  id: string;
  label: string;
  amount: number;
  category: 'labor' | 'subcontractor' | 'tools' | 'materials' | 'other';
}

export interface PriceSimTeamMember {
  id: string;
  name: string;
  role: string;
  hours: number;
  hourlyRate: number;
}

export interface PriceSimCost {
  id: string;
  label: string;
  amount: number;
  category: 'materials' | 'subcontractor' | 'travel' | 'software' | 'other';
}

export type PriceSimStatus = 'draft' | 'approved' | 'sent';

export interface PriceSimulation {
  id: string;
  name: string;
  client: string;
  description: string;
  createdAt: string;
  status: PriceSimStatus;
  team: PriceSimTeamMember[];
  directCosts: PriceSimCost[];
  fixedCostPct: number;
  fixedCostMonths: number;
  targetMarginPct: number;
  applyIVA: boolean;
  notes: string;
}

export interface AppState {
  assumptions: Assumptions;
  employees: Employee[];
  investments: Investment[];
  subProjects: SubProject[];
  financings: Financing[];
  pipeline: PipelineOpportunity[];
  monthlyResults: MonthlyResult[];
  scenarios: Scenario[];
  monthlyExpenses: MonthlyExpense[];
  monthlyExpensesRevenue: number;
  taxConfig: TaxConfig;
  yearPlans: YearPlan[];
  fixedCostItems: FixedCostItem[];
  freelancers: Freelancer[];
  priceSimulations: PriceSimulation[];
}
