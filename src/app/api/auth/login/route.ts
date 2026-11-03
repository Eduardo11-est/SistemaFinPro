import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Helper com retry para tolerar o tempo de despertar (cold start) do Neon
    async function executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
      try {
        return await fn();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes("Can't reach database") || (err as { code?: string }).code === 'P1001') {
          await new Promise((r) => setTimeout(r, 2500));
          return await fn();
        }
        throw err;
      }
    }

    const user = await executeWithRetry(() =>
      prisma.user.findUnique({
        where: { email: cleanEmail },
        include: {
          memberships: {
            include: {
              workspace: {
                include: {
                  accounts: true,
                },
              },
            },
          },
        },
      })
    );

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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao realizar login';
    if (msg.includes("Can't reach database") || (error as { code?: string }).code === 'P1001') {
      return NextResponse.json(
        {
          error:
            'O banco de dados Neon está inicializando a partir do modo de economia de energia. Por favor, tente novamente em 10 segundos.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
