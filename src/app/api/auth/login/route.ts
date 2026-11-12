import { NextResponse } from 'next/server';
import { withDatabaseRetry } from '@/lib/prisma';
import { verifyPassword, hashPassword, attachSessionCookie } from '@/lib/auth';
import { checkRateLimit, getClientIdentifier, getSafeErrorMessage } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const clientIp = getClientIdentifier(req);
    const rate = checkRateLimit(`login:${clientIp}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Muitas tentativas de login. Aguarde ${rate.retryAfterSeconds}s antes de tentar novamente.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase().slice(0, 180);

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

      if (!user || !user.password || !verifyPassword(password, user.password)) {
        return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
      }

      // Migração transparente para PBKDF2-SHA512 caso a senha ainda esteja no formato legado
      if (!user.password.startsWith('pbkdf2$')) {
        await db.user
          .update({
            where: { id: user.id },
            data: { password: hashPassword(password) },
          })
          .catch(() => {});
      }

      const workspaces = user.memberships.map((m) => m.workspace);

      const response = NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
        workspaces,
      });

      attachSessionCookie(response, user.id, user.email);
      return response;
    });
  } catch (error: unknown) {
    console.error('[Login Error]', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao realizar login') },
      { status: 500 }
    );
  }
}
