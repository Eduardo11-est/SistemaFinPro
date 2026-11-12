'use client';

import React, { useState, useMemo, useCallback, useDeferredValue, useEffect } from 'react';
import { useFinance } from '@/lib/store';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Download,
  Trash2,
  Pencil,
  Plus,
  Wallet,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Check,
  X,
  Calendar,
  Upload,
} from 'lucide-react';
import { Account, Category, CostCenter, CurrencyType, Transaction, TransactionType } from '@/types/finance';
import { projectInstallments } from '@/lib/credit-card';

interface TransactionRowProps {
  tx: Transaction;
  account?: Account;
  targetAcc?: Account;
  category?: Category;
  costCenter?: CostCenter;
  formattedAmount: string;
  formattedDate: string;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

const TransactionRow = React.memo(function TransactionRow({
  tx,
  account,
  targetAcc,
  category,
  costCenter,
  formattedAmount,
  formattedDate,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const isIncome = tx.type === 'INCOME';
  const isTransfer = tx.type === 'TRANSFER';
  const isProLabore = tx.tags?.includes('pro-labore');

  return (
    <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
      {/* Data */}
      <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
        {formattedDate}
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
            {account?.name || 'Origem'} → {targetAcc?.name || 'Destino'}
          </span>
        ) : (
          account?.name || 'Conta'
        )}
      </td>

      {/* Categoria / Centro de Custo */}
      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
        <div>
          <span className="inline-flex items-center gap-1.5">
            {category?.color && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: category.color }}
              />
            )}
            <span>{isTransfer ? 'Transferência' : category?.name || 'Geral'}</span>
          </span>
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
          {formattedAmount}
        </span>
        {tx.currency !== 'BRL' && (
          <span className="text-[9px] text-slate-400 block font-mono">
            Cotação: {tx.exchangeRate}
          </span>
        )}
      </td>

      {/* Ações */}
      <td className="py-3 px-4 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1 md:opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(tx)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            title="Editar Transação"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(tx)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Excluir Transação"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

function formatMonthLabel(monthPrefix: string): string {
  const [year, month] = monthPrefix.split('-');
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const idx = parseInt(month, 10) - 1;
  if (idx >= 0 && idx < 12) {
    return `${monthNames[idx]} ${year}`;
  }
  return monthPrefix;
}

