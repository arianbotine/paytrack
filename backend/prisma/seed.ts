import {
  PrismaClient,
  UserRole,
  CategoryType,
  PaymentMethod,
  AccountStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create system admin user (no organization)
  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const systemAdmin = await prisma.user.upsert({
    where: { email: 'admin@paytrack.com' },
    update: {},
    create: {
      email: 'admin@paytrack.com',
      password: hashedAdminPassword,
      name: 'System Administrator',
      isSystemAdmin: true,
    },
  });

  console.log('✅ System Admin user created:', systemAdmin.email);

  // Create default organization
  const organization = await prisma.organization.upsert({
    where: { document: '12345678000199' },
    update: {},
    create: {
      name: 'Empresa Demo',
      document: '12345678000199',
      email: 'contato@empresademo.com.br',
      phone: '(11) 99999-9999',
      address: 'Rua Exemplo, 123 - São Paulo/SP',
    },
  });

  console.log('✅ Organization created:', organization.name);

  // Create demo organization user (OWNER)
  const hashedOwnerPassword = await bcrypt.hash('owner123', 10);
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@empresademo.com.br' },
    update: {},
    create: {
      email: 'owner@empresademo.com.br',
      password: hashedOwnerPassword,
      name: 'Proprietário Demo',
      isSystemAdmin: false,
    },
  });

  // Associate owner with organization
  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: ownerUser.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: ownerUser.id,
      organizationId: organization.id,
      role: UserRole.OWNER,
    },
  });

  console.log('✅ Demo Owner user created and associated:', ownerUser.email);

  // Create categories for payables
  const payableCategoriesData = [
    { name: 'Aluguel', color: '#EF4444' },
    { name: 'Fornecedores', color: '#F97316' },
    { name: 'Serviços', color: '#8B5CF6' },
    { name: 'Impostos', color: '#EC4899' },
    { name: 'Salários', color: '#14B8A6' },
  ];

  const payableCategories = [];
  for (const catData of payableCategoriesData) {
    let category = await prisma.category.findFirst({
      where: {
        name: catData.name,
        organizationId: organization.id,
        type: CategoryType.PAYABLE,
      },
    });
    category ??= await prisma.category.create({
      data: {
        ...catData,
        organizationId: organization.id,
        type: CategoryType.PAYABLE,
      },
    });
    payableCategories.push(category);
  }

  console.log('✅ Payable categories created:', payableCategories.length);

  // Create categories for receivables
  const receivableCategoriesData = [
    { name: 'Vendas', color: '#22C55E' },
    { name: 'Serviços Prestados', color: '#3B82F6' },
    { name: 'Comissões', color: '#F59E0B' },
  ];

  const receivableCategories = [];
  for (const catData of receivableCategoriesData) {
    let category = await prisma.category.findFirst({
      where: {
        name: catData.name,
        organizationId: organization.id,
        type: CategoryType.RECEIVABLE,
      },
    });
    category ??= await prisma.category.create({
      data: {
        ...catData,
        organizationId: organization.id,
        type: CategoryType.RECEIVABLE,
      },
    });
    receivableCategories.push(category);
  }

  console.log('✅ Receivable categories created:', receivableCategories.length);

  // Create tags
  const tagsData = [
    { name: 'Urgente', color: '#EF4444' },
    { name: 'Recorrente', color: '#3B82F6' },
    { name: 'Parcelado', color: '#8B5CF6' },
  ];

  const tags = [];
  for (const tagData of tagsData) {
    let tag = await prisma.tag.findFirst({
      where: {
        name: tagData.name,
        organizationId: organization.id,
      },
    });
    tag ??= await prisma.tag.create({
      data: {
        ...tagData,
        organizationId: organization.id,
      },
    });
    tags.push(tag);
  }

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
        amount: 3500,
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
        amount: 8750.5,
        dueDate: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 15
        ),
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
        amount: 1200,
        dueDate: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 5
        ),
        paymentMethod: PaymentMethod.PIX,
        status: AccountStatus.PARTIAL,
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
        amount: 2500,
        dueDate: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 10
        ),
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
        amount: 15000,
        dueDate: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 30
        ),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: AccountStatus.PENDING,
      },
    }),
    prisma.receivable.create({
      data: {
        organizationId: organization.id,
        customerId: customers[2].id,
        categoryId: receivableCategories[0].id,
        description: 'Comissão sobre vendas - Novembro',
        amount: 1800,
        dueDate: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 3
        ),
        paymentMethod: PaymentMethod.PIX,
        status: AccountStatus.OVERDUE,
      },
    }),
  ]);

  console.log('✅ Receivables created:', receivables.length);

  // Create payments and allocations for paid accounts
  console.log('💰 Creating payments and allocations...');

  // Payment for partial payable (Manutenção de sistemas - 600 paid)
  const partialPayment = await prisma.payment.create({
    data: {
      organizationId: organization.id,
      amount: 600,
      paymentDate: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 2
      ),
      paymentMethod: PaymentMethod.PIX,
      notes: 'Pagamento parcial - Manutenção de sistemas',
      allocations: {
        create: {
          payableId: payables[2].id,
          amount: 600,
        },
      },
    },
  });

  // Update payable status and paidAmount
  await prisma.payable.update({
    where: { id: payables[2].id },
    data: {
      paidAmount: 600,
      status: AccountStatus.PARTIAL,
    },
  });

  // Payment for paid payable (Aluguel do escritório - Novembro/2025)
  const paidPayable = await prisma.payable.create({
    data: {
      organizationId: organization.id,
      vendorId: vendors[0].id,
      categoryId: payableCategories[0].id,
      description: 'Aluguel do escritório - Novembro/2025',
      amount: 3500,
      dueDate: new Date(today.getFullYear(), today.getMonth() - 1, 10),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: AccountStatus.PENDING, // Will be updated after payment
    },
  });

  const fullPayablePayment = await prisma.payment.create({
    data: {
      organizationId: organization.id,
      amount: 3500,
      paymentDate: new Date(today.getFullYear(), today.getMonth() - 1, 10),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      notes: 'Pagamento do aluguel - Novembro/2025',
      allocations: {
        create: {
          payableId: paidPayable.id,
          amount: 3500,
        },
      },
    },
  });

  // Update payable status and paidAmount
  await prisma.payable.update({
    where: { id: paidPayable.id },
    data: {
      paidAmount: 3500,
      status: AccountStatus.PAID,
    },
  });

  // Payment for paid receivable (Venda de serviços - Mês anterior)
  const paidReceivable = await prisma.receivable.create({
    data: {
      organizationId: organization.id,
      customerId: customers[2].id,
      categoryId: receivableCategories[0].id,
      description: 'Venda de serviços - Mês anterior',
      amount: 4200,
      dueDate: new Date(today.getFullYear(), today.getMonth() - 1, 20),
      paymentMethod: PaymentMethod.PIX,
      status: AccountStatus.PENDING, // Will be updated after payment
    },
  });

  const fullReceivablePayment = await prisma.payment.create({
    data: {
      organizationId: organization.id,
      amount: 4200,
      paymentDate: new Date(today.getFullYear(), today.getMonth() - 1, 20),
      paymentMethod: PaymentMethod.PIX,
      notes: 'Recebimento de serviços - Mês anterior',
      allocations: {
        create: {
          receivableId: paidReceivable.id,
          amount: 4200,
        },
      },
    },
  });

  // Update receivable status and paidAmount
  await prisma.receivable.update({
    where: { id: paidReceivable.id },
    data: {
      paidAmount: 4200,
      status: AccountStatus.PAID,
    },
  });

  console.log('✅ Payments and allocations created: 3 payments');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   System Admin:');
  console.log('     Email: admin@paytrack.com');
  console.log('     Password: admin123');
  console.log('\n   Demo Organization Owner:');
  console.log('     Email: owner@empresademo.com.br');
  console.log('     Password: owner123');
}

(async () => {
  try {
    await main();
  } catch (e) {
    console.error('❌ Seed error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
