import { NextResponse } from 'next/server';
import { withDatabaseRetry } from '@/lib/prisma';
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

    return await withDatabaseRetry(async (db) => {
      // 1. Checa se o usuário já existe
      const existing = await db.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existing) {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema.' }, { status: 400 });
      }

      // 2. Cria o usuário
      const user = await db.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          password: hashPassword(password),
        },
      });

      // 3. Cria o workspace inicial
      const wsName = workspaceName?.trim() || `${user.name} - Pessoal`;
      const workspace = await db.workspace.create({
        data: {
          name: wsName,
          type: 'PERSONAL',
          defaultCurrency: 'BRL',
          colorTheme: '#10b981',
        },
      });

      // 4. Associa ao workspace
      await db.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 'OWNER',
        },
      });

      // 5. Conta bancária inicial
      await db.account.create({
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

      // 6. Categorias padrão
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
        await db.category.create({
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
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao cadastrar usuário';
    console.error('[Register Error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
