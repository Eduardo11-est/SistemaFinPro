'use client';

import React from 'react';
import { useFinance } from '@/lib/store';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldAlert
} from 'lucide-react';

export function KpiCards() {
  const { stats, formatMoney, currentWorkspace } = useFinance();
  const isPersonal = currentWorkspace.type === 'PERSONAL';

  const isNetPositive = stats.monthNet >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {/* 1. Saldo Atual Consolidado */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Saldo Consolidado
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {formatMoney(stats.totalBalance)}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{isPersonal ? 'Total em contas PF' : 'Total em contas PJ'}</span>
        </div>
      </div>

      {/* 2. Entradas do Mês */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Entradas do Mês
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
          +{formatMoney(stats.monthIncome)}
        </div>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
          <span>Receitas computadas</span>
        </div>
      </div>

      {/* 3. Saídas do Mês */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-rose-500/30 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Saídas do Mês
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
          -{formatMoney(stats.monthExpense)}
        </div>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
          <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
          <span>Despesas pagas</span>
        </div>
      </div>

      {/* 4. Resultado Líquido */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Resultado Líquido
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isNetPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
          }`}>
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className={`text-xl sm:text-2xl font-bold tracking-tight ${
          isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {formatMoney(stats.monthNet)}
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          {isNetPositive ? 'Superávit no período' : 'Déficit no período'}
        </div>
      </div>

      {/* 5. Projeção de Caixa (30 dias) */}
      <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm relative overflow-hidden group transition-all ${
        stats.hasCashDeficitAlert 
          ? 'border-rose-500/40 bg-rose-500/5' 
          : 'border-slate-200/80 dark:border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Projeção (30 dias)
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            stats.hasCashDeficitAlert ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'
          }`}>
            {stats.hasCashDeficitAlert ? (
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className={`text-xl sm:text-2xl font-bold tracking-tight ${
          stats.projectedBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
        }`}>
          {formatMoney(stats.projectedBalance)}
        </div>
        <div className="mt-2 text-[11px] text-slate-500 truncate">
          {stats.hasCashDeficitAlert ? 'Risco de rombo detectado!' : 'Saldo projetado futuro'}
        </div>
      </div>
    </div>
  );
}
