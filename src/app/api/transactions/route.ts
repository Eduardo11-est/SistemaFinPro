import { NextResponse } from 'next/server';
import { prisma, ensureNeonAwake } from '@/lib/prisma';
import { resolveRequestUserId, verifyWorkspaceAccess } from '@/lib/auth';
import { sanitizeText, sanitizePositiveAmount, getSafeErrorMessage } from '@/lib/security';

const VALID_TYPES = new Set(['INCOME', 'EXPENSE', 'TRANSFER']);
const VALID_CURRENCIES = new Set(['BRL', 'USD', 'EUR']);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();
    const userId = resolveRequestUserId(req, sanitizeText(searchParams.get('userId'), 100));
    const workspaceId = sanitizeText(searchParams.get('workspaceId'), 100);

    // Isolamento multi-cliente: sem userId autenticado, jamais retorna transações de outros clientes
    if (!userId) {
      return NextResponse.json([]);
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(workspaceId ? { workspaceId } : {}),
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
      orderBy: { date: 'desc' },
      include: {
        account: true,
        category: true,
        costCenter: true,
      },
    });
    return NextResponse.json(transactions);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao listar transações') },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();

    const userId = resolveRequestUserId(req, sanitizeText(body.userId, 100));
    const cleanDescription = sanitizeText(body.description, 200);
    const validAmount = sanitizePositiveAmount(body.amount);
    const txType = VALID_TYPES.has(body.type) ? body.type : 'EXPENSE';
    const currency = VALID_CURRENCIES.has(body.currency) ? body.currency : 'BRL';
    const workspaceId = sanitizeText(body.workspaceId, 100);

    if (!cleanDescription || validAmount === null || !workspaceId || !body.accountId) {
      return NextResponse.json(
        { error: 'Dados inválidos para criação de transação.' },
        { status: 400 }
      );
    }

    if (userId) {
      const hasAccess = await verifyWorkspaceAccess(prisma, userId, workspaceId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado a este workspace.' }, { status: 403 });
      }
    }

    const safeCategoryId =
      body.categoryId && !String(body.categoryId).startsWith('cat-')
        ? String(body.categoryId)
        : undefined;
    const safeCostCenterId =
      body.costCenterId && !String(body.costCenterId).startsWith('cc-')
        ? String(body.costCenterId)
        : undefined;

    const cleanTags = Array.isArray(body.tags)
      ? body.tags
          .map((t: unknown) => sanitizeText(t, 40).toLowerCase())
          .filter(Boolean)
          .slice(0, 15)
      : [];

    const transaction = await prisma.transaction.create({
      data: {
        type: txType,
        description: cleanDescription,
        amount: validAmount,
        date: new Date(body.date || Date.now()),
        status: body.status || 'COMPLETED',
        paymentMethod: sanitizeText(body.paymentMethod, 60) || undefined,
        currency,
        exchangeRate: sanitizePositiveAmount(body.exchangeRate) || 1,
        notes: sanitizeText(body.notes, 500) || undefined,
        tags: cleanTags,
        isInstallment: Boolean(body.isInstallment),
        installmentNumber: body.installmentNumber ? Number(body.installmentNumber) : undefined,
        totalInstallments: body.totalInstallments ? Number(body.totalInstallments) : undefined,
        isRecurring: Boolean(body.isRecurring),
        recurrenceFrequency: body.recurrenceFrequency || 'NONE',
        linkedTransactionId: body.linkedTransactionId,
        workspaceId,
        accountId: String(body.accountId),
        targetAccountId: body.targetAccountId ? String(body.targetAccountId) : undefined,
        categoryId: safeCategoryId,
        costCenterId: safeCostCenterId,
      },
    });

    // Atualizar saldo da conta no Neon
    if (txType === 'INCOME') {
      await prisma.account.update({
        where: { id: String(body.accountId) },
        data: { currentBalance: { increment: validAmount } },
      });
    } else if (txType === 'EXPENSE') {
      await prisma.account.update({
        where: { id: String(body.accountId) },
        data: { currentBalance: { decrement: validAmount } },
      });
    } else if (txType === 'TRANSFER') {
      await prisma.account.update({
        where: { id: String(body.accountId) },
        data: { currentBalance: { decrement: validAmount } },
      });
      if (body.targetAccountId) {
        await prisma.account.update({
          where: { id: String(body.targetAccountId) },
          data: { currentBalance: { increment: validAmount } },
        });
      }
    }

    return NextResponse.json(transaction);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao criar transação') },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();

    const userId = resolveRequestUserId(req, sanitizeText(body.userId, 100));
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const existing = await prisma.transaction.findUnique({ where: { id: String(id) } });
    if (!existing) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    if (userId) {
      const hasAccess = await verifyWorkspaceAccess(prisma, userId, existing.workspaceId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    // Reverter impacto anterior no saldo
    if (existing.type === 'INCOME') {
      await prisma.account.update({
        where: { id: existing.accountId },
        data: { currentBalance: { decrement: existing.amount } },
      });
    } else if (existing.type === 'EXPENSE') {
      await prisma.account.update({
        where: { id: existing.accountId },
        data: { currentBalance: { increment: existing.amount } },
      });
    } else if (existing.type === 'TRANSFER') {
      await prisma.account.update({
        where: { id: existing.accountId },
        data: { currentBalance: { increment: existing.amount } },
      });
      if (existing.targetAccountId) {
        await prisma.account.update({
          where: { id: existing.targetAccountId },
          data: { currentBalance: { decrement: existing.amount } },
        });
      }
    }

    const safeCategoryId =
      updates.categoryId !== undefined
        ? updates.categoryId && !String(updates.categoryId).startsWith('cat-')
          ? String(updates.categoryId)
          : null
        : existing.categoryId;
    const safeCostCenterId =
      updates.costCenterId !== undefined
        ? updates.costCenterId && !String(updates.costCenterId).startsWith('cc-')
          ? String(updates.costCenterId)
          : null
        : existing.costCenterId;

    const newType = VALID_TYPES.has(updates.type) ? updates.type : existing.type;
    const newAmount =
      updates.amount !== undefined
        ? sanitizePositiveAmount(updates.amount) ?? existing.amount
        : existing.amount;
    const newAccountId = updates.accountId ? String(updates.accountId) : existing.accountId;
    const newTargetAccountId =
      newType === 'TRANSFER'
        ? updates.targetAccountId
          ? String(updates.targetAccountId)
          : existing.targetAccountId
        : null;

    const cleanTags = Array.isArray(updates.tags)
      ? updates.tags
          .map((t: unknown) => sanitizeText(t, 40).toLowerCase())
          .filter(Boolean)
          .slice(0, 15)
      : existing.tags;

    const updated = await prisma.transaction.update({
      where: { id: String(id) },
      data: {
        type: newType,
        description:
          updates.description !== undefined
            ? sanitizeText(updates.description, 200) || existing.description
            : existing.description,
        amount: newAmount,
        date: updates.date ? new Date(updates.date) : existing.date,
        status: updates.status ?? existing.status,
        paymentMethod:
          updates.paymentMethod !== undefined
            ? sanitizeText(updates.paymentMethod, 60)
            : existing.paymentMethod,
        currency: VALID_CURRENCIES.has(updates.currency) ? updates.currency : existing.currency,
        exchangeRate:
          updates.exchangeRate !== undefined
            ? sanitizePositiveAmount(updates.exchangeRate) || 1
            : existing.exchangeRate,
        notes:
          updates.notes !== undefined
            ? sanitizeText(updates.notes, 500) || null
            : existing.notes,
        tags: cleanTags,
        isInstallment:
          updates.isInstallment !== undefined
            ? Boolean(updates.isInstallment)
            : existing.isInstallment,
        installmentNumber:
          updates.installmentNumber !== undefined
            ? updates.installmentNumber
            : existing.installmentNumber,
        totalInstallments:
          updates.totalInstallments !== undefined
            ? updates.totalInstallments
            : existing.totalInstallments,
        isRecurring:
          updates.isRecurring !== undefined ? Boolean(updates.isRecurring) : existing.isRecurring,
        recurrenceFrequency: updates.recurrenceFrequency ?? existing.recurrenceFrequency,
        accountId: newAccountId,
        targetAccountId: newTargetAccountId,
        categoryId: safeCategoryId,
        costCenterId: safeCostCenterId,
      },
    });

    // Aplicar novo impacto no saldo
    if (newType === 'INCOME') {
      await prisma.account.update({
        where: { id: newAccountId },
        data: { currentBalance: { increment: newAmount } },
      });
    } else if (newType === 'EXPENSE') {
      await prisma.account.update({
        where: { id: newAccountId },
        data: { currentBalance: { decrement: newAmount } },
      });
    } else if (newType === 'TRANSFER') {
      await prisma.account.update({
        where: { id: newAccountId },
        data: { currentBalance: { decrement: newAmount } },
      });
      if (newTargetAccountId) {
        await prisma.account.update({
          where: { id: newTargetAccountId },
          data: { currentBalance: { increment: newAmount } },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao atualizar transação') },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();
    const userId = resolveRequestUserId(req, sanitizeText(searchParams.get('userId'), 100));
    const id = sanitizeText(searchParams.get('id'), 100);
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (tx) {
      if (userId) {
        const hasAccess = await verifyWorkspaceAccess(prisma, userId, tx.workspaceId);
        if (!hasAccess) {
          return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
        }
      }

      if (tx.type === 'INCOME') {
        await prisma.account.update({
          where: { id: tx.accountId },
          data: { currentBalance: { decrement: tx.amount } },
        });
      } else if (tx.type === 'EXPENSE') {
        await prisma.account.update({
          where: { id: tx.accountId },
          data: { currentBalance: { increment: tx.amount } },
        });
      } else if (tx.type === 'TRANSFER') {
        await prisma.account.update({
          where: { id: tx.accountId },
          data: { currentBalance: { increment: tx.amount } },
        });
        if (tx.targetAccountId) {
          await prisma.account.update({
            where: { id: tx.targetAccountId },
            data: { currentBalance: { decrement: tx.amount } },
          });
        }
      }
      await prisma.transaction.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao excluir transação') },
      { status: 500 }
    );
  }
}
