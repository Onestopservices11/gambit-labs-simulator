'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, Assumptions, Employee, Investment, SubProject, PipelineOpportunity, MonthlyResult, Scenario, Financing, MonthlyExpense, TaxConfig, YearPlan, FixedCostItem, Freelancer } from './types';
import { defaultAssumptions, mockEmployees, mockInvestments, mockSubProjects, mockPipeline, mockMonthlyResults, mockScenarios } from './mockData';

interface AppStore extends AppState {
  // Actions
  updateAssumptions: (assumptions: Partial<Assumptions>) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  addInvestment: (investment: Investment) => void;
  updateInvestment: (id: string, investment: Partial<Investment>) => void;
  removeInvestment: (id: string) => void;
  addSubProject: (subProject: SubProject) => void;
  updateSubProject: (id: string, subProject: Partial<SubProject>) => void;
  removeSubProject: (id: string) => void;
  addFinancing: (financing: Financing) => void;
  updateFinancing: (id: string, financing: Partial<Financing>) => void;
  removeFinancing: (id: string) => void;
  addOpportunity: (opportunity: PipelineOpportunity) => void;
  updateOpportunity: (id: string, opportunity: Partial<PipelineOpportunity>) => void;
  removeOpportunity: (id: string) => void;
  addMonthlyResult: (result: MonthlyResult) => void;
  updateMonthlyResult: (id: string, result: Partial<MonthlyResult>) => void;
  addScenario: (scenario: Scenario) => void;
  updateScenario: (id: string, scenario: Partial<Scenario>) => void;
  removeScenario: (id: string) => void;
  setMonthlyExpenses: (expenses: MonthlyExpense[], revenue: number) => void;
  updateTaxConfig: (config: Partial<TaxConfig>) => void;
  setYearPlan: (plan: YearPlan) => void;
  addFixedCostItem: (item: FixedCostItem) => void;
  updateFixedCostItem: (id: string, item: Partial<FixedCostItem>) => void;
  removeFixedCostItem: (id: string) => void;
  addFreelancer: (f: Freelancer) => void;
  updateFreelancer: (id: string, f: Partial<Freelancer>) => void;
  removeFreelancer: (id: string) => void;
  resetToDemo: () => void;
}

