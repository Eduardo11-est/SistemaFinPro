import { Account, Category, Transaction } from '@/types/finance';

export type BudgetPillar = 'NEEDS' | 'WANTS' | 'GOALS';

export interface PillarMeta {
  id: BudgetPillar;
  label: string;
  shortLabel: string;
  targetPercent: number;
  tag: string;
  description: string;
  color: string;
}

export const BUDGET_PILLARS: Record<BudgetPillar, PillarMeta> = {
  NEEDS: {
    id: 'NEEDS',
    label: '50% Necessidades Essenciais',
    shortLabel: 'Necessidades (50%)',
    targetPercent: 50,
    tag: '50-necessidades',
    description: 'Moradia, alimentação, saúde, transporte, contas fixas e impostos',
    color: '#3b82f6',
  },
  WANTS: {
    id: 'WANTS',
    label: '30% Desejos & Estilo de Vida',
    shortLabel: 'Desejos (30%)',
    targetPercent: 30,
    tag: '30-desejos',
    description: 'Lazer, restaurantes, compras pessoais, viagens e assinaturas',
    color: '#a855f7',
  },
  GOALS: {
    id: 'GOALS',
    label: '20% Metas & Investimentos',
    shortLabel: 'Metas / Futuro (20%)',
    targetPercent: 20,
    tag: '20-metas',
    description: 'Reserva de emergência, investimentos, aportes em metas e educação',
    color: '#10b981',
  },
};

/**
 * Identifica o pilar 50/30/20 de uma transação com base nas tags explícitas
 * ou infere automaticamente pelo nome da categoria.
 */
export function resolveTransactionPillar(
  tx: Pick<Transaction, 'tags' | 'categoryId' | 'description'>,
  categories: Category[]
): BudgetPillar {
  const tags = tx.tags || [];
  if (tags.includes('50-necessidades')) return 'NEEDS';
  if (tags.includes('30-desejos')) return 'WANTS';
  if (tags.includes('20-metas')) return 'GOALS';

  const cat = categories.find((c) => c.id === tx.categoryId);
  const text = `${cat?.name || ''} ${tx.description || ''}`.toLowerCase();

  if (
    text.includes('invest') ||
    text.includes('reserva') ||
    text.includes('aporte') ||
    text.includes('meta') ||
    text.includes('poupan') ||
    text.includes('educa') ||
    text.includes('curso')
  ) {
    return 'GOALS';
  }

  if (
    text.includes('lazer') ||
    text.includes('restaurante') ||
    text.includes('ifd') ||
    text.includes('ifood') ||
    text.includes('streaming') ||
    text.includes('netflix') ||
    text.includes('spotify') ||
    text.includes('viagem') ||
    text.includes('shopping') ||
    text.includes('roupa') ||
    text.includes('hobby') ||
    text.includes('bar') ||
    text.includes('festa')
  ) {
    return 'WANTS';
  }

  return 'NEEDS';
}

export interface InstallmentPreviewItem {
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  /** Data de vencimento/competência da fatura no formato YYYY-MM-DD */
  dueDate: string;
  /** Mês da fatura no formato YYYY-MM */
  invoiceMonth: string;
}

/**
 * Motor de Projeção de Parcelas para Cartão de Crédito:
 * Calcula em qual mês de vencimento cada parcela irá cair, respeitando o dia de fechamento
 * e o dia de vencimento da fatura do cartão.
 *
 * Regra de Fechamento:
 * - Se a compra ocorre ANTES do dia de fechamento (`purchaseDay < closingDay`), entra no ciclo que fecha neste mês.
 * - Se a compra ocorre NO DIA ou APÓS o dia de fechamento (`purchaseDay >= closingDay`), entra no próximo ciclo (mês seguinte).
 * - Se o `dueDay < closingDay` (ex: fecha dia 28 e vence dia 05), o vencimento do ciclo ocorre no mês subsequente ao fechamento.
 */
