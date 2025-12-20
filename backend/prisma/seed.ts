import { PrismaClient, UserRole, CategoryType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário admin do sistema
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@paytrack.com' },
    update: {},
    create: {
      email: 'admin@paytrack.com',
      password: adminPassword,
      name: 'Administrador do Sistema',
      isSystemAdmin: true,
      isActive: true,
    },
  });
  console.log('✅ Usuário admin criado:', admin.email);

  // Criar organização demo
  const organization = await prisma.organization.upsert({
    where: { id: 'demo-org-id' },
    update: {},
    create: {
      id: 'demo-org-id',
      name: 'Empresa Demo',
      document: '12.345.678/0001-90',
      email: 'contato@empresademo.com.br',
      phone: '(11) 98765-4321',
      address: 'Rua Demo, 123 - São Paulo, SP',
      isActive: true,
    },
  });
  console.log('✅ Organização demo criada:', organization.name);

  // Vincular admin à organização
  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      organizationId: organization.id,
      role: UserRole.OWNER,
      isActive: true,
    },
  });
  console.log('✅ Admin vinculado à organização como OWNER');

  // Criar categorias demo
  const categoriesData = [
    {
      name: 'Aluguel',
      type: CategoryType.PAYABLE,
      color: '#EF4444',
      description: 'Despesas com aluguel',
    },
    {
      name: 'Fornecedores',
      type: CategoryType.PAYABLE,
      color: '#F97316',
      description: 'Pagamentos a fornecedores',
    },
    {
      name: 'Salários',
      type: CategoryType.PAYABLE,
      color: '#8B5CF6',
      description: 'Folha de pagamento',
    },
    {
      name: 'Vendas',
      type: CategoryType.RECEIVABLE,
      color: '#10B981',
      description: 'Receitas de vendas',
    },
    {
      name: 'Serviços',
      type: CategoryType.RECEIVABLE,
      color: '#3B82F6',
      description: 'Receitas de serviços',
    },
  ];

  for (const categoryData of categoriesData) {
    await prisma.category.upsert({
      where: {
        organizationId_name_type: {
          organizationId: organization.id,
          name: categoryData.name,
          type: categoryData.type,
        },
      },
      update: {},
      create: {
        ...categoryData,
        organizationId: organization.id,
      },
    });
  }
  console.log('✅ Categorias demo criadas');

  // Criar tags demo
  const tagsData = [
    { name: 'Urgente', color: '#DC2626' },
    { name: 'Recorrente', color: '#7C3AED' },
    { name: 'Projeto A', color: '#2563EB' },
  ];

  for (const tagData of tagsData) {
    await prisma.tag.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: tagData.name,
        },
      },
      update: {},
      create: {
        ...tagData,
        organizationId: organization.id,
      },
    });
  }
  console.log('✅ Tags demo criadas');

  // Criar fornecedores demo
  const vendorsData = [
    {
      name: 'Fornecedor A',
      document: '12.345.678/0001-91',
      email: 'contato@fornecedora.com.br',
      phone: '(11) 91234-5678',
    },
    {
      name: 'Fornecedor B',
      document: '98.765.432/0001-10',
      email: 'vendas@fornecedorb.com.br',
      phone: '(11) 98765-4321',
    },
  ];

  for (const vendorData of vendorsData) {
    await prisma.vendor.create({
      data: {
        ...vendorData,
        organizationId: organization.id,
      },
    });
  }
  console.log('✅ Fornecedores demo criados');

  // Criar clientes demo
  const customersData = [
    {
      name: 'Cliente A',
      document: '123.456.789-00',
      email: 'cliente.a@email.com',
      phone: '(11) 91111-1111',
    },
    {
      name: 'Cliente B',
      document: '987.654.321-00',
      email: 'cliente.b@email.com',
      phone: '(11) 92222-2222',
    },
  ];

  for (const customerData of customersData) {
    await prisma.customer.create({
      data: {
        ...customerData,
        organizationId: organization.id,
      },
    });
  }
  console.log('✅ Clientes demo criados');

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📝 Credenciais de acesso:');
  console.log('   Email: admin@paytrack.com');
  console.log('   Senha: admin123');
}

main()
  .catch(e => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
