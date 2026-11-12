import { NextResponse } from 'next/server';
import { prisma, ensureNeonAwake } from '@/lib/prisma';
import { resolveRequestUserId, verifyWorkspaceAccess } from '@/lib/auth';
import { sanitizeText, sanitizePositiveAmount, getSafeErrorMessage } from '@/lib/security';

export const SALARY_COST_CENTER_CODE = '__SALARY_CONFIG__';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    await ensureNeonAwake();
    const userId = resolveRequestUserId(req, sanitizeText(searchParams.get('userId'), 100));

    // Isolamento multi-cliente: sem userId autenticado, jamais retorna workspaces de outros clientes
    if (!userId) {
      return NextResponse.json([]);
    }

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        accounts: true,
        categories: true,
        costCenters: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(workspaces);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao listar workspaces') },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();

    const userId = resolveRequestUserId(req, sanitizeText(body.userId, 100));
    if (!userId) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const cleanName = sanitizeText(body.name, 100);
    if (!cleanName) {
      return NextResponse.json({ error: 'Nome do workspace é obrigatório' }, { status: 400 });
    }

    const wsType = body.type === 'PERSONAL' ? 'PERSONAL' : 'CORPORATE';
    const baseWs = await prisma.workspace.create({
      data: {
        name: cleanName,
        type: wsType,
        document: sanitizeText(body.document, 30) || undefined,
        legalName: sanitizeText(body.legalName, 140) || undefined,
        defaultCurrency: body.defaultCurrency || 'BRL',
        colorTheme: sanitizeText(body.colorTheme, 20) || '#6366f1',
      },
    });

    const defaultCategories =
      wsType === 'CORPORATE'
        ? [
            { name: 'Faturamento de Serviços / Vendas', type: 'INCOME' as const, icon: 'Briefcase', color: '#10b981', workspaceId: baseWs.id },
            { name: 'Contratos Recorrentes (MRR)', type: 'INCOME' as const, icon: 'TrendingUp', color: '#06b6d4', workspaceId: baseWs.id },
            { name: 'Folha & Pró-Labore', type: 'EXPENSE' as const, icon: 'Users', color: '#6366f1', workspaceId: baseWs.id },
            { name: 'Impostos & Taxas (DAS / ISS / IRPJ)', type: 'EXPENSE' as const, icon: 'FileText', color: '#ef4444', workspaceId: baseWs.id },
            { name: 'Infraestrutura & Cloud / SaaS', type: 'EXPENSE' as const, icon: 'Server', color: '#0ea5e9', workspaceId: baseWs.id },
            { name: 'Marketing & Aquisição (Ads)', type: 'EXPENSE' as const, icon: 'Megaphone', color: '#f97316', workspaceId: baseWs.id },
            { name: 'Fornecedores & Operação', type: 'EXPENSE' as const, icon: 'Truck', color: '#8b5cf6', workspaceId: baseWs.id },
            { name: 'Despesas Bancárias & Tarifas', type: 'EXPENSE' as const, icon: 'CreditCard', color: '#64748b', workspaceId: baseWs.id },
          ]
        : [
            { name: 'Salário / Renda Principal', type: 'INCOME' as const, icon: 'Briefcase', color: '#10b981', workspaceId: baseWs.id },
            { name: 'Rendimentos / Investimentos', type: 'INCOME' as const, icon: 'TrendingUp', color: '#06b6d4', workspaceId: baseWs.id },
            { name: 'Serviços & Consultorias', type: 'INCOME' as const, icon: 'Laptop', color: '#3b82f6', workspaceId: baseWs.id },
            { name: 'Moradia & Contas', type: 'EXPENSE' as const, icon: 'Home', color: '#ef4444', workspaceId: baseWs.id },
            { name: 'Alimentação & Mercado', type: 'EXPENSE' as const, icon: 'ShoppingBag', color: '#f97316', workspaceId: baseWs.id },
            { name: 'Transporte & Combustível', type: 'EXPENSE' as const, icon: 'Car', color: '#f59e0b', workspaceId: baseWs.id },
            { name: 'Saúde & Farmácia', type: 'EXPENSE' as const, icon: 'Heart', color: '#ec4899', workspaceId: baseWs.id },
            { name: 'Educação & Cursos', type: 'EXPENSE' as const, icon: 'BookOpen', color: '#6366f1', workspaceId: baseWs.id },
            { name: 'Lazer & Restaurantes', type: 'EXPENSE' as const, icon: 'Compass', color: '#8b5cf6', workspaceId: baseWs.id },
          ];

    const [, createdAccount] = await Promise.all([
      prisma.workspaceMember.create({
        data: {
          userId,
          workspaceId: baseWs.id,
          role: 'OWNER',
        },
      }),
      prisma.account.create({
        data: {
          name:
            wsType === 'CORPORATE'
              ? 'Conta Empresarial Principal'
              : 'Conta Corrente Principal',
          type: 'CHECKING',
          bankName: 'Meu Banco',
          currency: body.defaultCurrency || 'BRL',
          initialBalance: 0,
          currentBalance: 0,
          color: sanitizeText(body.colorTheme, 20) || '#6366f1',
          workspaceId: baseWs.id,
        },
      }),
      prisma.category.createMany({
        data: defaultCategories,
      }),
    ]);

    const createdCategories = await prisma.category.findMany({
      where: { workspaceId: baseWs.id },
      orderBy: { name: 'asc' },
    });

    const workspace = {
      ...baseWs,
      accounts: [createdAccount],
      categories: createdCategories,
      costCenters: [],
    };
    return NextResponse.json(workspace);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao criar workspace') },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    await ensureNeonAwake();

    const userId = resolveRequestUserId(req, sanitizeText(body.userId, 100));
    const workspaceId = sanitizeText(body.workspaceId || body.id, 100);

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId é obrigatório.' }, { status: 400 });
    }

    if (userId) {
      const hasAccess = await verifyWorkspaceAccess(prisma, userId, workspaceId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado a este workspace.' }, { status: 403 });
      }
    }

    // Persistência do Salário / Renda Mensal no banco Neon PostgreSQL
    if (body.monthlySalary !== undefined) {
      const salaryValue = sanitizePositiveAmount(body.monthlySalary, true) ?? 0;

      const existingSalaryConfig = await prisma.costCenter.findFirst({
        where: {
          workspaceId,
          code: SALARY_COST_CENTER_CODE,
        },
      });

      if (existingSalaryConfig) {
        await prisma.costCenter.update({
          where: { id: existingSalaryConfig.id },
          data: {
            budgetLimit: salaryValue,
            name: 'Salário / Renda Mensal Configurada',
          },
        });
      } else {
        await prisma.costCenter.create({
          data: {
            code: SALARY_COST_CENTER_CODE,
            name: 'Salário / Renda Mensal Configurada',
            description: 'Configuração de salário/renda base mensal do workspace',
            budgetLimit: salaryValue,
            workspaceId,
          },
        });
      }
    }

    // Atualização opcional de dados cadastrais do workspace
    if (body.name || body.document !== undefined || body.legalName !== undefined) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          ...(body.name ? { name: sanitizeText(body.name, 100) } : {}),
          ...(body.document !== undefined ? { document: sanitizeText(body.document, 30) || null } : {}),
          ...(body.legalName !== undefined ? { legalName: sanitizeText(body.legalName, 140) || null } : {}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      workspaceId,
      monthlySalary: body.monthlySalary !== undefined ? (sanitizePositiveAmount(body.monthlySalary, true) ?? 0) : undefined,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, 'Erro ao salvar configurações do workspace') },
      { status: 500 }
    );
  }
}
