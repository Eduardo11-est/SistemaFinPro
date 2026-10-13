'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/lib/store';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Printer,
  TrendingUp,
  Percent,
  SlidersHorizontal,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export function ReportsView() {
  const { transactions, payablesReceivables, categories, formatMoney, currentWorkspace } = useFinance();
  const isPersonal = currentWorkspace.type === 'PERSONAL';

  const [regime, setRegime] = useState<'COMPETENCIA' | 'CAIXA'>('COMPETENCIA');

  // Cálculo da DRE Gerencial
  const dreData = useMemo(() => {
    // 1. Receita Bruta
    let receitaBruta = 0;
    let impostosDeducoes = 0;
    let custosOperacionais = 0;
    let despesasVendasMkt = 0;
    let despesasAdmFolha = 0;
    let despesasTICloud = 0;

    transactions.forEach((tx) => {
      if (tx.status === 'COMPLETED') {
        if (tx.type === 'INCOME') {
          receitaBruta += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          const desc = tx.description.toLowerCase();
          const cat = categories.find((c) => c.id === tx.categoryId)?.name.toLowerCase() || '';

          if (desc.includes('imposto') || desc.includes('das') || cat.includes('imposto')) {
            impostosDeducoes += tx.amount;
          } else if (desc.includes('cloud') || desc.includes('aws') || desc.includes('servidor') || cat.includes('cloud')) {
            despesasTICloud += tx.amount;
          } else if (desc.includes('folha') || desc.includes('pró-labore') || cat.includes('folha')) {
            despesasAdmFolha += tx.amount;
          } else if (desc.includes('marketing') || desc.includes('ads') || cat.includes('marketing')) {
            despesasVendasMkt += tx.amount;
          } else {
            custosOperacionais += tx.amount;
          }
        }
      }
    });

    // Se estiver em Competência, adiciona títulos a receber e a pagar em aberto
    if (regime === 'COMPETENCIA') {
      payablesReceivables.forEach((pr) => {
        if (pr.status === 'PENDING' || pr.status === 'OVERDUE') {
          if (pr.type === 'RECEIVABLE') receitaBruta += pr.amount;
          if (pr.type === 'PAYABLE') custosOperacionais += pr.amount;
        }
      });
    }

    const receitaLiquida = receitaBruta - impostosDeducoes;
    const lucroBruto = receitaLiquida - custosOperacionais;
    const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;

    const totalDespesasOperacionais = despesasVendasMkt + despesasAdmFolha + despesasTICloud;
    const ebitda = lucroBruto - totalDespesasOperacionais;
    const margemEbitda = receitaLiquida > 0 ? (ebitda / receitaLiquida) * 100 : 0;

    const lucroLiquido = ebitda; // Supondo depreciação simplificada
    const margemLiquida = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;

    return {
      receitaBruta,
      impostosDeducoes,
      receitaLiquida,
      custosOperacionais,
      lucroBruto,
      margemBruta,
      despesasVendasMkt,
      despesasAdmFolha,
      despesasTICloud,
      totalDespesasOperacionais,
      ebitda,
      margemEbitda,
      lucroLiquido,
      margemLiquida,
    };
  }, [transactions, payablesReceivables, categories, regime]);

  // Análise de Pareto (80/20) dos maiores gastos
  const paretoExpenses = useMemo(() => {
    const list = transactions
      .filter((t) => t.type === 'EXPENSE' && t.status === 'COMPLETED')
      .sort((a, b) => b.amount - a.amount);

    const total = list.reduce((acc, curr) => acc + curr.amount, 0);

    let cumulative = 0;
    return list.slice(0, 8).map((item) => {
      cumulative += item.amount;
      const share = total > 0 ? (item.amount / total) * 100 : 0;
      const cumShare = total > 0 ? (cumulative / total) * 100 : 0;
      return {
        description: item.description,
        amount: item.amount,
        share: share.toFixed(1),
        cumulativeShare: cumShare.toFixed(1),
      };
    });
  }, [transactions]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Alternância Competência vs Caixa */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            <span>DRE Gerencial & Relatórios Contábeis</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Demonstrativo do Resultado do Exercício com EBITDA, Lucro Líquido e Pareto 80/20
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternância Competência vs Caixa */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
            <button
              onClick={() => setRegime('COMPETENCIA')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                regime === 'COMPETENCIA'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Competência
            </button>
            <button
              onClick={() => setRegime('CAIXA')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                regime === 'CAIXA'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Caixa
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* DRE Gerencial Formatada */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Demonstrativo do Resultado do Exercício (Regime de {regime === 'COMPETENCIA' ? 'Competência' : 'Caixa'})
          </span>
          <span className="text-[11px] font-mono text-emerald-500 font-bold">
            Margem Líquida: {dreData.margemLiquida.toFixed(1)}%
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
          {/* Receita Operacional Bruta */}
          <div className="py-3 px-5 flex items-center justify-between font-bold text-slate-900 dark:text-white bg-slate-50/30 dark:bg-slate-800/20">
            <span>(+) Receita Operacional Bruta</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
              {formatMoney(dreData.receitaBruta)}
            </span>
          </div>

          {/* Deduções e Impostos */}
          <div className="py-2.5 px-5 pl-8 flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span>(-) Deduções da Receita & Impostos sobre Serviços (DAS/ISS)</span>
            <span className="text-rose-500 font-mono">-{formatMoney(dreData.impostosDeducoes)}</span>
          </div>

          {/* Receita Líquida */}
          <div className="py-3 px-5 flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/40">
            <span>(=) Receita Operacional Líquida</span>
            <span className="font-mono">{formatMoney(dreData.receitaLiquida)}</span>
          </div>

          {/* Custos dos Serviços */}
          <div className="py-2.5 px-5 pl-8 flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span>(-) Custos Operacionais Diretos</span>
            <span className="text-rose-500 font-mono">-{formatMoney(dreData.custosOperacionais)}</span>
          </div>

          {/* Lucro Bruto */}
          <div className="py-3 px-5 flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 bg-indigo-50/30 dark:bg-indigo-950/20">
            <span className="flex items-center gap-2">
              <span>(=) Lucro Bruto / Margem de Contribuição</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-500">
                {dreData.margemBruta.toFixed(1)}%
              </span>
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatMoney(dreData.lucroBruto)}</span>
          </div>

          {/* Despesas Operacionais Detalhadas */}
          <div className="py-2.5 px-5 pl-8 flex items-center justify-between text-slate-500">
            <span>(-) Despesas com Pessoal & Pró-Labore</span>
            <span className="font-mono">-{formatMoney(dreData.despesasAdmFolha)}</span>
          </div>
          <div className="py-2.5 px-5 pl-8 flex items-center justify-between text-slate-500">
            <span>(-) Infraestrutura de TI, Cloud & Servidores</span>
            <span className="font-mono">-{formatMoney(dreData.despesasTICloud)}</span>
          </div>
          <div className="py-2.5 px-5 pl-8 flex items-center justify-between text-slate-500">
            <span>(-) Marketing & Aquisição de Clientes (CAC)</span>
            <span className="font-mono">-{formatMoney(dreData.despesasVendasMkt)}</span>
          </div>

          {/* EBITDA (LAJIDA) */}
          <div className="py-3.5 px-5 flex items-center justify-between font-bold text-slate-900 dark:text-white bg-emerald-500/10">
            <span className="flex items-center gap-2">
              <span>(=) EBITDA (Lucro Antes de Juros, Impostos e Depreciação)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                Margem: {dreData.margemEbitda.toFixed(1)}%
              </span>
            </span>
            <span className="font-mono text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
              {formatMoney(dreData.ebitda)}
            </span>
          </div>

          {/* Lucro Líquido Final */}
          <div className="py-4 px-5 flex items-center justify-between font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/80">
            <span className="text-sm">(=) LUCRO LÍQUIDO DO EXERCÍCIO</span>
            <span
              className={`font-mono text-base sm:text-lg ${
                dreData.lucroLiquido >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {formatMoney(dreData.lucroLiquido)}
            </span>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: Análise de Pareto (80/20) dos Maiores Ofensores de Custo */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Percent className="w-4 h-4 text-rose-500" />
            <span>Análise de Pareto (Regra 80/20) - Principais Custos</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Identificação dos itens responsáveis por 80% do consumo do caixa
          </p>
        </div>

        <div className="space-y-3">
          {paretoExpenses.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {idx + 1}. {item.description}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-rose-600 dark:text-rose-400">{formatMoney(item.amount)}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.share}% ({item.cumulativeShare}% acum.)
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${item.share}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
