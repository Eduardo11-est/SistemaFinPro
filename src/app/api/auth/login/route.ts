import { NextResponse } from 'next/server';
import { withDatabaseRetry } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    return await withDatabaseRetry(async (db) => {
      const user = await db.user.findUnique({
        where: { email: cleanEmail },
        include: {
          memberships: {
            include: {
              workspace: {
                include: {
                  accounts: true,
                  categories: true,
                  costCenters: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
      }

      if (user.password && !verifyPassword(password, user.password)) {
        return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
      }

      const workspaces = user.memberships.map((m) => m.workspace);

      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
        workspaces,
      });
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao realizar login';
    console.error('[Login Error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
