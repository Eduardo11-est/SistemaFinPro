'use client';

import React, { useState, useEffect } from 'react';
import { useFinance } from '@/lib/store';
import {
  X,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Upload,
  Calendar,
  Tag,
  Paperclip,
  Building,
  User,
  Sparkles,
  Layers
} from 'lucide-react';
import { TransactionType, CurrencyType, RecurrenceFrequency } from '@/types/finance';

export function TransactionModal() {
  const {
    isNewTransactionModalOpen,
    setIsNewTransactionModalOpen,
    accounts,
    categories,
    costCenters,
    currentWorkspace,
    workspaces,
    addTransaction,
    formatMoney,
  } = useFinance();

  const isPersonal = currentWorkspace.type === 'PERSONAL';

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState('2026-10-12');
  const [accountId, setAccountId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('BRL');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [tagsStr, setTagsStr] = useState('');

  // Parcelamento
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(2);

  // Recorrência
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('MONTHLY');

  // Inter-context (Pró-Labore / Distribuição PJ -> PF)
  const [isInterContext, setIsInterContext] = useState(false);
  const [linkedPersonalWorkspaceId, setLinkedPersonalWorkspaceId] = useState('');

  // Anexos
  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  // Set default account and category
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
    if (categories.length > 0 && !categoryId) {
      const filtered = categories.filter((c) => (type === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'));
      if (filtered.length > 0) setCategoryId(filtered[0].id);
    }
    const personalWs = workspaces.find((w) => w.type === 'PERSONAL');
    if (personalWs) setLinkedPersonalWorkspaceId(personalWs.id);
    try {
      setDate(new Date().toISOString().split('T')[0]);
    } catch {}
  }, [accounts, categories, type, accountId, categoryId, workspaces]);

  if (!isNewTransactionModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, informe um valor numérico válido.');
      return;
    }

    if (!description.trim()) {
      alert('Informe a descrição do lançamento.');
      return;
    }

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim().toLowerCase().replace('#', ''))
      .filter(Boolean);

    if (isInterContext) {
      tags.push('pro-labore');
    }

    if (isInstallment && totalInstallments > 1) {
      // Create first installment
      addTransaction({
        type,
        description: `${description} (1/${totalInstallments})`,
        amount: Math.round((amount / totalInstallments) * 100) / 100,
        date,
        status: 'COMPLETED',
        paymentMethod: type === 'EXPENSE' ? 'Cartão / Débito' : 'PIX',
        currency,
        exchangeRate,
        isInstallment: true,
        installmentNumber: 1,
        totalInstallments,
        tags,
        workspaceId: currentWorkspace.id,
        accountId,
        targetAccountId: type === 'TRANSFER' ? targetAccountId : undefined,
        categoryId: categoryId || undefined,
        costCenterId: costCenterId || undefined,
        linkedWorkspaceId: isInterContext ? linkedPersonalWorkspaceId : undefined,
      });
    } else {
      addTransaction({
        type,
        description,
        amount,
        date,
        status: 'COMPLETED',
        paymentMethod: type === 'EXPENSE' ? 'Transferência / PIX' : 'PIX',
        currency,
        exchangeRate,
        isRecurring,
        recurrenceFrequency: isRecurring ? recurrenceFrequency : 'NONE',
        tags,
        workspaceId: currentWorkspace.id,
        accountId,
        targetAccountId: type === 'TRANSFER' ? targetAccountId : undefined,
        categoryId: categoryId || undefined,
        costCenterId: costCenterId || undefined,
        linkedWorkspaceId: isInterContext ? linkedPersonalWorkspaceId : undefined,
      });
    }

    // Reset and close
    setDescription('');
    setAmountStr('');
    setTagsStr('');
    setIsInstallment(false);
    setIsRecurring(false);
    setIsInterContext(false);
    setAttachedFile(null);
    setIsNewTransactionModalOpen(false);
  };

  const filteredCategories = categories.filter((c) =>
    type === 'INCOME' ? c.type === 'INCOME' : c.type === 'EXPENSE'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Nova Transação Financeira
              </h2>
              <p className="text-[11px] text-slate-500">
                Contexto: <strong className="text-slate-700 dark:text-slate-300">{currentWorkspace.name}</strong>
              </p>
            </div>
          </div>
          <button
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
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
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
                {accounts.map((acc) => (
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
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
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
                        {cc.code ? `[${cc.code}] ` : ''}{cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* REQUISITO: REGRA DE OURO - Transferência Inter-Contexto (Pró-Labore PJ -> PF) */}
          {!isPersonal && type === 'EXPENSE' && (
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
                  Cria automaticamente a despesa corporativa e a receita espelhada no perfil pessoal de{' '}
                  <strong>Rogério</strong> sem contaminação de balanços, respeitando a Regra de Ouro.
                </p>
              )}
            </div>
          )}

          {/* Parcelamento e Recorrência */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Parcelado?</span>
            </label>

            {isInstallment && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Total de parcelas:</span>
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
                <span>{attachedFile ? attachedFile : 'Anexar PDF / Imagem'}</span>
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
              Salvar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
