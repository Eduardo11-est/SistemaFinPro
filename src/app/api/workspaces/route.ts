import { NextResponse } from 'next/server';
import { prisma, ensureNeonAwake } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();
    const userId = searchParams.get('userId');

    const where = userId
      ? { members: { some: { userId } } }
      : {};

    const workspaces = await prisma.workspace.findMany({
      where,
      include: {
        accounts: true,
        categories: true,
        costCenters: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(workspaces);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao listar workspaces';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();
    const wsType = body.type || 'CORPORATE';
    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        type: wsType,
        document: body.document,
        legalName: body.legalName,
        defaultCurrency: body.defaultCurrency || 'BRL',
        colorTheme: body.colorTheme || '#6366f1',
        ...(body.userId
          ? {
              members: {
                create: {
                  userId: body.userId,
                  role: 'OWNER',
                },
              },
            }
          : {}),
        accounts: {
          create: {
            name: wsType === 'CORPORATE' ? 'Conta Empresarial Principal' : 'Conta Corrente Principal',
            type: 'CHECKING',
            bankName: 'Meu Banco',
            currency: body.defaultCurrency || 'BRL',
            initialBalance: 0,
            currentBalance: 0,
            color: body.colorTheme || '#6366f1',
          },
        },
        categories: {
          create:
            wsType === 'CORPORATE'
              ? [
                  { name: 'Faturamento de Serviços / Vendas', type: 'INCOME', icon: 'Briefcase', color: '#10b981' },
                  { name: 'Contratos Recorrentes (MRR)', type: 'INCOME', icon: 'TrendingUp', color: '#06b6d4' },
                  { name: 'Folha & Pró-Labore', type: 'EXPENSE', icon: 'Users', color: '#6366f1' },
                  { name: 'Impostos & Taxas (DAS / ISS / IRPJ)', type: 'EXPENSE', icon: 'FileText', color: '#ef4444' },
                  { name: 'Infraestrutura & Cloud / SaaS', type: 'EXPENSE', icon: 'Server', color: '#0ea5e9' },
                  { name: 'Marketing & Aquisição (Ads)', type: 'EXPENSE', icon: 'Megaphone', color: '#f97316' },
                  { name: 'Fornecedores & Operação', type: 'EXPENSE', icon: 'Truck', color: '#8b5cf6' },
                  { name: 'Despesas Bancárias & Tarifas', type: 'EXPENSE', icon: 'CreditCard', color: '#64748b' },
                ]
              : [
                  { name: 'Salário / Renda Principal', type: 'INCOME', icon: 'Briefcase', color: '#10b981' },
                  { name: 'Rendimentos / Investimentos', type: 'INCOME', icon: 'TrendingUp', color: '#06b6d4' },
                  { name: 'Serviços & Consultorias', type: 'INCOME', icon: 'Laptop', color: '#3b82f6' },
                  { name: 'Moradia & Contas', type: 'EXPENSE', icon: 'Home', color: '#ef4444' },
                  { name: 'Alimentação & Mercado', type: 'EXPENSE', icon: 'ShoppingBag', color: '#f97316' },
                  { name: 'Transporte & Combustível', type: 'EXPENSE', icon: 'Car', color: '#f59e0b' },
                  { name: 'Saúde & Farmácia', type: 'EXPENSE', icon: 'Heart', color: '#ec4899' },
                  { name: 'Educação & Cursos', type: 'EXPENSE', icon: 'BookOpen', color: '#6366f1' },
                  { name: 'Lazer & Restaurantes', type: 'EXPENSE', icon: 'Compass', color: '#8b5cf6' },
                ],
        },
      },
      include: {
        accounts: true,
        categories: true,
        costCenters: true,
      },
    });
    return NextResponse.json(workspace);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar workspace';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