function shiftMonthPrefix(monthPrefix: string, delta: number): string {
  const [y, m] = monthPrefix.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function TransactionListView() {
  const {
    transactions,
    accounts,
    categories,
    costCenters,
    formatMoney,
    convertAmount,
    activeCurrency,
    addTransactionsBatch,
    deleteTransaction,
    setEditingTransaction,
    setIsNewTransactionModalOpen,
    currentWorkspace,
    monthlySalary,
    setMonthlySalary,
    currentMonthPrefix,
    setCurrentMonthPrefix,
    setActiveView,
  } = useFinance();

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Paginação para alta fluidez com grandes volumes de dados
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Estado para edição rápida de salário no card
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [salaryInputStr, setSalaryInputStr] = useState('');

  // Mapas indexados O(1) para evitar buscas lineares (.find) a cada linha
  const accountMap = useMemo(() => {
    const map = new Map<string, Account>();
    for (let i = 0; i < accounts.length; i++) {
      map.set(accounts[i].id, accounts[i]);
    }
    return map;
  }, [accounts]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (let i = 0; i < categories.length; i++) {
      map.set(categories[i].id, categories[i]);
    }
    return map;
  }, [categories]);

  const costCenterMap = useMemo(() => {
    const map = new Map<string, CostCenter>();
    for (let i = 0; i < costCenters.length; i++) {
      map.set(costCenters[i].id, costCenters[i]);
    }
    return map;
  }, [costCenters]);

  // Cálculo de despesas e receitas do mês selecionado em relação ao salário
  const monthlyOverview = useMemo(() => {
    let monthExpenses = 0;
    let monthIncomes = 0;
    let monthExpenseCount = 0;

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (tx.status !== 'CANCELLED' && tx.date.startsWith(currentMonthPrefix)) {
        const converted = convertAmount(tx.amount, tx.currency, activeCurrency);
        if (tx.type === 'EXPENSE') {
          monthExpenses += converted;
          monthExpenseCount++;
        } else if (tx.type === 'INCOME') {
          monthIncomes += converted;
        }
      }
    }

    const effectiveSalary = monthlySalary > 0 ? monthlySalary : 0;
    const remainingSalary = effectiveSalary - monthExpenses;
    const usedPercentage =
      effectiveSalary > 0 ? Math.round((monthExpenses / effectiveSalary) * 1000) / 10 : 0;

    return {
      monthExpenses,
      monthIncomes,
      monthExpenseCount,
      effectiveSalary,
      remainingSalary,
      usedPercentage,
    };
  }, [transactions, currentMonthPrefix, convertAmount, activeCurrency, monthlySalary]);

  // Transações filtradas com busca adiada (deferred) para não travar a digitação
  const filteredTransactions = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

    return transactions.filter((tx) => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (accountFilter !== 'ALL' && tx.accountId !== accountFilter) return false;
      if (categoryFilter !== 'ALL' && tx.categoryId !== categoryFilter) return false;

      if (normalizedSearch) {
        const matchesDesc = tx.description.toLowerCase().includes(normalizedSearch);
        const matchesNotes = tx.notes?.toLowerCase().includes(normalizedSearch);
        const matchesTag = tx.tags?.some((t) => t.toLowerCase().includes(normalizedSearch));
        const catName = tx.categoryId
          ? categoryMap.get(tx.categoryId)?.name.toLowerCase()
          : '';
        const matchesCat = catName ? catName.includes(normalizedSearch) : false;
        if (!matchesDesc && !matchesNotes && !matchesTag && !matchesCat) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, accountFilter, categoryFilter, deferredSearchTerm, categoryMap]);

  // Reseta para a página 1 sempre que um filtro for alterado
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, typeFilter, accountFilter, categoryFilter, pageSize]);

  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, safePage, pageSize]);

  const handleOpenSalaryEditor = useCallback(() => {
    setSalaryInputStr(monthlySalary > 0 ? String(monthlySalary).replace('.', ',') : '');
    setIsEditingSalary(true);
  }, [monthlySalary]);

  const handleSaveSalary = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const parsed = parseFloat(salaryInputStr.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(parsed) && parsed >= 0) {
        setMonthlySalary(parsed);
      }
      setIsEditingSalary(false);
    },
    [salaryInputStr, setMonthlySalary]
  );

  const handleEditTx = useCallback(
    (tx: Transaction) => {
      setEditingTransaction(tx);
    },
    [setEditingTransaction]
  );

  const handleDeleteTx = useCallback(
    (tx: Transaction) => {
      if (confirm(`Deseja excluir o lançamento "${tx.description}"?`)) {
        deleteTransaction(tx.id);
      }
    },
    [deleteTransaction]
  );

  const handleOpenNewModal = useCallback(() => {
    setEditingTransaction(null);
    setIsNewTransactionModalOpen(true);
  }, [setEditingTransaction, setIsNewTransactionModalOpen]);

  // Export CSV
  const handleExportCSV = useCallback(() => {
    const headers = 'ID,Data,Tipo,Descricao,Valor,Moeda,Conta,Categoria,Tags\n';
    const rows = filteredTransactions
      .map((tx) => {
        const acc = accountMap.get(tx.accountId)?.name || '';
        const cat = (tx.categoryId && categoryMap.get(tx.categoryId)?.name) || '';
        return `"${tx.id}","${tx.date}","${tx.type}","${tx.description.replace(/"/g, '""')}","${tx.amount}","${tx.currency}","${acc}","${cat}","${(tx.tags || []).join(';')}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `transacoes_${currentWorkspace.name.toLowerCase().replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredTransactions, accountMap, categoryMap, currentWorkspace.name]);

  // Import CSV (suporta tanto o arquivo de teste .docs/massa_teste_transacoes.csv quanto o CSV exportado)
  const handleImportCSV = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = String(event.target?.result || '');
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length < 2) return;

        const headerCols = lines[0]
          .split(',')
          .map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

        const idxDate = headerCols.findIndex((h) => h.includes('data'));
        const idxType = headerCols.findIndex((h) => h.includes('tipo'));
        const idxDesc = headerCols.findIndex((h) => h.includes('descri'));
        const idxVal = headerCols.findIndex((h) => h.includes('valor'));
        const idxCurr = headerCols.findIndex((h) => h.includes('moeda'));
        const idxAcc = headerCols.findIndex((h) => h.includes('conta'));
        const idxCat = headerCols.findIndex((h) => h.includes('categoria'));
        const idxInst = headerCols.findIndex((h) => h.includes('parcela'));
        const idxTags = headerCols.findIndex((h) => h.includes('tag'));

        const defaultBankAcc =
          accounts.find((a) => a.type !== 'CREDIT_CARD') || accounts[0];
        const defaultCardAcc =
          accounts.find((a) => a.type === 'CREDIT_CARD') || defaultBankAcc;

        const batchToCreate: Omit<Transaction, 'id'>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i]
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map((c) => c.replace(/^"|"$/g, '').trim());

          const dateVal = cols[idxDate] || new Date().toISOString().split('T')[0];
          const rawType = (cols[idxType] || 'EXPENSE').toUpperCase();
          const txType: TransactionType =
            rawType === 'INCOME' || rawType === 'TRANSFER' ? rawType : 'EXPENSE';
          const descVal = cols[idxDesc] || 'Lançamento Importado';
          const amountVal = parseFloat((cols[idxVal] || '0').replace(',', '.'));
          if (!amountVal || amountVal <= 0) continue;

          const currVal = ((cols[idxCurr] || 'BRL').toUpperCase() as CurrencyType) || 'BRL';
          const accName = (cols[idxAcc] || '').toLowerCase();
          const catName = (cols[idxCat] || '').toLowerCase();
          const installmentsCount = Math.max(
            1,
            parseInt(cols[idxInst] || '1', 10) || 1
          );
          const rawTags = cols[idxTags] || '';
          const tags = rawTags
            .split(/[;,]/)
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);

          // Resolve conta pelo nome ou pelo tipo (Cartão vs Conta Corrente)
          const matchedAcc =
            accounts.find((a) => a.name.toLowerCase() === accName) ||
            (accName.includes('cart') ? defaultCardAcc : defaultBankAcc);

          if (!matchedAcc) continue;

          const matchedCat = categories.find(
            (c) =>
              c.name.toLowerCase() === catName ||
              c.name.toLowerCase().includes(catName)
          );

          const isCard = matchedAcc.type === 'CREDIT_CARD';

          if (installmentsCount > 1 || (isCard && txType === 'EXPENSE')) {
            const projected = projectInstallments({
              totalAmount: amountVal,
              purchaseDateStr: dateVal,
              totalInstallments: installmentsCount,
              closingDay: matchedAcc.closingDay || 28,
              dueDay: matchedAcc.dueDay || 5,
              isCreditCard: isCard,
            });
            const grpId = `grp-csv-${Date.now()}-${i}`;
            projected.forEach((p) => {
              batchToCreate.push({
                type: txType,
                description:
                  installmentsCount > 1
                    ? `${descVal} (${p.installmentNumber}/${p.totalInstallments})`
                    : descVal,
                amount: p.amount,
                date: p.dueDate,
                status: 'COMPLETED',
                paymentMethod: isCard ? 'Cartão de Crédito' : 'Importação CSV',
                currency: currVal,
                exchangeRate: 1,
                isInstallment: installmentsCount > 1,
                installmentNumber: installmentsCount > 1 ? p.installmentNumber : undefined,
                totalInstallments: installmentsCount > 1 ? p.totalInstallments : undefined,
                installmentGroupId: installmentsCount > 1 ? grpId : undefined,
                tags,
                workspaceId: currentWorkspace.id,
                accountId: matchedAcc.id,
                categoryId: matchedCat?.id,
              });
            });
          } else {
            batchToCreate.push({
              type: txType,
              description: descVal,
              amount: amountVal,
              date: dateVal,
              status: 'COMPLETED',
              paymentMethod: 'Importação CSV',
              currency: currVal,
              exchangeRate: 1,
              tags,
              workspaceId: currentWorkspace.id,
              accountId: matchedAcc.id,
              categoryId: matchedCat?.id,
            });
          }
        }

        if (batchToCreate.length > 0) {
          addTransactionsBatch(batchToCreate);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [accounts, categories, currentWorkspace.id, addTransactionsBatch]
  );

  // Status de cores da barra de progresso do salário
  const isExceeded = monthlyOverview.usedPercentage >= 100;
  const isCritical = monthlyOverview.usedPercentage >= 90 && !isExceeded;
  const isWarning = monthlyOverview.usedPercentage >= 70 && monthlyOverview.usedPercentage < 90;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* CARD INDICADOR DE GASTOS DO MÊS COM BASE NO SALÁRIO */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isExceeded || isCritical
                  ? 'bg-rose-500/10 text-rose-500'
                  : isWarning
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-emerald-500/10 text-emerald-500'
              }`}
            >
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                   Comprometimento do Salário / Renda no Mês
                </h2>
                {monthlyOverview.effectiveSalary > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                      isExceeded
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : isCritical
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : isWarning
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isExceeded ? (
                      <>
                        <AlertOctagon className="w-3 h-3" />
                        <span>Salário Excedido</span>
                      </>
                    ) : isCritical ? (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        <span>Limite Crítico (90%+)</span>
                      </>
                    ) : isWarning ? (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        <span>Atenção (70%+)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Dentro do Planejado</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhe o somatório das despesas do mês em relação à sua renda mensal configurada
              </p>
            </div>
          </div>

          {/* Seletor de Mês & Configuração Rápida de Salário */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Navegador de Mês */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-xs">
              <button
                type="button"
                onClick={() => setCurrentMonthPrefix(shiftMonthPrefix(currentMonthPrefix, -1))}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1.5 px-2 font-semibold text-slate-800 dark:text-slate-200 min-w-[120px] justify-center">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>{formatMonthLabel(currentMonthPrefix)}</span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentMonthPrefix(shiftMonthPrefix(currentMonthPrefix, 1))}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!isEditingSalary ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenSalaryEditor}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>
                    {monthlyOverview.effectiveSalary > 0
                      ? 'Editar Salário'
                      : 'Definir Salário Mensal'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('settings')}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title="Configurações de Renda e Workspace"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveSalary} className="flex items-center gap-1.5 animate-in fade-in">
                <input
                  type="text"
                  autoFocus
                  placeholder="Salário (ex: 8500,00)"
                  value={salaryInputStr}
                  onChange={(e) => setSalaryInputStr(e.target.value)}
                  className="w-36 px-3 py-1.5 rounded-xl border border-emerald-500 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  title="Salvar Salário"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingSalary(false)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700"
                  title="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Métricas: Salário, Total Gasto no Mês, Saldo Restante e % Utilizada */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Salário / Renda Definida */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">
                Salário / Renda Base Mensal
              </span>
              {monthlyOverview.effectiveSalary > 0 ? (
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {formatMoney(monthlyOverview.effectiveSalary)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenSalaryEditor}
                  className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>+ Clique para informar seu salário</span>
                </button>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Receitas no Mês</span>
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {formatMoney(monthlyOverview.monthIncomes)}
              </span>
            </div>
          </div>

          {/* Card 2: Total Gasto no Mês */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">
                Total Gasto em {formatMonthLabel(currentMonthPrefix)}
              </span>
              <span className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400">
                {formatMoney(monthlyOverview.monthExpenses)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Despesas</span>
              <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 justify-end">
                <TrendingDown className="w-3 h-3 text-rose-500" />
                {monthlyOverview.monthExpenseCount} lanç.
              </span>
            </div>
          </div>

          {/* Card 3: Saldo Restante do Salário & % */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">
                {monthlyOverview.effectiveSalary > 0
                  ? monthlyOverview.remainingSalary >= 0
                    ? 'Saldo Restante do Salário'
                    : 'Valor Acima do Salário'
                  : 'Saldo Líquido (Receitas - Despesas)'}
              </span>
              <span
                className={`text-base sm:text-lg font-bold ${
                  monthlyOverview.effectiveSalary > 0
                    ? monthlyOverview.remainingSalary >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                    : monthlyOverview.monthIncomes - monthlyOverview.monthExpenses >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {monthlyOverview.effectiveSalary > 0
                  ? formatMoney(monthlyOverview.remainingSalary)
                  : formatMoney(monthlyOverview.monthIncomes - monthlyOverview.monthExpenses)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">% Utilizada</span>
              <span
                className={`text-sm font-mono font-bold ${
                  isExceeded || isCritical
                    ? 'text-rose-600 dark:text-rose-400'
                    : isWarning
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {monthlyOverview.effectiveSalary > 0
                  ? `${monthlyOverview.usedPercentage.toFixed(1)}%`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isExceeded || isCritical
                  ? 'bg-gradient-to-r from-amber-500 to-rose-600'
                  : isWarning
                  ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{
                width:
                  monthlyOverview.effectiveSalary > 0
                    ? `${Math.min(100, Math.max(0, monthlyOverview.usedPercentage))}%`
                    : '0%',
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>
              {monthlyOverview.effectiveSalary > 0
                ? `${monthlyOverview.usedPercentage.toFixed(1)}% do salário comprometido com despesas no mês`
                : 'Configure seu salário mensal para acompanhar a barra de comprometimento de renda'}
            </span>
            {monthlyOverview.effectiveSalary > 0 && (
              <span>
                {monthlyOverview.remainingSalary >= 0
                  ? `${(100 - Math.min(100, monthlyOverview.usedPercentage)).toFixed(1)}% livre (${formatMoney(monthlyOverview.remainingSalary)})`
                  : `Excedido em ${formatMoney(Math.abs(monthlyOverview.remainingSalary))}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Ações & Filtros */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, categoria, nota ou tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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

          {/* Categoria */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none max-w-[180px]"
          >
            <option value="ALL">Todas as Categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
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

          {/* Botão Importar CSV */}
          <label
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Importar Lançamentos de um arquivo CSV"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Importar CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>

          {/* Botão Exportar CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            title="Exportar Lançamentos Filtrados em CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {/* Botão Novo Lançamento */}
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo</span>
          </button>
        </div>
      </div>

      {/* Tabela de Lançamentos com Paginação Otimizada */}
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
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    account={accountMap.get(tx.accountId)}
                    targetAcc={tx.targetAccountId ? accountMap.get(tx.targetAccountId) : undefined}
                    category={tx.categoryId ? categoryMap.get(tx.categoryId) : undefined}
                    costCenter={tx.costCenterId ? costCenterMap.get(tx.costCenterId) : undefined}
                    formattedAmount={formatMoney(tx.amount, tx.currency)}
                    formattedDate={formatDateBR(tx.date)}
                    onEdit={handleEditTx}
                    onDelete={handleDeleteTx}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Paginação & Controle de Volume */}
        {totalItems > 0 && (
          <div className="px-4 py-3 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                Exibindo{' '}
                <strong className="text-slate-700 dark:text-slate-300">
                  {(safePage - 1) * pageSize + 1}
                </strong>{' '}
                a{' '}
                <strong className="text-slate-700 dark:text-slate-300">
                  {Math.min(safePage * pageSize, totalItems)}
                </strong>{' '}
                de <strong className="text-slate-700 dark:text-slate-300">{totalItems}</strong>{' '}
                lançamentos
              </span>

              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300"
              >
                <option value={15}>15 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <span className="px-2.5 py-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                Página {safePage} de {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
              >
                <span>Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
