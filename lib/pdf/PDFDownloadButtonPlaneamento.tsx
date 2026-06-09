'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReportPlaneamento } from './ReportPlaneamento';
import type { AppState } from '@/lib/types';
import { Download, Loader2 } from 'lucide-react';

interface Props {
  state: AppState;
  generatedAt: string;
  fileName: string;
}

export default function PDFDownloadButtonPlaneamento({ state, generatedAt, fileName }: Props) {
  return (
    <PDFDownloadLink
      document={<ReportPlaneamento state={state} generatedAt={generatedAt} />}
      fileName={fileName}
    >
      {({ loading }: { loading: boolean }) => (
        <button
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
            loading
              ? 'bg-slate-100 text-slate-400 cursor-wait'
              : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-200'
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
