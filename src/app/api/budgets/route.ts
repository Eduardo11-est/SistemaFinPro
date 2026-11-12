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

    if (!userId) {
      return NextResponse.json([]);
    }

    const budgets = await prisma.budget.findMany({
      where: {
        ...(workspaceId ? { workspaceId } : {}),
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(budgets);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao listar orçamentos') },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();

    const userId = resolveRequestUserId(req, sanitizeText(body.userId, 100));
    const workspaceId = sanitizeText(body.workspaceId, 100);
    const categoryId = sanitizeText(body.categoryId, 100);
    const period = sanitizeText(body.period, 20) || new Date().toISOString().slice(0, 7);
    const monthlyLimit = sanitizePositiveAmount(body.monthlyLimit);

    if (!workspaceId || !categoryId || monthlyLimit === null) {
      return NextResponse.json(
        { error: 'Workspace, categoria e limite mensal são obrigatórios.' },
        { status: 400 }
      );
    }

    if (userId) {
      const hasAccess = await verifyWorkspaceAccess(prisma, userId, workspaceId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado a este workspace.' }, { status: 403 });
      }
    }

    const budget = await prisma.budget.upsert({
      where: {
        workspaceId_categoryId_period: {
          workspaceId,
          categoryId,
          period,
        },
      },
      update: {
        monthlyLimit,
      },
      create: {
        workspaceId,
        categoryId,
        period,
        monthlyLimit,
      },
    });

    return NextResponse.json(budget);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao salvar orçamento') },
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
      return NextResponse.json({ error: 'ID do orçamento é obrigatório.' }, { status: 400 });
    }

    const existing = await prisma.budget.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: true });
    }

    if (userId) {
      const hasAccess = await verifyWorkspaceAccess(prisma, userId, existing.workspaceId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao excluir orçamento') },
      { status: 500 }
    );
  }
}
