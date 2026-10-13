'use client';

import React from 'react';
import { useFinance } from '@/lib/store';
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Tag, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export function RecentTransactionsCard() {
  const { transactions, accounts, formatMoney, setActiveView } = useFinance();

  const recent = transactions.slice(0, 6);

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-emerald-500" />
            <span>Últimos Lançamentos</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Transações recentes sincronizadas no contexto ativo
          </p>
        </div>
        <button
          onClick={() => setActiveView('transactions')}
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
        >
          <span>Extrato completo</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2.5">
        {recent.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma transação registrada neste contexto ainda.
          </div>
        ) : (
          recent.map((tx) => {
            const isIncome = tx.type === 'INCOME';
            const isTransfer = tx.type === 'TRANSFER';
            const account = accounts.find((a) => a.id === tx.accountId);
            const isProLabore = tx.tags?.includes('pro-labore');

            return (
              <div
                key={tx.id}
                className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isTransfer
                        ? 'bg-indigo-500/10 text-indigo-500'
                        : isIncome
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {isTransfer ? (
                      <ArrowLeftRight className="w-4 h-4" />
                    ) : isIncome ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {tx.description}
                      </span>
                      {isProLabore && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          Pró-Labore
                        </span>
                      )}
                      {tx.isInstallment && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {tx.installmentNumber}/{tx.totalInstallments}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>{new Date(tx.date).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span className="truncate max-w-[120px]">{account?.name || 'Conta Corrente'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-xs font-bold ${
                      isTransfer
                        ? 'text-indigo-500'
                        : isIncome
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isIncome ? '+' : isTransfer ? '' : '-'}
                    {formatMoney(tx.amount, tx.currency)}
                  </div>
                  {tx.currency !== 'BRL' && (
                    <span className="text-[9px] text-slate-400 block font-mono">
                      (Cotação: {tx.exchangeRate})
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
