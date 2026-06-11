import { supabase, STATE_ROW_ID } from './supabase';
import type { AppState } from './types';

export async function loadFromSupabase(): Promise<Partial<AppState> | null> {
  const { data, error } = await supabase
    .from('simulator_state')
    .select('*')
    .eq('id', STATE_ROW_ID)
    .single();

  if (error || !data) return null;

  return {
    assumptions:             data.assumptions,
    employees:               data.employees,
    investments:             data.investments,
    subProjects:             data.sub_projects,
    financings:              data.financings,
    pipeline:                data.pipeline,
    monthlyResults:          data.monthly_results,
    scenarios:               data.scenarios,
    monthlyExpenses:         data.monthly_expenses,
    monthlyExpensesRevenue:  data.monthly_expenses_revenue,
    taxConfig:               data.tax_config        || undefined,
    yearPlans:               data.year_plans         ?? [],
    fixedCostItems:          data.fixed_cost_items   ?? [],
    freelancers:             data.freelancers         ?? [],
    priceSimulations:        data.price_simulations   ?? [],
  };
}

export async function saveToSupabase(state: AppState & { financings: unknown[]; monthlyExpenses: unknown[]; monthlyExpensesRevenue: number; taxConfig: unknown; yearPlans: unknown[] }): Promise<void> {
  const row = {
    id:                       STATE_ROW_ID,
    updated_at:               new Date().toISOString(),
    assumptions:              state.assumptions,
    employees:                state.employees,
    investments:              state.investments,
    sub_projects:             state.subProjects,
    financings:               state.financings,
    pipeline:                 state.pipeline,
    monthly_results:          state.monthlyResults,
    scenarios:                state.scenarios,
    monthly_expenses:         state.monthlyExpenses,
    monthly_expenses_revenue: state.monthlyExpensesRevenue,
    tax_config:               state.taxConfig,
    year_plans:               state.yearPlans,
    fixed_cost_items:         state.fixedCostItems,
    freelancers:              state.freelancers,
    price_simulations:        state.priceSimulations,
  };

  await supabase
    .from('simulator_state')
    .upsert(row, { onConflict: 'id' });
}
