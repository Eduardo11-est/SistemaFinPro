'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/lib/store';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Pencil,
  Trash2,
  PieChart,
  Landmark,
  Coins,
  Briefcase,
  Shield,
  Sparkles,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';
import { getTransactionsForMonth } from '@/lib/recurrence';

export type AssetClass =
  | 'FIXED_INCOME'
  | 'STOCKS'
  | 'FIIS'
  | 'ETFS'
  | 'CRYPTO'
  | 'RESERVE';

export interface InvestmentAsset {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  broker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  annualYieldPercent?: number;
  notes?: string;
}

const ASSET_CLASSES: Record<
  AssetClass,
  { label: string; shortLabel: string; color: string; description: string }
> = {
  FIXED_INCOME: {
    label: 'Renda Fixa (CDB / Tesouro / LCI)',
    shortLabel: 'Renda Fixa',
    color: '#10b981',
    description: 'Tesouro Direto, CDBs, LCIs, LCAs e Debêntures',
  },
  STOCKS: {
    label: 'Ações (B3 / Exterior)',
    shortLabel: 'Ações',
    color: '#3b82f6',
    description: 'Participação em empresas listadas em bolsa',
  },
  FIIS: {
    label: 'Fundos Imobiliários (FIIs)',
    shortLabel: 'FIIs',
    color: '#a855f7',
    description: 'Fundos de tijolo, papel e híbridos com renda mensal',
  },
  ETFS: {
    label: 'ETFs & Internacional',
    shortLabel: 'ETFs / Ext.',
    color: '#06b6d4',
    description: 'Fundos de índice nacionais e globais (IVVB11, S&P500)',
  },
  CRYPTO: {
    label: 'Criptoativos',
    shortLabel: 'Cripto',
    color: '#f59e0b',
    description: 'Bitcoin, Ethereum e demais ativos digitais',
  },
  RESERVE: {
    label: 'Reserva de Emergência',
    shortLabel: 'Reserva',
    color: '#64748b',
    description: 'Liquidez diária e caixa de segurança',
  },
};

