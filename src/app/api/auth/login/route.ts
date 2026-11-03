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

    const user = await prisma.user.findUnique({
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
    });

    if (!user) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
    }

    // Se o usuário não tem senha cadastrada (antigo seed), ou se a senha bate
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
