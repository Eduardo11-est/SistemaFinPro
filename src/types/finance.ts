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

export interface Attachment {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  url: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string; // ISO date string YYYY-MM-DD
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

  // Inter-contextos (Pró-labore, distribuição de lucros, aporte)
  linkedTransactionId?: string;
  linkedWorkspaceId?: string;

  workspaceId: string;
  accountId: string;
  targetAccountId?: string;
  categoryId?: string;
  subcategoryId?: string;
  costCenterId?: string;
  attachments?: Attachment[];
}

export interface PayableReceivable {
  id: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paymentDate?: string;
  status: SettlementStatus;
  recipientOrPayer?: string;
  notes?: string;
  
  // Juros e multas por atraso
  penaltyRate: number; // % (ex: 2%)
  interestRateDaily: number; // % ao dia (ex: 0.033%)
  accruedInterest: number; // Valor calculado adicional
  finalAmount?: number;

  workspaceId: string;
  accountId?: string;
  categoryId?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  monthlyLimit: number;
  currentSpent: number;
  period: string; // "YYYY-MM"
  workspaceId: string;
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
