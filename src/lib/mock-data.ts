import { 
  Workspace, 
  Account, 
  Category, 
  CostCenter, 
  Transaction, 
  PayableReceivable, 
  Budget, 
  Goal, 
  BankStatementItem, 
  ReconciliationRule 
} from '@/types/finance';

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: 'ws-personal',
    name: 'Meu Espaço Pessoal',
    type: 'PERSONAL',
    defaultCurrency: 'BRL',
    colorTheme: '#10b981',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-principal',
    name: 'Conta Corrente Principal',
    type: 'CHECKING',
    bankName: 'Meu Banco',
    currency: 'BRL',
    initialBalance: 0,
    currentBalance: 0,
    color: '#10b981',
    workspaceId: 'ws-personal',
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  // Receitas
  { id: 'cat-pf-salario', name: 'Salário / Renda Principal', type: 'INCOME', icon: 'Briefcase', color: '#10b981', workspaceId: 'ws-personal' },
  { id: 'cat-pf-div', name: 'Dividendos & Rendimentos', type: 'INCOME', icon: 'TrendingUp', color: '#06b6d4', workspaceId: 'ws-personal' },
  { id: 'cat-pf-free', name: 'Serviços & Consultorias', type: 'INCOME', icon: 'Laptop', color: '#3b82f6', workspaceId: 'ws-personal' },

  // Despesas
  { id: 'cat-pf-moradia', name: 'Moradia & Contas', type: 'EXPENSE', icon: 'Home', color: '#ef4444', workspaceId: 'ws-personal' },
  { id: 'cat-pf-alimen', name: 'Alimentação & Mercado', type: 'EXPENSE', icon: 'ShoppingBag', color: '#f97316', workspaceId: 'ws-personal' },
  { id: 'cat-pf-transp', name: 'Transporte & Combustível', type: 'EXPENSE', icon: 'Car', color: '#f59e0b', workspaceId: 'ws-personal' },
  { id: 'cat-pf-saude', name: 'Saúde & Farmácia', type: 'EXPENSE', icon: 'Heart', color: '#ec4899', workspaceId: 'ws-personal' },
  { id: 'cat-pf-educa', name: 'Educação & Cursos', type: 'EXPENSE', icon: 'BookOpen', color: '#6366f1', workspaceId: 'ws-personal' },
  { id: 'cat-pf-lazer', name: 'Lazer & Restaurantes', type: 'EXPENSE', icon: 'Compass', color: '#8b5cf6', workspaceId: 'ws-personal' },
];

export const INITIAL_COST_CENTERS: CostCenter[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_PAYABLES_RECEIVABLES: PayableReceivable[] = [];

export const INITIAL_BUDGETS: Budget[] = [];

export const INITIAL_GOALS: Goal[] = [];

export const INITIAL_STATEMENTS: BankStatementItem[] = [];

export const INITIAL_RECONCILIATION_RULES: ReconciliationRule[] = [];
