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
  Settings,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Sidebar = React.memo(function Sidebar({ activeView, setActiveView }: SidebarProps) {
  const { currentWorkspace, currentUser, maintenanceConfig } = useFinance();
  const isPersonal = currentWorkspace.type === 'PERSONAL';
  const isAdmin = Boolean(currentUser?.isAdmin);
  const disabledSet = useMemo(
    () => new Set<string>(maintenanceConfig.disabledViews),
    [maintenanceConfig.disabledViews]
  );

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
        label: 'Cadastros & Config',
        icon: Settings,
        badge: null,
      },
      ...(isAdmin
        ? [
            {
              id: 'admin',
              label: 'Admin & Neon DB',
              icon: ShieldCheck,
              badge: 'ADM',
            },
          ]
        : []),
    ],
    [isPersonal, isAdmin]
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
            const isUnderMaintenance = disabledSet.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border-l-2 border-emerald-500 shadow-sm'
                    : isUnderMaintenance
                    ? 'text-amber-600/80 dark:text-amber-400/80 hover:bg-amber-500/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-emerald-500'
                        : isUnderMaintenance
                        ? 'text-amber-500'
                        : 'opacity-70'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {isUnderMaintenance ? (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-0.5 shrink-0"
                    title="Tela em manutenção"
                  >
                    <Wrench className="w-2.5 h-2.5" />
                    <span>Manut.</span>
                  </span>
                ) : (
                  item.badge && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 shrink-0">
                      {item.badge}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rodapé da Sidebar */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button
          type="button"
          onClick={() => setActiveView('settings')}
          className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <Settings className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cadastros & Config</span>
            </div>
            <span className="text-[10px] text-slate-400 group-hover:text-emerald-500 transition-colors">
              Abrir →
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Salário, categorias e perfis PF / PJ
          </p>
        </button>

        <div className="text-[10px] text-center text-slate-400 dark:text-slate-500">
          FinPro © 2026 • Controle Financeiro
        </div>
      </div>
    </aside>
  );
});
