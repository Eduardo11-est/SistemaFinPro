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

const STORAGE_KEY_PREFIX = 'finpro_store_v3_';

/**
 * Gera chave de armazenamento isolada por usuário (Multi-Tenant no navegador).
 * Garante que um cliente jamais veja cache de outro cliente no mesmo dispositivo.
 */
function getUserStorageKey(userId: string | null | undefined, key: string): string {
  const scope = userId ? `u_${userId}` : 'guest';
  return `${STORAGE_KEY_PREFIX}${scope}_${key}`;
}

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
  const currentUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? null;
  }, [currentUser]);

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

  // Data states (isolados por cliente)
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState<boolean>(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>(INITIAL_COST_CENTERS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState<boolean>(false);
  const [payablesReceivables, setPayablesReceivables] = useState<PayableReceivable[]>(
    INITIAL_PAYABLES_RECEIVABLES
  );
  const [budgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);

  // Salary per workspace (isolado por cliente)
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

  /**
   * Limpa imediatamente todos os dados em memória para impedir qualquer vazamento
   * visual ao trocar de conta de usuário.
   */
  const resetClientDataState = useCallback(() => {
    syncedCategoryWorkspacesRef.current.clear();
    setWorkspaces([]);
    setAccounts([]);
    setCategories([]);
    setCostCenters([]);
    setTransactions([]);
    setPayablesReceivables([]);
    setGoals([]);
    setSalariesByWorkspace({});
  }, []);

  /**
   * Hidrata o cache local exclusivo daquele usuário específico (se existir)
   */
  const hydrateUserCache = useCallback((userId: string) => {
    try {
      const savedWs = localStorage.getItem(getUserStorageKey(userId, 'ws'));
      if (savedWs) {
        currentWorkspaceIdRef.current = savedWs;
        setCurrentWorkspaceId(savedWs);
      }

      const savedTx = localStorage.getItem(getUserStorageKey(userId, 'tx'));
      setTransactions(savedTx ? JSON.parse(savedTx) : []);

      const savedAcc = localStorage.getItem(getUserStorageKey(userId, 'acc'));
      setAccounts(savedAcc ? JSON.parse(savedAcc) : []);

      const savedCat = localStorage.getItem(getUserStorageKey(userId, 'cat'));
      setCategories(savedCat ? JSON.parse(savedCat) : []);

      const savedPay = localStorage.getItem(getUserStorageKey(userId, 'pay'));
      setPayablesReceivables(savedPay ? JSON.parse(savedPay) : []);

      const savedSalaries = localStorage.getItem(getUserStorageKey(userId, 'salaries'));
      setSalariesByWorkspace(savedSalaries ? JSON.parse(savedSalaries) : {});

      const savedGoals = localStorage.getItem(getUserStorageKey(userId, 'goals'));
      setGoals(savedGoals ? JSON.parse(savedGoals) : []);
    } catch {}
  }, []);

  const refreshCategories = useCallback(async (targetWorkspaceId?: string) => {
    const wsId = targetWorkspaceId || currentWorkspaceIdRef.current;
    const uid = currentUserIdRef.current;
    if (!wsId || !uid) return;

    setIsCategoriesLoading(true);
    try {
      const res = await fetch(
        `/api/categories?workspaceId=${encodeURIComponent(wsId)}&userId=${encodeURIComponent(uid)}`,
        {
          headers: { 'x-user-id': uid },
        }
      );
      if (res.ok) {
        const fetchedCats: Category[] = await res.json();
        if (Array.isArray(fetchedCats) && fetchedCats.length > 0) {
          syncedCategoryWorkspacesRef.current.add(wsId);
          setCategories((prev) => {
            const otherWsCats = prev.filter((c) => c.workspaceId !== wsId);
            const merged = [...otherWsCats, ...fetchedCats];
            try {
              localStorage.setItem(getUserStorageKey(uid, 'cat'), JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    } catch {
      // Fallback silencioso
    } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  // Sincronização 100% isolada por userId com o Neon PostgreSQL
  const loadFromNeon = useCallback(async (userId: string) => {
    if (!userId) return;
    if (inFlightSyncRef.current) {
      return inFlightSyncRef.current;
    }

    const syncPromise = (async () => {
      setIsTransactionsLoading(true);
      setIsCategoriesLoading(true);
      try {
        const userParam = `?userId=${encodeURIComponent(userId)}`;
        const headers = { 'x-user-id': userId };

        const [wsRes, accRes, catRes, txRes, payRes] = await Promise.all([
          fetch(`/api/workspaces${userParam}`, { headers }).then((r) => (r.ok ? r.json() : null)),
          fetch(`/api/accounts${userParam}`, { headers }).then((r) => (r.ok ? r.json() : null)),
          fetch(`/api/categories${userParam}`, { headers }).then((r) => (r.ok ? r.json() : null)),
          fetch(`/api/transactions${userParam}`, { headers }).then((r) => (r.ok ? r.json() : null)),
          fetch(`/api/payables${userParam}`, { headers }).then((r) => (r.ok ? r.json() : null)),
        ]);

        let activeWsId = currentWorkspaceIdRef.current;

        if (wsRes && Array.isArray(wsRes) && wsRes.length > 0) {
          setWorkspaces(wsRes);
          if (!wsRes.some((w: Workspace) => w.id === activeWsId)) {
            activeWsId = wsRes[0].id;
            currentWorkspaceIdRef.current = activeWsId;
            setCurrentWorkspaceId(activeWsId);
            try {
              localStorage.setItem(getUserStorageKey(userId, 'ws'), activeWsId);
            } catch {}
          }

          const embeddedCostCenters: CostCenter[] = [];
          wsRes.forEach((w: Workspace & { costCenters?: CostCenter[] }) => {
            if (Array.isArray(w.costCenters)) {
              embeddedCostCenters.push(...w.costCenters);
            }
          });
          setCostCenters(embeddedCostCenters);
        }

        if (accRes && Array.isArray(accRes)) {
          setAccounts(accRes);
          try {
            localStorage.setItem(getUserStorageKey(userId, 'acc'), JSON.stringify(accRes));
          } catch {}
        }

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

        if (activeWsId && !resolvedCategories.some((c) => c.workspaceId === activeWsId)) {
          try {
            const seededRes = await fetch(
              `/api/categories?workspaceId=${encodeURIComponent(activeWsId)}&userId=${encodeURIComponent(userId)}`,
              { headers }
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
            localStorage.setItem(
              getUserStorageKey(userId, 'cat'),
              JSON.stringify(resolvedCategories)
            );
          } catch {}
        }

        if (txRes && Array.isArray(txRes)) {
          const mappedTx = txRes.map((t: Transaction) => ({
            ...t,
            date: typeof t.date === 'string' ? t.date.split('T')[0] : t.date,
          }));
          setTransactions(mappedTx);
          try {
            localStorage.setItem(getUserStorageKey(userId, 'tx'), JSON.stringify(mappedTx));
          } catch {}
        }

        if (payRes && Array.isArray(payRes)) {
          const mappedPay = payRes.map((p: PayableReceivable) => ({
            ...p,
            dueDate: typeof p.dueDate === 'string' ? p.dueDate.split('T')[0] : p.dueDate,
          }));
          setPayablesReceivables(mappedPay);
          try {
            localStorage.setItem(getUserStorageKey(userId, 'pay'), JSON.stringify(mappedPay));
          } catch {}
        }
      } catch (err) {
        console.info('Carregando base local do usuário:', err);
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
      const savedTheme = localStorage.getItem(`${STORAGE_KEY_PREFIX}theme`) as
        | 'dark'
        | 'light'
        | null;
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

      const now = new Date();
      setCurrentMonthPrefix(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

      const savedUserStr = localStorage.getItem(`${STORAGE_KEY_PREFIX}active_user`);
      let userObj: AuthUser | null = null;
      if (savedUserStr) {
        try {
          userObj = JSON.parse(savedUserStr);
          if (userObj?.id) {
            currentUserIdRef.current = userObj.id;
            setCurrentUser(userObj);
            hydrateUserCache(userObj.id);
            loadFromNeon(userObj.id);
          }
        } catch {}
      }
    } catch {
      // Ignora erro no SSR
    } finally {
      setIsAuthLoading(false);
    }
  }, [hydrateUserCache, loadFromNeon]);

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

        // Limpa estado anterior antes de carregar os dados exclusivos deste cliente
        resetClientDataState();

        const loggedUser: AuthUser = data.user;
        currentUserIdRef.current = loggedUser.id;
        setCurrentUser(loggedUser);
        setActiveView('dashboard');

        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}active_user`, JSON.stringify(loggedUser));
        } catch {}

        // Hidrata configurações locais exclusivas deste usuário (ex: salário configurado, metas)
        hydrateUserCache(loggedUser.id);

        if (data.workspaces && data.workspaces.length > 0) {
          setWorkspaces(data.workspaces);
          const firstWsId = data.workspaces[0].id;
          currentWorkspaceIdRef.current = firstWsId;
          setCurrentWorkspaceId(firstWsId);
          try {
            localStorage.setItem(getUserStorageKey(loggedUser.id, 'ws'), firstWsId);
          } catch {}

          const loginAccounts: Account[] = [];
          const loginCats: Category[] = [];
          data.workspaces.forEach(
            (w: Workspace & { accounts?: Account[]; categories?: Category[] }) => {
              if (Array.isArray(w.accounts)) loginAccounts.push(...w.accounts);
              if (Array.isArray(w.categories)) loginCats.push(...w.categories);
            }
          );
          if (loginAccounts.length > 0) {
            setAccounts(loginAccounts);
            try {
              localStorage.setItem(
                getUserStorageKey(loggedUser.id, 'acc'),
                JSON.stringify(loginAccounts)
              );
            } catch {}
          }
          if (loginCats.length > 0) {
            setCategories(loginCats);
            try {
              localStorage.setItem(
                getUserStorageKey(loggedUser.id, 'cat'),
                JSON.stringify(loginCats)
              );
            } catch {}
          }
        }

        await loadFromNeon(loggedUser.id);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro de conexão';
        return { success: false, error: msg };
      }
    },
    [hydrateUserCache, loadFromNeon, resetClientDataState]
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

        // Limpa qualquer estado anterior para iniciar a conta 100% zerada e exclusiva
        resetClientDataState();

        const newUser: AuthUser = data.user;
        currentUserIdRef.current = newUser.id;
        setCurrentUser(newUser);
        setActiveView('dashboard');

        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}active_user`, JSON.stringify(newUser));
        } catch {}

        if (data.workspace) {
          setWorkspaces([data.workspace]);
          currentWorkspaceIdRef.current = data.workspace.id;
          setCurrentWorkspaceId(data.workspace.id);
          try {
            localStorage.setItem(getUserStorageKey(newUser.id, 'ws'), data.workspace.id);
          } catch {}

          if (Array.isArray(data.workspace.accounts)) {
            setAccounts(data.workspace.accounts);
            try {
              localStorage.setItem(
                getUserStorageKey(newUser.id, 'acc'),
                JSON.stringify(data.workspace.accounts)
              );
            } catch {}
          }
          if (Array.isArray(data.workspace.categories)) {
            setCategories(data.workspace.categories);
            try {
              localStorage.setItem(
                getUserStorageKey(newUser.id, 'cat'),
                JSON.stringify(data.workspace.categories)
              );
            } catch {}
          }
        }

        await loadFromNeon(newUser.id);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro de conexão';
        return { success: false, error: msg };
      }
    },
    [loadFromNeon, resetClientDataState]
  );

  const logout = useCallback(() => {
    currentUserIdRef.current = null;
    setCurrentUser(null);
    resetClientDataState();
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}active_user`);
    } catch {}
  }, [resetClientDataState]);

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
    const uid = currentUserIdRef.current;
    if (uid) {
      try {
        localStorage.setItem(getUserStorageKey(uid, 'ws'), id);
      } catch {}
    }
  }, []);

  const currentWorkspace = useMemo(() => {
    return (
      workspaces.find((w) => w.id === currentWorkspaceId) ||
      workspaces[0] ||
      INITIAL_WORKSPACES[0]
    );
  }, [workspaces, currentWorkspaceId]);

  // Salary getter & setter (persistido por usuário e workspace)
  const monthlySalary = useMemo(() => {
    return salariesByWorkspace[currentWorkspaceId] || 0;
  }, [salariesByWorkspace, currentWorkspaceId]);

  const setMonthlySalary = useCallback((amount: number, workspaceId?: string) => {
    const targetWs = workspaceId || currentWorkspaceIdRef.current;
    const uid = currentUserIdRef.current;
    const sanitized = Math.max(0, Number(amount) || 0);
    setSalariesByWorkspace((prev) => {
      const next = { ...prev, [targetWs]: sanitized };
      if (uid) {
        try {
          localStorage.setItem(getUserStorageKey(uid, 'salaries'), JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

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
    const uid = currentUserIdRef.current;
    const newAcc: Account = {
      ...acc,
      id: `acc-${Date.now()}`,
    };
    setAccounts((prev) => {
      const updated = [...prev, newAcc];
      if (uid) {
        try {
          localStorage.setItem(getUserStorageKey(uid, 'acc'), JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    fetch('/api/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(uid ? { 'x-user-id': uid } : {}),
      },
      body: JSON.stringify({ ...newAcc, userId: uid }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((created) => {
        if (created?.id) {
          setAccounts((prev) => {
            const updated = prev.map((a) => (a.id === newAcc.id ? created : a));
            if (uid) {
              try {
                localStorage.setItem(getUserStorageKey(uid, 'acc'), JSON.stringify(updated));
              } catch {}
            }
            return updated;
          });
        }
      })
      .catch(() => {});
  }, []);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    const uid = currentUserIdRef.current;
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
      if (uid) {
        try {
          localStorage.setItem(getUserStorageKey(uid, 'acc'), JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }, []);

  const deleteAccount = useCallback((id: string) => {
    const uid = currentUserIdRef.current;
    setAccounts((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      if (uid) {
        try {
          localStorage.setItem(getUserStorageKey(uid, 'acc'), JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }, []);

  // Category & Workspace actions
  const addCategory = useCallback(async (cat: Omit<Category, 'id'>): Promise<Category> => {
    const uid = currentUserIdRef.current;
    const tempId = `cat-local-${Date.now()}`;
    const optimisticCat: Category = { ...cat, id: tempId };

    setCategories((prev) => {
      const updated = [...prev, optimisticCat];
      if (uid) {
        try {
          localStorage.setItem(getUserStorageKey(uid, 'cat'), JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(uid ? { 'x-user-id': uid } : {}),
        },
        body: JSON.stringify({ ...cat, userId: uid }),
      });
      if (res.ok) {
        const created: Category = await res.json();
        setCategories((prev) => {
          const updated = prev.map((c) => (c.id === tempId ? created : c));
          if (uid) {
            try {
              localStorage.setItem(getUserStorageKey(uid, 'cat'), JSON.stringify(updated));
            } catch {}
          }
          return updated;
        });
        return created;
      }
    } catch {}

    return optimisticCat;
  }, []);

  const deleteCategory = useCallback((id: string) => {
    const uid = currentUserIdRef.current;
    setCategories((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (uid) {
        try {
          localStorage.setItem(getUserStorageKey(uid, 'cat'), JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    fetch(
      `/api/categories?id=${encodeURIComponent(id)}${uid ? `&userId=${encodeURIComponent(uid)}` : ''}`,
      {
        method: 'DELETE',
        headers: uid ? { 'x-user-id': uid } : undefined,
      }
    ).catch(() => {});
  }, []);

  const addWorkspace = useCallback((ws: Omit<Workspace, 'id' | 'createdAt'>) => {
    const uid = currentUserIdRef.current;
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
      headers: {
        'Content-Type': 'application/json',
        ...(uid ? { 'x-user-id': uid } : {}),
      },
      body: JSON.stringify({ ...newWs, userId: uid }),
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
            if (uid) {
              try {
                localStorage.setItem(getUserStorageKey(uid, 'ws'), createdWs.id);
              } catch {}
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  // Transaction Actions with Inter-Context Awareness (Golden Rule!)
  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id'>) => {
      const uid = currentUserIdRef.current;
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
        if (uid) {
          try {
            localStorage.setItem(getUserStorageKey(uid, 'acc'), JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });

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
        if (uid) {
          try {
            localStorage.setItem(getUserStorageKey(uid, 'tx'), JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });

      fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(uid ? { 'x-user-id': uid } : {}),
        },
        body: JSON.stringify({ ...newTx, userId: uid }),
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
              if (uid) {
                try {
                  localStorage.setItem(getUserStorageKey(uid, 'tx'), JSON.stringify(updated));
                } catch {}
              }
              return updated;
            });
          }
        })
        .catch(() => {});
    },
    [accounts, categories, currentWorkspace.name]
  );

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    const uid = currentUserIdRef.current;
    setTransactions((prev) => {
      const existing = prev.find((t) => t.id === id);
      if (!existing) return prev;

      const updatedTx: Transaction = { ...existing, ...updates };

      setAccounts((accs) => {
        const nextAccs = accs.map((acc) => {
          let balance = acc.currentBalance;

          if (acc.id === existing.accountId) {
            if (existing.type === 'INCOME') balance -= existing.amount;
            else if (existing.type === 'EXPENSE' || existing.type === 'TRANSFER')
              balance += existing.amount;
          }
          if (existing.type === 'TRANSFER' && acc.id === existing.targetAccountId) {
            balance -= existing.amount;
          }

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

        if (uid) {
          try {
            localStorage.setItem(getUserStorageKey(uid, 'acc'), JSON.stringify(nextAccs));
          } catch {}
        }
        return nextAccs;
      });

      const updatedList = prev.map((t) => (t.id === id ? updatedTx : t));
      if (uid) {
        try {
          localStorage.setItem(getUserStorageKey(uid, 'tx'), JSON.stringify(updatedList));
        } catch {}
      }
      return updatedList;
    });

    fetch('/api/transactions', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(uid ? { 'x-user-id': uid } : {}),
      },
      body: JSON.stringify({ id, ...updates, userId: uid }),
    }).catch(() => {});
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    const uid = currentUserIdRef.current;
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
          if (uid) {
            try {
              localStorage.setItem(getUserStorageKey(uid, 'acc'), JSON.stringify(nextAccs));
            } catch {}
          }
          return nextAccs;
        });
      }
      const updated = prev.filter((t) => t.id !== id);
      if (uid) {
        try {
          localStorage.setItem(getUserStorageKey(uid, 'tx'), JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    fetch(
      `/api/transactions?id=${encodeURIComponent(id)}${uid ? `&userId=${encodeURIComponent(uid)}` : ''}`,
      {
        method: 'DELETE',
        headers: uid ? { 'x-user-id': uid } : undefined,
      }
    ).catch(() => {});
  }, []);

  // Payables & Receivables
  const addPayableReceivable = useCallback((pr: Omit<PayableReceivable, 'id'>) => {
    const uid = currentUserIdRef.current;
    const newPr = { ...pr, id: `pr-${Date.now()}` };
    setPayablesReceivables((prev) => {
      const updated = [...prev, newPr];
      if (uid) {
        try {
          localStorage.setItem(getUserStorageKey(uid, 'pay'), JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    fetch('/api/payables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(uid ? { 'x-user-id': uid } : {}),
      },
      body: JSON.stringify({ ...newPr, userId: uid }),
    }).catch(() => {});
  }, []);

  const settlePayableReceivable = useCallback(
    (id: string, accountId: string, paymentDate?: string) => {
      const uid = currentUserIdRef.current;
      const finalDate = paymentDate || new Date().toISOString().split('T')[0];
      setPayablesReceivables((prev) => {
        const updated = prev.map((pr) => {
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
            headers: {
              'Content-Type': 'application/json',
              ...(uid ? { 'x-user-id': uid } : {}),
            },
            body: JSON.stringify({
              id,
              status: 'PAID',
              paymentDate: finalDate,
              finalAmount: finalAmt,
              accountId,
              userId: uid,
            }),
          }).catch(() => {});

          return {
            ...pr,
            status: 'PAID' as const,
            paymentDate: finalDate,
            accountId,
            finalAmount: finalAmt,
          };
        });
        if (uid) {
          try {
            localStorage.setItem(getUserStorageKey(uid, 'pay'), JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    },
    [addTransaction]
  );

  // Goals (isoladas por usuário)
  const addGoal = useCallback((goal: Omit<Goal, 'id'>) => {
    const uid = currentUserIdRef.current;
    setGoals((prev) => {
      const updated = [...prev, { ...goal, id: `goal-${Date.now()}` }];
      if (uid) {
        try {
          localStorage.setItem(getUserStorageKey(uid, 'goals'), JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }, []);

  const contributeToGoal = useCallback((id: string, amount: number) => {
    const uid = currentUserIdRef.current;
    setGoals((prev) => {
      const updated = prev.map((g) =>
        g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g
      );
      if (uid) {
        try {
          localStorage.setItem(getUserStorageKey(uid, 'goals'), JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
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
