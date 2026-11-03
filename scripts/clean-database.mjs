import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpando o banco de dados Neon para uso de produção...');

  // 1. Remover dados transacionais e de teste
  await prisma.transaction.deleteMany();
  console.log('- Transações removidas');

  await prisma.payableReceivable.deleteMany();
  console.log('- Contas a pagar/receber removidas');

  await prisma.bankStatementItem.deleteMany();
  await prisma.bankStatement.deleteMany();
  console.log('- Extratos bancários removidos');

  await prisma.reconciliationRule.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.costCenter.deleteMany();
  console.log('- Metas, regras e orçamentos removidos');

  // 2. Limpar contas bancárias e categorias antigas
  await prisma.account.deleteMany();
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();
  console.log('- Contas bancárias e categorias antigas removidas');

  // 3. Limpar membros, workspaces e usuários antigos de teste
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
  console.log('- Usuários e workspaces antigos de demonstração removidos');

  console.log('\n✨ Banco de dados 100% zerado e pronto para você criar sua conta na tela de login!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao limpar banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
