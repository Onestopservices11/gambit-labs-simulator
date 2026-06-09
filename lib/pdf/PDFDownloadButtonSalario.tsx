'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReportSalario } from './ReportSalario';
import type { Employee, Assumptions } from '../types';
import type { AjudasCustoCalc } from '../financialCalculations';
import { FileDown } from 'lucide-react';

interface Props {
  employee: Employee;
  assumptions: Assumptions;
  payslip: {
    gross: number; ss_employee: number; irs: number; net: number;
    ss_employer: number; totalCostEmployer: number; effectiveIRSRate: number;
  };
  ajudas: AjudasCustoCalc;
}

export default function PDFDownloadButtonSalario({ employee, assumptions, payslip, ajudas }: Props) {
  const filename = `recibo-${employee.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 7)}.pdf`;

  return (
    <PDFDownloadLink
      document={<ReportSalario employee={employee} assumptions={assumptions} payslip={payslip} ajudas={ajudas} />}
      fileName={filename}
    >
      {({ loading }) => (
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          disabled={loading}
        >
          <FileDown className="w-3 h-3" />
          {loading ? 'PDF...' : 'Recibo'}
        </button>
      )}
    </PDFDownloadLink>
  );
}
