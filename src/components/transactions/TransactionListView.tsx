'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/lib/store';
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Download,
  Trash2,
  Calendar,
  Tag,
  Plus,
  Layers,
  Sparkles
} from 'lucide-react';
import { TransactionType } from '@/types/finance';

export function TransactionListView() {
  const {
    transactions,
    accounts,
    categories,
    costCenters,
    formatMoney,
    deleteTransaction,
    setIsNewTransactionModalOpen,
    currentWorkspace
  } = useFinance();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;

      // Account
      if (accountFilter !== 'ALL' && tx.accountId !== accountFilter) return false;

      // Category
      if (categoryFilter !== 'ALL' && tx.categoryId !== categoryFilter) return false;

      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(term);
        const matchesNotes = tx.notes?.toLowerCase().includes(term);
        const matchesTag = tx.tags.some((t) => t.toLowerCase().includes(term));
        if (!matchesDesc && !matchesNotes && !matchesTag) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, accountFilter, categoryFilter, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'ID,Data,Tipo,Descricao,Valor,Moeda,Conta,Categoria,Tags\n';
    const rows = filteredTransactions.map((tx) => {
      const acc = accounts.find((a) => a.id === tx.accountId)?.name || '';
      const cat = categories.find((c) => c.id === tx.categoryId)?.name || '';
      return `"${tx.id}","${tx.date}","${tx.type}","${tx.description.replace(/"/g, '""')}","${tx.amount}","${tx.currency}","${acc}","${cat}","${tx.tags.join(';')}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_${currentWorkspace.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Barra de Ações & Filtros */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, nota ou tag (#pro-labore, etc)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filtros em Linha */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tipo */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | TransactionType)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="INCOME">Receitas (+)</option>
            <option value="EXPENSE">Despesas (-)</option>
            <option value="TRANSFER">Transferências (↔)</option>
          </select>

          {/* Conta */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">Todas as Contas</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          {/* Botão Exportar CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            title="Exportar Lançamentos Filtrados em CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {/* Botão Novo Lançamento */}
          <button
            onClick={() => setIsNewTransactionModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo</span>
          </button>
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Descrição & Detalhes</th>
                <th className="py-3 px-4">Conta</th>
                <th className="py-3 px-4">Categoria / Centro</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'INCOME';
                  const isTransfer = tx.type === 'TRANSFER';
                  const account = accounts.find((a) => a.id === tx.accountId);
                  const targetAcc = accounts.find((a) => a.id === tx.targetAccountId);
                  const category = categories.find((c) => c.id === tx.categoryId);
                  const costCenter = costCenters.find((cc) => cc.id === tx.costCenterId);
                  const isProLabore = tx.tags?.includes('pro-labore');

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors group"
                    >
                      {/* Data */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(tx.date).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Descrição & Tags */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              isTransfer
                                ? 'bg-indigo-500/10 text-indigo-500'
                                : isIncome
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-rose-500/10 text-rose-500'
                            }`}
                          >
                            {isTransfer ? (
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            ) : isIncome ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {tx.description}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {isProLabore && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                  Pró-Labore Inter-Contexto
                                </span>
                              )}
                              {tx.isInstallment && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  Parcela {tx.installmentNumber}/{tx.totalInstallments}
                                </span>
                              )}
                              {tx.tags?.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Conta */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {isTransfer ? (
                          <span className="text-[11px]">
                            {account?.name} → {targetAcc?.name || 'Destino'}
                          </span>
                        ) : (
                          account?.name || 'Conta'
                        )}
                      </td>

                      {/* Categoria / Centro de Custo */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div>
                          <span>{category?.name || 'Geral'}</span>
                          {costCenter && (
                            <span className="block text-[10px] text-indigo-500 dark:text-indigo-400 font-mono">
                              {costCenter.code || ''} {costCenter.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Valor */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold text-xs sm:text-sm ${
                            isTransfer
                              ? 'text-indigo-500'
                              : isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isIncome ? '+' : isTransfer ? '' : '-'}
                          {formatMoney(tx.amount, tx.currency)}
                        </span>
                        {tx.currency !== 'BRL' && (
                          <span className="text-[9px] text-slate-400 block font-mono">
                            Cotação: {tx.exchangeRate}
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Deseja excluir o lançamento "${tx.description}"?`)) {
                              deleteTransaction(tx.id);
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
                          title="Excluir Transação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