function parseNumberBR(raw: string): number {
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

function getStorageKey(userId: string | undefined, workspaceId: string): string {
  return `finpro_investments_v1_${userId || 'guest'}_${workspaceId}`;
}

export function InvestmentsView() {
  const {
    currentUser,
    currentWorkspace,
    accounts,
    transactions,
    currentMonthPrefix,
    formatMoney,
    convertAmount,
    activeCurrency,
    setActiveView,
  } = useFinance();

  const [assets, setAssets] = useState<InvestmentAsset[]>([]);
  const [classFilter, setClassFilter] = useState<'ALL' | AssetClass>('ALL');

  // Modal de Cadastro / Edição de Ativo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<InvestmentAsset | null>(null);
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('FIXED_INCOME');
  const [broker, setBroker] = useState('');
  const [quantityStr, setQuantityStr] = useState('1');
  const [averagePriceStr, setAveragePriceStr] = useState('');
  const [currentPriceStr, setCurrentPriceStr] = useState('');
  const [annualYieldStr, setAnnualYieldStr] = useState('');
  const [notes, setNotes] = useState('');

  // Carrega ativos do workspace atual
  useEffect(() => {
    try {
      const raw = localStorage.getItem(getStorageKey(currentUser?.id, currentWorkspace.id));
      setAssets(raw ? JSON.parse(raw) : []);
    } catch {
      setAssets([]);
    }
  }, [currentUser?.id, currentWorkspace.id]);

  const persistAssets = (next: InvestmentAsset[]) => {
    setAssets(next);
    try {
      localStorage.setItem(
        getStorageKey(currentUser?.id, currentWorkspace.id),
        JSON.stringify(next)
      );
    } catch {}
  };

  // Contas do tipo INVESTMENT já existentes em Contas & Cartões
  const investmentAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'INVESTMENT'),
    [accounts]
  );

  const investmentAccountsBalance = useMemo(() => {
    return investmentAccounts.reduce(
      (sum, acc) => sum + convertAmount(acc.currentBalance, acc.currency, activeCurrency),
      0
    );
  }, [investmentAccounts, convertAmount, activeCurrency]);

  // Aportes do mês atual (transações em contas INVESTMENT ou marcadas como #20-metas)
  const monthlyContributions = useMemo(() => {
    const invAccIds = new Set(investmentAccounts.map((a) => a.id));
    const monthTxs = getTransactionsForMonth(transactions, currentMonthPrefix);
    let total = 0;
    let count = 0;

    for (let i = 0; i < monthTxs.length; i++) {
      const tx = monthTxs[i];
      if (tx.status === 'CANCELLED') continue;
      const isGoalPillar = tx.tags?.includes('20-metas');
      const isTransferToInv = tx.type === 'TRANSFER' && tx.targetAccountId && invAccIds.has(tx.targetAccountId);
      const isInvExpense = tx.type === 'EXPENSE' && (isGoalPillar || invAccIds.has(tx.accountId));

      if (isTransferToInv || isInvExpense) {
        total += convertAmount(tx.amount, tx.currency, activeCurrency);
        count++;
      }
    }

    return { total, count };
  }, [investmentAccounts, transactions, currentMonthPrefix, convertAmount, activeCurrency]);

  // Consolidação da carteira de ativos
  const portfolioSummary = useMemo(() => {
    let totalCost = 0;
    let totalMarketValue = 0;
    let estimatedAnnualIncome = 0;

    const byClass: Record<AssetClass, number> = {
      FIXED_INCOME: 0,
      STOCKS: 0,
      FIIS: 0,
      ETFS: 0,
      CRYPTO: 0,
      RESERVE: 0,
    };

    for (let i = 0; i < assets.length; i++) {
      const a = assets[i];
      const cost = a.quantity * a.averagePrice;
      const market = a.quantity * a.currentPrice;
      totalCost += cost;
      totalMarketValue += market;
      byClass[a.assetClass] += market;

      if (a.annualYieldPercent && a.annualYieldPercent > 0) {
        estimatedAnnualIncome += (market * a.annualYieldPercent) / 100;
      }
    }

    const totalPatrimony = totalMarketValue + investmentAccountsBalance;
    const profitLoss = totalMarketValue - totalCost;
    const profitPercent =
      totalCost > 0 ? Math.round((profitLoss / totalCost) * 1000) / 10 : 0;
    const estimatedMonthlyIncome = estimatedAnnualIncome / 12;

    const allocation = (Object.keys(ASSET_CLASSES) as AssetClass[])
      .map((key) => {
        const value = byClass[key];
        const percent =
          totalMarketValue > 0 ? Math.round((value / totalMarketValue) * 1000) / 10 : 0;
        return {
          key,
          meta: ASSET_CLASSES[key],
          value,
          percent,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
      totalCost,
      totalMarketValue,
      totalPatrimony,
      profitLoss,
      profitPercent,
      estimatedMonthlyIncome,
      estimatedAnnualIncome,
      allocation,
    };
  }, [assets, investmentAccountsBalance]);

  const filteredAssets = useMemo(() => {
    if (classFilter === 'ALL') return assets;
    return assets.filter((a) => a.assetClass === classFilter);
  }, [assets, classFilter]);

  const openCreateModal = () => {
    setEditingAsset(null);
    setTicker('');
    setName('');
    setAssetClass('FIXED_INCOME');
    setBroker('');
    setQuantityStr('1');
    setAveragePriceStr('');
    setCurrentPriceStr('');
    setAnnualYieldStr('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (asset: InvestmentAsset) => {
    setEditingAsset(asset);
    setTicker(asset.ticker);
    setName(asset.name);
    setAssetClass(asset.assetClass);
    setBroker(asset.broker);
    setQuantityStr(String(asset.quantity).replace('.', ','));
    setAveragePriceStr(String(asset.averagePrice).replace('.', ','));
    setCurrentPriceStr(String(asset.currentPrice).replace('.', ','));
    setAnnualYieldStr(
      asset.annualYieldPercent ? String(asset.annualYieldPercent).replace('.', ',') : ''
    );
    setNotes(asset.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Math.max(0.000001, parseNumberBR(quantityStr) || 1);
    const avgPrice = Math.max(0, parseNumberBR(averagePriceStr));
    const curPrice = currentPriceStr.trim()
      ? Math.max(0, parseNumberBR(currentPriceStr))
      : avgPrice;
    const yieldPct = annualYieldStr.trim()
      ? Math.max(0, parseNumberBR(annualYieldStr))
      : undefined;

    if (!name.trim()) return;

    if (editingAsset) {
      const updated = assets.map((a) =>
        a.id === editingAsset.id
          ? {
              ...a,
              ticker: ticker.trim().toUpperCase(),
              name: name.trim(),
              assetClass,
              broker: broker.trim() || 'Corretora',
              quantity: qty,
              averagePrice: avgPrice,
              currentPrice: curPrice,
              annualYieldPercent: yieldPct,
              notes: notes.trim() || undefined,
            }
          : a
      );
      persistAssets(updated);
    } else {
      const newAsset: InvestmentAsset = {
        id: `inv-${Date.now()}`,
        ticker: ticker.trim().toUpperCase(),
        name: name.trim(),
        assetClass,
        broker: broker.trim() || 'Corretora',
        quantity: qty,
        averagePrice: avgPrice,
        currentPrice: curPrice,
        annualYieldPercent: yieldPct,
        notes: notes.trim() || undefined,
      };
      persistAssets([newAsset, ...assets]);
    }

    setIsModalOpen(false);
    setEditingAsset(null);
  };

  const handleDeleteAsset = (asset: InvestmentAsset) => {
    if (confirm(`Deseja remover "${asset.ticker || asset.name}" da sua carteira?`)) {
      persistAssets(assets.filter((a) => a.id !== asset.id));
    }
  };

  const isProfitPositive = portfolioSummary.profitLoss >= 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho da Tela de Investimentos */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Investimentos & Evolução Patrimonial
              </h1>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                v1 • Estrutura Base
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhe sua carteira por classe de ativos, rentabilidade, proventos estimados e aportes mensais
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('accounts')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Landmark className="w-3.5 h-3.5 text-emerald-500" />
            <span>Contas de Investimento ({investmentAccounts.length})</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Ativo</span>
          </button>
        </div>
      </div>

      {/* 4 KPIs Principais da Carteira */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Patrimônio Total
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {formatMoney(portfolioSummary.totalPatrimony)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Ativos: {formatMoney(portfolioSummary.totalMarketValue)} • Contas:{' '}
            {formatMoney(investmentAccountsBalance)}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Rentabilidade da Carteira
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isProfitPositive
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-rose-500/10 text-rose-500'
              }`}
            >
              {isProfitPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold ${
              isProfitPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isProfitPositive ? '+' : ''}
            {formatMoney(portfolioSummary.profitLoss)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {isProfitPositive ? '+' : ''}
            {portfolioSummary.profitPercent.toFixed(1)}% sobre {formatMoney(portfolioSummary.totalCost)} aplicado
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Renda Passiva Estimada
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatMoney(portfolioSummary.estimatedMonthlyIncome)}
            <span className="text-xs font-normal text-slate-400">/mês</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            ≈ {formatMoney(portfolioSummary.estimatedAnnualIncome)}/ano em proventos/juros
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Aportes em {currentMonthPrefix}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {formatMoney(monthlyContributions.total)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {monthlyContributions.count} movimentação(ões) no pilar 20% Metas / Investimentos
          </p>
        </div>
      </div>

      {/* Alocação por Classe & Contas de Investimento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Alocação por Classe */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Alocação por Classe de Ativos
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {assets.length} {assets.length === 1 ? 'ativo' : 'ativos'}
            </span>
          </div>

          {portfolioSummary.allocation.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-xs text-slate-400">
              <p>Cadastre seus primeiros ativos para visualizar a distribuição da carteira.</p>
              <button
                type="button"
                onClick={openCreateModal}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                + Cadastrar primeiro ativo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {portfolioSummary.allocation.map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.meta.color }}
                      />
                      <span>{item.meta.label}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatMoney(item.value)}{' '}
                      <span className="text-slate-400 font-normal">({item.percent}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, item.percent)}%`,
                        backgroundColor: item.meta.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contas de Investimento Integradas */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-500" />
                <span>Saldo em Corretoras</span>
              </h2>
              <button
                type="button"
                onClick={() => setActiveView('accounts')}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Gerenciar →
              </button>
            </div>

            {investmentAccounts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">
                Nenhuma conta do tipo <strong>Investimentos</strong> cadastrada em Contas & Cartões.
              </p>
            ) : (
              <div className="space-y-2">
                {investmentAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                        {acc.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {acc.bankName || 'Corretora'}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white shrink-0">
                      {formatMoney(acc.currentBalance, acc.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-700 dark:text-indigo-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Próximas evoluções planejadas</span>
            </div>
            <p className="opacity-85">
              Cotações automáticas (B3/Cripto), calendário de dividendos, metas de rebalanceamento
              e sincronização em nuvem no banco.
            </p>
          </div>
        </div>
      </div>

      {/* Tabela da Carteira de Ativos */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Meus Ativos em Carteira</span>
            </h3>
            <p className="text-xs text-slate-400">
              Controle de quantidade, preço médio, valor atual e rendimento anual estimado
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setClassFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                classFilter === 'ALL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Todos ({assets.length})
            </button>
            {(Object.keys(ASSET_CLASSES) as AssetClass[]).map((key) => {
              const count = assets.filter((a) => a.assetClass === key).length;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setClassFilter(key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    classFilter === key
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {ASSET_CLASSES[key].shortLabel} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Sua carteira de ativos ainda está vazia
              </p>
              <p className="text-xs text-slate-400 mt-0.5 max-w-md mx-auto">
                Adicione seus investimentos de Renda Fixa, Ações, FIIs, ETFs, Cripto ou Reserva de
                Emergência para acompanhar seu patrimônio.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Ativo</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Ativo & Corretora</th>
                  <th className="py-3 px-4">Classe</th>
                  <th className="py-3 px-4 text-right">Qtd.</th>
                  <th className="py-3 px-4 text-right">Preço Médio</th>
                  <th className="py-3 px-4 text-right">Valor Atual</th>
                  <th className="py-3 px-4 text-right">Resultado</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredAssets.map((asset) => {
                  const meta = ASSET_CLASSES[asset.assetClass];
                  const cost = asset.quantity * asset.averagePrice;
                  const market = asset.quantity * asset.currentPrice;
                  const diff = market - cost;
                  const diffPct = cost > 0 ? Math.round((diff / cost) * 1000) / 10 : 0;

                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {asset.ticker && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              {asset.ticker}
                            </span>
                          )}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {asset.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {asset.broker}
                          {asset.annualYieldPercent
                            ? ` • Yield est.: ${asset.annualYieldPercent}% a.a.`
                            : ''}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${meta.color}20`,
                            color: meta.color,
                          }}
                        >
                          {meta.shortLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        {asset.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {formatMoney(asset.averagePrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatMoney(market)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold font-mono ${
                            diff >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {diff >= 0 ? '+' : ''}
                          {formatMoney(diff)} ({diff >= 0 ? '+' : ''}
                          {diffPct.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(asset)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="Editar Ativo"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(asset)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Excluir Ativo"
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

      {/* Modal de Cadastro / Edição de Ativo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {editingAsset ? 'Editar Ativo da Carteira' : 'Cadastrar Novo Ativo'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-3.5 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Ticker / Código
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: MXRF11, PETR4..."
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Investimento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Tesouro Selic 2029, CDB 110% CDI, Maxi Renda..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Classe do Ativo
                  </label>
                  <select
                    value={assetClass}
                    onChange={(e) => setAssetClass(e.target.value as AssetClass)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    {(Object.keys(ASSET_CLASSES) as AssetClass[]).map((key) => (
                      <option key={key} value={key}>
                        {ASSET_CLASSES[key].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Corretora / Banco
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: XP, Rico, NuInvest, BTG, Inter..."
                    value={broker}
                    onChange={(e) => setBroker(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1"
                    value={quantityStr}
                    onChange={(e) => setQuantityStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Preço Médio (R$)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1.000,00"
                    value={averagePriceStr}
                    onChange={(e) => setAveragePriceStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Preço Atual (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="Igual ao médio"
                    value={currentPriceStr}
                    onChange={(e) => setCurrentPriceStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Yield / Rentabilidade Est. (% ao ano)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 11,5"
                    value={annualYieldStr}
                    onChange={(e) => setAnnualYieldStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Observações (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Vencimento 2029, liquidez D+0..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {editingAsset ? 'Salvar Alterações' : 'Cadastrar Ativo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
