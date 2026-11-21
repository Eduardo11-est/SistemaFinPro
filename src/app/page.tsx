'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useFinance } from '@/lib/store';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { CashDeficitAlert } from '@/components/dashboard/CashDeficitAlert';
import { UpcomingBillsCard } from '@/components/dashboard/UpcomingBillsCard';
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard';
import {
  LayoutDashboard,
  ArrowLeftRight,
  CalendarDays,
  BarChart3,
  Plus,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  MANAGEABLE_VIEWS,
  ManageableViewId,
  formatDefaultMaintenanceMessage,
  getViewLabel,
} from '@/lib/maintenance';

// Code-splitting (Lazy Loading) para gráficos pesados e abas secundárias
const CashFlowChart = dynamic(
  () => import('@/components/dashboard/CashFlowChart').then((m) => m.CashFlowChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse p-5" />
    ),
  }
);

const ExpenseDonut = dynamic(
  () => import('@/components/dashboard/ExpenseDonut').then((m) => m.ExpenseDonut),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse p-5" />
    ),
  }
);

const TransactionListView = dynamic(
  () => import('@/components/transactions/TransactionListView').then((m) => m.TransactionListView)
);
const AccountsView = dynamic(
  () => import('@/components/accounts/AccountsView').then((m) => m.AccountsView)
);
const PayablesReceivablesView = dynamic(
  () =>
    import('@/components/payables/PayablesReceivablesView').then((m) => m.PayablesReceivablesView)
);
const BudgetsAndGoalsView = dynamic(
  () => import('@/components/budgets/BudgetsAndGoalsView').then((m) => m.BudgetsAndGoalsView)
);
const ReportsView = dynamic(
  () => import('@/components/reports/ReportsView').then((m) => m.ReportsView)
);
const SettingsAndNeonView = dynamic(
  () => import('@/components/settings/SettingsAndNeonView').then((m) => m.SettingsAndNeonView)
);
const AdminNeonView = dynamic(
  () => import('@/components/admin/AdminNeonView').then((m) => m.AdminNeonView)
);
const TransactionModal = dynamic(
  () => import('@/components/transactions/TransactionModal').then((m) => m.TransactionModal)
);