const initialState: AppState = {
  assumptions: defaultAssumptions,
  employees: mockEmployees,
  investments: mockInvestments,
  subProjects: mockSubProjects,
  financings: [],
  monthlyExpenses: [],
  monthlyExpensesRevenue: 0,
  taxConfig: {
    isPME: true,
    ircStandardRate: 0.21,
    ircReducedRate: 0.17,
    ircReducedThreshold: 25000,
    derramaRate: 0.015,
    monthlyCarExpenses: 0,
    autonomousTaxCarsRate: 0.10,
    monthlyRepresentationExpenses: 0,
    autonomousTaxRepresentationRate: 0.10,
    monthlyMealsAboveLimit: 0,
    autonomousTaxMealsRate: 0.05,
    ivaRate: 0.23,
    ivaFrequency: 'quarterly',
    employerSSRate: 0.2375,
    employeeSSRate: 0.11,
    pagamentosPorConta: true,
  },
  yearPlans: [],
  fixedCostItems: [],
  freelancers: [],
  pipeline: mockPipeline,
  monthlyResults: mockMonthlyResults,
  scenarios: mockScenarios,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      updateAssumptions: (assumptions) =>
        set((state) => ({ assumptions: { ...state.assumptions, ...assumptions } })),

      addEmployee: (employee) =>
        set((state) => ({ employees: [...state.employees, employee] })),
      updateEmployee: (id, employee) =>
        set((state) => ({ employees: state.employees.map((e) => e.id === id ? { ...e, ...employee } : e) })),
      removeEmployee: (id) =>
        set((state) => ({ employees: state.employees.filter((e) => e.id !== id) })),

      addInvestment: (investment) =>
        set((state) => ({ investments: [...state.investments, investment] })),
      updateInvestment: (id, investment) =>
        set((state) => ({ investments: state.investments.map((i) => i.id === id ? { ...i, ...investment } : i) })),
      removeInvestment: (id) =>
        set((state) => ({ investments: state.investments.filter((i) => i.id !== id) })),

      addSubProject: (subProject) =>
        set((state) => ({ subProjects: [...state.subProjects, subProject] })),
      updateSubProject: (id, subProject) =>
        set((state) => ({ subProjects: state.subProjects.map((s) => s.id === id ? { ...s, ...subProject } : s) })),
      removeSubProject: (id) =>
        set((state) => ({ subProjects: state.subProjects.filter((s) => s.id !== id) })),

      addFinancing: (financing) =>
        set((state) => ({ financings: [...state.financings, financing] })),
      updateFinancing: (id, financing) =>
        set((state) => ({ financings: state.financings.map((f) => f.id === id ? { ...f, ...financing } : f) })),
      removeFinancing: (id) =>
        set((state) => ({ financings: state.financings.filter((f) => f.id !== id) })),

      addOpportunity: (opportunity) =>
        set((state) => ({ pipeline: [...state.pipeline, opportunity] })),
      updateOpportunity: (id, opportunity) =>
        set((state) => ({ pipeline: state.pipeline.map((o) => o.id === id ? { ...o, ...opportunity } : o) })),
      removeOpportunity: (id) =>
        set((state) => ({ pipeline: state.pipeline.filter((o) => o.id !== id) })),

      addMonthlyResult: (result) =>
        set((state) => ({ monthlyResults: [...state.monthlyResults, result] })),
      updateMonthlyResult: (id, result) =>
        set((state) => ({ monthlyResults: state.monthlyResults.map((r) => r.id === id ? { ...r, ...result } : r) })),

      addScenario: (scenario) =>
        set((state) => ({ scenarios: [...state.scenarios, scenario] })),
      updateScenario: (id, scenario) =>
        set((state) => ({ scenarios: state.scenarios.map((s) => s.id === id ? { ...s, ...scenario } : s) })),
      removeScenario: (id) =>
        set((state) => ({ scenarios: state.scenarios.filter((s) => s.id !== id) })),

      setMonthlyExpenses: (expenses, revenue) =>
        set({ monthlyExpenses: expenses, monthlyExpensesRevenue: revenue }),

      addFixedCostItem: (item) =>
        set((state) => ({ fixedCostItems: [...state.fixedCostItems, item] })),
      updateFixedCostItem: (id, item) =>
        set((state) => ({ fixedCostItems: state.fixedCostItems.map((f) => f.id === id ? { ...f, ...item } : f) })),
      removeFixedCostItem: (id) =>
        set((state) => ({ fixedCostItems: state.fixedCostItems.filter((f) => f.id !== id) })),

      addFreelancer: (f) =>
        set((state) => ({ freelancers: [...state.freelancers, f] })),
      updateFreelancer: (id, f) =>
        set((state) => ({ freelancers: state.freelancers.map((x) => x.id === id ? { ...x, ...f } : x) })),
      removeFreelancer: (id) =>
        set((state) => ({ freelancers: state.freelancers.filter((x) => x.id !== id) })),

      updateTaxConfig: (config) =>
        set((state) => ({ taxConfig: { ...state.taxConfig, ...config } })),

      setYearPlan: (plan) =>
        set((state) => {
          const existing = state.yearPlans.findIndex(p => p.year === plan.year);
          if (existing >= 0) {
            const updated = [...state.yearPlans];
            updated[existing] = plan;
            return { yearPlans: updated };
          }
          return { yearPlans: [...state.yearPlans, plan] };
        }),

      resetToDemo: () => set(initialState),
    }),
    {
      name: 'gambit-labs-simulator',
      version: 4,
      migrate(persisted: unknown, fromVersion: number) {
        const state = persisted as Partial<AppState>;

        if (fromVersion < 1) {
          // v0 → v1: add monthlyExpenses, taxConfig, yearPlans, fixedCostItems, freelancers
          if (!state.monthlyExpenses) state.monthlyExpenses = [];
          if (state.monthlyExpensesRevenue == null) state.monthlyExpensesRevenue = 0;
          if (!state.yearPlans) state.yearPlans = [];
          if (!state.fixedCostItems) state.fixedCostItems = [];
          if (!state.freelancers) state.freelancers = [];
          if (!state.taxConfig) state.taxConfig = initialState.taxConfig;
        }

        if (fromVersion < 2) {
          // v1 → v2: add hiringModel + monthlyBillableCapacity to each employee
          if (Array.isArray(state.employees)) {
            state.employees = state.employees.map((e) => ({
              ...e,
              hiringModel: e.hiringModel ?? (
                (e.department === 'delivery' || e.department === 'tech') ? 'capacity_based' : 'revenue_based'
              ),
              monthlyBillableCapacity: e.monthlyBillableCapacity ?? 0,
            }));
          }
        }

        if (fromVersion < 3) {
          // v2 → v3: add ajudas de custo fields to each employee
          if (Array.isArray(state.employees)) {
            state.employees = state.employees.map((e) => ({
              ...e,
              ajudasCustoDiasPerMonth: e.ajudasCustoDiasPerMonth ?? 0,
              ajudasCustoTipo: e.ajudasCustoTipo ?? 'none',
              ajudasCustoValorDiaCustom: e.ajudasCustoValorDiaCustom ?? 0,
            }));
          }
        }

        if (fromVersion < 4) {
          // v3 → v4: add km allowance fields
          if (Array.isArray(state.employees)) {
            state.employees = state.employees.map((e) => ({
              ...e,
              ajudasKmPerMonth: e.ajudasKmPerMonth ?? 0,
              ajudasKmRateCustom: e.ajudasKmRateCustom ?? 0,
              ajudasKmVehicle: e.ajudasKmVehicle ?? 'car',
            }));
          }
        }

        return state as AppState;
      },
    }
  )
);
