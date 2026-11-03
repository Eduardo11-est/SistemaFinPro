'use client';

import React, { useEffect } from 'react';
import { useFinance } from '@/lib/store';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { CashDeficitAlert } from '@/components/dashboard/CashDeficitAlert';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { ExpenseDonut } from '@/components/dashboard/ExpenseDonut';
import { UpcomingBillsCard } from '@/components/dashboard/UpcomingBillsCard';
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard';
import { TransactionListView } from '@/components/transactions/TransactionListView';
import { AccountsView } from '@/components/accounts/AccountsView';
import { PayablesReceivablesView } from '@/components/payables/PayablesReceivablesView';
import { ReconciliationView } from '@/components/reconciliation/ReconciliationView';
import { BudgetsAndGoalsView } from '@/components/budgets/BudgetsAndGoalsView';
import { ReportsView } from '@/components/reports/ReportsView';
import { SettingsAndNeonView } from '@/components/settings/SettingsAndNeonView';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CalendarDays,
  BarChart3,
  Plus
} from 'lucide-react';

export default function HomePage() {
  const {
    activeView,
    setActiveView,
    setIsNewTransactionModalOpen,
    currentUser,
    isAuthLoading
  } = useFinance();

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
          {activeView === 'reconciliation' && <ReconciliationView />}
          {activeView === 'budgets' && <BudgetsAndGoalsView />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'settings' && <SettingsAndNeonView />}
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

      {/* Modal Global de Lançamentos */}
      <TransactionModal />
    </div>
  );
}
