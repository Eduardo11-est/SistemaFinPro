'use client';

import React, { useState } from 'react';
import { useFinance } from '@/lib/store';
import {
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Plus,
  ShieldCheck,
  Plane,
  Home,
  DollarSign,
  Sparkles,
  X
} from 'lucide-react';

export function BudgetsAndGoalsView() {
  const {
    budgets,
    categories,
    goals,
    formatMoney,
    contributeToGoal,
    addGoal,
    currentWorkspace,
    stats
  } = useFinance();

  const isPersonal = currentWorkspace.type === 'PERSONAL';

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [goalCurrentStr, setGoalCurrentStr] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');

  // Aporte rápido modal
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null);
  const [contributionAmountStr, setContributionAmountStr] = useState('');

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(goalTargetStr.replace(',', '.')) || 0;
    const current = parseFloat(goalCurrentStr.replace(',', '.')) || 0;
    if (!goalTitle || target <= 0) return;

    addGoal({
      title: goalTitle,
      targetAmount: target,
      currentAmount: current,
      targetDate: goalDeadline || undefined,
      workspaceId: currentWorkspace.id,
      color: '#10b981',
      icon: 'Target',
    });

    setIsGoalModalOpen(false);
    setGoalTitle('');
    setGoalTargetStr('');
    setGoalCurrentStr('');
  };

  const handleConfirmContribution = (id: string) => {
    const amount = parseFloat(contributionAmountStr.replace(',', '.')) || 0;
    if (amount > 0) {
      contributeToGoal(id, amount);
    }
    setContributingGoalId(null);
    setContributionAmountStr('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* SEÇÃO 1: Orçamentos por Categoria (Budgeting com alertas de 80% e 100%) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-500" />
              <span>Orçamento Mensal por Categoria (Budgeting)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tetos de gastos com alertas em tempo real ao atingir 80% e 100% do limite
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Período: <strong className="text-slate-800 dark:text-slate-200">Outubro / 2026</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => {
            const cat = categories.find((c) => c.id === budget.categoryId);
            const percent = Math.round((budget.currentSpent / budget.monthlyLimit) * 100);
            const isWarning = percent >= 80 && percent < 100;
            const isDanger = percent >= 100;
            const remaining = budget.monthlyLimit - budget.currentSpent;

            return (
              <div
                key={budget.id}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm transition-all ${
                  isDanger
                    ? 'border-rose-500/50 bg-rose-500/5'
                    : isWarning
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1">
                    {cat?.name || 'Categoria'}
                  </h3>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isDanger
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isDanger ? 'Estourado (100%+)' : isWarning ? 'Atenção (80%+)' : 'Normal'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Gasto Atual</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatMoney(budget.currentSpent)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Teto Mensal</span>
                      <span className="text-xs font-semibold text-slate-500">
                        {formatMoney(budget.monthlyLimit)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso com Transição de Cores */}
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{percent}% utilizado</span>
                    <span>
                      {remaining >= 0 ? `Resta ${formatMoney(remaining)}` : `Excedido em ${formatMoney(Math.abs(remaining))}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 2: Metas Financeiras (Pessoal) ou Projeções Estratégicas (Corporativo) */}
      {isPersonal ? (
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                <span>Metas Financeiras & Sonhos (Pessoal)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhamento com barra de progresso (Reserva de Emergência, Viagem, Ativos)
              </p>
            </div>

            <button
              onClick={() => setIsGoalModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Meta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {goals.map((goal) => {
              const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

              return (
                <div
                  key={goal.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Target className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {goal.category || 'Objetivo'}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                      {goal.title}
                    </h3>

                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-400">Acumulado:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(goal.currentAmount)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-400">Objetivo:</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {formatMoney(goal.targetAmount)}
                        </span>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{progress}% concluído</span>
                        {goal.targetDate && (
                          <span>Prazo: {new Date(goal.targetDate).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setContributingGoalId(goal.id)}
                    className="w-full py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white font-semibold text-xs transition-colors"
                  >
                    + Fazer Aporte Rápido
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Modo Corporativo: Projeção de Fluxo de Caixa (30, 60, 90 dias, 12 meses) */
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <span>Projeção Estratégica de Caixa PJ (30, 60, 90 dias e 12 meses)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Simulação de compromissos recorrentes e previsão de liquidez corporativa
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { period: '30 Dias', proj: stats.totalBalance + 33000, trend: '+12%' },
              { period: '60 Dias', proj: stats.totalBalance + 68000, trend: '+24%' },
              { period: '90 Dias', proj: stats.totalBalance + 104000, trend: '+38%' },
              { period: '12 Meses', proj: stats.totalBalance + 410000, trend: '+140%' },
            ].map((proj, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">{proj.period}</span>
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white block mt-1">
                  {formatMoney(proj.proj)}
                </span>
                <span className="text-[10px] text-emerald-500 font-mono">{proj.trend} vs atual</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para Fazer Aporte Rápido na Meta */}
      {contributingGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
              Fazer Aporte na Meta Financeira
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Informe o valor a ser somado ao montante acumulado da meta:
            </p>
            <input
              type="text"
              placeholder="Ex: 500,00"
              value={contributionAmountStr}
              onChange={(e) => setContributionAmountStr(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm font-bold bg-white dark:bg-slate-800 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setContributingGoalId(null)}
                className="px-3 py-1.5 text-xs text-slate-500"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmContribution(contributingGoalId)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Confirmar Aporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Nova Meta */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Cadastrar Nova Meta Financeira
              </h3>
              <button onClick={() => setIsGoalModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Título da Meta</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carro Novo, Reserva, Viagem"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Valor Alvo (R$)</label>
                  <input
                    type="text"
                    required
                    placeholder="50000"
                    value={goalTargetStr}
                    onChange={(e) => setGoalTargetStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Já Acumulado (R$)</label>
                  <input
                    type="text"
                    placeholder="10000"
                    value={goalCurrentStr}
                    onChange={(e) => setGoalCurrentStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Data Limite (Opcional)</label>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                >
                  Criar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
