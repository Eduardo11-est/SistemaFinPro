'use client';

import React, { useMemo } from 'react';
import { useFinance } from '@/lib/store';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CalendarDays,
  PieChart,
  BarChart3,
  Database,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Sidebar = React.memo(function Sidebar({ activeView, setActiveView }: SidebarProps) {
  const { currentWorkspace } = useFinance();
  const isPersonal = currentWorkspace.type === 'PERSONAL';

  const menuItems = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        badge: null,
      },
      {
        id: 'transactions',
        label: 'Transações',
        icon: ArrowLeftRight,
        badge: null,
      },
      {
        id: 'accounts',
        label: 'Contas & Cartões',
        icon: Wallet,
        badge: null,
      },
      {
        id: 'payables',
        label: 'A Pagar & Receber',
        icon: CalendarDays,
        badge: 'Calendário',
      },
      {
        id: 'budgets',
        label: isPersonal ? 'Orçamento & Metas' : 'Orçamento & Centros',
        icon: PieChart,
        badge: null,
      },
      {
        id: 'reports',
        label: isPersonal ? 'Relatórios & Fluxo' : 'DRE & Relatórios PJ',
        icon: BarChart3,
        badge: isPersonal ? null : 'DRE',
      },
      {
        id: 'settings',
        label: 'Neon DB & Config',
        icon: Database,
        badge: 'Neon',
      },
    ],
    [isPersonal]
  );

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hidden md:flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      {/* Navegação Principal */}
      <div className="space-y-6">
        {/* Banner do Contexto Ativo */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            isPersonal
              ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
              : 'bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border-indigo-500/20 text-indigo-800 dark:text-indigo-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isPersonal
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                  : 'bg-indigo-500 shadow-sm shadow-indigo-500/50'
              }`}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isPersonal ? 'Modo Finanças Pessoais' : 'Modo Gestão Corporativa'}
            </span>
          </div>
          <div className="font-semibold text-xs truncate">{currentWorkspace.name}</div>
          <div className="text-[10px] opacity-75 font-mono">
            {currentWorkspace.document || (isPersonal ? 'CPF' : 'CNPJ')}
          </div>
        </div>

        {/* Links do Menu */}
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Módulos Financeiros
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border-l-2 border-emerald-500 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'opacity-70'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rodapé da Sidebar: Status do Banco de Dados Neon */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div
          onClick={() => setActiveView('settings')}
          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>Neon PostgreSQL</span>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Pooler Serverless Configurado
          </p>
          <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
            <span>Prisma ORM v6</span>
            <span className="group-hover:text-emerald-500 transition-colors">Configurar →</span>
          </div>
        </div>

        <div className="text-[10px] text-center text-slate-400 dark:text-slate-500">
          FinPro © 2026 • Segurança PBKDF2 & HTTPS
        </div>
      </div>
    </aside>
  );
});
