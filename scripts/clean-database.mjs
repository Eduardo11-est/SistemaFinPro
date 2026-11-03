import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Iniciando limpeza do banco de dados Neon...');

  // 1. Remover dados transacionais e de teste
  const delTransactions = await prisma.transaction.deleteMany();
  console.log(`- Removidas ${delTransactions.count} transações de teste`);

  const delPayables = await prisma.payableReceivable.deleteMany();
  console.log(`- Removidas ${delPayables.count} contas a pagar/receber de teste`);

  const delBankItems = await prisma.bankStatementItem.deleteMany();
  console.log(`- Removidos ${delBankItems.count} itens de extrato bancário`);

  const delBankStatements = await prisma.bankStatement.deleteMany();
  console.log(`- Removidos ${delBankStatements.count} extratos bancários`);

  const delRules = await prisma.reconciliationRule.deleteMany();
  console.log(`- Removidas ${delRules.count} regras de conciliação`);

  const delAttachments = await prisma.attachment.deleteMany();
  console.log(`- Removidos ${delAttachments.count} anexos`);

  const delAudit = await prisma.auditLog.deleteMany();
  console.log(`- Removidos ${delAudit.count} logs de auditoria`);

  const delBudgets = await prisma.budget.deleteMany();
  console.log(`- Removidos ${delBudgets.count} orçamentos`);

  const delGoals = await prisma.goal.deleteMany();
  console.log(`- Removidas ${delGoals.count} metas financeiras`);

  const delCostCenters = await prisma.costCenter.deleteMany();
  console.log(`- Removidos ${delCostCenters.count} centros de custo`);

  // 2. Limpar contas bancárias de teste
  const delAccounts = await prisma.account.deleteMany();
  console.log(`- Removidas ${delAccounts.count} contas bancárias de teste`);

  // 3. Garantir Workspace Pessoal ativo e limpo
  const defaultWs = await prisma.workspace.upsert({
    where: { id: 'ws-personal' },
    update: {
      name: 'Meu Espaço Pessoal',
      type: 'PERSONAL',
      colorTheme: '#10b981',
      defaultCurrency: 'BRL',
    },
    create: {
      id: 'ws-personal',
      name: 'Meu Espaço Pessoal',
      type: 'PERSONAL',
      colorTheme: '#10b981',
      defaultCurrency: 'BRL',
    },
  });

  // Remover workspaces corporativos de demonstração
  await prisma.workspace.deleteMany({
    where: {
      id: { in: ['ws-techcorp', 'ws-studio'] },
    },
  });
  console.log('- Workspaces de demonstração corporativos removidos');

  // Criar 1 conta corrente limpa com saldo R$ 0,00
  await prisma.account.create({
    data: {
      id: 'acc-principal',
      name: 'Conta Corrente Principal',
      type: 'CHECKING',
      bankName: 'Meu Banco',
      currency: 'BRL',
      initialBalance: 0.0,
      currentBalance: 0.0,
      color: '#10b981',
      workspaceId: defaultWs.id,
    },
  });
  console.log('- Criada conta limpa "Conta Corrente Principal" com saldo R$ 0,00');

  // 4. Categorias Essenciais limpas no Workspace Pessoal
  const defaultCategories = [
    { id: 'cat-pf-salario', name: 'Salário / Renda Principal', type: 'INCOME', icon: 'Briefcase', color: '#10b981' },
    { id: 'cat-pf-div', name: 'Dividendos & Rendimentos', type: 'INCOME', icon: 'TrendingUp', color: '#06b6d4' },
    { id: 'cat-pf-free', name: 'Serviços & Consultorias', type: 'INCOME', icon: 'Laptop', color: '#3b82f6' },
    { id: 'cat-pf-moradia', name: 'Moradia & Contas', type: 'EXPENSE', icon: 'Home', color: '#ef4444' },
    { id: 'cat-pf-alimen', name: 'Alimentação & Mercado', type: 'EXPENSE', icon: 'ShoppingBag', color: '#f97316' },
    { id: 'cat-pf-transp', name: 'Transporte & Combustível', type: 'EXPENSE', icon: 'Car', color: '#f59e0b' },
    { id: 'cat-pf-saude', name: 'Saúde & Farmácia', type: 'EXPENSE', icon: 'Heart', color: '#ec4899' },
    { id: 'cat-pf-educa', name: 'Educação & Cursos', type: 'EXPENSE', icon: 'BookOpen', color: '#6366f1' },
    { id: 'cat-pf-lazer', name: 'Lazer & Restaurantes', type: 'EXPENSE', icon: 'Compass', color: '#8b5cf6' },
  ];

  await prisma.category.deleteMany({
    where: { workspaceId: defaultWs.id },
  });

  for (const cat of defaultCategories) {
    await prisma.category.create({
      data: {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        workspaceId: defaultWs.id,
      },
    });
  }
  console.log('- Categorias padrão criadas com sucesso');

  console.log('\n✨ Banco de dados limpo e preparado para uso real!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao limpar banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
