import { NextResponse } from 'next/server';
import { withDatabaseRetry } from '@/lib/prisma';
import { hashPassword, attachSessionCookie } from '@/lib/auth';
import {
  checkRateLimit,
  getClientIdentifier,
  sanitizeText,
  getSafeErrorMessage,
} from '@/lib/security';

export async function POST(req: Request) {
  try {
    const clientIp = getClientIdentifier(req);
    const rate = checkRateLimit(`register:${clientIp}`, 6, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Muitas solicitações de cadastro. Aguarde ${rate.retryAfterSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, password, workspaceName } = body;

    const cleanName = sanitizeText(name, 100);
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 180) : '';
    const cleanWsName = sanitizeText(workspaceName, 100);

    if (!cleanName || !cleanEmail || !password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Nome, e-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Informe um endereço de e-mail válido.' }, { status: 400 });
    }

    if (password.length < 6 || password.length > 128) {
      return NextResponse.json(
        { error: 'A senha deve ter entre 6 e 128 caracteres.' },
        { status: 400 }
      );
    }

    return await withDatabaseRetry(async (db) => {
      const existing = await db.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Este e-mail já está cadastrado no sistema.' },
          { status: 400 }
        );
      }

      const user = await db.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          password: hashPassword(password),
        },
      });

      const wsName = cleanWsName || `${user.name} - Pessoal`;
      const workspace = await db.workspace.create({
        data: {
          name: wsName,
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

      const response = NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        workspace,
      });

      attachSessionCookie(response, user.id, user.email);
      return response;
    });
  } catch (error: unknown) {
    console.error('[Register Error]', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao cadastrar usuário') },
      { status: 500 }
    );
  }
}
