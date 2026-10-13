'use client';

import React, { useState } from 'react';
import { useFinance } from '@/lib/store';
import { 
  Building2, 
  User, 
  Plus, 
  Sun, 
  Moon, 
  ChevronDown, 
  Bell, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  ArrowLeftRight,
  ShieldCheck,
  Search,
  Sparkles
} from 'lucide-react';
import { CurrencyType } from '@/types/finance';

export function Navbar() {
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspaceId,
    activeCurrency,
    setActiveCurrency,
    formatMoney,
    setIsNewTransactionModalOpen,
    theme,
    toggleTheme,
    stats,
    setActiveView,
    activeView
  } = useFinance();

  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  const isPersonal = currentWorkspace.type === 'PERSONAL';

  const totalNotifications = 
    (stats.hasCashDeficitAlert ? 1 : 0) + 
    stats.overduePayablesCount + 
    stats.budgetAlertsCount;

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      {/* Esquerda: Identidade & Context Switcher */}
      <div className="flex items-center gap-3 sm:gap-6">
        <div 
          onClick={() => setActiveView('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                FinPro
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Controle Financeiro Unificado
            </p>
          </div>
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

        {/* Seletor de Contexto (REGRA DE OURO: Separação Pessoal vs Corporativo) */}
        <div className="relative">
          <button
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
              isPersonal
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20'
            }`}
          >
            {isPersonal ? (
              <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            )}
            <div className="text-left">
              <div className="font-semibold leading-tight line-clamp-1 max-w-[130px] sm:max-w-[200px]">
                {currentWorkspace.name}
              </div>
              <div className="text-[10px] opacity-75 font-mono">
                {currentWorkspace.document ? currentWorkspace.document : isPersonal ? 'Pessoa Física' : 'CNPJ'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-1" />
          </button>

          {/* Dropdown de Workspaces */}
          {isWorkspaceDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Alternar Contexto (Isolamento Total)
              </div>
              <div className="space-y-1">
                {workspaces.map((ws) => {
                  const isWsPersonal = ws.type === 'PERSONAL';
                  const isSelected = ws.id === currentWorkspace.id;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setCurrentWorkspaceId(ws.id);
                        setIsWorkspaceDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-slate-800 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isWsPersonal
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-indigo-500/10 text-indigo-500'
                          }`}
                        >
                          {isWsPersonal ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Building2 className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                            {ws.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {ws.document || (isWsPersonal ? 'Pessoa Física' : 'Empresa')}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2 px-1">
                <button
                  onClick={() => {
                    setIsWorkspaceDropdownOpen(false);
                    setActiveView('settings');
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Novo CNPJ / Empresa</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Direita: Ações, Moeda, Notificações, Tema & Botão Nova Transação */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Seletor de Multimoeda */}
        <div className="relative">
          <button
            onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-mono text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span>{activeCurrency}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {isCurrencyDropdownOpen && (
            <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 z-50 animate-in fade-in">
              {(['BRL', 'USD', 'EUR'] as CurrencyType[]).map((cur) => (
                <button
                  key={cur}
                  onClick={() => {
                    setActiveCurrency(cur);
                    setIsCurrencyDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    activeCurrency === cur
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{cur}</span>
                  {cur === 'BRL' && <span className="text-[10px] text-slate-400">R$</span>}
                  {cur === 'USD' && <span className="text-[10px] text-slate-400">US$</span>}
                  {cur === 'EUR' && <span className="text-[10px] text-slate-400">€</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Central de Notificações / Alertas */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Alertas do Sistema"
          >
            <Bell className="w-4 h-4" />
            {totalNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Notificações & Alertas Financeiros
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                  {totalNotifications} ativos
                </span>
              </div>

              <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
                {stats.hasCashDeficitAlert && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <div>
                      <div className="font-semibold">Alerta de Rombo no Caixa!</div>
                      <div className="text-[11px] opacity-90">
                        O saldo projetado para os próximos 30 dias está negativo ({formatMoney(stats.projectedBalance)}).
                      </div>
                    </div>
                  </div>
                )}

                {stats.overduePayablesCount > 0 && (
                  <div 
                    onClick={() => { setActiveView('payables'); setIsNotificationsOpen(false); }}
                    className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2 cursor-pointer hover:bg-amber-500/20 transition-colors"
                  >
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <div className="font-semibold">{stats.overduePayablesCount} título(s) em atraso</div>
                      <div className="text-[11px] opacity-90">
                        Juros e multas diárias estão sendo calculados automaticamente.
                      </div>
                    </div>
                  </div>
                )}

                {stats.budgetAlertsCount > 0 && (
                  <div 
                    onClick={() => { setActiveView('budgets'); setIsNotificationsOpen(false); }}
                    className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-400 flex items-start gap-2 cursor-pointer hover:bg-indigo-500/20 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
                    <div>
                      <div className="font-semibold">Teto Orçamentário Excedendo 80%</div>
                      <div className="text-[11px] opacity-90">
                        {stats.budgetAlertsCount} categoria(s) atingiram ou ultrapassaram o limite definido.
                      </div>
                    </div>
                  </div>
                )}

                {totalNotifications === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500/50 mb-1" />
                    Tudo sob controle! Nenhum alerta financeiro crítico no momento.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Toggle Dark/Light Mode */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Mudar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Botão de Ação Rápida: + Nova Transação (Atalho N) */}
        <button
          onClick={() => setIsNewTransactionModalOpen(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium text-xs sm:text-sm shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Transação</span>
          <span className="sm:hidden">Novo</span>
          <kbd className="hidden lg:inline-block ml-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-700/60 text-emerald-100 font-mono">
            N
          </kbd>
        </button>
      </div>
    </header>
  );
}
