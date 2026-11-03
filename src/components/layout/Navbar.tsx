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
  ShieldCheck, 
  Sparkles,
  LogOut
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
    currentUser,
    logout
  } = useFinance();

  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  const isPersonal = currentWorkspace?.type === 'PERSONAL';

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
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-emerald-500 to-indigo-600 bg-clip-text text-transparent">
                FinPro
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
              Controle Financeiro Unificado
            </p>
          </div>
        </div>

        {/* Separador vertical */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Context Switcher Dropdown (A Regra de Ouro) */}
        <div className="relative">
          <button
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 transition-all text-left group"
          >
            <div 
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                isPersonal 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {isPersonal ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
            </div>
            <div className="max-w-[140px] sm:max-w-[180px] truncate">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {currentWorkspace?.name || 'Meu Espaço'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {currentWorkspace?.document || (isPersonal ? 'Pessoa Física' : 'Corporativo')}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
          </button>

          {/* Menu Dropdown de Workspaces */}
          {isWorkspaceDropdownOpen && (
            <div 
              className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              onMouseLeave={() => setIsWorkspaceDropdownOpen(false)}
            >
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Alternar Contexto (Isolamento Total)
              </div>
              <div className="space-y-1">
                {workspaces.map((ws) => {
                  const isWsPersonal = ws.type === 'PERSONAL';
                  const isSelected = ws.id === currentWorkspace?.id;
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
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Novo CNPJ / Empresa</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Direita: Moeda, Notificações, Tema, Usuário e Botão de Ação */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Seletor Multimoeda */}
        <div className="relative">
          <button
            onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-mono font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <span>{activeCurrency}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {isCurrencyDropdownOpen && (
            <div 
              className="absolute right-0 mt-2 w-32 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-1 z-50"
              onMouseLeave={() => setIsCurrencyDropdownOpen(false)}
            >
              {(['BRL', 'USD', 'EUR'] as CurrencyType[]).map((curr) => (
                <button
                  key={curr}
                  onClick={() => {
                    setActiveCurrency(curr);
                    setIsCurrencyDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between ${
                    activeCurrency === curr 
                      ? 'bg-emerald-500 text-white font-bold' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{curr}</span>
                  <span className="text-[10px] opacity-75">
                    {curr === 'BRL' ? 'R$' : curr === 'USD' ? 'US$' : '€'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sino de Notificações / Alertas */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            title="Alertas e Notificações"
          >
            <Bell className="w-4 h-4" />
            {totalNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          {isNotificationsOpen && (
            <div 
              className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50"
              onMouseLeave={() => setIsNotificationsOpen(false)}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Notificações do Sistema
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold">
                  {totalNotifications} pendente(s)
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {stats.hasCashDeficitAlert && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Alerta Proativo de Rombo</div>
                      <div className="text-[11px] opacity-90">
                        Projeção negativa de {formatMoney(stats.projectedBalance)} nos próximos 30 dias.
                      </div>
                    </div>
                  </div>
                )}

                {stats.overduePayablesCount > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-start gap-2">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Inadimplência / Atraso</div>
                      <div className="text-[11px] opacity-90">
                        {stats.overduePayablesCount} conta(s) a pagar vencida(s) com incidência de juros diários.
                      </div>
                    </div>
                  </div>
                )}

                {stats.budgetAlertsCount > 0 && (
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
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

        {/* Usuário Logado & Botão Sair */}
        {currentUser && (
          <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {currentUser.email}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Sair da Conta (Logout)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Botão de Ação Rápida: + Nova Transação (Atalho N) */}
        <button
          onClick={() => setIsNewTransactionModalOpen(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium text-xs sm:text-sm shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer"
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
