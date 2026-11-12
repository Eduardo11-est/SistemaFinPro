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

    const goals = await prisma.goal.findMany({
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

    return NextResponse.json(goals);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao listar metas financeiras') },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();

    const userId = resolveRequestUserId(req, sanitizeText(body.userId, 100));
    const cleanTitle = sanitizeText(body.title, 120);
    const targetAmount = sanitizePositiveAmount(body.targetAmount);
    const currentAmount = sanitizePositiveAmount(body.currentAmount, true) ?? 0;
    const workspaceId = sanitizeText(body.workspaceId, 100);

    if (!cleanTitle || targetAmount === null || !workspaceId) {
      return NextResponse.json(
        { error: 'Título, valor alvo e workspaceId são obrigatórios.' },
        { status: 400 }
      );
    }

    if (userId) {
      const hasAccess = await verifyWorkspaceAccess(prisma, userId, workspaceId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado a este workspace.' }, { status: 403 });
      }
    }

    const goal = await prisma.goal.create({
      data: {
        title: cleanTitle,
        targetAmount,
        currentAmount,
        targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
        color: sanitizeText(body.color, 20) || '#10b981',
        icon: sanitizeText(body.icon, 40) || 'Target',
        category: sanitizeText(body.category, 60) || 'Objetivo',
        workspaceId,
      },
    });

    return NextResponse.json(goal);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao criar meta financeira') },
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
      return NextResponse.json({ error: 'ID da meta é obrigatório.' }, { status: 400 });
    }

    const existing = await prisma.goal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Meta não encontrada.' }, { status: 404 });
    }

    if (userId) {
      const hasAccess = await verifyWorkspaceAccess(prisma, userId, existing.workspaceId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    const contribution = sanitizePositiveAmount(body.contributionAmount, true);
    const explicitCurrentAmount = sanitizePositiveAmount(body.currentAmount, true);
    const nextCurrentAmount =
      contribution !== null && contribution > 0
        ? existing.currentAmount + contribution
        : explicitCurrentAmount !== null
          ? explicitCurrentAmount
          : existing.currentAmount;

    const updated = await prisma.goal.update({
      where: { id },
      data: {
        currentAmount: nextCurrentAmount,
        ...(body.title ? { title: sanitizeText(body.title, 120) } : {}),
        ...(body.targetAmount !== undefined && sanitizePositiveAmount(body.targetAmount) !== null
          ? { targetAmount: sanitizePositiveAmount(body.targetAmount)! }
          : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao atualizar meta financeira') },
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
      return NextResponse.json({ error: 'ID da meta é obrigatório.' }, { status: 400 });
    }

    const existing = await prisma.goal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: true });
    }

    if (userId) {
      const hasAccess = await verifyWorkspaceAccess(prisma, userId, existing.workspaceId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
      }
    }

    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao excluir meta financeira') },
      { status: 500 }
    );
  }
}
