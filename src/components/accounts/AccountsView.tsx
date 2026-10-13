'use client';

import React, { useState } from 'react';
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
  ArrowRightLeft,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { AccountType, CurrencyType } from '@/types/finance';

export function AccountsView() {
  const { accounts, formatMoney, convertAmount, activeCurrency, addAccount, currentWorkspace } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [bankName, setBankName] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('BRL');
  const [initialBalance, setInitialBalance] = useState('0');
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(initialBalance.replace(',', '.')) || 0;
    const limit = creditLimit ? parseFloat(creditLimit.replace(',', '.')) : undefined;

    addAccount({
      name,
      type,
      bankName: bankName || undefined,
      currency,
      initialBalance: balance,
      currentBalance: balance,
      creditLimit: limit,
      closingDay: closingDay ? parseInt(closingDay) : undefined,
      dueDay: dueDay ? parseInt(dueDay) : undefined,
      workspaceId: currentWorkspace.id,
      color: type === 'CREDIT_CARD' ? '#a855f7' : type === 'INVESTMENT' ? '#eab308' : '#3b82f6',
    });

    setIsModalOpen(false);
    setName('');
    setBankName('');
    setInitialBalance('0');
    setCreditLimit('');
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Ações */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500" />
            <span>Gestão Multicontas & Carteiras</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Contas correntes, cartões de crédito, gateways e investimentos em {currentWorkspace.name}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Conta / Cartão</span>
        </button>
      </div>

      {/* Grid de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const Icon = getAccountIcon(acc.type);
          const isCard = acc.type === 'CREDIT_CARD';
          const isNegative = acc.currentBalance < 0;

          // Se for cartão, calcula percentual de uso do limite
          const limitUsedPercent =
            isCard && acc.creditLimit
              ? Math.min(100, Math.round((Math.abs(acc.currentBalance) / acc.creditLimit) * 100))
              : 0;

          return (
            <div
              key={acc.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: acc.color || '#3b82f6' }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 line-clamp-1">
                        {acc.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {acc.bankName || acc.type}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {acc.currency}
                  </span>
                </div>

                <div className="my-3">
                  <span className="text-[11px] text-slate-400 block mb-0.5">
                    {isCard ? 'Fatura Aberta Atual' : 'Saldo Disponível'}
                  </span>
                  <div
                    className={`text-xl sm:text-2xl font-bold tracking-tight ${
                      isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {formatMoney(acc.currentBalance, acc.currency)}
                  </div>
                  {acc.currency !== activeCurrency && (
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      ≈ {formatMoney(convertAmount(acc.currentBalance, acc.currency, activeCurrency))} ({activeCurrency})
                    </span>
                  )}
                </div>

                {/* Cartão de Crédito: Barra de Limite */}
                {isCard && acc.creditLimit && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Limite Total:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatMoney(acc.creditLimit, acc.currency)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${limitUsedPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{limitUsedPercent}% utilizado</span>
                      <span>Fecha dia {acc.closingDay || '28'} • Vence dia {acc.dueDay || '05'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para Adicionar Conta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Cadastrar Nova Conta ou Cartão
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 pt-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Conta / Cartão
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Itaú Empresas, Cartão Corporativo, Stripe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Conta
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
                  Instituição Financeira / Banco
                </label>
                <input
                  type="text"
                  placeholder="Ex: Itaú, Nubank, Asaas, Stripe"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Saldo Inicial
                </label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              {type === 'CREDIT_CARD' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Limite</label>
                    <input
                      type="text"
                      placeholder="5000"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Dia Fechamento</label>
                    <input
                      type="number"
                      placeholder="28"
                      value={closingDay}
                      onChange={(e) => setClosingDay(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Dia Vencimento</label>
                    <input
                      type="number"
                      placeholder="5"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                >
                  Cadastrar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
