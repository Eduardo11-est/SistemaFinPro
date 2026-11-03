import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, workspaceName } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Helper com retry para tolerar o tempo de despertar (cold start) do Neon
    async function executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
      try {
        return await fn();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes("Can't reach database") || (err as { code?: string }).code === 'P1001') {
          // Aguarda 2.5s para o Neon completar o spin-up e tenta de novo
          await new Promise((r) => setTimeout(r, 2500));
          return await fn();
        }
        throw err;
      }
    }

    // 1. Verificar se já existe
    const existing = await executeWithRetry(() =>
      prisma.user.findUnique({
        where: { email: cleanEmail },
      })
    );

    if (existing) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema.' }, { status: 400 });
    }

    // 2. Criar Usuário
    const user = await executeWithRetry(() =>
      prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          password: hashPassword(password),
        },
      })
    );

    // 3. Criar Workspace Inicial do Usuário
    const wsName = workspaceName?.trim() || `${user.name} - Pessoal`;
    const workspace = await prisma.workspace.create({
      data: {
        name: wsName,
        type: 'PERSONAL',
        defaultCurrency: 'BRL',
        colorTheme: '#10b981',
      },
    });

    // 4. Associar Usuário como Proprietário (OWNER)
    await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: 'OWNER',
      },
    });

    // 5. Criar Conta Bancária Inicial com Saldo Zerado (R$ 0,00)
    await prisma.account.create({
      data: {
        name: 'Conta Corrente Principal',
        type: 'CHECKING',
        bankName: 'Meu Banco',
        currency: 'BRL',
        initialBalance: 0.0,
        currentBalance: 0.0,
        color: '#10b981',
        workspaceId: workspace.id,
      },
    });

    // 6. Criar Categorias Padrão
    const defaultCategories = [
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
    ];

    for (const cat of defaultCategories) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type as 'INCOME' | 'EXPENSE',
          icon: cat.icon,
          color: cat.color,
          workspaceId: workspace.id,
        },
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      workspace,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao cadastrar usuário';
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
