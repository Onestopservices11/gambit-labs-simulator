'use client';

import { useAppStore } from '@/lib/store';
import { FileText, Download, CheckCircle2, BarChart3, Users, CalendarRange, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';

const loadingBtn = (
  <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-100 text-slate-400 cursor-wait">
    A preparar PDF...
  </button>
);

const PDFDownloadButton = dynamic(
  () => import('@/lib/pdf/PDFDownloadButton'),
  { ssr: false, loading: () => loadingBtn }
);

const PDFDownloadButtonPlaneamento = dynamic(
  () => import('@/lib/pdf/PDFDownloadButtonPlaneamento'),
  { ssr: false, loading: () => loadingBtn }
);

const PDFDownloadButtonComissoes = dynamic(
  () => import('@/lib/pdf/PDFDownloadButtonComissoes'),
  { ssr: false, loading: () => loadingBtn }
);

const PDFDownloadButtonEquipa = dynamic(
  () => import('@/lib/pdf/PDFDownloadButtonEquipa'),
  { ssr: false, loading: () => loadingBtn }
);

// ─── Report card ──────────────────────────────────────────────────────────────
function ReportCard({
  icon, title, description, pages, includes, children,
}: {
  icon: React.ReactNode; title: string; description: string;
  pages: number; includes: string[]; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">{icon}</div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          <span className="inline-block mt-2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{pages} {pages === 1 ? 'página' : 'páginas'}</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">Inclui:</p>
        <ul className="space-y-1">
          {includes.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />{item}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const store = useAppStore();
  const now = new Date();
  const generatedAt = now.toLocaleDateString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const year = now.getFullYear();

  const stateForPDF = {
    ...store,
    taxConfig:              store.taxConfig,
    yearPlans:              store.yearPlans,
    financings:             store.financings,
    monthlyExpenses:        store.monthlyExpenses as [],
    monthlyExpensesRevenue: store.monthlyExpensesRevenue,
  };

  return (
    <div className="pb-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Relatórios PDF</h1>
        <p className="text-sm text-slate-500 mt-1">Exporta relatórios profissionais com todos os dados da simulação.</p>
      </div>

      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
        <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">PDFs gerados diretamente no browser</p>
          <p className="text-sm text-blue-700 mt-0.5">Gerados com os dados atuais. Garante que guardaste tudo antes de exportar.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Relatório Executivo */}
        <ReportCard
          icon={<BarChart3 className="w-5 h-5 text-indigo-600" />}
          title="Relatório Executivo"
          description="Visão completa: resultados, pipeline, equipa e planeamento."
          pages={3}
          includes={[
            'KPIs principais (receita, lucro, pipeline)',
            'Resultados mensais vs plano',
            'Pipeline comercial por fase',
            'P&L projetada 5 anos com impostos',
            'Equipa e custos por colaborador',
            'Investimentos e estado',
          ]}
        >
          <PDFDownloadButton
            state={stateForPDF}
            generatedAt={generatedAt}
            fileName={`gambit-labs-relatorio-executivo-${year}.pdf`}
          />
        </ReportCard>

        {/* Planeamento 5 Anos */}
        <ReportCard
          icon={<CalendarRange className="w-5 h-5 text-purple-600" />}
          title="Planeamento 5 Anos"
          description="P&L detalhada por ano com impostos e investimentos."
          pages={2}
          includes={[
            'P&L completa por ano (receita → lucro líquido)',
            'IRC, Derrama e Tributações Autónomas',
            'Aumentos salariais e novas contratações por ano',
            'Comissões por ano (override ou auto)',
            'Freelancers e custos fixos detalhados',
            'Cash livre disponível',
          ]}
        >
          <PDFDownloadButtonPlaneamento
            state={stateForPDF}
            generatedAt={generatedAt}
            fileName={`gambit-labs-planeamento-5anos-${year}.pdf`}
          />
        </ReportCard>

        {/* Análise de Comissões */}
        <ReportCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          title="Análise de Comissões"
          description="Sustentabilidade das comissões e ponto de equilíbrio."
          pages={2}
          includes={[
            'P&L mensal com comissões actuais',
            'Custo por colaborador e comissão individual',
            'Tabela de cenários (0% a 20%)',
            'Break-even de comissões',
            'Plano de comissões 5 anos por planeamento',
            'Margem de segurança',
          ]}
        >
          <PDFDownloadButtonComissoes
            state={stateForPDF}
            generatedAt={generatedAt}
            fileName={`gambit-labs-comissoes-${year}.pdf`}
          />
        </ReportCard>

        {/* Relatório de Equipa */}
        <ReportCard
          icon={<Users className="w-5 h-5 text-amber-600" />}
          title="Relatório de Equipa"
          description="Custos e break-even por colaborador com recibos IRS 2025."
          pages={2}
          includes={[
            'Custo real por colaborador (SS, subsídios, ferramentas)',
            'Break-even e decisão de contratação',
            'Recibo de vencimento com IRS 2025',
            'Custo anual e mensal da equipa',
            'Custos fixos mensais detalhados',
            'Freelancers activos',
          ]}
        >
          <PDFDownloadButtonEquipa
            state={stateForPDF}
            generatedAt={generatedAt}
            fileName={`gambit-labs-equipa-${year}.pdf`}
          />
        </ReportCard>

      </div>
    </div>
  );
}
