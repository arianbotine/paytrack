import { PrismaClient, UserRole, CategoryType, PaymentMethod, AccountStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Empresa Demo',
      document: '12345678000199',
      email: 'contato@empresademo.com.br',
      phone: '(11) 99999-9999',
      address: 'Rua Exemplo, 123 - São Paulo/SP',
    },
  });

  console.log('✅ Organization created:', organization.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      organizationId: organization.id,
      email: 'admin@paytrack.com',
      password: hashedPassword,
      name: 'Administrador',
      role: UserRole.OWNER,
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create categories for payables
  const payableCategories = await Promise.all([
    prisma.category.create({
      data: {
        organizationId: organization.id,
        name: 'Aluguel',
        type: CategoryType.PAYABLE,
        color: '#EF4444',
      },
    }),
    prisma.category.create({
      data: {
        organizationId: organization.id,
        name: 'Fornecedores',
        type: CategoryType.PAYABLE,
        color: '#F97316',
      },
    }),
    prisma.category.create({
      data: {
        organizationId: organization.id,
        name: 'Serviços',
        type: CategoryType.PAYABLE,
        color: '#8B5CF6',
      },
    }),
    prisma.category.create({
      data: {
        organizationId: organization.id,
        name: 'Impostos',
        type: CategoryType.PAYABLE,
        color: '#EC4899',
      },
    }),
    prisma.category.create({
      data: {
        organizationId: organization.id,
        name: 'Salários',
        type: CategoryType.PAYABLE,
        color: '#14B8A6',
      },
    }),
  ]);

  console.log('✅ Payable categories created:', payableCategories.length);

  // Create categories for receivables
  const receivableCategories = await Promise.all([
    prisma.category.create({
      data: {
        organizationId: organization.id,
        name: 'Vendas',
        type: CategoryType.RECEIVABLE,
        color: '#22C55E',
      },
    }),
    prisma.category.create({
      data: {
        organizationId: organization.id,
        name: 'Serviços Prestados',
        type: CategoryType.RECEIVABLE,
        color: '#3B82F6',
      },
    }),
    prisma.category.create({
      data: {
        organizationId: organization.id,
        name: 'Comissões',
        type: CategoryType.RECEIVABLE,
        color: '#F59E0B',
      },
    }),
  ]);

  console.log('✅ Receivable categories created:', receivableCategories.length);

  // Create tags
  const tags = await Promise.all([
    prisma.tag.create({
      data: { organizationId: organization.id, name: 'Urgente', color: '#EF4444' },
    }),
    prisma.tag.create({
      data: { organizationId: organization.id, name: 'Recorrente', color: '#3B82F6' },
    }),
    prisma.tag.create({
      data: { organizationId: organization.id, name: 'Parcelado', color: '#8B5CF6' },
    }),
  ]);

  console.log('✅ Tags created:', tags.length);

  // Create vendors
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        organizationId: organization.id,
        name: 'Imobiliária Central',
        document: '11222333000144',
        email: 'financeiro@imobiliariacentral.com.br',
        phone: '(11) 3333-4444',
      },
    }),
    prisma.vendor.create({
      data: {
        organizationId: organization.id,
        name: 'Distribuidora ABC',
        document: '22333444000155',
        email: 'vendas@distribuidoraabc.com.br',
        phone: '(11) 4444-5555',
      },
    }),
    prisma.vendor.create({
      data: {
        organizationId: organization.id,
        name: 'Tech Solutions',
        document: '33444555000166',
        email: 'contato@techsolutions.com.br',
        phone: '(11) 5555-6666',
      },
    }),
  ]);

  console.log('✅ Vendors created:', vendors.length);

  // Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        organizationId: organization.id,
        name: 'João Silva',
        document: '12345678900',
        email: 'joao.silva@email.com',
        phone: '(11) 98765-4321',
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: organization.id,
        name: 'Empresa XYZ Ltda',
        document: '44555666000177',
        email: 'financeiro@empresaxyz.com.br',
        phone: '(11) 6666-7777',
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: organization.id,
        name: 'Maria Oliveira',
        document: '98765432100',
        email: 'maria.oliveira@email.com',
        phone: '(11) 91234-5678',
      },
    }),
  ]);

  console.log('✅ Customers created:', customers.length);

  // Create sample payables
  const today = new Date();
  const payables = await Promise.all([
    prisma.payable.create({
      data: {
        organizationId: organization.id,
        vendorId: vendors[0].id,
        categoryId: payableCategories[0].id,
        description: 'Aluguel do escritório - Dezembro/2025',
        amount: 3500.00,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 10),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: AccountStatus.PENDING,
      },
    }),
    prisma.payable.create({
      data: {
        organizationId: organization.id,
        vendorId: vendors[1].id,
        categoryId: payableCategories[1].id,
        description: 'Compra de mercadorias - NF 12345',
        amount: 8750.50,
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15),
        paymentMethod: PaymentMethod.BOLETO,
        status: AccountStatus.PENDING,
        documentNumber: 'NF-12345',
      },
    }),
    prisma.payable.create({
      data: {
        organizationId: organization.id,
        vendorId: vendors[2].id,
        categoryId: payableCategories[2].id,
        description: 'Manutenção de sistemas',
        amount: 1200.00,
        paidAmount: 600.00,
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
        paymentMethod: PaymentMethod.PIX,
        status: AccountStatus.PARTIAL,
      },
    }),
    prisma.payable.create({
      data: {
        organizationId: organization.id,
        vendorId: vendors[0].id,
        categoryId: payableCategories[0].id,
        description: 'Aluguel do escritório - Novembro/2025',
        amount: 3500.00,
        paidAmount: 3500.00,
        dueDate: new Date(today.getFullYear(), today.getMonth() - 1, 10),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: AccountStatus.PAID,
      },
    }),
  ]);

  console.log('✅ Payables created:', payables.length);

  // Create sample receivables
  const receivables = await Promise.all([
    prisma.receivable.create({
      data: {
        organizationId: organization.id,
        customerId: customers[0].id,
        categoryId: receivableCategories[0].id,
        description: 'Venda de produtos - Pedido #001',
        amount: 2500.00,
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        status: AccountStatus.PENDING,
        documentNumber: 'PED-001',
      },
    }),
    prisma.receivable.create({
      data: {
        organizationId: organization.id,
        customerId: customers[1].id,
        categoryId: receivableCategories[1].id,
        description: 'Consultoria - Projeto Alpha',
        amount: 15000.00,
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: AccountStatus.PENDING,
      },
    }),
    prisma.receivable.create({
      data: {
        organizationId: organization.id,
        customerId: customers[2].id,
        categoryId: receivableCategories[0].id,
        description: 'Venda de serviços - Mês anterior',
        amount: 4200.00,
        paidAmount: 4200.00,
        dueDate: new Date(today.getFullYear(), today.getMonth() - 1, 20),
        paymentMethod: PaymentMethod.PIX,
        status: AccountStatus.PAID,
      },
    }),
    prisma.receivable.create({
      data: {
        organizationId: organization.id,
        customerId: customers[0].id,
        categoryId: receivableCategories[2].id,
        description: 'Comissão sobre vendas - Novembro',
        amount: 1800.00,
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
        paymentMethod: PaymentMethod.PIX,
        status: AccountStatus.OVERDUE,
      },
    }),
  ]);

  console.log('✅ Receivables created:', receivables.length);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Email: admin@paytrack.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
