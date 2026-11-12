'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
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
} from './mock-data';

interface FinanceContextType {
  // Auth
  currentUser: AuthUser | null;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    workspaceName?: string
  ) => Promise<{ success: boolean; error?: string }>;
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
  allCategories: Category[];
  isCategoriesLoading: boolean;
  costCenters: CostCenter[];
  addCategory: (cat: Omit<Category, 'id'>) => Promise<Category>;
  deleteCategory: (id: string) => void;
  refreshCategories: (workspaceId?: string) => Promise<void>;

  // Transactions
  transactions: Transaction[];
  allTransactions: Transaction[];
  isTransactionsLoading: boolean;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (tx: Transaction | null) => void;

  // Salary / Monthly Income Configuration
  monthlySalary: number;
  setMonthlySalary: (amount: number, workspaceId?: string) => void;
  currentMonthPrefix: string;
  setCurrentMonthPrefix: (prefix: string) => void;

  // Payables & Receivables
  payablesReceivables: PayableReceivable[];
  addPayableReceivable: (pr: Omit<PayableReceivable, 'id'>) => void;
  settlePayableReceivable: (id: string, accountId: string, paymentDate?: string) => void;

  // Budgets & Goals
  budgets: Budget[];
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  contributeToGoal: (id: string, amount: number) => void;

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

const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  USD_BRL: 5.65,
  EUR_BRL: 6.15,
};

