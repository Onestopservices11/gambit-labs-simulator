'use client';

/**
 * Wrapper that imports both PDFDownloadLink and ReportExecutivo directly.
 * This entire file is loaded via dynamic({ ssr: false }) in relatorios/page.tsx
 * so @react-pdf/renderer never runs on the server.
 */

import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReportExecutivo } from './ReportExecutivo';
import type { AppState, TaxConfig, YearPlan } from '@/lib/types';
import { Download, Loader2 } from 'lucide-react';

type PDFState = AppState & {
  taxConfig: TaxConfig;
  yearPlans: YearPlan[];
  financings: AppState['financings'];
  monthlyExpenses: [];
  monthlyExpensesRevenue: number;
};

interface Props {
  state: PDFState;
  generatedAt: string;
  fileName: string;
}

export default function PDFDownloadButton({ state, generatedAt, fileName }: Props) {
  return (
    <PDFDownloadLink
      document={<ReportExecutivo state={state} generatedAt={generatedAt} />}
      fileName={fileName}
    >
      {({ loading }: { loading: boolean }) => (
        <button
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
            loading
              ? 'bg-slate-100 text-slate-400 cursor-wait'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
          }`}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />A gerar PDF...</>
            : <><Download className="w-4 h-4" />Descarregar PDF</>
          }
        </button>
      )}
    </PDFDownloadLink>
  );
}
