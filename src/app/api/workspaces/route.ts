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
    const workspace = await prisma.workspace.create({
      data: {
        name: cleanName,
        type: wsType,
        document: sanitizeText(body.document, 30) || undefined,
        legalName: sanitizeText(body.legalName, 140) || undefined,
        defaultCurrency: body.defaultCurrency || 'BRL',
        colorTheme: sanitizeText(body.colorTheme, 20) || '#6366f1',
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
        accounts: {
          create: {
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
