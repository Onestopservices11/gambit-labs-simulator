'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings2,
  Target,
  Users,
  UserCheck,
  TrendingUp,
  FolderKanban,
  Banknote,
  GitBranch,
  BarChart3,
  LineChart,
  FileText,
  Settings,
  ChevronRight,
  Zap,
  BadgePercent,
  CalendarRange,
  Receipt,
  FlaskConical,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pressupostos', label: 'Pressupostos', icon: Settings2 },
  { href: '/objetivos', label: 'Objetivos de Faturação', icon: Target },
  { href: '/contratacoes', label: 'Contratações', icon: Users },
  { href: '/freelancers', label: 'Freelancers', icon: UserCheck },
  { href: '/custos-fixos', label: 'Custos Fixos', icon: Receipt },
  { href: '/comissoes', label: 'Comissões', icon: BadgePercent },
  { href: '/investimentos', label: 'Investimentos', icon: TrendingUp },
  { href: '/subprojetos', label: 'Subprojetos', icon: FolderKanban },
  { href: '/financiamento', label: 'Financiamento', icon: Banknote },
  { href: '/simulador-preco', label: 'Simulador de Preço', icon: Calculator },
  { href: '/pipeline', label: 'Pipeline Comercial', icon: GitBranch },
  { href: '/planeamento', label: 'Planeamento 5 Anos', icon: CalendarRange },
  { href: '/resultados', label: 'Resultados Reais', icon: BarChart3 },
  { href: '/cenarios', label: 'Cenários', icon: LineChart },
  { href: '/analise', label: 'Análise Financeira', icon: FlaskConical },
  { href: '/relatorios', label: 'Relatórios', icon: FileText },
  { href: '/definicoes', label: 'Definições', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 flex flex-col z-50 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Gambit Labs</p>
          <p className="text-slate-400 text-xs">Business Simulator</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300')} />
                <span className="truncate">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-800">
        <p className="text-slate-500 text-xs">Versão 1.0 · MVP</p>
        <p className="text-slate-600 text-xs mt-0.5">© 2024 Gambit Labs</p>
      </div>
    </aside>
  );
}
