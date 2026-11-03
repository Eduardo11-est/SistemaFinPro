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
        targetAccountId: body.targetAccountId,
        categoryId: body.categoryId,
        costCenterId: body.costCenterId,
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
