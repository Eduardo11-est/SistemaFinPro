'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '@/lib/store';
import {
  X,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Upload,
  Tag,
  Paperclip,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  Pencil,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { TransactionType, CurrencyType, RecurrenceFrequency } from '@/types/finance';
import {
  BUDGET_PILLARS,
  BudgetPillar,
  projectInstallments,
  resolveTransactionPillar,
} from '@/lib/credit-card';

export function TransactionModal() {
  const {
    isNewTransactionModalOpen,
    setIsNewTransactionModalOpen,
    editingTransaction,
    accounts,
    categories,
    isCategoriesLoading,
    addCategory,
    refreshCategories,
    costCenters,
    currentWorkspace,
    workspaces,
    addTransaction,
    addTransactionsBatch,
    updateTransaction,
    formatMoney,
  } = useFinance();

  const isPersonal = currentWorkspace.type === 'PERSONAL';
  const isEditing = Boolean(editingTransaction);

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState('2026-11-11');
  const [accountId, setAccountId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('BRL');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [tagsStr, setTagsStr] = useState('');
  const [notes, setNotes] = useState('');

  // Parcelamento & Regra 50/30/20
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(2);
  const [budgetPillar, setBudgetPillar] = useState<BudgetPillar>('NEEDS');

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId]
  );
  const isCreditCardSelected = selectedAccount?.type === 'CREDIT_CARD';

  // Motor de Projeção de Parcelas em tempo real
  const installmentPreview = useMemo(() => {
    const parsedAmt = parseFloat(amountStr.replace(/\./g, '').replace(',', '.')) || 0;
    const count = isInstallment ? Math.max(2, totalInstallments) : 1;
    if (parsedAmt <= 0 || (!isInstallment && !isCreditCardSelected)) return [];
    return projectInstallments({
      totalAmount: parsedAmt,
      purchaseDateStr: date,
      totalInstallments: count,
      closingDay: selectedAccount?.closingDay || 28,
      dueDay: selectedAccount?.dueDay || 5,
      isCreditCard: isCreditCardSelected,
    });
  }, [amountStr, date, isInstallment, totalInstallments, isCreditCardSelected, selectedAccount]);

  // Recorrência
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('MONTHLY');

  // Inter-context (Pró-Labore / Distribuição PJ -> PF)
  const [isInterContext, setIsInterContext] = useState(false);
  const [linkedPersonalWorkspaceId, setLinkedPersonalWorkspaceId] = useState('');

  // Anexos
  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  // Atalho de criação rápida de categoria
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Filtra as categorias ativas compatíveis com o tipo selecionado (Receita ou Despesa)
  const filteredCategories = useMemo(() => {
    const targetCategoryType = type === 'INCOME' ? 'INCOME' : 'EXPENSE';
    return categories.filter((c) => c.type === targetCategoryType);
  }, [categories, type]);

  // Ao abrir o modal, se não houver categorias carregadas, solicita atualização da API
  useEffect(() => {
    if (isNewTransactionModalOpen && categories.length === 0 && !isCategoriesLoading) {
      refreshCategories(currentWorkspace.id);
    }
  }, [isNewTransactionModalOpen, categories.length, isCategoriesLoading, refreshCategories, currentWorkspace.id]);

  // Preenche dados ao abrir o modal (Modo Criação vs Modo Edição)
  useEffect(() => {
    if (!isNewTransactionModalOpen) return;

    const personalWs = workspaces.find((w) => w.type === 'PERSONAL');
    if (personalWs) setLinkedPersonalWorkspaceId(personalWs.id);

    if (editingTransaction) {
      setType(editingTransaction.type);
      setDescription(editingTransaction.description);
      setAmountStr(String(editingTransaction.amount).replace('.', ','));
      setDate(
        typeof editingTransaction.date === 'string'
          ? editingTransaction.date.split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setAccountId(editingTransaction.accountId || accounts[0]?.id || '');
      setTargetAccountId(editingTransaction.targetAccountId || '');
      setCategoryId(editingTransaction.categoryId || '');
      setCostCenterId(editingTransaction.costCenterId || '');
      setCurrency(editingTransaction.currency || 'BRL');
      setExchangeRate(editingTransaction.exchangeRate || 1);
      setTagsStr((editingTransaction.tags || []).join(', '));
      setNotes(editingTransaction.notes || '');
      setIsInstallment(Boolean(editingTransaction.isInstallment));
      setTotalInstallments(editingTransaction.totalInstallments || 2);
      setBudgetPillar(resolveTransactionPillar(editingTransaction, categories));
      setIsRecurring(Boolean(editingTransaction.isRecurring));
      setRecurrenceFrequency(editingTransaction.recurrenceFrequency || 'MONTHLY');
      setIsInterContext(Boolean(editingTransaction.tags?.includes('pro-labore')));
    } else {
      setType('EXPENSE');
      setDescription('');
      setAmountStr('');
      try {
        setDate(new Date().toISOString().split('T')[0]);
      } catch {}
      setAccountId(accounts[0]?.id || '');
      setTargetAccountId('');
      const expCats = categories.filter((c) => c.type === 'EXPENSE');
      const defaultCatId = expCats[0]?.id || '';
      setCategoryId(defaultCatId);
      setBudgetPillar(
        resolveTransactionPillar(
          { tags: [], categoryId: defaultCatId, description: '' },
          categories
        )
      );
      setCostCenterId('');
      setCurrency('BRL');
      setExchangeRate(1);
      setTagsStr('');
      setNotes('');
      setIsInstallment(false);
      setTotalInstallments(2);
      setIsRecurring(false);
      setRecurrenceFrequency('MONTHLY');
      setIsInterContext(false);
      setAttachedFile(null);
    }
    setIsCreatingCategory(false);
    setNewCategoryName('');
  }, [isNewTransactionModalOpen, editingTransaction, workspaces]);

  // Garante que a conta e a categoria selecionadas sejam sempre válidas quando as opções mudam
  useEffect(() => {
    if (!isNewTransactionModalOpen) return;

    if (accounts.length > 0 && (!accountId || !accounts.some((a) => a.id === accountId))) {
      setAccountId(accounts[0].id);
    }

    if (type !== 'TRANSFER') {
      const isCurrentCategoryValid = filteredCategories.some((c) => c.id === categoryId);
      if (!isCurrentCategoryValid) {
        setCategoryId(filteredCategories[0]?.id || '');
      }
    }
  }, [isNewTransactionModalOpen, accounts, accountId, filteredCategories, categoryId, type]);

  if (!isNewTransactionModalOpen) return null;

  const handleQuickCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || isSavingCategory) return;

    setIsSavingCategory(true);
    try {
      const catType = type === 'INCOME' ? 'INCOME' : 'EXPENSE';
      const created = await addCategory({
        name: trimmed,
        type: catType,
        icon: 'Tag',
        color: catType === 'INCOME' ? '#10b981' : '#f97316',
        workspaceId: currentWorkspace.id,
      });
      setCategoryId(created.id);
      setNewCategoryName('');
      setIsCreatingCategory(false);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, informe um valor numérico válido.');
      return;
    }

    if (!description.trim()) {
      alert('Informe a descrição do lançamento.');
      return;
    }

    if (!accountId) {
      alert('Selecione uma conta bancária ou carteira.');
      return;
    }

    const pillarTags = new Set(['50-necessidades', '30-desejos', '20-metas']);
    const tags = tagsStr
      .split(',')
      .map((t) => t.trim().toLowerCase().replace('#', ''))
      .filter((t) => Boolean(t) && !pillarTags.has(t));

    if (type === 'EXPENSE') {
      tags.push(BUDGET_PILLARS[budgetPillar].tag);
    }

    if (isInterContext && !tags.includes('pro-labore')) {
      tags.push('pro-labore');
    }

    const baseCleanDesc = description.trim().replace(/\s*\(\d+\/\d+\)$/, '');

    if (isEditing && editingTransaction) {
      updateTransaction(editingTransaction.id, {
        type,
        description: description.trim(),
        amount,
        date,
        currency,
        exchangeRate,
        notes: notes.trim() || undefined,
        isInstallment,
        totalInstallments: isInstallment ? totalInstallments : undefined,
        isRecurring,
        recurrenceFrequency: isRecurring ? recurrenceFrequency : 'NONE',
        tags,
        accountId,
        targetAccountId: type === 'TRANSFER' ? targetAccountId || undefined : undefined,
        categoryId: type !== 'TRANSFER' ? categoryId || undefined : undefined,
        costCenterId: !isPersonal && type !== 'TRANSFER' ? costCenterId || undefined : undefined,
      });
    } else if (isInstallment && totalInstallments > 1) {
      const groupId = `grp-${Date.now()}`;
      const projected = projectInstallments({
        totalAmount: amount,
        purchaseDateStr: date,
        totalInstallments,
        closingDay: selectedAccount?.closingDay || 28,
        dueDay: selectedAccount?.dueDay || 5,
        isCreditCard: isCreditCardSelected,
      });

      const batchPayload = projected.map((item) => ({
        type,
        description: `${baseCleanDesc} (${item.installmentNumber}/${item.totalInstallments})`,
        amount: item.amount,
        date: item.dueDate,
        status: 'COMPLETED' as const,
        paymentMethod: isCreditCardSelected
          ? 'Cartão de Crédito'
          : type === 'EXPENSE'
          ? 'Parcelado'
          : 'PIX',
        currency,
        exchangeRate,
        notes: notes.trim()
          ? `${notes.trim()} | Compra em ${date}`
          : `Compra realizada em ${date}`,
        isInstallment: true,
        installmentNumber: item.installmentNumber,
        totalInstallments: item.totalInstallments,
        installmentGroupId: groupId,
        tags,
        workspaceId: currentWorkspace.id,
        accountId,
        targetAccountId: type === 'TRANSFER' ? targetAccountId || undefined : undefined,
        categoryId: type !== 'TRANSFER' ? categoryId || undefined : undefined,
        costCenterId: !isPersonal && type !== 'TRANSFER' ? costCenterId || undefined : undefined,
        linkedWorkspaceId:
          isInterContext && item.installmentNumber === 1 ? linkedPersonalWorkspaceId : undefined,
      }));

      addTransactionsBatch(batchPayload);
    } else {
      // Compra à vista (1x): se for cartão de crédito, calcula o vencimento da fatura respeitando o fechamento
      const singleProjectedDate =
        isCreditCardSelected && type === 'EXPENSE' && installmentPreview[0]
          ? installmentPreview[0].dueDate
          : date;

      addTransaction({
        type,
        description: description.trim(),
        amount,
        date: singleProjectedDate,
        status: 'COMPLETED',
        paymentMethod: isCreditCardSelected
          ? 'Cartão de Crédito (1x)'
          : type === 'EXPENSE'
          ? 'Transferência / PIX'
          : 'PIX',
        currency,
        exchangeRate,
        notes:
          isCreditCardSelected && singleProjectedDate !== date
            ? `${notes.trim() ? notes.trim() + ' | ' : ''}Compra em ${date}`
            : notes.trim() || undefined,
        isRecurring,
        recurrenceFrequency: isRecurring ? recurrenceFrequency : 'NONE',
        tags,
        workspaceId: currentWorkspace.id,
        accountId,
        targetAccountId: type === 'TRANSFER' ? targetAccountId || undefined : undefined,
        categoryId: type !== 'TRANSFER' ? categoryId || undefined : undefined,
        costCenterId: !isPersonal && type !== 'TRANSFER' ? costCenterId || undefined : undefined,
        linkedWorkspaceId: isInterContext ? linkedPersonalWorkspaceId : undefined,
      });
    }

    setIsNewTransactionModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Editar Transação Financeira' : 'Nova Transação Financeira'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Contexto:{' '}
                <strong className="text-slate-700 dark:text-slate-300">
                  {currentWorkspace.name}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsNewTransactionModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Seletor de Tipo: Despesa, Receita, Transferência */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                type === 'EXPENSE'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Despesa</span>
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                type === 'INCOME'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Receita</span>
            </button>
            <button
              type="button"
              onClick={() => setType('TRANSFER')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                type === 'TRANSFER'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Transferência</span>
            </button>
          </div>

          {/* Valor & Moeda */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Valor ({currency})
              </label>
              <input
                type="text"
                required
                placeholder="0,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Moeda
              </label>
              <select
                value={currency}
                onChange={(e) => {
                  const c = e.target.value as CurrencyType;
                  setCurrency(c);
                  setExchangeRate(c === 'USD' ? 5.65 : c === 'EUR' ? 6.15 : 1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="BRL">BRL (R$)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Descrição
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Assinatura Servidor, Supermercado, Consultoria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Data & Conta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data do Lançamento
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {type === 'TRANSFER' ? 'Conta de Origem' : 'Conta Bancária / Carteira'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatMoney(acc.currentBalance, acc.currency)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conta de Destino (se for transferência) */}
          {type === 'TRANSFER' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Conta de Destino
              </label>
              <select
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione a conta destino...</option>
                {accounts
                  .filter((acc) => acc.id !== accountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Categoria e Centro de Custo */}
          {type !== 'TRANSFER' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={isPersonal ? 'sm:col-span-2' : ''}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Categoria ({type === 'INCOME' ? 'Receita' : 'Despesa'})
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory((prev) => !prev)}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isCreatingCategory ? 'Cancelar' : 'Nova categoria'}</span>
                  </button>
                </div>

                {/* Estado de Carregamento (Loading) */}
                {isCategoriesLoading && filteredCategories.length === 0 ? (
                  <div className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                    <span>Carregando categorias cadastradas...</span>
                  </div>
                ) : filteredCategories.length === 0 ? (
                  /* Mensagem amigável caso nenhuma categoria esteja cadastrada + atalho */
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Nenhuma categoria ativa para este tipo.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCategory(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-semibold text-[11px] hover:bg-amber-600 shrink-0"
                    >
                      + Criar agora
                    </button>
                  </div>
                ) : (
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      const nextCatId = e.target.value;
                      setCategoryId(nextCatId);
                      setBudgetPillar(
                        resolveTransactionPillar(
                          { tags: [], categoryId: nextCatId, description },
                          categories
                        )
                      );
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Atalho inline para criar nova categoria */}
                {isCreatingCategory && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center gap-2 animate-in fade-in">
                    <input
                      type="text"
                      placeholder={`Nome da categoria de ${type === 'INCOME' ? 'receita' : 'despesa'}...`}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickCreateCategory();
                        }
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleQuickCreateCategory}
                      disabled={isSavingCategory || !newCategoryName.trim()}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      {isSavingCategory ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Adicionar</span>
                    </button>
                  </div>
                )}
              </div>

              {!isPersonal && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Centro de Custo / Projeto (PJ)
                  </label>
                  <select
                    value={costCenterId}
                    onChange={(e) => setCostCenterId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Nenhum (Geral)</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.code ? `[${cc.code}] ` : ''}
                        {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Regra 50/30/20: Seletor de Pilar do Orçamento (para Despesas) */}
          {type === 'EXPENSE' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Pilar do Orçamento 50/30/20
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['NEEDS', 'WANTS', 'GOALS'] as BudgetPillar[]).map((pillarKey) => {
                  const meta = BUDGET_PILLARS[pillarKey];
                  const active = budgetPillar === pillarKey;
                  return (
                    <button
                      key={pillarKey}
                      type="button"
                      onClick={() => setBudgetPillar(pillarKey)}
                      className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition-all text-left flex flex-col justify-between ${
                        active
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="truncate font-bold">{meta.shortLabel}</span>
                      <span className="text-[9px] opacity-75 truncate mt-0.5">
                        {pillarKey === 'NEEDS'
                          ? 'Essencial / Fixo'
                          : pillarKey === 'WANTS'
                          ? 'Estilo de Vida'
                          : 'Reserva / Futuro'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* REQUISITO: REGRA DE OURO - Transferência Inter-Contexto (Pró-Labore PJ -> PF) */}
          {!isPersonal && type === 'EXPENSE' && !isEditing && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <input
                  type="checkbox"
                  checked={isInterContext}
                  onChange={(e) => setIsInterContext(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Operação Inter-Contexto (Pró-Labore / Distribuição de Lucros)
                </span>
              </label>
              {isInterContext && (
                <p className="text-[11px] text-indigo-600/90 dark:text-indigo-300/80 pl-5">
                  Cria automaticamente a despesa corporativa e a receita espelhada no perfil
                  pessoal sem contaminação de balanços, respeitando a Regra de Ouro.
                </p>
              )}
            </div>
          )}

          {/* Parcelamento e Recorrência */}
          {!isEditing && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={isInstallment}
                    onChange={(e) => setIsInstallment(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Compra Parcelada (ex: 1/12)?</span>
                </label>

                {isInstallment && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Nº de parcelas:</span>
                    <input
                      type="number"
                      min="2"
                      max="48"
                      value={totalInstallments}
                      onChange={(e) => setTotalInstallments(parseInt(e.target.value) || 2)}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Recorrente?</span>
                </label>

                {isRecurring && (
                  <select
                    value={recurrenceFrequency}
                    onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="YEARLY">Anual</option>
                  </select>
                )}
              </div>

              {/* Preview do Motor de Projeção de Faturas & Parcelas */}
              {type === 'EXPENSE' &&
                installmentPreview.length > 0 &&
                (isInstallment || isCreditCardSelected) && (
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1.5">
                    <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 font-semibold text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-purple-500" />
                        <span>
                          {isCreditCardSelected
                            ? `Motor de Fatura (${selectedAccount?.name} • Fecha dia ${selectedAccount?.closingDay || 28}, Vence dia ${selectedAccount?.dueDay || 5})`
                            : 'Projeção Automática de Parcelas'}
                        </span>
                      </span>
                      <span className="font-mono">
                        {installmentPreview.length}x de{' '}
                        {formatMoney(installmentPreview[0].amount, currency)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-purple-600/90 dark:text-purple-300/80 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        1ª parcela cai na fatura{' '}
                        <strong>{installmentPreview[0].invoiceMonth}</strong> (venc.{' '}
                        {installmentPreview[0].dueDate.split('-').reverse().join('/')})
                      </span>
                      {installmentPreview.length > 1 && (
                        <span>
                          Última ({installmentPreview.length}/{installmentPreview.length}) em{' '}
                          <strong>
                            {installmentPreview[installmentPreview.length - 1].invoiceMonth}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Tags & Anexo de Comprovante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>Tags (separadas por vírgula)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: combustivel, fixo, viagem"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Paperclip className="w-3 h-3 text-slate-400" />
                <span>Anexo de Comprovante / NF</span>
              </label>
              <label className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs text-slate-500 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span className="truncate">{attachedFile ? attachedFile : 'Anexar PDF / Imagem'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setAttachedFile(e.target.files[0].name);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewTransactionModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              {isEditing ? 'Salvar Alterações' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
