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

    // Isolamento multi-cliente: sem userId, não retorna contas de outros usuários
    if (!userId) {
      return NextResponse.json([]);
    }

    const accounts = await prisma.account.findMany({
      where: {
        ...(workspaceId ? { workspaceId } : {}),
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(accounts);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao listar contas') },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();

    const userId = resolveRequestUserId(req, sanitizeText(body.userId, 100));
    const cleanName = sanitizeText(body.name, 100);
    const workspaceId = sanitizeText(body.workspaceId, 100);

    if (!cleanName || !workspaceId) {
      return NextResponse.json(
        { error: 'Nome da conta e workspaceId são obrigatórios' },
        { status: 400 }
      );
    }

    if (userId) {
      const hasAccess = await verifyWorkspaceAccess(prisma, userId, workspaceId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado a este workspace.' }, { status: 403 });
      }
    }

    const initialBal = Number.isFinite(Number(body.initialBalance))
      ? Number(body.initialBalance)
      : 0;
    const currentBal = Number.isFinite(Number(body.currentBalance))
      ? Number(body.currentBalance)
      : initialBal;

    const account = await prisma.account.create({
      data: {
        name: cleanName,
        type: body.type || 'CHECKING',
        bankName: sanitizeText(body.bankName, 80) || undefined,
        currency: body.currency || 'BRL',
        initialBalance: initialBal,
        currentBalance: currentBal,
        creditLimit: sanitizePositiveAmount(body.creditLimit, true) ?? undefined,
        closingDay: body.closingDay ? Number(body.closingDay) : undefined,
        dueDay: body.dueDay ? Number(body.dueDay) : undefined,
        color: sanitizeText(body.color, 20) || '#3b82f6',
        workspaceId,
      },
    });
    return NextResponse.json(account);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao criar conta') },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();

    const userId = resolveRequestUserId(req, sanitizeText(body.userId, 100));
    const id = sanitizeText(body.id, 100);
    if (!id) {
      return NextResponse.json({ error: 'ID da conta é obrigatório' }, { status: 400 });
    }

    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    if (userId) {
      const hasAccess = await verifyWorkspaceAccess(prisma, userId, existing.workspaceId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        ...(body.name ? { name: sanitizeText(body.name, 100) } : {}),
        ...(body.bankName !== undefined ? { bankName: sanitizeText(body.bankName, 80) || null } : {}),
        ...(body.type ? { type: body.type } : {}),
        ...(body.currency ? { currency: body.currency } : {}),
        ...(body.currentBalance !== undefined && Number.isFinite(Number(body.currentBalance))
          ? { currentBalance: Number(body.currentBalance) }
          : {}),
        ...(body.creditLimit !== undefined
          ? { creditLimit: sanitizePositiveAmount(body.creditLimit, true) ?? null }
          : {}),
        ...(body.closingDay !== undefined ? { closingDay: body.closingDay ? Number(body.closingDay) : null } : {}),
        ...(body.dueDay !== undefined ? { dueDay: body.dueDay ? Number(body.dueDay) : null } : {}),
        ...(body.color ? { color: sanitizeText(body.color, 20) } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao atualizar conta') },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();

    const id = sanitizeText(searchParams.get('id'), 100);
    const userId = resolveRequestUserId(req, sanitizeText(searchParams.get('userId'), 100));

    if (!id) {
      return NextResponse.json({ error: 'ID da conta é obrigatório' }, { status: 400 });
    }

    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: true });
    }

    if (userId) {
      const hasAccess = await verifyWorkspaceAccess(prisma, userId, existing.workspaceId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao excluir conta') },
      { status: 500 }
    );
  }
}
