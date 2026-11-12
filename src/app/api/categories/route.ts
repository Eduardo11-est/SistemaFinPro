import { NextResponse } from 'next/server';
import { prisma, ensureNeonAwake } from '@/lib/prisma';
import { sanitizeText, getSafeErrorMessage } from '@/lib/security';

const DEFAULT_PERSONAL_CATEGORIES = [
  { name: 'Salário / Renda Principal', type: 'INCOME' as const, icon: 'Briefcase', color: '#10b981' },
  { name: 'Rendimentos / Investimentos', type: 'INCOME' as const, icon: 'TrendingUp', color: '#06b6d4' },
  { name: 'Serviços & Consultorias', type: 'INCOME' as const, icon: 'Laptop', color: '#3b82f6' },
  { name: 'Outras Receitas', type: 'INCOME' as const, icon: 'Plus', color: '#14b8a6' },
  { name: 'Moradia & Contas', type: 'EXPENSE' as const, icon: 'Home', color: '#ef4444' },
  { name: 'Alimentação & Mercado', type: 'EXPENSE' as const, icon: 'ShoppingBag', color: '#f97316' },
  { name: 'Transporte & Combustível', type: 'EXPENSE' as const, icon: 'Car', color: '#f59e0b' },
  { name: 'Saúde & Farmácia', type: 'EXPENSE' as const, icon: 'Heart', color: '#ec4899' },
  { name: 'Educação & Cursos', type: 'EXPENSE' as const, icon: 'BookOpen', color: '#6366f1' },
  { name: 'Lazer & Restaurantes', type: 'EXPENSE' as const, icon: 'Compass', color: '#8b5cf6' },
  { name: 'Outras Despesas', type: 'EXPENSE' as const, icon: 'Tag', color: '#64748b' },
];

const DEFAULT_CORPORATE_CATEGORIES = [
  { name: 'Faturamento de Serviços / Vendas', type: 'INCOME' as const, icon: 'Briefcase', color: '#10b981' },
  { name: 'Contratos Recorrentes (MRR)', type: 'INCOME' as const, icon: 'TrendingUp', color: '#06b6d4' },
  { name: 'Rendimentos Financeiros PJ', type: 'INCOME' as const, icon: 'Plus', color: '#3b82f6' },
  { name: 'Folha & Pró-Labore', type: 'EXPENSE' as const, icon: 'Users', color: '#6366f1' },
  { name: 'Impostos & Taxas (DAS / ISS / IRPJ)', type: 'EXPENSE' as const, icon: 'FileText', color: '#ef4444' },
  { name: 'Infraestrutura & Cloud / SaaS', type: 'EXPENSE' as const, icon: 'Server', color: '#0ea5e9' },
  { name: 'Marketing & Aquisição (Ads)', type: 'EXPENSE' as const, icon: 'Megaphone', color: '#f97316' },
  { name: 'Administrativo & Contabilidade', type: 'EXPENSE' as const, icon: 'Building', color: '#f59e0b' },
  { name: 'Fornecedores & Operação', type: 'EXPENSE' as const, icon: 'Truck', color: '#8b5cf6' },
  { name: 'Despesas Bancárias & Tarifas', type: 'EXPENSE' as const, icon: 'CreditCard', color: '#64748b' },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();
    const workspaceId = searchParams.get('workspaceId');
    const where = workspaceId ? { workspaceId } : {};

    let categories = await prisma.category.findMany({
      where,
      include: {
        subcategories: true,
      },
      orderBy: { name: 'asc' },
    });

    // Provisionamento em lote (createMany) caso o workspace consultado não possua categorias no banco
    if (workspaceId && categories.length === 0) {
      const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (ws) {
        const defaults =
          ws.type === 'CORPORATE' ? DEFAULT_CORPORATE_CATEGORIES : DEFAULT_PERSONAL_CATEGORIES;
        await prisma.category.createMany({
          data: defaults.map((cat) => ({
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            color: cat.color,
            workspaceId: ws.id,
          })),
        });
        categories = await prisma.category.findMany({
          where: { workspaceId },
          include: { subcategories: true },
          orderBy: { name: 'asc' },
        });
      }
    }

    return NextResponse.json(categories);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao listar categorias') },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();

    const cleanName = sanitizeText(body.name, 80);
    const workspaceId = sanitizeText(body.workspaceId, 100);

    if (!cleanName || !workspaceId) {
      return NextResponse.json(
        { error: 'Nome e workspaceId são obrigatórios' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: cleanName,
        type: body.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        icon: sanitizeText(body.icon, 40) || 'Tag',
        color: sanitizeText(body.color, 20) || '#10b981',
        workspaceId,
      },
      include: {
        subcategories: true,
      },
    });

    return NextResponse.json(category);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao criar categoria') },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();
    const id = sanitizeText(searchParams.get('id'), 100);
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao remover categoria') },
      { status: 500 }
    );
  }
}
