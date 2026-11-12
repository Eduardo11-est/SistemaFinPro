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
