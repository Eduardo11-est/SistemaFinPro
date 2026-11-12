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

      let workspaces = user.memberships.map((m) => m.workspace);

      // Se o usuário ainda não possuir um workspace vinculado, cria um espaço exclusivo e isolado para ele
      if (workspaces.length === 0) {
        const createdWs = await db.workspace.create({
          data: {
            name: `${user.name} - Pessoal`,
            type: 'PERSONAL',
            defaultCurrency: 'BRL',
            colorTheme: '#10b981',
            members: {
              create: {
                userId: user.id,
                role: 'OWNER',
              },
            },
            accounts: {
              create: {
                name: 'Conta Corrente Principal',
                type: 'CHECKING',
                bankName: 'Meu Banco',
                currency: 'BRL',
                initialBalance: 0.0,
                currentBalance: 0.0,
                color: '#10b981',
              },
            },
            categories: {
              create: [
                { name: 'Salário / Renda Principal', type: 'INCOME', icon: 'Briefcase', color: '#10b981' },
                { name: 'Rendimentos / Investimentos', type: 'INCOME', icon: 'TrendingUp', color: '#06b6d4' },
                { name: 'Outras Receitas', type: 'INCOME', icon: 'Plus', color: '#3b82f6' },
                { name: 'Moradia & Contas', type: 'EXPENSE', icon: 'Home', color: '#ef4444' },
                { name: 'Alimentação & Mercado', type: 'EXPENSE', icon: 'ShoppingBag', color: '#f97316' },
                { name: 'Transporte & Combustível', type: 'EXPENSE', icon: 'Car', color: '#f59e0b' },
                { name: 'Saúde & Farmácia', type: 'EXPENSE', icon: 'Heart', color: '#ec4899' },
                { name: 'Educação & Cursos', type: 'EXPENSE', icon: 'BookOpen', color: '#6366f1' },
                { name: 'Lazer & Restaurantes', type: 'EXPENSE', icon: 'Compass', color: '#8b5cf6' },
                { name: 'Outras Despesas', type: 'EXPENSE', icon: 'Tag', color: '#64748b' },
              ],
            },
          },
          include: {
            accounts: true,
            categories: true,
            costCenters: true,
          },
        });
        workspaces = [createdWs];
      }

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