function buildDefaultCategoriesForWorkspace(
  workspaceId: string,
  workspaceType: 'PERSONAL' | 'CORPORATE' = 'PERSONAL'
): Category[] {
  if (workspaceType === 'CORPORATE') {
    return [
      { id: `cat-${workspaceId}-fat`, name: 'Faturamento de Serviços / Vendas', type: 'INCOME', icon: 'Briefcase', color: '#10b981', workspaceId },
      { id: `cat-${workspaceId}-mrr`, name: 'Contratos Recorrentes (MRR)', type: 'INCOME', icon: 'TrendingUp', color: '#06b6d4', workspaceId },
      { id: `cat-${workspaceId}-rend`, name: 'Rendimentos Financeiros PJ', type: 'INCOME', icon: 'Plus', color: '#3b82f6', workspaceId },
      { id: `cat-${workspaceId}-folha`, name: 'Folha & Pró-Labore', type: 'EXPENSE', icon: 'Users', color: '#6366f1', workspaceId },
      { id: `cat-${workspaceId}-imp`, name: 'Impostos & Taxas (DAS / ISS / IRPJ)', type: 'EXPENSE', icon: 'FileText', color: '#ef4444', workspaceId },
      { id: `cat-${workspaceId}-cloud`, name: 'Infraestrutura & Cloud / SaaS', type: 'EXPENSE', icon: 'Server', color: '#0ea5e9', workspaceId },
      { id: `cat-${workspaceId}-mkt`, name: 'Marketing & Aquisição (Ads)', type: 'EXPENSE', icon: 'Megaphone', color: '#f97316', workspaceId },
      { id: `cat-${workspaceId}-forn`, name: 'Fornecedores & Operação', type: 'EXPENSE', icon: 'Truck', color: '#8b5cf6', workspaceId },
      { id: `cat-${workspaceId}-tar`, name: 'Despesas Bancárias & Tarifas', type: 'EXPENSE', icon: 'CreditCard', color: '#64748b', workspaceId },
    ];
  }
  return INITIAL_CATEGORIES.map((c) => ({
    ...c,
    id: workspaceId === 'ws-personal' ? c.id : `${c.id}-${workspaceId.slice(0, 8)}`,
    workspaceId,
  }));
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Auth State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('ws-personal');
  const currentWorkspaceIdRef = useRef<string>('ws-personal');
  useEffect(() => {
    currentWorkspaceIdRef.current = currentWorkspaceId;
  }, [currentWorkspaceId]);

  // Currency
  const [activeCurrency, setActiveCurrency] = useState<CurrencyType>('BRL');
  const exchangeRates = DEFAULT_EXCHANGE_RATES;

  // Active view in SPA layout
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [currentMonthPrefix, setCurrentMonthPrefix] = useState<string>('2026-11');

  // Data states
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState<boolean>(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>(INITIAL_COST_CENTERS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState<boolean>(false);
  const [payablesReceivables, setPayablesReceivables] = useState<PayableReceivable[]>(INITIAL_PAYABLES_RECEIVABLES);
  const [budgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);

  // Salary per workspace
  const [salariesByWorkspace, setSalariesByWorkspace] = useState<Record<string, number>>({});

  // Modals & Editing state
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransactionState] = useState<Transaction | null>(null);

  // Request deduplication refs
  const inFlightSyncRef = useRef<Promise<void> | null>(null);
  const syncedCategoryWorkspacesRef = useRef<Set<string>>(new Set());

  const setEditingTransaction = useCallback((tx: Transaction | null) => {
    setEditingTransactionState(tx);
    if (tx) {
      setIsNewTransactionModalOpen(true);
    }
  }, []);

  const handleSetModalOpen = useCallback((open: boolean) => {
    setIsNewTransactionModalOpen(open);
    if (!open) {
      setEditingTransactionState(null);
    }
  }, []);

  const refreshCategories = useCallback(async (targetWorkspaceId?: string) => {
    const wsId = targetWorkspaceId || currentWorkspaceIdRef.current;
    if (!wsId) return;

    setIsCategoriesLoading(true);
    try {
      const res = await fetch(`/api/categories?workspaceId=${encodeURIComponent(wsId)}`);
      if (res.ok) {
        const fetchedCats: Category[] = await res.json();
        if (Array.isArray(fetchedCats) && fetchedCats.length > 0) {
          syncedCategoryWorkspacesRef.current.add(wsId);
          setCategories((prev) => {
            const otherWsCats = prev.filter((c) => c.workspaceId !== wsId);
            const merged = [...otherWsCats, ...fetchedCats];
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}cat`, JSON.stringify(merged));
            } catch {}
            return merged;
          });
          return;
        }
      }
    } catch {
      // Fallback para categorias locais se offline
    } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  // Sincronização otimizada e sem loops redundantes com o Neon PostgreSQL
  const loadFromNeon = useCallback(async (userId?: string) => {
    if (inFlightSyncRef.current) {
      return inFlightSyncRef.current;
    }

    const syncPromise = (async () => {
      setIsTransactionsLoading(true);
      setIsCategoriesLoading(true);
      try {
        const userParam = userId ? `?userId=${encodeURIComponent(userId)}` : '';
        const [wsRes, accRes, catRes, txRes, payRes] = await Promise.all([
          fetch(`/api/workspaces${userParam}`).then((r) => (r.ok ? r.json() : null)),
          fetch('/api/accounts').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/categories').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/transactions').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/payables').then((r) => (r.ok ? r.json() : null)),
        ]);

        let activeWsId = currentWorkspaceIdRef.current;

        if (wsRes && Array.isArray(wsRes) && wsRes.length > 0) {
          setWorkspaces(wsRes);
          if (!wsRes.some((w: Workspace) => w.id === activeWsId)) {
            activeWsId = wsRes[0].id;
            currentWorkspaceIdRef.current = activeWsId;
            setCurrentWorkspaceId(activeWsId);
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}ws`, activeWsId);
            } catch {}
          }

          // Extrair centros de custo embutidos, se existirem
          const embeddedCostCenters: CostCenter[] = [];
          wsRes.forEach((w: Workspace & { costCenters?: CostCenter[] }) => {
            if (Array.isArray(w.costCenters)) {
              embeddedCostCenters.push(...w.costCenters);
            }
          });
          if (embeddedCostCenters.length > 0) {
            setCostCenters(embeddedCostCenters);
          }
        }

        if (accRes && Array.isArray(accRes)) {
          setAccounts(accRes);
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}acc`, JSON.stringify(accRes));
          } catch {}
        }

        // Categorias: usa /api/categories ou categorias aninhadas nos workspaces
        let resolvedCategories: Category[] = [];
        if (catRes && Array.isArray(catRes) && catRes.length > 0) {
          resolvedCategories = catRes;
        } else if (wsRes && Array.isArray(wsRes)) {
          wsRes.forEach((w: Workspace & { categories?: Category[] }) => {
            if (Array.isArray(w.categories)) {
              resolvedCategories.push(...w.categories);
            }
          });
        }

        // Se o workspace ativo ainda não tiver categorias no banco, solicita seed via endpoint específico
        if (activeWsId && !resolvedCategories.some((c) => c.workspaceId === activeWsId)) {
          try {
            const seededRes = await fetch(
              `/api/categories?workspaceId=${encodeURIComponent(activeWsId)}`
            );
            if (seededRes.ok) {
              const seededCats: Category[] = await seededRes.json();
              if (Array.isArray(seededCats) && seededCats.length > 0) {
                resolvedCategories = [
                  ...resolvedCategories.filter((c) => c.workspaceId !== activeWsId),
                  ...seededCats,
                ];
              }
            }
          } catch {}
        }

        if (resolvedCategories.length > 0) {
          resolvedCategories.forEach((c) => syncedCategoryWorkspacesRef.current.add(c.workspaceId));
          setCategories(resolvedCategories);
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}cat`, JSON.stringify(resolvedCategories));
          } catch {}
        }

        if (txRes && Array.isArray(txRes)) {
          const mappedTx = txRes.map((t: Transaction) => ({
            ...t,
            date: typeof t.date === 'string' ? t.date.split('T')[0] : t.date,
          }));
          setTransactions(mappedTx);
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}tx`, JSON.stringify(mappedTx));
          } catch {}
        }

        if (payRes && Array.isArray(payRes)) {
          const mappedPay = payRes.map((p: PayableReceivable) => ({
            ...p,
            dueDate: typeof p.dueDate === 'string' ? p.dueDate.split('T')[0] : p.dueDate,
          }));
          setPayablesReceivables(mappedPay);
        }
      } catch (err) {
        console.info('Carregando base local:', err);
      } finally {
        setIsTransactionsLoading(false);
        setIsCategoriesLoading(false);
        inFlightSyncRef.current = null;
      }
    })();

    inFlightSyncRef.current = syncPromise;
    return syncPromise;
  }, []);

  // Load persisted state from localStorage once on mount
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
      if (savedWs) {
        currentWorkspaceIdRef.current = savedWs;
        setCurrentWorkspaceId(savedWs);
      }

      const savedTx = localStorage.getItem(`${STORAGE_KEY_PREFIX}tx`);
      if (savedTx) setTransactions(JSON.parse(savedTx));

      const savedAcc = localStorage.getItem(`${STORAGE_KEY_PREFIX}acc`);
      if (savedAcc) setAccounts(JSON.parse(savedAcc));

      const savedCat = localStorage.getItem(`${STORAGE_KEY_PREFIX}cat`);
      if (savedCat) {
        const parsedCat = JSON.parse(savedCat);
        if (Array.isArray(parsedCat) && parsedCat.length > 0) {
          setCategories(parsedCat);
        }
      }

      const savedSalaries = localStorage.getItem(`${STORAGE_KEY_PREFIX}salaries`);
      if (savedSalaries) {
        try {
          setSalariesByWorkspace(JSON.parse(savedSalaries));
        } catch {}
      }

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

  // Quando o usuário troca de workspace, garante que as categorias daquele workspace estejam populadas
  useEffect(() => {
    if (!currentUser || !currentWorkspaceId) return;
    const hasCatsForWorkspace = categories.some((c) => c.workspaceId === currentWorkspaceId);
    if (!hasCatsForWorkspace && !syncedCategoryWorkspacesRef.current.has(currentWorkspaceId)) {
      refreshCategories(currentWorkspaceId);
    }
  }, [currentWorkspaceId, currentUser, categories, refreshCategories]);

  // Auth Methods
  const login = useCallback(
    async (email: string, password: string) => {
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
          const firstWsId = data.workspaces[0].id;
          currentWorkspaceIdRef.current = firstWsId;
          setCurrentWorkspaceId(firstWsId);
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}ws`, firstWsId);
          } catch {}

          // Extrair categorias já vindas no login para resposta imediata
          const loginCats: Category[] = [];
          data.workspaces.forEach((w: Workspace & { categories?: Category[] }) => {
            if (Array.isArray(w.categories)) {
              loginCats.push(...w.categories);
            }
          });
          if (loginCats.length > 0) {
            setCategories(loginCats);
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}cat`, JSON.stringify(loginCats));
            } catch {}
          }
        }

        await loadFromNeon(data.user.id);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro de conexão';
        return { success: false, error: msg };
      }
    },
    [loadFromNeon]
  );

  const register = useCallback(
    async (name: string, email: string, password: string, workspaceName?: string) => {
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
          currentWorkspaceIdRef.current = data.workspace.id;
          setCurrentWorkspaceId(data.workspace.id);
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}ws`, data.workspace.id);
          } catch {}
        }

        await loadFromNeon(data.user.id);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro de conexão';
        return { success: false, error: msg };
      }
    },
    [loadFromNeon]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    syncedCategoryWorkspacesRef.current.clear();
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}user`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}ws`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}tx`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}acc`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}cat`);
    } catch {}
    setTransactions([]);
    setPayablesReceivables([]);
    setAccounts(INITIAL_ACCOUNTS);
    setCategories(INITIAL_CATEGORIES);
    setWorkspaces(INITIAL_WORKSPACES);
    currentWorkspaceIdRef.current = 'ws-personal';
    setCurrentWorkspaceId('ws-personal');
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
    currentWorkspaceIdRef.current = id;
    setCurrentWorkspaceId(id);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}ws`, id);
    } catch {}
  }, []);

  const currentWorkspace = useMemo(() => {
    return (
      workspaces.find((w) => w.id === currentWorkspaceId) ||
      workspaces[0] ||
      INITIAL_WORKSPACES[0]
    );
  }, [workspaces, currentWorkspaceId]);

  // Salary getter & setter
  const monthlySalary = useMemo(() => {
    return salariesByWorkspace[currentWorkspaceId] || 0;
  }, [salariesByWorkspace, currentWorkspaceId]);

  const setMonthlySalary = useCallback(
    (amount: number, workspaceId?: string) => {
      const targetWs = workspaceId || currentWorkspaceIdRef.current;
      const sanitized = Math.max(0, Number(amount) || 0);
      setSalariesByWorkspace((prev) => {
        const next = { ...prev, [targetWs]: sanitized };
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}salaries`, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  // Currency converter
  const convertAmount = useCallback(
    (amount: number, from: CurrencyType, to?: CurrencyType): number => {
      const target = to || activeCurrency;
      if (from === target) return amount;

      let inBRL = amount;
      if (from === 'USD') inBRL = amount * exchangeRates.USD_BRL;
      if (from === 'EUR') inBRL = amount * exchangeRates.EUR_BRL;

      if (target === 'BRL') return inBRL;
      if (target === 'USD') return inBRL / exchangeRates.USD_BRL;
      if (target === 'EUR') return inBRL / exchangeRates.EUR_BRL;

      return inBRL;
    },
    [activeCurrency, exchangeRates]
  );

  const formatMoney = useCallback(
    (amount: number, currency?: CurrencyType): string => {
      const curr = currency || activeCurrency;
      const symbols = { BRL: 'R$', USD: 'US$', EUR: '€' };
      const symbol = symbols[curr] || 'R$';

      const formatted = Math.abs(amount).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return amount < 0 ? `-${symbol} ${formatted}` : `${symbol} ${formatted}`;
    },
    [activeCurrency]
  );

  // Filtered lists by active workspace (Golden Rule: Strict context isolation)
  const currentAccounts = useMemo(() => {
    return accounts.filter((a) => a.workspaceId === currentWorkspaceId);
  }, [accounts, currentWorkspaceId]);

  const currentCategories = useMemo(() => {
    const wsCats = categories.filter((c) => c.workspaceId === currentWorkspaceId);
    if (wsCats.length > 0) return wsCats;
    // Se ainda não houver categorias salvas para o workspace atual e não estiver carregando do banco,
    // disponibiliza as categorias padrão ativas para o contexto atual
    if (!isCategoriesLoading) {
      return buildDefaultCategoriesForWorkspace(currentWorkspaceId, currentWorkspace?.type);
    }
    return [];
  }, [categories, currentWorkspaceId, currentWorkspace?.type, isCategoriesLoading]);

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
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}acc`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAcc),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((created) => {
        if (created?.id) {
          setAccounts((prev) => {
            const updated = prev.map((a) => (a.id === newAcc.id ? created : a));
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}acc`, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      })
      .catch(() => {});
  }, []);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}acc`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Category & Workspace actions
  const addCategory = useCallback(async (cat: Omit<Category, 'id'>): Promise<Category> => {
    const tempId = `cat-local-${Date.now()}`;
    const optimisticCat: Category = { ...cat, id: tempId };

    setCategories((prev) => {
      const updated = [...prev, optimisticCat];
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}cat`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat),
      });
      if (res.ok) {
        const created: Category = await res.json();
        setCategories((prev) => {
          const updated = prev.map((c) => (c.id === tempId ? created : c));
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}cat`, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        return created;
      }
    } catch {}

    return optimisticCat;
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}cat`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    fetch(`/api/categories?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
  }, []);

  const addWorkspace = useCallback(
    (ws: Omit<Workspace, 'id' | 'createdAt'>) => {
      const tempId = `ws-${Date.now()}`;
      const newWs: Workspace = {
        ...ws,
        id: tempId,
        createdAt: new Date().toISOString(),
      };
      const defaultCats = buildDefaultCategoriesForWorkspace(tempId, ws.type);

      setWorkspaces((prev) => [...prev, newWs]);
      setCategories((prev) => [...prev, ...defaultCats]);
      currentWorkspaceIdRef.current = newWs.id;
      setCurrentWorkspaceId(newWs.id);

      fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newWs, userId: currentUser?.id }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((createdWs) => {
          if (createdWs?.id) {
            setWorkspaces((prev) => prev.map((w) => (w.id === tempId ? createdWs : w)));
            if (Array.isArray(createdWs.accounts) && createdWs.accounts.length > 0) {
              setAccounts((prev) => [...prev, ...createdWs.accounts]);
            }
            if (Array.isArray(createdWs.categories) && createdWs.categories.length > 0) {
              setCategories((prev) => [
                ...prev.filter((c) => c.workspaceId !== tempId),
                ...createdWs.categories,
              ]);
            }
            if (currentWorkspaceIdRef.current === tempId) {
              currentWorkspaceIdRef.current = createdWs.id;
              setCurrentWorkspaceId(createdWs.id);
              try {
                localStorage.setItem(`${STORAGE_KEY_PREFIX}ws`, createdWs.id);
              } catch {}
            }
          }
        })
        .catch(() => {});
    },
    [currentUser?.id]
  );

  // Transaction Actions with Inter-Context Awareness (Golden Rule!)
  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id'>) => {
      const txId = `tx-${Date.now()}`;
      const newTx: Transaction = { ...tx, id: txId };

      // Update account balance
      setAccounts((prev) => {
        const updated = prev.map((acc) => {
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
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}acc`, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Check if this is an inter-context operation (e.g. Pró-labore withdrawal from Corporate to Personal)
      const extraTransactions: Transaction[] = [];
      if (newTx.linkedWorkspaceId && newTx.tags.includes('pro-labore')) {
        const personalAccount = accounts.find((a) => a.workspaceId === newTx.linkedWorkspaceId);
        if (personalAccount) {
          const personalSalaryCat = categories.find(
            (c) => c.workspaceId === newTx.linkedWorkspaceId && c.type === 'INCOME'
          );
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
            categoryId: personalSalaryCat?.id,
          };
          extraTransactions.push(mirrorTx);

          setAccounts((prev) =>
            prev.map((a) =>
              a.id === personalAccount.id
                ? { ...a, currentBalance: a.currentBalance + newTx.amount }
                : a
            )
          );
        }
      }

      setTransactions((prev) => {
        const updated = [newTx, ...extraTransactions, ...prev];
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}tx`, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((created) => {
          if (created?.id) {
            setTransactions((prev) => {
              const updated = prev.map((t) =>
                t.id === txId
                  ? {
                      ...newTx,
                      id: created.id,
                    }
                  : t
              );
              try {
                localStorage.setItem(`${STORAGE_KEY_PREFIX}tx`, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        })
        .catch(() => {});
    },
    [accounts, categories, currentWorkspace.name]
  );

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) => {
      const existing = prev.find((t) => t.id === id);
      if (!existing) return prev;

      const updatedTx: Transaction = { ...existing, ...updates };

      // Ajustar saldos das contas caso valor, tipo ou conta tenham sido alterados
      setAccounts((accs) => {
        const nextAccs = accs.map((acc) => {
          let balance = acc.currentBalance;

          // Reverter impacto antigo
          if (acc.id === existing.accountId) {
            if (existing.type === 'INCOME') balance -= existing.amount;
            else if (existing.type === 'EXPENSE' || existing.type === 'TRANSFER')
              balance += existing.amount;
          }
          if (existing.type === 'TRANSFER' && acc.id === existing.targetAccountId) {
            balance -= existing.amount;
          }

          // Aplicar novo impacto
          if (acc.id === updatedTx.accountId) {
            if (updatedTx.type === 'INCOME') balance += updatedTx.amount;
            else if (updatedTx.type === 'EXPENSE' || updatedTx.type === 'TRANSFER')
              balance -= updatedTx.amount;
          }
          if (updatedTx.type === 'TRANSFER' && acc.id === updatedTx.targetAccountId) {
            balance += updatedTx.amount;
          }

          return balance !== acc.currentBalance ? { ...acc, currentBalance: balance } : acc;
        });

        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}acc`, JSON.stringify(nextAccs));
        } catch {}
        return nextAccs;
      });

      const updatedList = prev.map((t) => (t.id === id ? updatedTx : t));
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}tx`, JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    }).catch(() => {});
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => {
      const tx = prev.find((t) => t.id === id);
      if (tx) {
        setAccounts((accs) => {
          const nextAccs = accs.map((acc) => {
            if (acc.id === tx.accountId) {
              if (tx.type === 'INCOME')
                return { ...acc, currentBalance: acc.currentBalance - tx.amount };
              if (tx.type === 'EXPENSE')
                return { ...acc, currentBalance: acc.currentBalance + tx.amount };
              if (tx.type === 'TRANSFER')
                return { ...acc, currentBalance: acc.currentBalance + tx.amount };
            }
            if (tx.type === 'TRANSFER' && acc.id === tx.targetAccountId) {
              return { ...acc, currentBalance: acc.currentBalance - tx.amount };
            }
            return acc;
          });
          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}acc`, JSON.stringify(nextAccs));
          } catch {}
          return nextAccs;
        });
      }
      const updated = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}tx`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    fetch(`/api/transactions?id=${encodeURIComponent(id)}`, {
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

  const settlePayableReceivable = useCallback(
    (id: string, accountId: string, paymentDate?: string) => {
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
            body: JSON.stringify({
              id,
              status: 'PAID',
              paymentDate: finalDate,
              finalAmount: finalAmt,
              accountId,
            }),
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
    },
    [addTransaction]
  );

  // Goals
  const addGoal = useCallback((goal: Omit<Goal, 'id'>) => {
    setGoals((prev) => [...prev, { ...goal, id: `goal-${Date.now()}` }]);
  }, []);

  const contributeToGoal = useCallback((id: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g))
    );
  }, []);

  // Compute stats and KPIs
  const stats = useMemo(() => {
    const totalBalance = currentAccounts.reduce((acc, account) => {
      const converted = convertAmount(account.currentBalance, account.currency, activeCurrency);
      return acc + converted;
    }, 0);

    let monthIncome = 0;
    let monthExpense = 0;

    for (let i = 0; i < currentTransactions.length; i++) {
      const tx = currentTransactions[i];
      if (tx.status === 'COMPLETED' && tx.date.startsWith(currentMonthPrefix)) {
        const converted = convertAmount(tx.amount, tx.currency, activeCurrency);
        if (tx.type === 'INCOME') monthIncome += converted;
        else if (tx.type === 'EXPENSE') monthExpense += converted;
      }
    }

    const monthNet = monthIncome - monthExpense;

    let pendingPayables = 0;
    let pendingReceivables = 0;
    let overdueCount = 0;

    for (let i = 0; i < currentPayablesReceivables.length; i++) {
      const pr = currentPayablesReceivables[i];
      if (pr.status === 'PENDING' || pr.status === 'OVERDUE' || pr.status === 'SCHEDULED') {
        const totalWithInterest = pr.amount + (pr.accruedInterest || 0);
        if (pr.type === 'PAYABLE') {
          pendingPayables += totalWithInterest;
          if (pr.status === 'OVERDUE') overdueCount++;
        } else {
          pendingReceivables += totalWithInterest;
        }
      }
    }

    const projectedBalance = totalBalance + pendingReceivables - pendingPayables;
    const hasCashDeficitAlert = projectedBalance < 0;

    return {
      totalBalance,
      monthIncome,
      monthExpense,
      monthNet,
      projectedBalance,
      hasCashDeficitAlert,
      overduePayablesCount: overdueCount,
      budgetAlertsCount: 0,
    };
  }, [
    currentAccounts,
    currentTransactions,
    currentPayablesReceivables,
    currentMonthPrefix,
    convertAmount,
    activeCurrency,
  ]);

  const contextValue = useMemo<FinanceContextType>(
    () => ({
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
      allCategories: categories,
      isCategoriesLoading,
      costCenters: currentCostCenters,
      addCategory,
      deleteCategory,
      refreshCategories,

      transactions: currentTransactions,
      allTransactions: transactions,
      isTransactionsLoading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      editingTransaction,
      setEditingTransaction,

      monthlySalary,
      setMonthlySalary,
      currentMonthPrefix,
      setCurrentMonthPrefix,

      payablesReceivables: currentPayablesReceivables,
      addPayableReceivable,
      settlePayableReceivable,

      budgets: currentBudgets,
      goals: currentGoals,
      addGoal,
      contributeToGoal,

      isNewTransactionModalOpen,
      setIsNewTransactionModalOpen: handleSetModalOpen,
      activeView,
      setActiveView,
      theme,
      toggleTheme,

      stats,
    }),
    [
      currentUser,
      isAuthLoading,
      login,
      register,
      logout,
      workspaces,
      currentWorkspaceId,
      currentWorkspace,
      handleSetWorkspace,
      addWorkspace,
      activeCurrency,
      exchangeRates,
      convertAmount,
      formatMoney,
      currentAccounts,
      accounts,
      addAccount,
      updateAccount,
      deleteAccount,
      currentCategories,
      categories,
      isCategoriesLoading,
      currentCostCenters,
      addCategory,
      deleteCategory,
      refreshCategories,
      currentTransactions,
      transactions,
      isTransactionsLoading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      editingTransaction,
      setEditingTransaction,
      monthlySalary,
      setMonthlySalary,
      currentMonthPrefix,
      currentPayablesReceivables,
      addPayableReceivable,
      settlePayableReceivable,
      currentBudgets,
      currentGoals,
      addGoal,
      contributeToGoal,
      isNewTransactionModalOpen,
      handleSetModalOpen,
      activeView,
      theme,
      toggleTheme,
      stats,
    ]
  );

  return <FinanceContext.Provider value={contextValue}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
