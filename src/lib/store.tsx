'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  AuthUser,
  Workspace,
  Account,
  Category,
  CostCenter,
  Transaction,
  PayableReceivable,
  Budget,
  Goal,
  BankStatementItem,
  ReconciliationRule,
  CurrencyType,
  ExchangeRates,
} from '@/types/finance';
import {
  INITIAL_WORKSPACES,
  INITIAL_ACCOUNTS,
  INITIAL_CATEGORIES,
  INITIAL_COST_CENTERS,
  INITIAL_TRANSACTIONS,
  INITIAL_PAYABLES_RECEIVABLES,
  INITIAL_BUDGETS,
  INITIAL_GOALS,
  INITIAL_STATEMENTS,
  INITIAL_RECONCILIATION_RULES,
} from './mock-data';

interface FinanceContextType {
  // Auth
  currentUser: AuthUser | null;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, workspaceName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Workspaces
  workspaces: Workspace[];
  currentWorkspaceId: string;
  currentWorkspace: Workspace;
  setCurrentWorkspaceId: (id: string) => void;
  addWorkspace: (ws: Omit<Workspace, 'id' | 'createdAt'>) => void;

  // Currencies & Exchange
  activeCurrency: CurrencyType;
  setActiveCurrency: (currency: CurrencyType) => void;
  exchangeRates: ExchangeRates;
  convertAmount: (amount: number, fromCurrency: CurrencyType, toCurrency?: CurrencyType) => number;
  formatMoney: (amount: number, currency?: CurrencyType) => string;

  // Accounts
  accounts: Account[];
  allAccounts: Account[];
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  // Categories & Cost Centers
  categories: Category[];
  costCenters: CostCenter[];
  addCategory: (cat: Omit<Category, 'id'>) => void;

  // Transactions
  transactions: Transaction[];
  allTransactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Payables & Receivables
  payablesReceivables: PayableReceivable[];
  addPayableReceivable: (pr: Omit<PayableReceivable, 'id'>) => void;
  settlePayableReceivable: (id: string, accountId: string, paymentDate?: string) => void;

  // Budgets & Goals
  budgets: Budget[];
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  contributeToGoal: (id: string, amount: number) => void;

  // Bank Reconciliation
  statements: BankStatementItem[];
  reconcileItem: (statementId: string, transactionId?: string) => void;
  addStatementItems: (items: BankStatementItem[]) => void;
  reconciliationRules: ReconciliationRule[];

  // Modals & UI States
  isNewTransactionModalOpen: boolean;
  setIsNewTransactionModalOpen: (open: boolean) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Computed KPIs
  stats: {
    totalBalance: number;
    monthIncome: number;
    monthExpense: number;
    monthNet: number;
    projectedBalance: number;
    hasCashDeficitAlert: boolean;
    overduePayablesCount: number;
    budgetAlertsCount: number;
  };
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'finpro_store_v2_';

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Auth State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('ws-personal');

  // Currency
  const [activeCurrency, setActiveCurrency] = useState<CurrencyType>('BRL');
  const exchangeRates: ExchangeRates = {
    USD_BRL: 5.65,
    EUR_BRL: 6.15,
  };

  // Active view in SPA layout
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [currentMonthPrefix, setCurrentMonthPrefix] = useState<string>('2026-10');

  // Data states (iniciam completamente limpos)
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [costCenters, setCostCenters] = useState<CostCenter[]>(INITIAL_COST_CENTERS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [payablesReceivables, setPayablesReceivables] = useState<PayableReceivable[]>(INITIAL_PAYABLES_RECEIVABLES);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [statements, setStatements] = useState<BankStatementItem[]>(INITIAL_STATEMENTS);
  const [reconciliationRules] = useState<ReconciliationRule[]>(INITIAL_RECONCILIATION_RULES);

  // Modal
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);

