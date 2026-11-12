import { NextResponse } from 'next/server';
import { prisma, ensureNeonAwake } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();
    const workspaceId = searchParams.get('workspaceId');

    const where = workspaceId ? { workspaceId } : {};
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        account: true,
        category: true,
        costCenter: true,
      },
    });
    return NextResponse.json(transactions);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao listar transações';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();

    const safeCategoryId =
      body.categoryId && !String(body.categoryId).startsWith('cat-')
        ? body.categoryId
        : undefined;
    const safeCostCenterId =
      body.costCenterId && !String(body.costCenterId).startsWith('cc-')
        ? body.costCenterId
        : undefined;

    const transaction = await prisma.transaction.create({
      data: {
        type: body.type,
        description: body.description,
        amount: body.amount,
        date: new Date(body.date),
        status: body.status || 'COMPLETED',
        paymentMethod: body.paymentMethod,
        currency: body.currency || 'BRL',
        exchangeRate: body.exchangeRate || 1,
        notes: body.notes,
        tags: body.tags || [],
        isInstallment: Boolean(body.isInstallment),
        installmentNumber: body.installmentNumber,
        totalInstallments: body.totalInstallments,
        isRecurring: Boolean(body.isRecurring),
        recurrenceFrequency: body.recurrenceFrequency || 'NONE',
        linkedTransactionId: body.linkedTransactionId,
        workspaceId: body.workspaceId,
        accountId: body.accountId,
        targetAccountId: body.targetAccountId || undefined,
        categoryId: safeCategoryId,
        costCenterId: safeCostCenterId,
      },
    });

    // Atualizar saldo da conta no Neon
    if (body.type === 'INCOME') {
      await prisma.account.update({
        where: { id: body.accountId },
        data: { currentBalance: { increment: body.amount } },
      });
    } else if (body.type === 'EXPENSE') {
      await prisma.account.update({
        where: { id: body.accountId },
        data: { currentBalance: { decrement: body.amount } },
      });
    } else if (body.type === 'TRANSFER') {
      await prisma.account.update({
        where: { id: body.accountId },
        data: { currentBalance: { decrement: body.amount } },
      });
      if (body.targetAccountId) {
        await prisma.account.update({
          where: { id: body.targetAccountId },
          data: { currentBalance: { increment: body.amount } },
        });
      }
    }

    return NextResponse.json(transaction);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar transação';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();

    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
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
          ? updates.categoryId
          : null
        : existing.categoryId;
    const safeCostCenterId =
      updates.costCenterId !== undefined
        ? updates.costCenterId && !String(updates.costCenterId).startsWith('cc-')
          ? updates.costCenterId
          : null
        : existing.costCenterId;

    const newType = updates.type ?? existing.type;
    const newAmount = updates.amount !== undefined ? Number(updates.amount) : existing.amount;
    const newAccountId = updates.accountId ?? existing.accountId;
    const newTargetAccountId =
      newType === 'TRANSFER' ? updates.targetAccountId ?? existing.targetAccountId : null;

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        type: newType,
        description: updates.description ?? existing.description,
        amount: newAmount,
        date: updates.date ? new Date(updates.date) : existing.date,
        status: updates.status ?? existing.status,
        paymentMethod: updates.paymentMethod ?? existing.paymentMethod,
        currency: updates.currency ?? existing.currency,
        exchangeRate: updates.exchangeRate ?? existing.exchangeRate,
        notes: updates.notes !== undefined ? updates.notes : existing.notes,
        tags: updates.tags ?? existing.tags,
        isInstallment:
          updates.isInstallment !== undefined ? Boolean(updates.isInstallment) : existing.isInstallment,
        installmentNumber:
          updates.installmentNumber !== undefined ? updates.installmentNumber : existing.installmentNumber,
        totalInstallments:
          updates.totalInstallments !== undefined ? updates.totalInstallments : existing.totalInstallments,
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
    const msg = error instanceof Error ? error.message : 'Erro ao atualizar transação';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (tx) {
      // Reverter saldo da conta
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
      }
      await prisma.transaction.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao excluir transação';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
