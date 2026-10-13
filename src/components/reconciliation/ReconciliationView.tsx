'use client';

import React, { useState } from 'react';
import { useFinance } from '@/lib/store';
import {
  FileCheck2,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  ArrowRight,
  Filter,
  Plus,
  Zap
} from 'lucide-react';
import { BankStatementItem } from '@/types/finance';

export function ReconciliationView() {
  const {
    statements,
    reconciliationRules,
    transactions,
    accounts,
    formatMoney,
    reconcileItem,
    addStatementItems,
    addTransaction,
    currentWorkspace
  } = useFinance();

  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'OFX' | 'CSV' | 'PDF'>('OFX');

  // Simular importação de extrato real OFX / CSV
  const handleSimulateImport = () => {
    setIsSimulatingUpload(true);
    setTimeout(() => {
      const newItems: BankStatementItem[] = [
        {
          id: `stmt-${Date.now()}-1`,
          date: new Date().toISOString().split('T')[0],
          description: 'PIX TRANSF CLIENTE SOLUCOES SA',
          amount: 14500.00,
          fitId: `OFX-${Date.now()}-01`,
          isReconciled: false,
          suggestedCategoryId: 'cat-pj-saas',
        },
        {
          id: `stmt-${Date.now()}-2`,
          date: new Date().toISOString().split('T')[0],
          description: 'GOOGLE ADS BRASIL INTERNET',
          amount: -3200.00,
          fitId: `OFX-${Date.now()}-02`,
          isReconciled: false,
          suggestedCategoryId: 'cat-pj-mkt',
        },
      ];
      addStatementItems(newItems);
      setIsSimulatingUpload(false);
    }, 600);
  };

  // Conciliar e criar lançamento se não existir correspondência
  const handleReconcileAndCreate = (item: BankStatementItem) => {
    const defaultAcc = accounts[0]?.id;
    if (!defaultAcc) return;

    // Se não tiver transação existente, cria no extrato do sistema
    addTransaction({
      type: item.amount > 0 ? 'INCOME' : 'EXPENSE',
      description: `[Conciliado] ${item.description}`,
      amount: Math.abs(item.amount),
      date: item.date,
      status: 'COMPLETED',
      paymentMethod: 'Extrato Bancário',
      currency: 'BRL',
      exchangeRate: 1,
      tags: ['conciliado-ofx'],
      workspaceId: currentWorkspace.id,
      accountId: defaultAcc,
      categoryId: item.suggestedCategoryId,
    });

    reconcileItem(item.id);
  };

  const pendingCount = statements.filter((s) => !s.isReconciled).length;
  const reconciledCount = statements.filter((s) => s.isReconciled).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Upload */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-500" />
            <span>Conciliação Bancária Inteligente</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Importação e correspondência automática de extratos OFX, CSV e PDF em {currentWorkspace.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
            {(['OFX', 'CSV', 'PDF'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-2.5 py-1 rounded-lg font-mono font-semibold transition-all ${
                  selectedFormat === fmt
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                .{fmt}
              </button>
            ))}
          </div>

          <button
            onClick={handleSimulateImport}
            disabled={isSimulatingUpload}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isSimulatingUpload ? 'Processando Arquivo...' : `Importar Extrato (.${selectedFormat})`}</span>
          </button>
        </div>
      </div>

      {/* Métricas de Conciliação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Pendentes de Conciliação</span>
            <div className="text-xl font-bold text-amber-500 mt-1">{pendingCount} itens</div>
          </div>
          <AlertCircle className="w-7 h-7 text-amber-500/30" />
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Extratos Já Conciliados</span>
            <div className="text-xl font-bold text-emerald-500 mt-1">{reconciledCount} itens</div>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-500/30" />
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Regras de Sugestão Ativas</span>
            <div className="text-xl font-bold text-indigo-500 mt-1">{reconciliationRules.length} regras</div>
          </div>
          <Zap className="w-7 h-7 text-indigo-500/30" />
        </div>
      </div>

      {/* Tabela de Extratos Bancários com Sugestões */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Linhas de Extrato Importadas
          </h3>
          <span className="text-[11px] text-slate-400">
            Algoritmo inteligente de correspondência ativo
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Linha do Extrato Bancário</th>
                <th className="py-3 px-4">FITID (OFX)</th>
                <th className="py-3 px-4 text-right">Valor Extrato</th>
                <th className="py-3 px-4">Sugestão do Sistema</th>
                <th className="py-3 px-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {statements.map((item) => {
                const isPositive = item.amount > 0;
                const matchedTx = transactions.find((t) => t.id === item.matchedTransactionId);

                // Check rule match
                const matchedRule = reconciliationRules.find((r) =>
                  item.description.toUpperCase().includes(r.keyword.toUpperCase())
                );

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors ${
                      item.isReconciled ? 'opacity-70' : ''
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {new Date(item.date).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                      {item.description}
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">
                      {item.fitId || 'EXTRATO-MANUAL'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-bold">
                      <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                        {formatMoney(item.amount)}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {item.isReconciled ? (
                        <span className="text-[11px] text-emerald-500 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Conciliado com Sucesso</span>
                        </span>
                      ) : matchedTx ? (
                        <div className="flex items-center gap-1.5 text-indigo-500 font-semibold text-[11px]">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Correspondência 100%: {matchedTx.description}</span>
                        </div>
                      ) : matchedRule ? (
                        <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-[11px]">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Regra aplicada: Palavra "{matchedRule.keyword}"</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Sugestão: Criar novo lançamento
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {item.isReconciled ? (
                        <span className="text-[11px] text-slate-400 font-mono">OK</span>
                      ) : (
                        <button
                          onClick={() => handleReconcileAndCreate(item)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm shadow-emerald-600/20"
                        >
                          Conciliar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
