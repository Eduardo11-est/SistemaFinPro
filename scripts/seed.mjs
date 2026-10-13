import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed no Neon PostgreSQL...');

  // 1. Criar Usuário Rogério
  const user = await prisma.user.upsert({
    where: { email: 'rogerio@finpro.com' },
    update: {},
    create: {
      name: 'Rogério Administrador',
      email: 'rogerio@finpro.com',
    },
  });

  // 2. Criar Workspaces (Pessoal e Corporativos)
  const wsPersonal = await prisma.workspace.upsert({
    where: { id: 'ws-personal' },
    update: {},
    create: {
      id: 'ws-personal',
      name: 'Rogério - Pessoal',
      type: 'PERSONAL',
      document: '123.456.789-00',
      defaultCurrency: 'BRL',
      colorTheme: '#10b981',
    },
  });

  const wsTechCorp = await prisma.workspace.upsert({
    where: { id: 'ws-techcorp' },
    update: {},
    create: {
      id: 'ws-techcorp',
      name: 'TechCorp Inovações Ltda.',
      type: 'CORPORATE',
      document: '12.345.678/0001-90',
      legalName: 'TechCorp Soluções Tecnológicas e Software Ltda.',
      defaultCurrency: 'BRL',
      colorTheme: '#6366f1',
    },
  });

  const wsStudio = await prisma.workspace.upsert({
    where: { id: 'ws-studio' },
    update: {},
    create: {
      id: 'ws-studio',
      name: 'Studio Criativo Digital',
      type: 'CORPORATE',
      document: '98.765.432/0001-11',
      legalName: 'Studio Criativo Design e Publicidade Ltda.',
      defaultCurrency: 'BRL',
      colorTheme: '#06b6d4',
    },
  });

  // 3. Vincular Usuário aos Workspaces
  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: wsPersonal.id } },
    update: {},
    create: { role: 'OWNER', userId: user.id, workspaceId: wsPersonal.id },
  });
  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: wsTechCorp.id } },
    update: {},
    create: { role: 'OWNER', userId: user.id, workspaceId: wsTechCorp.id },
  });
  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: wsStudio.id } },
    update: {},
    create: { role: 'OWNER', userId: user.id, workspaceId: wsStudio.id },
  });

  // 4. Criar Contas Bancárias
  const accountsData = [
    // Pessoal
    { id: 'acc-nubank-pf', name: 'Nubank Conta Principal', type: 'CHECKING', bankName: 'Nu Pagamentos', currency: 'BRL', initialBalance: 5000, currentBalance: 14850.50, color: '#8b5cf6', workspaceId: 'ws-personal' },
    { id: 'acc-cartao-pf', name: 'Nubank Ultravioleta (Cartão)', type: 'CREDIT_CARD', bankName: 'Nubank', currency: 'BRL', initialBalance: 0, currentBalance: -3420.00, creditLimit: 25000, closingDay: 28, dueDay: 5, color: '#a855f7', workspaceId: 'ws-personal' },
    { id: 'acc-xp-pf', name: 'XP Investimentos (CDB/Ações)', type: 'INVESTMENT', bankName: 'XP Investimentos', currency: 'BRL', initialBalance: 70000, currentBalance: 84500.00, color: '#eab308', workspaceId: 'ws-personal' },
    { id: 'acc-carteira-pf', name: 'Carteira Física (Dinheiro)', type: 'CASH', currency: 'BRL', initialBalance: 200, currentBalance: 420.00, color: '#10b981', workspaceId: 'ws-personal' },
    // TechCorp
    { id: 'acc-itau-pj', name: 'Itaú Empresas CC', type: 'CHECKING', bankName: 'Banco Itaú S.A.', currency: 'BRL', initialBalance: 80000, currentBalance: 184250.00, color: '#ea580c', workspaceId: 'ws-techcorp' },
    { id: 'acc-asaas-pj', name: 'Asaas Gateway de Boletos & PIX', type: 'GATEWAY', bankName: 'Asaas Gestão Financeira', currency: 'BRL', initialBalance: 12000, currentBalance: 38450.00, color: '#2563eb', workspaceId: 'ws-techcorp' },
    { id: 'acc-stripe-pj', name: 'Stripe Global (Recebimentos USD)', type: 'GATEWAY', bankName: 'Stripe Payments', currency: 'USD', initialBalance: 2000, currentBalance: 8900.00, color: '#6366f1', workspaceId: 'ws-techcorp' },
    { id: 'acc-bradesco-pj', name: 'Bradesco PJ Reserva', type: 'SAVINGS', bankName: 'Banco Bradesco S.A.', currency: 'BRL', initialBalance: 50000, currentBalance: 62100.00, color: '#dc2626', workspaceId: 'ws-techcorp' },
    // Studio
    { id: 'acc-inter-studio', name: 'Banco Inter PJ', type: 'CHECKING', bankName: 'Banco Inter', currency: 'BRL', initialBalance: 15000, currentBalance: 28900.00, color: '#f97316', workspaceId: 'ws-studio' },
    { id: 'acc-mp-studio', name: 'Mercado Pago Checkout', type: 'GATEWAY', bankName: 'Mercado Pago', currency: 'BRL', initialBalance: 3000, currentBalance: 11200.00, color: '#0284c7', workspaceId: 'ws-studio' },
  ];

  for (const acc of accountsData) {
    await prisma.account.upsert({
      where: { id: acc.id },
      update: acc,
      create: acc,
    });
  }

  // 5. Categorias
  const categoriesData = [
    { id: 'cat-pf-salario', name: 'Pró-Labore / Salário', type: 'INCOME', icon: 'Briefcase', color: '#10b981', workspaceId: 'ws-personal' },
    { id: 'cat-pf-div', name: 'Dividendos & Rendimentos', type: 'INCOME', icon: 'TrendingUp', color: '#06b6d4', workspaceId: 'ws-personal' },
    { id: 'cat-pf-moradia', name: 'Moradia & Contas', type: 'EXPENSE', icon: 'Home', color: '#ef4444', workspaceId: 'ws-personal' },
    { id: 'cat-pf-alimen', name: 'Alimentação & Mercado', type: 'EXPENSE', icon: 'ShoppingBag', color: '#f97316', workspaceId: 'ws-personal' },
    { id: 'cat-pf-transp', name: 'Transporte & Combustível', type: 'EXPENSE', icon: 'Car', color: '#f59e0b', workspaceId: 'ws-personal' },
    { id: 'cat-pf-educa', name: 'Educação & Cursos', type: 'EXPENSE', icon: 'BookOpen', color: '#6366f1', workspaceId: 'ws-personal' },

    { id: 'cat-pj-saas', name: 'Assinaturas SaaS', type: 'INCOME', icon: 'Cloud', color: '#10b981', workspaceId: 'ws-techcorp' },
    { id: 'cat-pj-dev', name: 'Desenvolvimento Sob Demanda', type: 'INCOME', icon: 'Code', color: '#06b6d4', workspaceId: 'ws-techcorp' },
    { id: 'cat-pj-folha', name: 'Folha de Pagamento & Pró-Labore', type: 'EXPENSE', icon: 'Users', color: '#dc2626', workspaceId: 'ws-techcorp' },
    { id: 'cat-pj-cloud', name: 'Infraestrutura Cloud & Servidores', type: 'EXPENSE', icon: 'Server', color: '#ea580c', workspaceId: 'ws-techcorp' },
    { id: 'cat-pj-mkt', name: 'Marketing & Tráfego Pago', type: 'EXPENSE', icon: 'Megaphone', color: '#d946ef', workspaceId: 'ws-techcorp' },
    { id: 'cat-pj-imp', name: 'Impostos & Tributos (Simples/DAS)', type: 'EXPENSE', icon: 'FileText', color: '#ef4444', workspaceId: 'ws-techcorp' },
    { id: 'cat-pj-cont', name: 'Contabilidade & Jurídico', type: 'EXPENSE', icon: 'Scale', color: '#64748b', workspaceId: 'ws-techcorp' },
    { id: 'cat-pj-soft', name: 'Softwares & Ferramentas SaaS', type: 'EXPENSE', icon: 'Box', color: '#f59e0b', workspaceId: 'ws-techcorp' },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: cat,
      create: cat,
    });
  }

  // 6. Centros de Custo (PJ)
  const costCentersData = [
    { id: 'cc-fintech', code: 'PRJ-01', name: 'Plataforma Fintech Core', description: 'Desenvolvimento do produto principal', budgetLimit: 120000, workspaceId: 'ws-techcorp' },
    { id: 'cc-mkt', code: 'DEP-02', name: 'Marketing & Aquisição', description: 'Campanhas de tráfego e growth', budgetLimit: 45000, workspaceId: 'ws-techcorp' },
    { id: 'cc-cloud', code: 'INF-03', name: 'DevOps & Nuvem AWS/Neon', description: 'Infraestrutura distribuída', budgetLimit: 30000, workspaceId: 'ws-techcorp' },
    { id: 'cc-adm', code: 'DIR-04', name: 'Diretoria & Administrativo', description: 'Gestão executiva e pró-labore', budgetLimit: 50000, workspaceId: 'ws-techcorp' },
  ];

  for (const cc of costCentersData) {
    await prisma.costCenter.upsert({
      where: { id: cc.id },
      update: cc,
      create: cc,
    });
  }

  // 7. Transações Iniciais
  const transactionsData = [
    // Pessoal
    { id: 'tx-pf-1', type: 'INCOME', description: 'Recebimento de Pró-Labore (TechCorp)', amount: 18500.00, date: new Date('2026-10-05'), status: 'COMPLETED', paymentMethod: 'PIX', currency: 'BRL', exchangeRate: 1, tags: ['pro-labore', 'renda-fixa'], workspaceId: 'ws-personal', accountId: 'acc-nubank-pf', categoryId: 'cat-pf-salario' },
    { id: 'tx-pf-2', type: 'EXPENSE', description: 'Condomínio e IPTU Residencial', amount: 1450.00, date: new Date('2026-10-10'), status: 'COMPLETED', paymentMethod: 'Boleto', currency: 'BRL', exchangeRate: 1, tags: ['moradia', 'fixo'], workspaceId: 'ws-personal', accountId: 'acc-nubank-pf', categoryId: 'cat-pf-moradia' },
    { id: 'tx-pf-3', type: 'EXPENSE', description: 'Supermercado Pão de Açúcar', amount: 890.40, date: new Date('2026-10-08'), status: 'COMPLETED', paymentMethod: 'Cartão de Crédito', currency: 'BRL', exchangeRate: 1, tags: ['alimentacao'], workspaceId: 'ws-personal', accountId: 'acc-cartao-pf', categoryId: 'cat-pf-alimen' },
    { id: 'tx-pf-4', type: 'EXPENSE', description: 'MacBook Pro M4 (Parcela 3 de 10)', amount: 1499.00, date: new Date('2026-10-02'), status: 'COMPLETED', paymentMethod: 'Cartão de Crédito', currency: 'BRL', exchangeRate: 1, isInstallment: true, installmentNumber: 3, totalInstallments: 10, tags: ['equipamento', 'parcelado'], workspaceId: 'ws-personal', accountId: 'acc-cartao-pf', categoryId: 'cat-pf-educa' },
    // TechCorp
    { id: 'tx-pj-1', type: 'INCOME', description: 'Assinaturas Enterprise SaaS (Lote Outubro)', amount: 54800.00, date: new Date('2026-10-03'), status: 'COMPLETED', paymentMethod: 'Boleto / PIX Asaas', currency: 'BRL', exchangeRate: 1, tags: ['saas', 'recorrente'], workspaceId: 'ws-techcorp', accountId: 'acc-asaas-pj', categoryId: 'cat-pj-saas', costCenterId: 'cc-fintech' },
    { id: 'tx-pj-2', type: 'INCOME', description: 'Faturamento Stripe Global (Clientes EUA/Europa)', amount: 50285.00, date: new Date('2026-10-07'), status: 'COMPLETED', paymentMethod: 'Stripe Gateway', currency: 'USD', exchangeRate: 5.65, tags: ['exportacao-servicos', 'usd'], workspaceId: 'ws-techcorp', accountId: 'acc-stripe-pj', categoryId: 'cat-pj-saas', costCenterId: 'cc-fintech' },
    { id: 'tx-pj-folha-1', type: 'EXPENSE', description: 'Pagamento Pró-Labore Rogério (Sócio-Diretor)', amount: 18500.00, date: new Date('2026-10-05'), status: 'COMPLETED', paymentMethod: 'PIX', currency: 'BRL', exchangeRate: 1, tags: ['pro-labore', 'socio'], workspaceId: 'ws-techcorp', accountId: 'acc-itau-pj', categoryId: 'cat-pj-folha', costCenterId: 'cc-adm' },
    { id: 'tx-pj-3', type: 'EXPENSE', description: 'Infraestrutura AWS Cloud & Neon Serverless Postgres', amount: 4890.00, date: new Date('2026-10-04'), status: 'COMPLETED', paymentMethod: 'Cartão Corporativo', currency: 'BRL', exchangeRate: 1, tags: ['cloud', 'infra'], workspaceId: 'ws-techcorp', accountId: 'acc-itau-pj', categoryId: 'cat-pj-cloud', costCenterId: 'cc-cloud' },
    { id: 'tx-pj-4', type: 'EXPENSE', description: 'Campanhas Google Ads & Meta Ads (Performance)', amount: 9200.00, date: new Date('2026-10-09'), status: 'COMPLETED', paymentMethod: 'Cartão Corporativo', currency: 'BRL', exchangeRate: 1, tags: ['marketing', 'aquisicao'], workspaceId: 'ws-techcorp', accountId: 'acc-itau-pj', categoryId: 'cat-pj-mkt', costCenterId: 'cc-mkt' },
    { id: 'tx-pj-5', type: 'EXPENSE', description: 'DAS Simples Nacional (Imposto sobre Serviços)', amount: 11450.00, date: new Date('2026-10-12'), status: 'COMPLETED', paymentMethod: 'Débito Automático', currency: 'BRL', exchangeRate: 1, tags: ['impostos', 'tributos'], workspaceId: 'ws-techcorp', accountId: 'acc-itau-pj', categoryId: 'cat-pj-imp', costCenterId: 'cc-adm' },
  ];

  for (const tx of transactionsData) {
    await prisma.transaction.upsert({
      where: { id: tx.id },
      update: tx,
      create: tx,
    });
  }

  // 8. Contas a Pagar / Receber
  const payablesData = [
    { id: 'pr-pj-1', type: 'PAYABLE', description: 'Honorários Contabilidade Premium', amount: 1800.00, dueDate: new Date('2026-10-15'), status: 'SCHEDULED', recipientOrPayer: 'Contábil Prime & Associados', penaltyRate: 2, interestRateDaily: 0.033, accruedInterest: 0, workspaceId: 'ws-techcorp', accountId: 'acc-itau-pj', categoryId: 'cat-pj-cont' },
    { id: 'pr-pj-2', type: 'PAYABLE', description: 'Licenciamento Figma Enterprise & GitHub Copilot', amount: 1250.00, dueDate: new Date('2026-10-09'), status: 'OVERDUE', recipientOrPayer: 'Software Vendor Corp', penaltyRate: 2.0, interestRateDaily: 0.05, accruedInterest: 31.25, workspaceId: 'ws-techcorp', accountId: 'acc-itau-pj', categoryId: 'cat-pj-soft' },
    { id: 'pr-pj-3', type: 'RECEIVABLE', description: 'Fatura Mensal Contrato SaaS - Banco Alpha', amount: 28500.00, dueDate: new Date('2026-10-20'), status: 'PENDING', recipientOrPayer: 'Banco Alpha S.A.', penaltyRate: 2, interestRateDaily: 0.033, accruedInterest: 0, workspaceId: 'ws-techcorp', accountId: 'acc-asaas-pj', categoryId: 'cat-pj-saas' },
    { id: 'pr-pf-1', type: 'PAYABLE', description: 'Fatura Cartão Nubank Ultravioleta', amount: 3420.00, dueDate: new Date('2026-10-28'), status: 'SCHEDULED', recipientOrPayer: 'Nubank', penaltyRate: 2, interestRateDaily: 0.04, accruedInterest: 0, workspaceId: 'ws-personal', accountId: 'acc-nubank-pf', categoryId: 'cat-pf-moradia' },
    { id: 'pr-pf-2', type: 'RECEIVABLE', description: 'Restituição IRPF (Lote 5)', amount: 2840.00, dueDate: new Date('2026-10-31'), status: 'PENDING', recipientOrPayer: 'Receita Federal do Brasil', penaltyRate: 0, interestRateDaily: 0, accruedInterest: 0, workspaceId: 'ws-personal', accountId: 'acc-nubank-pf', categoryId: 'cat-pf-div' },
  ];

  for (const pr of payablesData) {
    await prisma.payableReceivable.upsert({
      where: { id: pr.id },
      update: pr,
      create: pr,
    });
  }

  // 9. Metas Pessoais
  const goalsData = [
    { id: 'goal-1', title: 'Reserva de Emergência (6 Meses)', targetAmount: 60000, currentAmount: 48500, targetDate: new Date('2026-12-31'), color: '#10b981', icon: 'ShieldCheck', category: 'Segurança', workspaceId: 'ws-personal' },
    { id: 'goal-2', title: 'Viagem para Tóquio (Férias 2027)', targetAmount: 35000, currentAmount: 18200, targetDate: new Date('2027-04-15'), color: '#6366f1', icon: 'Plane', category: 'Lazer', workspaceId: 'ws-personal' },
    { id: 'goal-3', title: 'Aporte Carteira de Dividendos FIIs/Ações', targetAmount: 100000, currentAmount: 72000, targetDate: new Date('2027-06-30'), color: '#06b6d4', icon: 'TrendingUp', category: 'Patrimônio', workspaceId: 'ws-personal' },
  ];

  for (const g of goalsData) {
    await prisma.goal.upsert({
      where: { id: g.id },
      update: g,
      create: g,
    });
  }

  // 10. Regras de Conciliação
  const rulesData = [
    { id: 'rule-1', keyword: 'AWS', targetType: 'EXPENSE', workspaceId: 'ws-techcorp' },
    { id: 'rule-2', keyword: 'UBER', targetType: 'EXPENSE', workspaceId: 'ws-personal' },
    { id: 'rule-3', keyword: 'SHELL', targetType: 'EXPENSE', workspaceId: 'ws-personal' },
    { id: 'rule-4', keyword: 'ASAAS', targetType: 'INCOME', workspaceId: 'ws-techcorp' },
  ];

  for (const r of rulesData) {
    await prisma.reconciliationRule.upsert({
      where: { id: r.id },
      update: r,
      create: r,
    });
  }

  console.log('✅ Banco de Dados Neon populado com sucesso com dados corporativos e pessoais!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
