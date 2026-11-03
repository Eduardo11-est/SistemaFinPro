'use client';

import React, { useMemo, useState } from 'react';
import { useFinance } from '@/lib/store';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  Line,
  ComposedChart
} from 'recharts';
import { TrendingUp } from 'lucide-react';

export function CashFlowChart() {
  const { transactions, formatMoney, activeCurrency, convertAmount } = useFinance();
  const [period, setPeriod] = useState<'6M' | '30D'>('6M');

  // Generate 6 months data aggregation from real transactions
  const chartData = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = i === 0 ? `${monthNames[month]} (Atual)` : monthNames[month];

      let receitas = 0;
      let despesas = 0;

      transactions.forEach((tx) => {
        if (tx.status === 'COMPLETED') {
          const txDate = new Date(tx.date);
          if (txDate.getFullYear() === year && txDate.getMonth() === month) {
            const val = convertAmount(tx.amount, tx.currency, activeCurrency);
            if (tx.type === 'INCOME') receitas += val;
            if (tx.type === 'EXPENSE') despesas += val;
          }
        }
      });

      result.push({
        name: label,
        receitas: Math.round(receitas),
        despesas: Math.round(despesas),
        saldo: Math.round(receitas - despesas),
      });
    }

    return result;
  }, [transactions, convertAmount, activeCurrency]);

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Fluxo de Caixa (Histórico & Realizado)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparativo de Receitas vs Despesas e Saldo Operacional
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
          <button
            onClick={() => setPeriod('6M')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              period === '6M' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'
            }`}
          >
            Últimos 6 Meses
          </button>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `R$${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-xl text-xs space-y-1">
                      <div className="font-bold text-slate-200">{payload[0]?.payload?.name}</div>
                      <div className="text-emerald-400">
                        Receitas: {formatMoney(payload[0]?.value as number)}
                      </div>
                      <div className="text-rose-400">
                        Despesas: {formatMoney(payload[1]?.value as number)}
                      </div>
                      <div className="text-indigo-300 font-semibold border-t border-slate-800 pt-1">
                        Resultado: {formatMoney(payload[2]?.value as number)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle" 
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }} 
            />
            <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Line type="monotone" dataKey="saldo" name="Saldo Líquido" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
