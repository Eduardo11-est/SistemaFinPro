'use client';

import React from 'react';
import { useFinance } from '@/lib/store';
import { CalendarClock, AlertCircle, CheckCircle2, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function UpcomingBillsCard() {
  const { payablesReceivables, formatMoney, settlePayableReceivable, accounts, setActiveView } = useFinance();

  const activeBills = payablesReceivables
    .filter((b) => b.status === 'PENDING' || b.status === 'OVERDUE' || b.status === 'SCHEDULED')
    .slice(0, 5);

  const defaultAccount = accounts[0]?.id;

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-amber-500" />
            <span>Próximos Vencimentos & Inadimplência</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compromissos agendados e alertas de atraso
          </p>
        </div>
        <button
          onClick={() => setActiveView('payables')}
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
        >
          <span>Ver todos</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2.5">
        {activeBills.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhum compromisso financeiro pendente no momento.
          </div>
        ) : (
          activeBills.map((bill) => {
            const isPayable = bill.type === 'PAYABLE';
            const isOverdue = bill.status === 'OVERDUE';
            const totalWithInterest = bill.amount + (bill.accruedInterest || 0);

            return (
              <div
                key={bill.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  isOverdue
                    ? 'bg-rose-500/5 border-rose-500/30'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isPayable
                        ? 'bg-rose-500/10 text-rose-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                  >
                    {isPayable ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                      {bill.description}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Vencimento: {new Date(bill.dueDate).toLocaleDateString('pt-BR')}</span>
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" />
                          Atrasado (+{formatMoney(bill.accruedInterest)} juros)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-right">
                    <div
                      className={`text-xs font-bold ${
                        isPayable ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatMoney(totalWithInterest)}
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {bill.recipientOrPayer || (isPayable ? 'Fornecedor' : 'Cliente')}
                    </span>
                  </div>

                  <button
                    onClick={() => defaultAccount && settlePayableReceivable(bill.id, defaultAccount)}
                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all text-xs"
                    title="Liquidar / Baixar Título Agora"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
