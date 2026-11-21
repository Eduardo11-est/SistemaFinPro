'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/lib/store';
import {
  Wallet,
  CreditCard,
  Building,
  PiggyBank,
  TrendingUp,
  Banknote,
  Plus,
  X,
  Globe,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Receipt,
  Pencil,
  Trash2,
  Sparkles,
  ArrowLeftRight,
  Repeat,
  ShieldAlert,
} from 'lucide-react';
import { Account, AccountType, CurrencyType, Transaction } from '@/types/finance';
import {
  BUDGET_PILLARS,
  buildMonthlyCardInvoice,
  calculateCardLimitSummary,
  resolveTransactionPillar,
} from '@/lib/credit-card';
import { getRecurrenceLabel } from '@/lib/recurrence';

const ACCOUNT_COLORS = [
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#a855f7', label: 'Roxo' },
  { hex: '#f97316', label: 'Laranja' },
  { hex: '#10b981', label: 'Esmeralda' },
  { hex: '#1e293b', label: 'Black' },
  { hex: '#ef4444', label: 'Vermelho' },
  { hex: '#eab308', label: 'Dourado' },
  { hex: '#06b6d4', label: 'Ciano' },
];

function parseBRLNumber(raw: string): number {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) return 0;
  if (trimmed.includes(',')) {
    return parseFloat(trimmed.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (/^-?\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    return parseFloat(trimmed.replace(/\./g, '')) || 0;
  }
  return parseFloat(trimmed) || 0;
}

function formatInputNumberBR(val: number): string {
  if (!Number.isFinite(val)) return '0';
  return String(val).replace('.', ',');
}

function shiftMonth(monthPrefix: string, delta: number): string {
  const [y, m] = monthPrefix.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthShort(monthPrefix: string): string {
  const [y, m] = monthPrefix.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const idx = parseInt(m, 10) - 1;
  return `${names[idx] || m}/${y}`;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.split('T')[0].split('-').reverse().join('/');
}

function getAccountTypeLabel(accType: AccountType): string {
  switch (accType) {
    case 'CHECKING':
      return 'Conta Corrente';
    case 'CREDIT_CARD':
      return 'Cartão de Crédito';
    case 'SAVINGS':
      return 'Poupança';
    case 'INVESTMENT':
      return 'Investimentos';
    case 'GATEWAY':
      return 'Gateway de Pagamento';
    case 'CASH':
      return 'Carteira Física';
    default:
      return accType;
  }
}

export function AccountsView() {
  const {
    accounts,
    transactions,
    categories,
    formatMoney,
    convertAmount,
    activeCurrency,
    addAccount,
    updateAccount,
    deleteAccount,
    currentWorkspace,
    currentMonthPrefix,
    setCurrentMonthPrefix,
    payCreditCardInvoice,
    openNewTransactionModal,
    setEditingTransaction,
    updateTransaction,
    deleteTransaction,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'ALL_ACCOUNTS' | 'CREDIT_CARD_INVOICES'>('ALL_ACCOUNTS');
  const [selectedCardId, setSelectedCardId] = useState<string>('ALL');
  const [invoiceMonth, setInvoiceMonth] = useState<string>(currentMonthPrefix || '2026-11');

  // Modal de Nova / Edição de Conta ou Cartão
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [bankName, setBankName] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('BRL');
  const [initialBalance, setInitialBalance] = useState('0');
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState('28');
  const [dueDay, setDueDay] = useState('5');
  const [color, setColor] = useState('#3b82f6');

  // Modal de Confirmação Segura de Exclusão
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);

  // Modal de Pagamento de Fatura
  const [payingCardId, setPayingCardId] = useState<string | null>(null);
  const [sourceBankAccountId, setSourceBankAccountId] = useState<string>('');

  const creditCards = useMemo(
    () => accounts.filter((a) => a.type === 'CREDIT_CARD'),
    [accounts]
  );

  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.type !== 'CREDIT_CARD'),
    [accounts]
  );

  // Contagem de transações vinculadas por conta (para alerta de exclusão segura)
  const txCountByAccount = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < transactions.length; i++) {
      const accId = transactions[i].accountId;
      map.set(accId, (map.get(accId) || 0) + 1);
    }
    return map;
  }, [transactions]);

  // Mapa de limites dinâmicos por cartão (considerando faturas abertas + parcelas futuras)
  const cardLimitMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateCardLimitSummary>>();
    for (let i = 0; i < creditCards.length; i++) {
      const card = creditCards[i];
      map.set(card.id, calculateCardLimitSummary(card, transactions, currentMonthPrefix));
    }
    return map;
  }, [creditCards, transactions, currentMonthPrefix]);

  // Resumo consolidado do topo (Contas Bancárias vs. Faturas & Limites de Cartão)
  const accountsSummary = useMemo(() => {
    let totalBankBalance = 0;
    for (let i = 0; i < bankAccounts.length; i++) {
      const acc = bankAccounts[i];
      totalBankBalance += convertAmount(acc.currentBalance, acc.currency, activeCurrency);
    }

    let totalOpenInvoicesMonth = 0;
    let totalAvailableCreditLimit = 0;
    let totalCreditLimit = 0;

    for (let i = 0; i < creditCards.length; i++) {
      const card = creditCards[i];
      const inv = buildMonthlyCardInvoice({
        monthPrefix: currentMonthPrefix,
        cards: [card],
        selectedCardId: card.id,
        transactions,
        categories,
      });
      totalOpenInvoicesMonth += convertAmount(inv.openAmount, card.currency, activeCurrency);

      const summary = cardLimitMap.get(card.id);
      if (summary) {
        totalAvailableCreditLimit += convertAmount(
          summary.availableLimit,
          card.currency,
          activeCurrency
        );
        totalCreditLimit += convertAmount(summary.creditLimit, card.currency, activeCurrency);
      }
    }

    return {
      totalBankBalance,
      totalOpenInvoicesMonth,
      totalAvailableCreditLimit,
      totalCreditLimit,
    };
  }, [
    bankAccounts,
    creditCards,
    cardLimitMap,
    transactions,
    categories,
    currentMonthPrefix,
    convertAmount,
    activeCurrency,
  ]);

  // Lista de 6 meses na linha do tempo de faturas (1 anterior, atual, +4 futuros)
  const timelineMonths = useMemo(() => {
    return [-1, 0, 1, 2, 3, 4].map((offset) => shiftMonth(invoiceMonth, offset));
  }, [invoiceMonth]);

  // Fatura consolidada do mês selecionado
  const currentInvoice = useMemo(() => {
    return buildMonthlyCardInvoice({
      monthPrefix: invoiceMonth,
      cards: creditCards,
      selectedCardId,
      transactions,
      categories,
    });
  }, [invoiceMonth, creditCards, selectedCardId, transactions, categories]);

  const openCreateModal = (defaultType: AccountType = 'CHECKING') => {
    setEditingAccount(null);
    setName('');
    setType(defaultType);
    setBankName('');
    setCurrency('BRL');
    setInitialBalance('0');
    setCreditLimit(defaultType === 'CREDIT_CARD' ? '5000' : '');
    setClosingDay('28');
    setDueDay('5');
    setColor(
      defaultType === 'CREDIT_CARD'
        ? '#a855f7'
        : defaultType === 'INVESTMENT'
        ? '#eab308'
        : '#3b82f6'
    );
    setIsModalOpen(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setBankName(acc.bankName || '');
    setCurrency(acc.currency);
    setInitialBalance(formatInputNumberBR(acc.currentBalance));
    setCreditLimit(acc.creditLimit ? formatInputNumberBR(acc.creditLimit) : '');
    setClosingDay(acc.closingDay ? String(acc.closingDay) : '28');
    setDueDay(acc.dueDay ? String(acc.dueDay) : '5');
    setColor(acc.color || (acc.type === 'CREDIT_CARD' ? '#a855f7' : '#3b82f6'));
    setIsModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseBRLNumber(initialBalance);
    const limit = creditLimit.trim() ? Math.max(0, parseBRLNumber(creditLimit)) : undefined;
    const cDay = closingDay ? Math.min(31, Math.max(1, parseInt(closingDay, 10))) : undefined;
    const dDay = dueDay ? Math.min(31, Math.max(1, parseInt(dueDay, 10))) : undefined;

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name: name.trim(),
        type,
        bankName: bankName.trim() || undefined,
        currency,
        currentBalance: balance,
        creditLimit: type === 'CREDIT_CARD' ? limit : undefined,
        closingDay: type === 'CREDIT_CARD' ? cDay : undefined,
        dueDay: type === 'CREDIT_CARD' ? dDay : undefined,
        color,
      });
    } else {
      addAccount({
        name: name.trim(),
        type,
        bankName: bankName.trim() || undefined,
        currency,
        initialBalance: balance,
        currentBalance: balance,
        creditLimit: type === 'CREDIT_CARD' ? limit : undefined,
        closingDay: type === 'CREDIT_CARD' ? cDay : undefined,
        dueDay: type === 'CREDIT_CARD' ? dDay : undefined,
        workspaceId: currentWorkspace.id,
        color,
      });
    }

    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleConfirmDeleteAccount = () => {
    if (!deletingAccount) return;
    if (selectedCardId === deletingAccount.id) {
      setSelectedCardId('ALL');
    }
    deleteAccount(deletingAccount.id);
    setDeletingAccount(null);
    if (editingAccount?.id === deletingAccount.id) {
      setIsModalOpen(false);
      setEditingAccount(null);
    }
  };

  const handleDeleteInvoiceItem = (item: Transaction) => {
    if (item.isRecurringProjection && item.recurringSourceId) {
      const sourceTx = transactions.find((t) => t.id === item.recurringSourceId);
      if (sourceTx) {
        if (
          confirm(
            `"${item.description}" é uma projeção recorrente do lançamento de ${formatDateBR(sourceTx.date)}.\n\nDeseja encerrar a recorrência (mantendo o lançamento original, mas removendo das faturas futuras)?`
          )
        ) {
          updateTransaction(sourceTx.id, {
            isRecurring: false,
            recurrenceFrequency: 'NONE',
          });
        }
        return;
      }
    }

    if (confirm(`Excluir "${item.description}" desta fatura?`)) {
      deleteTransaction(item.id);
    }
  };

  const handleConfirmPayInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCardId) return;
    const sourceId = sourceBankAccountId || bankAccounts[0]?.id || '';
    if (payingCardId === 'ALL') {
      creditCards.forEach((c) => payCreditCardInvoice(c.id, invoiceMonth, sourceId));
    } else {
      payCreditCardInvoice(payingCardId, invoiceMonth, sourceId);
    }
    setPayingCardId(null);
  };

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case 'CHECKING':
        return Building;
      case 'CREDIT_CARD':
        return CreditCard;
      case 'SAVINGS':
        return PiggyBank;
      case 'INVESTMENT':
        return TrendingUp;
      case 'CASH':
        return Banknote;
      case 'GATEWAY':
        return Globe;
      default:
        return Wallet;
    }
  };

  const renderStatusBadge = (status: 'PAID' | 'OVERDUE' | 'CLOSED' | 'OPEN') => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Paga / Realizada
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3" />
            Em Atraso
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            Fatura Fechada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <Calendar className="w-3 h-3" />
            Prevista / Em Aberto
          </span>
        );
    }
  };

  const deletingLinkedCount = deletingAccount
    ? txCountByAccount.get(deletingAccount.id) || 0
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Seletor de Visão */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500" />
            <span>Gestão Multicontas & Módulo de Cartão de Crédito</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Controle de saldos bancários, limite dinâmico disponível, projeção de parcelas e faturas mês a mês
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Abas de Navegação Rápida */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('ALL_ACCOUNTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ALL_ACCOUNTS'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Contas & Limites ({accounts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CREDIT_CARD_INVOICES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'CREDIT_CARD_INVOICES'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Faturas Mês a Mês ({creditCards.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateModal('CREDIT_CARD')}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all active:scale-95"
          >
            <CreditCard className="w-4 h-4" />
            <span>Novo Cartão</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateModal('CHECKING')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Conta</span>
          </button>
        </div>
      </div>

      {/* ABA 1: CONTAS BANCÁRIAS E CARTÕES SEPARADOS + RESUMO CONSOLIDADO */}
      {activeTab === 'ALL_ACCOUNTS' && (
        <div className="space-y-6">
          {/* Resumo Consolidado no Topo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block">
                  Saldo Total em Contas ({bankAccounts.length})
                </span>
                <span
                  className={`text-lg sm:text-xl font-bold ${
                    accountsSummary.totalBankBalance < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {formatMoney(accountsSummary.totalBankBalance)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Contas bancárias, carteira e investimentos
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block">
                  Faturas em Aberto ({formatMonthShort(currentMonthPrefix)})
                </span>
                <span className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400">
                  {formatMoney(accountsSummary.totalOpenInvoicesMonth)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {creditCards.length}{' '}
                  {creditCards.length === 1 ? 'cartão cadastrado' : 'cartões cadastrados'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block">
                  Limite Total Disponível
                </span>
                <span className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                  {formatMoney(accountsSummary.totalAvailableCreditLimit)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  De {formatMoney(accountsSummary.totalCreditLimit)} de limite total
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* SEÇÃO 1: CONTAS BANCÁRIAS & CARTEIRAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-500" />
                <span>Contas Bancárias & Carteiras ({bankAccounts.length})</span>
              </h3>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nenhuma conta bancária ou carteira cadastrada neste workspace.
                </p>
                <button
                  type="button"
                  onClick={() => openCreateModal('CHECKING')}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Primeira Conta</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bankAccounts.map((acc) => {
                  const Icon = getAccountIcon(acc.type);
                  const isNegative = acc.currentBalance < 0;
                  const txCount = txCountByAccount.get(acc.id) || 0;

                  return (
                    <div
                      key={acc.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                              style={{ backgroundColor: acc.color || '#3b82f6' }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
                                {acc.name}
                              </h3>
                              <span className="text-[10px] text-slate-400 font-mono block truncate">
                                {acc.bankName || getAccountTypeLabel(acc.type)}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                            {acc.currency}
                          </span>
                        </div>

                        <div className="my-3">
                          <span className="text-[11px] text-slate-400 block mb-0.5">
                            Saldo Disponível
                          </span>
                          <div
                            className={`text-xl sm:text-2xl font-bold tracking-tight ${
                              isNegative
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {formatMoney(acc.currentBalance, acc.currency)}
                          </div>
                          {acc.currency !== activeCurrency && (
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              ≈{' '}
                              {formatMoney(
                                convertAmount(acc.currentBalance, acc.currency, activeCurrency)
                              )}{' '}
                              ({activeCurrency})
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            {txCount} {txCount === 1 ? 'lançamento vinculado' : 'lançamentos vinculados'}
                          </span>
                        </div>
                      </div>

                      {/* Ações Rápidas da Conta */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            openNewTransactionModal({ type: 'TRANSFER', accountId: acc.id })
                          }
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                          title="Transferir desta conta"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>Transferir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(acc)}
                          className="py-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Editar Conta / Ajustar Saldo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingAccount(acc)}
                          className="py-1.5 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Excluir Conta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SEÇÃO 2: CARTÕES DE CRÉDITO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-500" />
                <span>Cartões de Crédito ({creditCards.length})</span>
              </h3>
            </div>

            {creditCards.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nenhum cartão de crédito cadastrado ainda. Cadastre para acompanhar limites e faturas mensais.
                </p>
                <button
                  type="button"
                  onClick={() => openCreateModal('CREDIT_CARD')}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Cadastrar Cartão de Crédito</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {creditCards.map((acc) => {
                  const cardSummary = cardLimitMap.get(acc.id);

                  return (
                    <div
                      key={acc.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-purple-500/30 transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                              style={{ backgroundColor: acc.color || '#a855f7' }}
                            >
                              <CreditCard className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
                                {acc.name}
                              </h3>
                              <span className="text-[10px] text-slate-400 font-mono block truncate">
                                {acc.bankName || 'Cartão de Crédito'}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                            {acc.currency}
                          </span>
                        </div>

                        {cardSummary && (
                          <>
                            <div className="my-3 grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                              <div>
                                <span className="text-[10px] text-slate-400 block">
                                  Fatura Atual ({formatMonthShort(currentMonthPrefix)})
                                </span>
                                <span className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400">
                                  {formatMoney(cardSummary.currentMonthInvoiceAmount, acc.currency)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">
                                  Limite Disponível
                                </span>
                                <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatMoney(cardSummary.availableLimit, acc.currency)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>
                                  Comprometido:{' '}
                                  <strong className="text-slate-700 dark:text-slate-200">
                                    {formatMoney(cardSummary.totalCommittedLimit, acc.currency)}
                                  </strong>
                                </span>
                                <span>
                                  Limite:{' '}
                                  <strong className="text-slate-700 dark:text-slate-200">
                                    {formatMoney(cardSummary.creditLimit, acc.currency)}
                                  </strong>
                                </span>
                              </div>

                              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    cardSummary.usedPercent >= 90
                                      ? 'bg-rose-500'
                                      : cardSummary.usedPercent >= 70
                                      ? 'bg-amber-500'
                                      : 'bg-purple-500'
                                  }`}
                                  style={{ width: `${cardSummary.usedPercent}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>
                                  {cardSummary.usedPercent}% tomado • Futuras:{' '}
                                  {formatMoney(cardSummary.futureInstallmentsAmount, acc.currency)}
                                </span>
                                <span>
                                  Fecha {acc.closingDay || 28} • Vence {acc.dueDay || 5}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Ações do Cartão */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCardId(acc.id);
                            setInvoiceMonth(currentMonthPrefix);
                            setActiveTab('CREDIT_CARD_INVOICES');
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Faturas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openNewTransactionModal({ type: 'EXPENSE', accountId: acc.id })
                          }
                          className="py-1.5 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Lançar compra neste cartão"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Compra</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(acc)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Editar Cartão"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingAccount(acc)}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                          title="Excluir Cartão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: VISÃO DE FATURAS MÊS A MÊS (CICLO DE VIDA, PARCELAMENTOS E AUDITORIA 50/30/20) */}
      {activeTab === 'CREDIT_CARD_INVOICES' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {creditCards.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Nenhum Cartão de Crédito Cadastrado
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Cadastre seu primeiro cartão de crédito informando Limite Total, Dia de Fechamento e Dia de Vencimento para projetar faturas e parcelas futuras automaticamente.
              </p>
              <button
                type="button"
                onClick={() => openCreateModal('CREDIT_CARD')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Cartão de Crédito</span>
              </button>
            </div>
          ) : (
            <>
              {/* Barra Superior: Seletor de Cartão + Navegador de Meses */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Cartão:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCardId('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedCardId === 'ALL'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Todos os Cartões ({creditCards.length})
                    </button>
                    {creditCards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setSelectedCardId(card.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          selectedCardId === card.id
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{card.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openNewTransactionModal({
                          type: 'EXPENSE',
                          accountId:
                            selectedCardId !== 'ALL' ? selectedCardId : creditCards[0]?.id,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Lançar Compra no Cartão</span>
                    </button>
                  </div>
                </div>

                {/* Carrossel de Faturas Mês a Mês */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceMonth(shiftMonth(invoiceMonth, -1))}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    title="Mês Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 flex-1">
                    {timelineMonths.map((mPrefix) => {
                      const monthInv = buildMonthlyCardInvoice({
                        monthPrefix: mPrefix,
                        cards: creditCards,
                        selectedCardId,
                        transactions,
                        categories,
                      });
                      const isSelected = mPrefix === invoiceMonth;
                      return (
                        <button
                          key={mPrefix}
                          type="button"
                          onClick={() => {
                            setInvoiceMonth(mPrefix);
                            setCurrentMonthPrefix(mPrefix);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-500/10 shadow-sm'
                              : 'border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-purple-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span className={isSelected ? 'font-bold text-purple-600 dark:text-purple-300' : ''}>
                              {formatMonthShort(mPrefix)}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                monthInv.status === 'PAID'
                                  ? 'bg-emerald-500'
                                  : monthInv.status === 'OVERDUE'
                                  ? 'bg-rose-500'
                                  : monthInv.status === 'CLOSED'
                                  ? 'bg-amber-500'
                                  : 'bg-purple-500'
                              }`}
                            />
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                            {formatMoney(monthInv.totalAmount)}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate">
                            {monthInv.items.length} {monthInv.items.length === 1 ? 'item' : 'itens'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setInvoiceMonth(shiftMonth(invoiceMonth, 1))}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    title="Próximo Mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Resumo da Fatura do Mês + Integração 50/30/20 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Card Principal da Fatura */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                          Fatura de {formatMonthShort(invoiceMonth)}
                        </h3>
                        {renderStatusBadge(currentInvoice.status)}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        Fechamento: {formatDateBR(currentInvoice.closingDate)} • Vencimento:{' '}
                        {formatDateBR(currentInvoice.dueDate)}
                      </p>
                    </div>

                    {currentInvoice.openAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSourceBankAccountId(bankAccounts[0]?.id || '');
                          setPayingCardId(selectedCardId);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Pagar / Liquidar Fatura</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Total da Fatura</span>
                      <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                        {formatMoney(currentInvoice.totalAmount)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Valor em Aberto</span>
                      <span className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400">
                        {formatMoney(currentInvoice.openAmount)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Valor Já Pago</span>
                      <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(currentInvoice.paidAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Composição 50/30/20 desta Fatura */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span>Impacto na Regra 50/30/20</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Fatura {invoiceMonth}</span>
                  </div>

                  <div className="space-y-2.5">
                    {(['NEEDS', 'WANTS', 'GOALS'] as const).map((pillarKey) => {
                      const meta = BUDGET_PILLARS[pillarKey];
                      const amount = currentInvoice.byPillar[pillarKey] || 0;
                      const pct =
                        currentInvoice.totalAmount > 0
                          ? Math.round((amount / currentInvoice.totalAmount) * 100)
                          : 0;
                      return (
                        <div key={pillarKey} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {meta.shortLabel}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white font-mono">
                              {formatMoney(amount)} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: meta.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tabela de Auditoria dos Itens da Fatura */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Detalhamento de Compras e Parcelas da Fatura ({formatMonthShort(invoiceMonth)})
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Auditoria completa de todos os lançamentos à vista, parcelados e recorrentes que vencem neste ciclo
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {currentInvoice.items.length} lançamento(s)
                  </span>
                </div>

                {currentInvoice.items.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Nenhuma compra ou parcela registrada para a fatura de {formatMonthShort(invoiceMonth)}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Vencimento</th>
                          <th className="py-3 px-4">Descrição & Parcela</th>
                          <th className="py-3 px-4">Cartão</th>
                          <th className="py-3 px-4">Categoria & Pilar 50/30/20</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Valor na Fatura</th>
                          <th className="py-3 px-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {currentInvoice.items.map((item) => {
                          const card = creditCards.find((c) => c.id === item.accountId);
                          const cat = categories.find((c) => c.id === item.categoryId);
                          const pillar = resolveTransactionPillar(item, categories);
                          const pillarMeta = BUDGET_PILLARS[pillar];
                          const isPaid = item.tags?.includes('fatura-paga');

                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {formatDateBR(item.date)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {item.description}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  {item.isInstallment && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                                      Parcela {item.installmentNumber}/{item.totalInstallments}
                                    </span>
                                  )}
                                  {item.isRecurring && (
                                    <span
                                      className={`text-[9px] font-semibold px-1.5 py-0.2 rounded inline-flex items-center gap-1 border ${
                                        item.isRecurringProjection
                                          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25'
                                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                      }`}
                                    >
                                      <Repeat className="w-2.5 h-2.5" />
                                      <span>
                                        Recorrente
                                        {item.recurrenceFrequency &&
                                        item.recurrenceFrequency !== 'NONE'
                                          ? ` • ${getRecurrenceLabel(item.recurrenceFrequency)}`
                                          : ''}
                                        {item.isRecurringProjection ? ' (Projetado)' : ''}
                                      </span>
                                    </span>
                                  )}
                                  {item.notes && (
                                    <span className="text-[10px] text-slate-400 truncate max-w-[220px]">
                                      {item.notes}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {card?.name || 'Cartão'}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="text-slate-700 dark:text-slate-300 font-medium">
                                  {cat?.name || 'Geral'}
                                </div>
                                <span
                                  className="inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded mt-0.5"
                                  style={{
                                    backgroundColor: `${pillarMeta.color}20`,
                                    color: pillarMeta.color,
                                  }}
                                >
                                  {pillarMeta.shortLabel}
                                </span>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                {isPaid ? (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    Fatura Paga
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                    Em Aberto
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                {formatMoney(item.amount, item.currency)}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingTransaction(item)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500"
                                    title={
                                      item.isRecurringProjection
                                        ? 'Editar este mês ou série recorrente'
                                        : 'Editar'
                                    }
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteInvoiceItem(item)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
                                    title={
                                      item.isRecurringProjection
                                        ? 'Encerrar recorrência'
                                        : 'Excluir'
                                    }
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal para Adicionar / Editar Conta ou Cartão */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {editingAccount
                  ? 'Editar Conta / Cartão de Crédito'
                  : 'Cadastrar Nova Conta ou Cartão'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5 pt-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Conta / Cartão
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cartão Nubank Ultravioleta, Itaú, Inter..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="CHECKING">Conta Corrente</option>
                    <option value="CREDIT_CARD">Cartão de Crédito</option>
                    <option value="SAVINGS">Poupança</option>
                    <option value="INVESTMENT">Investimentos</option>
                    <option value="GATEWAY">Gateway de Pagamento</option>
                    <option value="CASH">Carteira Física</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Moeda
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="BRL">BRL (R$)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Instituição Financeira / Emissor
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nubank, Itaú, Bradesco, XP, C6..."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              {/* Cor Personalizada */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Cor de Identificação
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCOUNT_COLORS.map((c) => {
                    const active = color.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        title={c.label}
                        className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center ${
                          active
                            ? 'ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-900 scale-110'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {active && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {type !== 'CREDIT_CARD' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Saldo Atual / Inicial
                  </label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>
              )}

              {type === 'CREDIT_CARD' && (
                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
                  <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-300">
                    Parâmetros do Ciclo de Fatura e Limite
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Limite Total
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="5.000,00"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Dia Fechamento
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        placeholder="28"
                        value={closingDay}
                        onChange={(e) => setClosingDay(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Dia Vencimento
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        placeholder="5"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                {editingAccount ? (
                  <button
                    type="button"
                    onClick={() => setDeletingAccount(editingAccount)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    {editingAccount ? 'Salvar Alterações' : 'Cadastrar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Segura de Exclusão */}
      {deletingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/30 shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Excluir {deletingAccount.type === 'CREDIT_CARD' ? 'Cartão' : 'Conta'}?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {deletingAccount.name} ({getAccountTypeLabel(deletingAccount.type)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingAccount(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              {deletingLinkedCount > 0 ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300">
                  <strong>Atenção:</strong> esta{' '}
                  {deletingAccount.type === 'CREDIT_CARD' ? 'fatura/cartão' : 'conta'} possui{' '}
                  <strong>
                    {deletingLinkedCount}{' '}
                    {deletingLinkedCount === 1
                      ? 'lançamento vinculado'
                      : 'lançamentos vinculados'}
                  </strong>
                  . Ao excluir, todos esses lançamentos também serão removidos permanentemente.
                </div>
              ) : (
                <p>
                  Nenhum lançamento está vinculado a este cadastro. A remoção não afetará seu
                  histórico de transações.
                </p>
              )}

              {accounts.length === 1 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300">
                  Esta é a única conta cadastrada neste workspace. Você poderá cadastrar uma nova
                  conta ou cartão logo em seguida.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingAccount(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento / Liquidação de Fatura */}
      {payingCardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Pagar / Liquidar Fatura ({formatMonthShort(invoiceMonth)})
              </h3>
              <button
                type="button"
                onClick={() => setPayingCardId(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayInvoice} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  Valor a liquidar nesta fatura:
                </span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(currentInvoice.openAmount)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Debitar pagamento de qual Conta Bancária?
                </label>
                <select
                  value={sourceBankAccountId}
                  onChange={(e) => setSourceBankAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({formatMoney(b.currentBalance, b.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-400">
                Ao confirmar, os itens desta fatura serão marcados como <strong>Paga / Realizada</strong>, recompondo imediatamente o limite disponível do cartão.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayingCardId(null)}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