export function projectInstallments(params: {
  totalAmount: number;
  purchaseDateStr: string;
  totalInstallments: number;
  closingDay?: number;
  dueDay?: number;
  isCreditCard?: boolean;
}): InstallmentPreviewItem[] {
  const {
    totalAmount,
    purchaseDateStr,
    totalInstallments,
    closingDay = 28,
    dueDay = 5,
    isCreditCard = true,
  } = params;

  const count = Math.max(1, Math.min(48, Math.floor(totalInstallments || 1)));
  const cleanDate = (purchaseDateStr || new Date().toISOString().split('T')[0]).split('T')[0];
  const [yStr, mStr, dStr] = cleanDate.split('-');
  const purchaseYear = parseInt(yStr, 10) || new Date().getFullYear();
  const purchaseMonthIndex = (parseInt(mStr, 10) || 1) - 1; // 0..11
  const purchaseDay = parseInt(dStr, 10) || 1;

  // Divisão exata de centavos: a 1ª parcela absorve eventual diferença de arredondamento
  const baseInstallmentAmount = Math.floor((totalAmount / count) * 100) / 100;
  const firstInstallmentAmount =
    Math.round((totalAmount - baseInstallmentAmount * (count - 1)) * 100) / 100;

  // Determina o deslocamento de meses para a 1ª fatura se for cartão de crédito
  let firstInvoiceMonthOffset = 0;
  if (isCreditCard && closingDay && dueDay) {
    // Se comprou no dia do fechamento ou depois, vai para o fechamento do mês seguinte
    const closingMonthOffset = purchaseDay >= closingDay ? 1 : 0;
    // Se o dia de vencimento é menor que o dia de fechamento (ex: fecha 28, vence 05), vence no mês seguinte ao fechamento
    const dueMonthAfterClosing = dueDay < closingDay ? 1 : 0;
    firstInvoiceMonthOffset = closingMonthOffset + dueMonthAfterClosing;
  }

  const items: InstallmentPreviewItem[] = [];

  for (let i = 0; i < count; i++) {
    const amount = i === 0 ? firstInstallmentAmount : baseInstallmentAmount;

    if (isCreditCard) {
      const targetDate = new Date(
        purchaseYear,
        purchaseMonthIndex + firstInvoiceMonthOffset + i,
        1
      );
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth() + 1;
      const maxDayInMonth = new Date(targetYear, targetMonth, 0).getDate();
      const safeDueDay = Math.min(Math.max(1, dueDay || 5), maxDayInMonth);

      const invoiceMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
      const dueDate = `${invoiceMonth}-${String(safeDueDay).padStart(2, '0')}`;

      items.push({
        installmentNumber: i + 1,
        totalInstallments: count,
        amount,
        dueDate,
        invoiceMonth,
      });
    } else {
      // Conta comum parcelada: mantém o dia da compra avançando mês a mês
      const targetDate = new Date(purchaseYear, purchaseMonthIndex + i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth() + 1;
      const maxDayInMonth = new Date(targetYear, targetMonth, 0).getDate();
      const safeDay = Math.min(purchaseDay, maxDayInMonth);

      const invoiceMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
      const dueDate = `${invoiceMonth}-${String(safeDay).padStart(2, '0')}`;

      items.push({
        installmentNumber: i + 1,
        totalInstallments: count,
        amount,
        dueDate,
        invoiceMonth,
      });
    }
  }

  return items;
}

export type InvoiceStatus = 'PAID' | 'OVERDUE' | 'CLOSED' | 'OPEN';

export interface CreditCardLimitSummary {
  cardId: string;
  creditLimit: number;
  currentMonthInvoiceAmount: number;
  futureInstallmentsAmount: number;
  totalCommittedLimit: number;
  availableLimit: number;
  usedPercent: number;
}

/**
 * Calcula dinamicamente o limite comprometido e o limite disponível de um cartão de crédito
 * com base nas faturas em aberto e parcelas futuras não quitadas.
 */
export function calculateCardLimitSummary(
  card: Account,
  transactions: Transaction[],
  currentMonthPrefix: string
): CreditCardLimitSummary {
  const creditLimit = card.creditLimit || 0;
  let currentMonthInvoiceAmount = 0;
  let futureInstallmentsAmount = 0;
  let openPastAmount = 0;

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (tx.accountId !== card.id || tx.status === 'CANCELLED') continue;
    if (tx.type !== 'EXPENSE') continue;

    const isPaidInvoice = tx.tags?.includes('fatura-paga');
    const txMonth = tx.date.slice(0, 7);

    if (txMonth === currentMonthPrefix) {
      if (!isPaidInvoice) {
        currentMonthInvoiceAmount += tx.amount;
      }
    } else if (txMonth > currentMonthPrefix) {
      if (!isPaidInvoice) {
        futureInstallmentsAmount += tx.amount;
      }
    } else if (txMonth < currentMonthPrefix && !isPaidInvoice && tx.status === 'PENDING') {
      openPastAmount += tx.amount;
    }
  }

  const totalCommittedLimit =
    Math.round((currentMonthInvoiceAmount + futureInstallmentsAmount + openPastAmount) * 100) / 100;
  const availableLimit = Math.max(0, Math.round((creditLimit - totalCommittedLimit) * 100) / 100);
  const usedPercent =
    creditLimit > 0 ? Math.min(100, Math.round((totalCommittedLimit / creditLimit) * 100)) : 0;

  return {
    cardId: card.id,
    creditLimit,
    currentMonthInvoiceAmount,
    futureInstallmentsAmount,
    totalCommittedLimit,
    availableLimit,
    usedPercent,
  };
}