  // Sincronização com o Neon PostgreSQL
  const loadFromNeon = useCallback(async (userId?: string) => {
    try {
      const userParam = userId ? `?userId=${userId}` : '';
      const [wsRes, accRes, txRes, payRes] = await Promise.all([
        fetch(`/api/workspaces${userParam}`).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/accounts').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/transactions').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/payables').then((r) => (r.ok ? r.json() : null)),
      ]);

      if (wsRes && Array.isArray(wsRes) && wsRes.length > 0) {
        setWorkspaces(wsRes);
        if (!wsRes.some((w: any) => w.id === currentWorkspaceId)) {
          setCurrentWorkspaceId(wsRes[0].id);
          try { localStorage.setItem(`${STORAGE_KEY_PREFIX}ws`, wsRes[0].id); } catch {}
        }
      }
      if (accRes && Array.isArray(accRes)) {
        setAccounts(accRes);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}acc`, JSON.stringify(accRes)); } catch {}
      }
      if (txRes && Array.isArray(txRes)) {
        const mappedTx = txRes.map((t: any) => ({
          ...t,
          date: typeof t.date === 'string' ? t.date.split('T')[0] : t.date,
        }));
        setTransactions(mappedTx);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}tx`, JSON.stringify(mappedTx)); } catch {}
      }
      if (payRes && Array.isArray(payRes)) {
        const mappedPay = payRes.map((p: any) => ({
          ...p,
          dueDate: typeof p.dueDate === 'string' ? p.dueDate.split('T')[0] : p.dueDate,
        }));
        setPayablesReceivables(mappedPay);
      }
    } catch (err) {
      console.info('Carregando base local:', err);
    }
  }, [currentWorkspaceId]);

  // Load persisted state from localStorage if available
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(`${STORAGE_KEY_PREFIX}theme`) as 'dark' | 'light' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        document.documentElement.classList.add('dark');
      }

      const savedUserStr = localStorage.getItem(`${STORAGE_KEY_PREFIX}user`);
      let userObj: AuthUser | null = null;
      if (savedUserStr) {
        try {
          userObj = JSON.parse(savedUserStr);
          setCurrentUser(userObj);
        } catch {}
      }

      const savedWs = localStorage.getItem(`${STORAGE_KEY_PREFIX}ws`);
      if (savedWs) setCurrentWorkspaceId(savedWs);

      const savedTx = localStorage.getItem(`${STORAGE_KEY_PREFIX}tx`);
      if (savedTx) setTransactions(JSON.parse(savedTx));

      const savedAcc = localStorage.getItem(`${STORAGE_KEY_PREFIX}acc`);
      if (savedAcc) setAccounts(JSON.parse(savedAcc));

      const now = new Date();
      setCurrentMonthPrefix(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

      if (userObj) {
        loadFromNeon(userObj.id);
      }
    } catch {
      // Ignora erro no SSR
    } finally {
      setIsAuthLoading(false);
    }
  }, [loadFromNeon]);

  // Auth Methods
  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao realizar login' };
      }

      setCurrentUser(data.user);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(data.user));
      } catch {}

      if (data.workspaces && data.workspaces.length > 0) {
        setWorkspaces(data.workspaces);
        setCurrentWorkspaceId(data.workspaces[0].id);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}ws`, data.workspaces[0].id); } catch {}
      }

      await loadFromNeon(data.user.id);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro de conexão';
      return { success: false, error: msg };
    }
  }, [loadFromNeon]);

  const register = useCallback(async (name: string, email: string, password: string, workspaceName?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, workspaceName }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao criar conta' };
      }

      setCurrentUser(data.user);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}user`, JSON.stringify(data.user));
      } catch {}

      if (data.workspace) {
        setWorkspaces([data.workspace]);
        setCurrentWorkspaceId(data.workspace.id);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}ws`, data.workspace.id); } catch {}
      }

      await loadFromNeon(data.user.id);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro de conexão';
      return { success: false, error: msg };
    }
  }, [loadFromNeon]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}user`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}ws`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}tx`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}acc`);
    } catch {}
    setTransactions([]);
    setPayablesReceivables([]);
    setAccounts(INITIAL_ACCOUNTS);
    setWorkspaces(INITIAL_WORKSPACES);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}theme`, next);
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch {}
      return next;
    });
  }, []);

  const handleSetWorkspace = useCallback((id: string) => {
    setCurrentWorkspaceId(id);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}ws`, id);
    } catch {}
  }, []);

  const currentWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0] || INITIAL_WORKSPACES[0];
  }, [workspaces, currentWorkspaceId]);

  // Currency converter
  const convertAmount = useCallback((amount: number, from: CurrencyType, to?: CurrencyType): number => {
    const target = to || activeCurrency;
    if (from === target) return amount;

    // Convert from source to BRL
    let inBRL = amount;
    if (from === 'USD') inBRL = amount * exchangeRates.USD_BRL;
    if (from === 'EUR') inBRL = amount * exchangeRates.EUR_BRL;

    // Convert from BRL to target
    if (target === 'BRL') return inBRL;
    if (target === 'USD') return inBRL / exchangeRates.USD_BRL;
    if (target === 'EUR') return inBRL / exchangeRates.EUR_BRL;

    return inBRL;
  }, [activeCurrency, exchangeRates]);

  const formatMoney = useCallback((amount: number, currency?: CurrencyType): string => {
    const curr = currency || activeCurrency;
    const symbols = { BRL: 'R$', USD: 'US$', EUR: '€' };
    const symbol = symbols[curr] || 'R$';

    const formatted = Math.abs(amount).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return amount < 0 ? `-${symbol} ${formatted}` : `${symbol} ${formatted}`;
  }, [activeCurrency]);

  // Filtered lists by active workspace (Golden Rule: Strict context isolation)
  const currentAccounts = useMemo(() => {
    return accounts.filter((a) => a.workspaceId === currentWorkspaceId);
  }, [accounts, currentWorkspaceId]);

  const currentCategories = useMemo(() => {
    return categories.filter((c) => c.workspaceId === currentWorkspaceId);
  }, [categories, currentWorkspaceId]);

  const currentCostCenters = useMemo(() => {
    return costCenters.filter((c) => c.workspaceId === currentWorkspaceId);
  }, [costCenters, currentWorkspaceId]);

  const currentTransactions = useMemo(() => {
    return transactions.filter((t) => t.workspaceId === currentWorkspaceId);
  }, [transactions, currentWorkspaceId]);

  const currentPayablesReceivables = useMemo(() => {
    return payablesReceivables.filter((pr) => pr.workspaceId === currentWorkspaceId);
  }, [payablesReceivables, currentWorkspaceId]);

  const currentBudgets = useMemo(() => {
    return budgets.filter((b) => b.workspaceId === currentWorkspaceId);
  }, [budgets, currentWorkspaceId]);

  const currentGoals = useMemo(() => {
    return goals.filter((g) => g.workspaceId === currentWorkspaceId);
  }, [goals, currentWorkspaceId]);

  // Account actions
  const addAccount = useCallback((acc: Omit<Account, 'id'>) => {
    const newAcc: Account = {
      ...acc,
      id: `acc-${Date.now()}`,
    };
    setAccounts((prev) => {
      const updated = [...prev, newAcc];
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}acc`, JSON.stringify(updated)); } catch {}
      return updated;
    });

    fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAcc),
    }).catch(() => {});
  }, []);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}acc`, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Category & Workspace actions
  const addCategory = useCallback((cat: Omit<Category, 'id'>) => {
    setCategories((prev) => [...prev, { ...cat, id: `cat-${Date.now()}` }]);
  }, []);

  const addWorkspace = useCallback((ws: Omit<Workspace, 'id' | 'createdAt'>) => {
    const newWs: Workspace = {
      ...ws,
      id: `ws-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setWorkspaces((prev) => [...prev, newWs]);
    setCurrentWorkspaceId(newWs.id);

    fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newWs, userId: currentUser?.id }),
    }).catch(() => {});
  }, [currentUser]);

  // Transaction Actions with Inter-Context Awareness (Golden Rule!)
  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    const txId = `tx-${Date.now()}`;
    const newTx: Transaction = { ...tx, id: txId };

    // Update account balance
    setAccounts((prev) => {
      return prev.map((acc) => {
        if (acc.id === newTx.accountId) {
          if (newTx.type === 'INCOME') {
            return { ...acc, currentBalance: acc.currentBalance + newTx.amount };
          } else if (newTx.type === 'EXPENSE') {
            return { ...acc, currentBalance: acc.currentBalance - newTx.amount };
          } else if (newTx.type === 'TRANSFER') {
            return { ...acc, currentBalance: acc.currentBalance - newTx.amount };
          }
        }
        if (newTx.type === 'TRANSFER' && acc.id === newTx.targetAccountId) {
          return { ...acc, currentBalance: acc.currentBalance + newTx.amount };
        }
        return acc;
      });
    });

    // Check if this is an inter-context operation (e.g. Pró-labore withdrawal from Corporate to Personal)
    const extraTransactions: Transaction[] = [];
    if (newTx.linkedWorkspaceId && newTx.tags.includes('pro-labore')) {
      const personalAccount = accounts.find((a) => a.workspaceId === newTx.linkedWorkspaceId);
      if (personalAccount) {
        const mirrorTx: Transaction = {
          id: `tx-mirror-${Date.now()}`,
          type: 'INCOME',
          description: `Pró-Labore Recebido (${currentWorkspace.name})`,
          amount: newTx.amount,
          date: newTx.date,
          status: 'COMPLETED',
          paymentMethod: newTx.paymentMethod || 'PIX',
          currency: newTx.currency,
          exchangeRate: 1,
          tags: ['pro-labore', 'renda-fixa'],
          linkedTransactionId: txId,
          linkedWorkspaceId: newTx.workspaceId,
          workspaceId: newTx.linkedWorkspaceId,
          accountId: personalAccount.id,
          categoryId: 'cat-pf-salario',
        };
        extraTransactions.push(mirrorTx);

        setAccounts((prev) =>
          prev.map((a) =>
            a.id === personalAccount.id ? { ...a, currentBalance: a.currentBalance + newTx.amount } : a
          )
        );
      }
    }

    setTransactions((prev) => {
      const updated = [newTx, ...extraTransactions, ...prev];
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}tx`, JSON.stringify(updated)); } catch {}
      return updated;
    });

    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx),
    }).catch(() => {});
  }, [accounts, currentWorkspace.name]);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}tx`, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => {
      const tx = prev.find((t) => t.id === id);
      if (tx) {
        setAccounts((accs) =>
          accs.map((acc) => {
            if (acc.id === tx.accountId) {
              if (tx.type === 'INCOME') return { ...acc, currentBalance: acc.currentBalance - tx.amount };
              if (tx.type === 'EXPENSE') return { ...acc, currentBalance: acc.currentBalance + tx.amount };
              if (tx.type === 'TRANSFER') return { ...acc, currentBalance: acc.currentBalance + tx.amount };
            }
            if (tx.type === 'TRANSFER' && acc.id === tx.targetAccountId) {
              return { ...acc, currentBalance: acc.currentBalance - tx.amount };
            }
            return acc;
          })
        );
      }
      const updated = prev.filter((t) => t.id !== id);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}tx`, JSON.stringify(updated)); } catch {}
      return updated;
    });

    fetch(`/api/transactions?id=${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  }, []);

  // Payables & Receivables
  const addPayableReceivable = useCallback((pr: Omit<PayableReceivable, 'id'>) => {
    const newPr = { ...pr, id: `pr-${Date.now()}` };
    setPayablesReceivables((prev) => [...prev, newPr]);

    fetch('/api/payables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPr),
    }).catch(() => {});
  }, []);

  const settlePayableReceivable = useCallback((id: string, accountId: string, paymentDate?: string) => {
    const finalDate = paymentDate || new Date().toISOString().split('T')[0];
    setPayablesReceivables((prev) => {
      return prev.map((pr) => {
        if (pr.id !== id) return pr;

        const finalAmt = pr.amount + (pr.accruedInterest || 0);
        const txType = pr.type === 'PAYABLE' ? 'EXPENSE' : 'INCOME';

        addTransaction({
          type: txType,
          description: `Liquidação: ${pr.description}`,
          amount: finalAmt,
          date: finalDate,
          status: 'COMPLETED',
          paymentMethod: 'Liquidação Bancária',
          currency: 'BRL',
          exchangeRate: 1,
          tags: ['titulo-liquidado'],
          workspaceId: pr.workspaceId,
          accountId: accountId,
          categoryId: pr.categoryId,
        });

        fetch('/api/payables', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: 'PAID', paymentDate: finalDate, finalAmount: finalAmt, accountId }),
        }).catch(() => {});

        return {
          ...pr,
          status: 'PAID',
          paymentDate: finalDate,
          accountId,
          finalAmount: finalAmt,
        };
      });
    });
  }, [addTransaction]);

  // Goals
  const addGoal = useCallback((goal: Omit<Goal, 'id'>) => {
    setGoals((prev) => [...prev, { ...goal, id: `goal-${Date.now()}` }]);
  }, []);

  const contributeToGoal = useCallback((id: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g))
    );
  }, []);

  // Bank Reconciliation
  const reconcileItem = useCallback((statementId: string, transactionId?: string) => {
    setStatements((prev) =>
      prev.map((s) =>
        s.id === statementId ? { ...s, isReconciled: true, matchedTransactionId: transactionId } : s
      )
    );
  }, []);

  const addStatementItems = useCallback((items: BankStatementItem[]) => {
    setStatements((prev) => [...items, ...prev]);
  }, []);

  // Compute stats and KPIs
  const stats = useMemo(() => {
    const totalBalance = currentAccounts.reduce((acc, account) => {
      const converted = convertAmount(account.currentBalance, account.currency, activeCurrency);
      return acc + converted;
    }, 0);

    let monthIncome = 0;
    let monthExpense = 0;

    currentTransactions.forEach((tx) => {
      if (tx.status === 'COMPLETED' && tx.date.startsWith(currentMonthPrefix)) {
        const converted = convertAmount(tx.amount, tx.currency, activeCurrency);
        if (tx.type === 'INCOME') monthIncome += converted;
        if (tx.type === 'EXPENSE') monthExpense += converted;
      }
    });

    const monthNet = monthIncome - monthExpense;

    let pendingPayables = 0;
    let pendingReceivables = 0;
    let overdueCount = 0;

    currentPayablesReceivables.forEach((pr) => {
      if (pr.status === 'PENDING' || pr.status === 'OVERDUE' || pr.status === 'SCHEDULED') {
        const totalWithInterest = pr.amount + (pr.accruedInterest || 0);
        if (pr.type === 'PAYABLE') {
          pendingPayables += totalWithInterest;
          if (pr.status === 'OVERDUE') overdueCount++;
        } else {
          pendingReceivables += totalWithInterest;
        }
      }
    });

    const projectedBalance = totalBalance + pendingReceivables - pendingPayables;
    const hasCashDeficitAlert = projectedBalance < 0;

    let budgetAlertsCount = 0;

    return {
      totalBalance,
      monthIncome,
      monthExpense,
      monthNet,
      projectedBalance,
      hasCashDeficitAlert,
      overduePayablesCount: overdueCount,
      budgetAlertsCount,
    };
  }, [currentAccounts, currentTransactions, currentPayablesReceivables, currentMonthPrefix, convertAmount, activeCurrency]);

  return (
    <FinanceContext.Provider
      value={{
        currentUser,
        isAuthLoading,
        login,
        register,
        logout,

        workspaces,
        currentWorkspaceId,
        currentWorkspace,
        setCurrentWorkspaceId: handleSetWorkspace,
        addWorkspace,

        activeCurrency,
        setActiveCurrency,
        exchangeRates,
        convertAmount,
        formatMoney,

        accounts: currentAccounts,
        allAccounts: accounts,
        addAccount,
        updateAccount,
        deleteAccount,

        categories: currentCategories,
        costCenters: currentCostCenters,
        addCategory,

        transactions: currentTransactions,
        allTransactions: transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,

        payablesReceivables: currentPayablesReceivables,
        addPayableReceivable,
        settlePayableReceivable,

        budgets: currentBudgets,
        goals: currentGoals,
        addGoal,
        contributeToGoal,

        statements,
        reconcileItem,
        addStatementItems,
        reconciliationRules,

        isNewTransactionModalOpen,
        setIsNewTransactionModalOpen,
        activeView,
        setActiveView,
        theme,
        toggleTheme,

        stats,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
