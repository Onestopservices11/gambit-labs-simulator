'use client';

import { useAppStore } from '@/lib/store';
import PageHeader from '@/components/shared/PageHeader';
import { RotateCcw, Database, AlertTriangle } from 'lucide-react';

export default function DefinicoesPage() {
  const { resetToDemo } = useAppStore();

  function handleReset() {
    if (window.confirm('Tem a certeza que pretende repor os dados de demonstração? Todos os dados atuais serão perdidos.')) {
      resetToDemo();
    }
  }

  return (
    <div>
      <PageHeader
        title="Definições"
        description="Configurações gerais da aplicação e gestão de dados."
      />

      <div className="space-y-6">
        {/* App info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Informação da Aplicação</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Versão', value: '1.0.0 MVP' },
              { label: 'Stack', value: 'Next.js 15 + TypeScript + Tailwind' },
              { label: 'Armazenamento', value: 'LocalStorage (browser)' },
              { label: 'Desenvolvido por', value: 'Gambit Labs' },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-sm font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Roadmap de Evolução</h3>
          <div className="space-y-3">
            {[
              { label: 'Login e autenticação', status: 'planned' },
              { label: 'Multi-empresa (workspace)', status: 'planned' },
              { label: 'Base de dados Supabase/PostgreSQL', status: 'planned' },
              { label: 'Exportação para PDF', status: 'planned' },
              { label: 'Importação de Excel', status: 'planned' },
              { label: 'IA para gerar recomendações', status: 'planned' },
              { label: 'Partilha com clientes', status: 'planned' },
              { label: 'Templates por setor', status: 'planned' },
              { label: 'Modo white-label', status: 'planned' },
              { label: 'Relatórios automáticos por email', status: 'planned' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Planeado</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data management */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Gestão de Dados</h3>
          <p className="text-sm text-slate-500 mb-5">Os dados são guardados automaticamente no browser (localStorage). Não é necessário guardar manualmente.</p>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">Repor os dados de demonstração irá apagar todos os dados atuais permanentemente.</p>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Repor Dados de Demonstração
          </button>
        </div>

        {/* Storage info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Sobre o Armazenamento</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Esta versão MVP guarda todos os dados localmente no browser através de localStorage.
                Os dados persistem entre sessões mas são específicos do dispositivo e browser.
                Numa versão futura, os dados serão sincronizados com Supabase para acesso multi-dispositivo e colaboração em equipa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
