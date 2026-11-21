import type { RecurrenceFrequency, Transaction } from '@/types/finance';

const DAY_MS = 24 * 60 * 60 * 1000;

export function getRecurrenceLabel(frequency?: RecurrenceFrequency): string {
  switch (frequency) {
    case 'DAILY':
      return 'Diária';
    case 'WEEKLY':
      return 'Semanal';
    case 'MONTHLY':
      return 'Mensal';
    case 'YEARLY':
      return 'Anual';
    default:
      return '';
  }
}

function parseDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Projeta dinamicamente as ocorrências futuras de transações marcadas como recorrentes
 * dentro de um mês específico (`YYYY-MM`), sem duplicar registros nem alterar o saldo atual da conta.
 */
export function projectRecurringTransactionsForMonth(
  transactions: Transaction[],
  targetMonthPrefix: string
): Transaction[] {
  if (!targetMonthPrefix || !/^\d{4}-\d{2}$/.test(targetMonthPrefix)) {
    return [];
  }

  const [targetYear, targetMonth] = targetMonthPrefix.split('-').map(Number);
  if (!targetYear || !targetMonth || targetMonth < 1 || targetMonth > 12) {
    return [];
  }

  const maxDayInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();

  // Índice de transações reais vinculadas por sourceId + data/mês para evitar duplicação
  const materializedKeys = new Set<string>();
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (t.isRecurringProjection || !t.linkedTransactionId || !t.date) continue;
    const clean = t.date.split('T')[0];
    materializedKeys.add(`${t.linkedTransactionId}::${clean}`);
    materializedKeys.add(`${t.linkedTransactionId}::${clean.slice(0, 7)}`);
  }

  const projected: Transaction[] = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (tx.isRecurringProjection) continue;
    if (!tx.isRecurring) continue;
    if (!tx.recurrenceFrequency || tx.recurrenceFrequency === 'NONE') continue;
    if (tx.status === 'CANCELLED') continue;

    const orig = parseDateParts(tx.date);
    if (!orig) continue;

    const origDateStr = formatDateParts(orig.year, orig.month, orig.day);
    const origMonthPrefix = origDateStr.slice(0, 7);

    // Projeções recorrentes só valem para o mesmo mês (semanal/diária) ou meses futuros
    if (targetMonthPrefix < origMonthPrefix) continue;

    const occurrenceDates: string[] = [];

    if (tx.recurrenceFrequency === 'MONTHLY') {
      if (targetMonthPrefix > origMonthPrefix) {
        const safeDay = Math.min(orig.day, maxDayInTargetMonth);
        occurrenceDates.push(formatDateParts(targetYear, targetMonth, safeDay));
      }
    } else if (tx.recurrenceFrequency === 'YEARLY') {
      if (targetYear > orig.year && targetMonth === orig.month) {
        const safeDay = Math.min(orig.day, maxDayInTargetMonth);
        occurrenceDates.push(formatDateParts(targetYear, targetMonth, safeDay));
      }
    } else if (tx.recurrenceFrequency === 'WEEKLY') {
      const origMs = Date.UTC(orig.year, orig.month - 1, orig.day);
      const monthStartMs = Date.UTC(targetYear, targetMonth - 1, 1);
      const monthEndMs = Date.UTC(targetYear, targetMonth - 1, maxDayInTargetMonth);

      const weeksToStart =
        monthStartMs > origMs ? Math.ceil((monthStartMs - origMs) / (7 * DAY_MS)) : 1;
      let stepMs = origMs + Math.max(1, weeksToStart) * 7 * DAY_MS;

      while (stepMs <= monthEndMs) {
        const d = new Date(stepMs);
        const occStr = formatDateParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
        if (occStr > origDateStr && occStr.startsWith(targetMonthPrefix)) {
          occurrenceDates.push(occStr);
        }
        stepMs += 7 * DAY_MS;
      }
    } else if (tx.recurrenceFrequency === 'DAILY') {
      const startDay = targetMonthPrefix === origMonthPrefix ? orig.day + 1 : 1;
      for (let d = startDay; d <= maxDayInTargetMonth; d++) {
        occurrenceDates.push(formatDateParts(targetYear, targetMonth, d));
      }
    }

    for (let j = 0; j < occurrenceDates.length; j++) {
      const occDate = occurrenceDates[j];
      if (
        materializedKeys.has(`${tx.id}::${occDate}`) ||
        ((tx.recurrenceFrequency === 'MONTHLY' || tx.recurrenceFrequency === 'YEARLY') &&
          materializedKeys.has(`${tx.id}::${targetMonthPrefix}`))
      ) {
        continue;
      }

      projected.push({
        ...tx,
        id: `rec-proj-${tx.id}-${occDate}`,
        date: occDate,
        isRecurringProjection: true,
        recurringSourceId: tx.id,
        // Não herda quitação de fatura de outro mês
        tags: (tx.tags || []).filter((tag) => tag !== 'fatura-paga'),
      });
    }
  }

  return projected;
}

/**
 * Retorna as transações reais do mês selecionado combinadas com as projeções
 * de transações recorrentes originadas em datas anteriores, ordenadas por data decrescente.
 */
export function getTransactionsForMonth(
  transactions: Transaction[],
  targetMonthPrefix: string
): Transaction[] {
  const realForMonth = transactions.filter(
    (tx) => !tx.isRecurringProjection && tx.date && tx.date.startsWith(targetMonthPrefix)
  );
  const projectedForMonth = projectRecurringTransactionsForMonth(transactions, targetMonthPrefix);

  if (projectedForMonth.length === 0) {
    return realForMonth;
  }

  return [...realForMonth, ...projectedForMonth].sort((a, b) => b.date.localeCompare(a.date));
}
