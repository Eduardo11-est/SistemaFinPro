'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/lib/store';
import {
  CalendarClock,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  X,
  Calendar,
  Filter,
  DollarSign
} from 'lucide-react';
import { SettlementStatus } from '@/types/finance';

export function PayablesReceivablesView() {
  const {
    payablesReceivables,
    accounts,
    categories,
    formatMoney,
    addPayableReceivable,
    settlePayableReceivable,
    currentWorkspace
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PAYABLE' | 'RECEIVABLE' | 'OVERDUE'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [type, setType] = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recipientOrPayer, setRecipientOrPayer] = useState('');
  const [penaltyRate, setPenaltyRate] = useState('2.0'); // 2% multa
  const [interestRateDaily, setInterestRateDaily] = useState('0.033'); // 0.033% ao dia
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // Settlement selection modal
  const [settlingItem, setSettlingItem] = useState<string | null>(null);
  const [settleAccount, setSettleAccount] = useState(accounts[0]?.id || '');

  const filteredItems = useMemo(() => {
    return payablesReceivables.filter((item) => {
      if (activeTab === 'PAYABLE') return item.type === 'PAYABLE';
      if (activeTab === 'RECEIVABLE') return item.type === 'RECEIVABLE';
      if (activeTab === 'OVERDUE') return item.status === 'OVERDUE';
      return true;
    });
  }, [payablesReceivables, activeTab]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr.replace(',', '.')) || 0;
    if (amount <= 0 || !description || !dueDate) return;

    addPayableReceivable({
      type,
      description,
      amount,
      dueDate,
      status: 'PENDING',
      recipientOrPayer: recipientOrPayer || undefined,
      penaltyRate: parseFloat(penaltyRate) || 0,
      interestRateDaily: parseFloat(interestRateDaily) || 0,
      accruedInterest: 0,
      workspaceId: currentWorkspace.id,
      accountId: accountId || accounts[0]?.id,
      categoryId: categoryId || undefined,
    });

    setIsModalOpen(false);
    setDescription('');
    setAmountStr('');
    setDueDate('');
    setRecipientOrPayer('');
  };

  const handleConfirmSettlement = (id: string) => {
    settlePayableReceivable(id, settleAccount);
    setSettlingItem(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Botão */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-amber-500" />
            <span>Contas a Pagar & a Receber</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Calendário de vencimentos futuros, gestão de inadimplência e baixas financeiras
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Novo Título</span>
        </button>
      </div>

      {/* Abas de Navegação */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'ALL', label: 'Todos os Títulos' },
          { id: 'PAYABLE', label: 'Contas a Pagar' },
          { id: 'RECEIVABLE', label: 'Contas a Receber' },
          { id: 'OVERDUE', label: 'Em Atraso (Inadimplentes)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista de Títulos */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Status & Tipo</th>
                <th className="py-3 px-4">Descrição & Fornecedor/Cliente</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Valor Original</th>
                <th className="py-3 px-4">Juros / Multa</th>
                <th className="py-3 px-4 text-right">Valor Final</th>
                <th className="py-3 px-4 text-center">Liquidação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum compromisso financeiro nesta categoria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isPayable = item.type === 'PAYABLE';
                  const isOverdue = item.status === 'OVERDUE';
                  const isPaid = item.status === 'PAID';
                  const totalAmount = item.amount + (item.accruedInterest || 0);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Status & Tipo */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : isOverdue
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {isPaid ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isPayable ? 'A Pagar' : 'A Receber'}
                          </span>
                        </div>
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.description}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.recipientOrPayer || (isPayable ? 'Fornecedor' : 'Cliente')}
                        </div>
                      </td>

                      {/* Vencimento */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Valor Original */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                        {formatMoney(item.amount)}
                      </td>

                      {/* Juros & Multa Calculados */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {(item.accruedInterest || 0) > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-mono text-[11px] font-semibold">
                            +{formatMoney(item.accruedInterest || 0)} ({item.penaltyRate}% + juros)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Valor Final */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold text-xs sm:text-sm ${
                            isPayable ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatMoney(totalAmount)}
                        </span>
                      </td>

                      {/* Ação de Liquidação */}
                      <td className="py-3 px-4 text-center">
                        {isPaid ? (
                          <span className="text-emerald-500 flex items-center justify-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Baixado</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => setSettlingItem(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white transition-all text-xs font-semibold"
                          >
                            Baixar Título
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação de Baixa */}
      {settlingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
              Liquidar Título (Baixa Bancária)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Selecione a conta corrente/cartão utilizada para debitar ou creditar esta operação:
            </p>

            <select
              value={settleAccount}
              onChange={(e) => setSettleAccount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mb-4"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatMoney(a.currentBalance, a.currency)})
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSettlingItem(null)}
                className="px-3 py-1.5 text-xs text-slate-500"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmSettlement(settlingItem)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Confirmar Liquidação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Cadastrar Título */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Agendar Conta a Pagar / Receber
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('PAYABLE')}
                  className={`py-1.5 rounded-lg text-xs font-bold ${
                    type === 'PAYABLE' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  Conta a Pagar
                </button>
                <button
                  type="button"
                  onClick={() => setType('RECEIVABLE')}
                  className={`py-1.5 rounded-lg text-xs font-bold ${
                    type === 'RECEIVABLE' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  Conta a Receber
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fornecedor Cloud, Fatura Consultoria"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Fornecedor ou Cliente</label>
                <input
                  type="text"
                  placeholder="Ex: AWS Amazon, Contabilidade Prime"
                  value={recipientOrPayer}
                  onChange={(e) => setRecipientOrPayer(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Regras de Inadimplência
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400">Multa (%)</label>
                    <input
                      type="text"
                      value={penaltyRate}
                      onChange={(e) => setPenaltyRate(e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Juros Diários (%)</label>
                    <input
                      type="text"
                      value={interestRateDaily}
                      onChange={(e) => setInterestRateDaily(e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
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
                  Salvar Título
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
