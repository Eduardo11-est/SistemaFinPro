'use client';

import React from 'react';
import { useFinance } from '@/lib/store';
import { AlertTriangle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

export function CashDeficitAlert() {
  const { stats, formatMoney, setActiveView } = useFinance();

  if (!stats.hasCashDeficitAlert) return null;

  return (
    <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-sm sm:text-base flex items-center gap-2">
            <span>Alerta de Rombo no Caixa Projetado!</span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300">
              Ação Requerida
            </span>
          </div>
          <p className="text-xs sm:text-sm text-rose-800/80 dark:text-rose-300/80 mt-1 max-w-2xl">
            Com base nos títulos a pagar e receber previstos para os próximos 30 dias, seu caixa atingirá um saldo negativo estimado em{' '}
            <strong className="text-rose-600 dark:text-rose-400 underline">{formatMoney(stats.projectedBalance)}</strong>. 
            Antecipe recebíveis ou renegocie vencimentos de fornecedores para evitar custos de juros.
          </p>
        </div>
      </div>

      <button
        onClick={() => setActiveView('payables')}
        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20"
      >
        <span>Ver Contas a Pagar</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
