'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { loadFromSupabase, saveToSupabase } from '@/lib/syncSupabase';

export default function SupabaseSync() {
  const store = useAppStore();
  const [status, setStatus] = useState<'loading' | 'synced' | 'saving' | 'error' | 'idle'>('loading');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // On mount: load from Supabase and hydrate store
  useEffect(() => {
    async function init() {
      try {
        const remote = await loadFromSupabase();
        if (remote) {
          // Only hydrate if remote has real data (not empty defaults)
          if (remote.employees && (remote.employees as unknown[]).length > 0) {
            const { updateAssumptions, ..._ } = useAppStore.getState() as typeof store;
            // Bulk-set via store internals
            useAppStore.setState({
              assumptions:            remote.assumptions            ?? store.assumptions,
              employees:              remote.employees              ?? store.employees,
              investments:            remote.investments            ?? store.investments,
              subProjects:            remote.subProjects            ?? store.subProjects,
              financings:             remote.financings             ?? store.financings,
              pipeline:               remote.pipeline               ?? store.pipeline,
              monthlyResults:         remote.monthlyResults         ?? store.monthlyResults,
              scenarios:              remote.scenarios              ?? store.scenarios,
              monthlyExpenses:        remote.monthlyExpenses        ?? store.monthlyExpenses,
              monthlyExpensesRevenue: remote.monthlyExpensesRevenue ?? store.monthlyExpensesRevenue,
            });
          }
        }
        setStatus('synced');
      } catch {
        setStatus('error');
      }
      initialized.current = true;
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch store changes → debounce 2s → save to Supabase
  useEffect(() => {
    if (!initialized.current) return;

    setStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      try {
        const s = useAppStore.getState() as Parameters<typeof saveToSupabase>[0];
        await saveToSupabase(s);
        setStatus('synced');
      } catch {
        setStatus('error');
      }
    }, 2000);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    store.assumptions,
    store.employees,
    store.investments,
    store.subProjects,
    store.financings,
    store.pipeline,
    store.monthlyResults,
    store.scenarios,
    store.monthlyExpenses,
    store.monthlyExpensesRevenue,
  ]);

  // Status indicator — tiny pill in bottom-right
  const pill =
    status === 'loading' ? { text: 'A carregar...', cls: 'bg-slate-500' } :
    status === 'saving'  ? { text: 'A guardar...', cls: 'bg-amber-500' } :
    status === 'synced'  ? { text: '✓ Guardado na cloud', cls: 'bg-emerald-600' } :
    status === 'error'   ? { text: '✗ Erro ao guardar', cls: 'bg-red-600' } :
    null;

  if (!pill) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-full text-white text-xs font-medium shadow-lg transition-all duration-300 ${pill.cls}`}>
      {pill.text}
    </div>
  );
}
