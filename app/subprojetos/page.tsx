'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/lib/financialCalculations';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { FolderKanban } from 'lucide-react';

export default function SubprojetosPage() {
  const { investments, subProjects } = useAppStore();

  const investmentGroups = useMemo(() =>
    investments.map(inv => {
      const subs = subProjects.filter(s => s.investmentId === inv.id);
      const totalCost = subs.reduce((s, p) => s + p.initialCost + p.monthlyCost * 12, 0);
      const totalRevenue = subs.reduce((s, p) => s + p.expectedMonthlyRevenue * 12, 0);
      const totalSavings = subs.reduce((s, p) => s + p.expectedMonthlySavings * 12, 0);
      return { investment: inv, subProjects: subs, totalCost, totalRevenue, totalSavings };
    }),
    [investments, subProjects]
  );

  return (
    <div>
      <PageHeader
        title="Subprojetos"
        description="Veja e acompanhe todos os subprojetos dentro de cada investimento principal."
        badge={`${subProjects.length} subprojetos`}
      />

      {investmentGroups.map(({ investment, subProjects: subs, totalCost, totalRevenue, totalSavings }) => (
        <div key={investment.id} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <FolderKanban className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{investment.name}</h2>
              <p className="text-xs text-slate-500">{subs.length} subprojeto(s)</p>
            </div>
          </div>

          {/* Investment summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <p className="text-xs text-slate-500">Custo Total Subprojetos/Ano</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(totalCost)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
              <p className="text-xs text-slate-500">Receita Total Prevista/Ano</p>
              <p className="text-sm font-bold text-emerald-700">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
              <p className="text-xs text-slate-500">Poupança Total Prevista/Ano</p>
              <p className="text-sm font-bold text-indigo-700">{formatCurrency(totalSavings)}</p>
            </div>
          </div>

          {/* Subprojects table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subprojeto</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Custo Inicial</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Custo/Mês</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Receita/Mês</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Poupança/Mês</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Progresso</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subs.map(sp => (
                  <tr key={sp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{sp.name}</p>
                      {sp.owner && <p className="text-xs text-slate-400">{sp.owner}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(sp.initialCost)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(sp.monthlyCost)}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-700">{sp.expectedMonthlyRevenue > 0 ? formatCurrency(sp.expectedMonthlyRevenue) : '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-indigo-700">{sp.expectedMonthlySavings > 0 ? formatCurrency(sp.expectedMonthlySavings) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${sp.executionPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{sp.executionPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={sp.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {subProjects.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum subprojeto criado</p>
          <p className="text-slate-400 text-sm">Crie investimentos e adicione subprojetos para acompanhar a execução.</p>
        </div>
      )}
    </div>
  );
}
