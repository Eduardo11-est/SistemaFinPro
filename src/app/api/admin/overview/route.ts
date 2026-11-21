import { NextResponse } from 'next/server';
import { prisma, ensureNeonAwake } from '@/lib/prisma';
import { isAdminEmail, verifyAdminRequest } from '@/lib/auth';
import { getSafeErrorMessage } from '@/lib/security';

export async function GET(req: Request) {
  try {
    await ensureNeonAwake();
    const isAdmin = await verifyAdminRequest(req, prisma);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso restrito a contas de Administrador.' },
        { status: 403 }
      );
    }

    const [usersCount, workspacesCount, accountsCount, transactionsCount, users] =
      await Promise.all([
        prisma.user.count(),
        prisma.workspace.count(),
        prisma.account.count(),
        prisma.transaction.count(),
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            _count: {
              select: {
                memberships: true,
              },
            },
          },
        }),
      ]);

    return NextResponse.json({
      totals: {
        users: usersCount,
        workspaces: workspacesCount,
        accounts: accountsCount,
        transactions: transactionsCount,
      },
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        workspacesCount: u._count.memberships,
        isAdmin: isAdminEmail(u.email),
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao carregar visão administrativa') },
      { status: 500 }
    );
  }
}
