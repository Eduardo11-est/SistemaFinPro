'use client';

import React, { useMemo } from 'react';
import { useFinance } from '@/lib/store';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { Category } from '@/types/finance';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];

export const ExpenseDonut = React.memo(function ExpenseDonut() {
  const { transactions, categories, formatMoney, activeCurrency, convertAmount } = useFinance();

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (let i = 0; i < categories.length; i++) {
      map.set(categories[i].id, categories[i]);
    }
    return map;
  }, [categories]);

  const expenseData = useMemo(() => {
    const categoryTotals: Record<string, { name: string; amount: number; color: string }> = {};

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (tx.type === 'EXPENSE' && tx.status === 'COMPLETED') {
        const catId = tx.categoryId || 'outros';
        const cat = categoryMap.get(catId);
        const catName = cat?.name || 'Outras Despesas';
        const catColor = cat?.color || '#94a3b8';
        const converted = convertAmount(tx.amount, tx.currency, activeCurrency);

        if (!categoryTotals[catId]) {
          categoryTotals[catId] = { name: catName, amount: 0, color: catColor };
        }
        categoryTotals[catId].amount += converted;
      }
    }

    const list = Object.values(categoryTotals);
    const total = list.reduce((acc, curr) => acc + curr.amount, 0);

    return list
      .map((item) => ({
        ...item,
        percentage: total > 0 ? ((item.amount / total) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, categoryMap, convertAmount, activeCurrency]);

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="mb-3">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-rose-500" />
          <span>Distribuição de Despesas</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Concentração de saídas por categoria
        </p>
      </div>

      {expenseData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          Nenhuma despesa registrada para exibir no gráfico.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Gráfico Donut */}
          <div className="h-52 w-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="amount"
                >
                  {expenseData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 shadow-xl text-xs space-y-0.5">
                          <div className="font-bold text-slate-100">{data.name}</div>
                          <div className="text-rose-400">{formatMoney(data.amount)}</div>
                          <div className="text-slate-400 font-mono">{data.percentage}% do total</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda Customizada com Percentuais */}
          <div className="flex-1 w-full space-y-2 max-h-56 overflow-y-auto pr-1">
            {expenseData.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
              >
                <div className="flex items-center gap-2 truncate max-w-[150px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatMoney(item.amount)}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
