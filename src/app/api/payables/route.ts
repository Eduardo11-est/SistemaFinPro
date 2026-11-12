import { NextResponse } from 'next/server';
import { prisma, ensureNeonAwake } from '@/lib/prisma';
import { resolveRequestUserId, verifyWorkspaceAccess } from '@/lib/auth';
import { sanitizeText, sanitizePositiveAmount, getSafeErrorMessage } from '@/lib/security';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();
    const userId = resolveRequestUserId(req, sanitizeText(searchParams.get('userId'), 100));
    const workspaceId = sanitizeText(searchParams.get('workspaceId'), 100);

    // Isolamento multi-cliente: sem userId autenticado, jamais retorna títulos de outros clientes
    if (!userId) {
      return NextResponse.json([]);
    }

    const items = await prisma.payableReceivable.findMany({
      where: {
        ...(workspaceId ? { workspaceId } : {}),
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
    return NextResponse.json(items);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao listar títulos') },
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
    const workspaceId = sanitizeText(body.workspaceId, 100);

    if (!cleanDescription || validAmount === null || !workspaceId) {
      return NextResponse.json({ error: 'Dados inválidos para agendamento' }, { status: 400 });
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
    const safeAccountId =
      body.accountId && !String(body.accountId).startsWith('acc-')
        ? String(body.accountId)
        : undefined;

    const item = await prisma.payableReceivable.create({
      data: {
        type: body.type === 'RECEIVABLE' ? 'RECEIVABLE' : 'PAYABLE',
        description: cleanDescription,
        amount: validAmount,
        dueDate: new Date(body.dueDate || Date.now()),
        status: body.status || 'PENDING',
        recipientOrPayer: sanitizeText(body.recipientOrPayer, 120) || undefined,
        penaltyRate: sanitizePositiveAmount(body.penaltyRate, true) ?? 0,
        interestRateDaily: sanitizePositiveAmount(body.interestRateDaily, true) ?? 0,
        accruedInterest: sanitizePositiveAmount(body.accruedInterest, true) ?? 0,
        workspaceId,
        accountId: safeAccountId,
        categoryId: safeCategoryId,
      },
    });
    return NextResponse.json(item);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao criar título') },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, paymentDate, finalAmount, accountId } = body;
    await ensureNeonAwake();

    const userId = resolveRequestUserId(req, sanitizeText(body.userId, 100));
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const existing = await prisma.payableReceivable.findUnique({ where: { id: String(id) } });
    if (!existing) {
      return NextResponse.json({ error: 'Título não encontrado' }, { status: 404 });
    }

    if (userId) {
      const hasAccess = await verifyWorkspaceAccess(prisma, userId, existing.workspaceId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    const updated = await prisma.payableReceivable.update({
      where: { id: String(id) },
      data: {
        status,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        finalAmount: sanitizePositiveAmount(finalAmount, true) ?? undefined,
        accountId: accountId ? String(accountId) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao atualizar título') },
      { status: 500 }
    );
  }
}