export default function HomePage() {
  const {
    activeView,
    setActiveView,
    isNewTransactionModalOpen,
    setIsNewTransactionModalOpen,
    currentUser,
    isAuthLoading,
    maintenanceConfig,
  } = useFinance();

  const [dismissedMaintenanceKey, setDismissedMaintenanceKey] = useState<string | null>(null);
  const maintenanceKey = `${maintenanceConfig.disabledViews.join(',')}|${maintenanceConfig.message}`;
  const isAdmin = Boolean(currentUser?.isAdmin);
  const hasAnyMaintenance = maintenanceConfig.disabledViews.length > 0;
  const isCurrentViewInMaintenance = maintenanceConfig.disabledViews.includes(
    activeView as ManageableViewId
  );
  const isBlockedForCurrentUser = isCurrentViewInMaintenance && !isAdmin;
  const firstAvailableView = MANAGEABLE_VIEWS.find(
    (v) => !maintenanceConfig.disabledViews.includes(v.id)
  );
  const effectiveMaintenanceMessage =
    maintenanceConfig.message.trim() ||
    formatDefaultMaintenanceMessage(maintenanceConfig.disabledViews);

  // Keyboard shortcut: Press 'N' or 'n' to open transaction modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsNewTransactionModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsNewTransactionModalOpen]);

  // Se estiver carregando sessão
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Carregando ambiente seguro...</span>
        </div>
      </div>
    );
  }

  // Se não estiver logado, exibe a tela de login/cadastro
  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar activeView={activeView} setActiveView={setActiveView} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 pb-20 md:pb-8">
          {/* Aviso Global de Manutenção para Usuários */}
          {hasAnyMaintenance &&
            !isBlockedForCurrentUser &&
            activeView !== 'admin' &&
            dismissedMaintenanceKey !== maintenanceKey && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold">
                        Aviso de Manutenção Programada
                      </span>
                      {isAdmin && isCurrentViewInMaintenance && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                          Esta tela está bloqueada p/ usuários (acesso ADM liberado)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                      {effectiveMaintenanceMessage}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80">
                        Telas indisponíveis:
                      </span>
                      {maintenanceConfig.disabledViews.map((vId) => (
                        <span
                          key={vId}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30"
                        >
                          {getViewLabel(vId)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setActiveView('admin')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Gerenciar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDismissedMaintenanceKey(maintenanceKey)}
                    className="p-1.5 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
                    title="Ocultar aviso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          {/* Bloqueio de Tela em Manutenção para Usuários Comuns */}
          {isBlockedForCurrentUser ? (
            <div className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 shadow-sm text-center max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
                <Wrench className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Em Manutenção
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  A tela {getViewLabel(activeView)} está temporariamente indisponível
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
                  {effectiveMaintenanceMessage}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Telas atualmente em manutenção:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {maintenanceConfig.disabledViews.map((vId) => (
                    <span
                      key={vId}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                    >
                      {getViewLabel(vId)}
                    </span>
                  ))}
                </div>
              </div>

              {firstAvailableView && (
                <button
                  type="button"
                  onClick={() => setActiveView(firstAvailableView.id)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                >
                  Ir para {firstAvailableView.label}
                </button>
              )}
            </div>
          ) : (
            <>
              {activeView === 'dashboard' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Alerta de Rombo no Caixa (se houver déficit projetado) */}
                  <CashDeficitAlert />

                  {/* KPIs no Topo (Saldo, Entradas, Saídas, Resultado, Projeção) */}
                  <KpiCards />

                  {/* Gráficos Principais: Fluxo de Caixa e Distribuição de Despesas */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                      <CashFlowChart />
                    </div>
                    <div className="lg:col-span-1">
                      <ExpenseDonut />
                    </div>
                  </div>

                  {/* Cards Secundários: Próximos Vencimentos e Lançamentos Recentes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <UpcomingBillsCard />
                    <RecentTransactionsCard />
                  </div>
                </div>
              )}

              {activeView === 'transactions' && <TransactionListView />}
              {activeView === 'accounts' && <AccountsView />}
              {activeView === 'payables' && <PayablesReceivablesView />}
              {activeView === 'budgets' && <BudgetsAndGoalsView />}
              {activeView === 'reports' && <ReportsView />}
              {activeView === 'settings' && <SettingsAndNeonView />}
              {activeView === 'admin' && currentUser?.isAdmin && <AdminNeonView />}
            </>
          )}
        </main>
      </div>

      {/* Barra de Navegação Rápida no Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-around text-[10px]">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`flex flex-col items-center gap-0.5 p-1 ${
            activeView === 'dashboard' ? 'text-emerald-500 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Início</span>
        </button>
        <button
          onClick={() => setActiveView('transactions')}
          className={`flex flex-col items-center gap-0.5 p-1 ${
            activeView === 'transactions' ? 'text-emerald-500 font-bold' : 'text-slate-400'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Extrato</span>
        </button>
        <button
          onClick={() => setIsNewTransactionModalOpen(true)}
          className="flex flex-col items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 -mt-4 active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveView('payables')}
          className={`flex flex-col items-center gap-0.5 p-1 ${
            activeView === 'payables' ? 'text-emerald-500 font-bold' : 'text-slate-400'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Contas</span>
        </button>
        <button
          onClick={() => setActiveView('reports')}
          className={`flex flex-col items-center gap-0.5 p-1 ${
            activeView === 'reports' ? 'text-emerald-500 font-bold' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>DRE</span>
        </button>
      </div>

      {/* Modal Global de Lançamentos (montado sob demanda) */}
      {isNewTransactionModalOpen && <TransactionModal />}
    </div>
  );
}