export interface MonthlyCardInvoice {
  monthPrefix: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD
  closingDate: string; // YYYY-MM-DD
  totalAmount: number;
  paidAmount: number;
  openAmount: number;
  status: InvoiceStatus;
  items: Transaction[];
  byPillar: Record<BudgetPillar, number>;
}

/**
 * Determina o status da fatura de um cartão em determinado mês (YYYY-MM).
 */
export function resolveInvoiceStatus(params: {
  monthPrefix: string;
  closingDay?: number;
  dueDay?: number;
  items: Transaction[];
  referenceDate?: Date;
}): InvoiceStatus {
  const { monthPrefix, closingDay = 28, dueDay = 5, items, referenceDate = new Date() } = params;
  if (items.length === 0) return 'OPEN';

  const allPaid = items.every((tx) => tx.tags?.includes('fatura-paga'));
  if (allPaid) return 'PAID';

  const [y, m] = monthPrefix.split('-').map(Number);
  const maxDay = new Date(y, m, 0).getDate();
  const safeDueDay = Math.min(Math.max(1, dueDay), maxDay);
  const dueDateObj = new Date(y, m - 1, safeDueDay, 23, 59, 59);

  // Calcula data de fechamento correspondente àquela fatura
  let closingDateObj: Date;
  if (dueDay < closingDay) {
    // Fecha no mês anterior ao vencimento
    const prevMonthDate = new Date(y, m - 2, 1);
    const prevMaxDay = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
    closingDateObj = new Date(
      prevMonthDate.getFullYear(),
      prevMonthDate.getMonth(),
      Math.min(closingDay, prevMaxDay),
      23,
      59,
      59
    );
  } else {
    closingDateObj = new Date(y, m - 1, Math.min(closingDay, maxDay), 23, 59, 59);
  }

  if (referenceDate > dueDateObj) {
    return 'OVERDUE';
  }
  if (referenceDate >= closingDateObj) {
    return 'CLOSED';
  }
  return 'OPEN';
}

/**
 * Gera a visão consolidada da fatura de um mês específico para um cartão (ou todos os cartões).
 */
export function buildMonthlyCardInvoice(params: {
  monthPrefix: string;
  cards: Account[];
  selectedCardId: string | 'ALL';
  transactions: Transaction[];
  categories: Category[];
}): MonthlyCardInvoice {
  const { monthPrefix, cards, selectedCardId, transactions, categories } = params;
  const targetCards =
    selectedCardId === 'ALL' ? cards : cards.filter((c) => c.id === selectedCardId);
  const targetCardIds = new Set(targetCards.map((c) => c.id));

  const primaryCard = targetCards[0];
  const closingDay = primaryCard?.closingDay || 28;
  const dueDay = primaryCard?.dueDay || 5;

  const [y, m] = monthPrefix.split('-').map(Number);
  const maxDay = new Date(y, m, 0).getDate();
  const dueDate = `${monthPrefix}-${String(Math.min(dueDay, maxDay)).padStart(2, '0')}`;
  const closingDate = `${monthPrefix}-${String(Math.min(closingDay, maxDay)).padStart(2, '0')}`;

  const items = transactions
    .filter(
      (tx) =>
        targetCardIds.has(tx.accountId) &&
        tx.type === 'EXPENSE' &&
        tx.status !== 'CANCELLED' &&
        tx.date.startsWith(monthPrefix)
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  let totalAmount = 0;
  let paidAmount = 0;
  const byPillar: Record<BudgetPillar, number> = {
    NEEDS: 0,
    WANTS: 0,
    GOALS: 0,
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    totalAmount += item.amount;
    if (item.tags?.includes('fatura-paga')) {
      paidAmount += item.amount;
    }
    const pillar = resolveTransactionPillar(item, categories);
    byPillar[pillar] += item.amount;
  }

  const openAmount = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);
  const status = resolveInvoiceStatus({
    monthPrefix,
    closingDay,
    dueDay,
    items,
  });

  return {
    monthPrefix,
    dueDate,
    closingDate,
    totalAmount: Math.round(totalAmount * 100) / 100,
    paidAmount: Math.round(paidAmount * 100) / 100,
    openAmount,
    status,
    items,
    byPillar,
  };
}

