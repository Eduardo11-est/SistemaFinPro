export type WorkspaceType = 'PERSONAL' | 'CORPORATE';

export type AccountType = 
  | 'CHECKING' 
  | 'SAVINGS' 
  | 'CREDIT_CARD' 
  | 'CASH' 
  | 'INVESTMENT' 
  | 'GATEWAY';

export type CurrencyType = 'BRL' | 'USD' | 'EUR';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED';

export type SettlementStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'SCHEDULED';

export type RecurrenceFrequency = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  document?: string; // CPF ou CNPJ
  legalName?: string; // Razão social
  defaultCurrency: CurrencyType;
  colorTheme?: string;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bankName?: string;
  currency: CurrencyType;
  initialBalance: number;
  currentBalance: number;
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
  color?: string;
  workspaceId: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon?: string;
  color?: string;
  workspaceId: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface CostCenter {
  id: string;
  code?: string;
  name: string;
  description?: string;
  budgetLimit?: number;
  workspaceId: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  paymentMethod?: string;
  currency: CurrencyType;
  exchangeRate: number;
  notes?: string;
  tags: string[];
  
  // Parcelamento
  isInstallment?: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
  installmentGroupId?: string;

  // Recorrência
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;

  // Vínculos Inter-Contexto (PJ -> PF)
  linkedTransactionId?: string;
  linkedWorkspaceId?: string;

  // Relacionamentos
  workspaceId: string;
  accountId: string;
  targetAccountId?: string; // Para transferências
  categoryId?: string;
  subcategoryId?: string;
  costCenterId?: string;
  attachments?: string[];
}

export interface PayableReceivable {
  id: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  description: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: SettlementStatus;
  recipientOrPayer?: string;
  notes?: string;
  
  penaltyRate?: number; // %
  interestRateDaily?: number; // % ao dia
  accruedInterest?: number; // Valor calculado em atraso
  finalAmount?: number;

  workspaceId: string;
  accountId?: string;
  categoryId?: string;
}

export interface Budget {
  id: string;
  monthlyLimit: number;
  currentSpent: number;
  period: string; // "YYYY-MM"
  workspaceId: string;
  categoryId: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  color?: string;
  icon?: string;
  category?: string;
  workspaceId: string;
}

export interface BankStatementItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  fitId?: string;
  isReconciled: boolean;
  matchedTransactionId?: string;
  suggestedCategoryId?: string;
}

export interface ReconciliationRule {
  id: string;
  keyword: string;
  targetType: TransactionType;
  suggestedCategoryId?: string;
  workspaceId: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  details: string;
  timestamp: string;
  workspaceId?: string;
}

export interface ExchangeRates {
  USD_BRL: number;
  EUR_BRL: number;
}
