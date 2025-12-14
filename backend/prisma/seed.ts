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

  // ========================================
  // Create Organizations
  // ========================================
  const orgEmpresaDemo = await prisma.organization.upsert({
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

  const orgTechStartup = await prisma.organization.upsert({
    where: { document: '98765432000188' },
    update: {},
    create: {
      name: 'Tech Startup Ltda',
      document: '98765432000188',
      email: 'contato@techstartup.com.br',
      phone: '(11) 98888-7777',
      address: 'Av. Paulista, 1000 - São Paulo/SP',
    },
  });

  const orgConsultoriaXYZ = await prisma.organization.upsert({
    where: { document: '11223344000155' },
    update: {},
    create: {
      name: 'Consultoria XYZ',
      document: '11223344000155',
      email: 'contato@consultoriaxyz.com.br',
      phone: '(21) 97777-6666',
      address: 'Rua do Comércio, 456 - Rio de Janeiro/RJ',
    },
  });

  console.log('✅ Organizations created: 3');

  // ========================================
  // Create Users
  // ========================================
  const hashedPassword = await bcrypt.hash('senha123', 10);

  // Empresa Demo users
  const ownerEmpresaDemo = await prisma.user.upsert({
    where: { email: 'owner@empresademo.com.br' },
    update: {},
    create: {
      email: 'owner@empresademo.com.br',
      password: hashedPassword,
      name: 'João Silva',
      isSystemAdmin: false,
    },
  });

  const viewerEmpresaDemo = await prisma.user.upsert({
    where: { email: 'viewer@empresademo.com.br' },
    update: {},
    create: {
      email: 'viewer@empresademo.com.br',
      password: hashedPassword,
      name: 'Maria Santos',
      isSystemAdmin: false,
    },
  });

  // Tech Startup users
  const adminTechStartup = await prisma.user.upsert({
    where: { email: 'admin@techstartup.com.br' },
    update: {},
    create: {
      email: 'admin@techstartup.com.br',
      password: hashedPassword,
      name: 'Carlos Oliveira',
      isSystemAdmin: false,
    },
  });

  // Consultoria XYZ users
  const ownerConsultoriaXYZ = await prisma.user.upsert({
    where: { email: 'owner@consultoriaxyz.com.br' },
    update: {},
    create: {
      email: 'owner@consultoriaxyz.com.br',
      password: hashedPassword,
      name: 'Ana Costa',
      isSystemAdmin: false,
    },
  });

  // Multi-org accountant
  const contadorGeral = await prisma.user.upsert({
    where: { email: 'contador@geral.com.br' },
    update: {},
    create: {
      email: 'contador@geral.com.br',
      password: hashedPassword,
      name: 'Roberto Contador',
      isSystemAdmin: false,
    },
  });

  console.log('✅ Users created: 5');

  // ========================================
  // Associate Users with Organizations
  // ========================================
  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: ownerEmpresaDemo.id,
        organizationId: orgEmpresaDemo.id,
      },
    },
    update: {},
    create: {
      userId: ownerEmpresaDemo.id,
      organizationId: orgEmpresaDemo.id,
      role: UserRole.OWNER,
    },
  });

  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: viewerEmpresaDemo.id,
        organizationId: orgEmpresaDemo.id,
      },
    },
    update: {},
    create: {
      userId: viewerEmpresaDemo.id,
      organizationId: orgEmpresaDemo.id,
      role: UserRole.VIEWER,
    },
  });

  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: adminTechStartup.id,
        organizationId: orgTechStartup.id,
      },
    },
    update: {},
    create: {
      userId: adminTechStartup.id,
      organizationId: orgTechStartup.id,
      role: UserRole.ADMIN,
    },
  });

  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: ownerConsultoriaXYZ.id,
        organizationId: orgConsultoriaXYZ.id,
      },
    },
    update: {},
    create: {
      userId: ownerConsultoriaXYZ.id,
      organizationId: orgConsultoriaXYZ.id,
      role: UserRole.OWNER,
    },
  });

  // Contador works for multiple organizations
  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: contadorGeral.id,
        organizationId: orgEmpresaDemo.id,
      },
    },
    update: {},
    create: {
      userId: contadorGeral.id,
      organizationId: orgEmpresaDemo.id,
      role: UserRole.ACCOUNTANT,
    },
  });

  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: contadorGeral.id,
        organizationId: orgTechStartup.id,
      },
    },
    update: {},
    create: {
      userId: contadorGeral.id,
      organizationId: orgTechStartup.id,
      role: UserRole.ACCOUNTANT,
    },
  });

  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: contadorGeral.id,
        organizationId: orgConsultoriaXYZ.id,
      },
    },
    update: {},
    create: {
      userId: contadorGeral.id,
      organizationId: orgConsultoriaXYZ.id,
      role: UserRole.ACCOUNTANT,
    },
  });

  console.log('✅ User-Organization associations created: 7');

  // ========================================
  // Seed data for Empresa Demo
  // ========================================
  console.log('\n📦 Seeding Empresa Demo data...');

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
        organizationId: orgEmpresaDemo.id,
        type: CategoryType.PAYABLE,
      },
    });
    category ??= await prisma.category.create({
      data: {
        ...catData,
        organizationId: orgEmpresaDemo.id,
        type: CategoryType.PAYABLE,
      },
    });
    payableCategories.push(category);
  }

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
        organizationId: orgEmpresaDemo.id,
        type: CategoryType.RECEIVABLE,
      },
    });
    category ??= await prisma.category.create({
      data: {
        ...catData,
        organizationId: orgEmpresaDemo.id,
        type: CategoryType.RECEIVABLE,
      },
    });
    receivableCategories.push(category);
  }

  console.log(
    '  ✅ Categories created:',
    payableCategories.length + receivableCategories.length
  );

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
        organizationId: orgEmpresaDemo.id,
      },
    });
    tag ??= await prisma.tag.create({
      data: {
        ...tagData,
        organizationId: orgEmpresaDemo.id,
      },
    });
    tags.push(tag);
  }

  console.log('  ✅ Tags created:', tags.length);

  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        organizationId: orgEmpresaDemo.id,
        name: 'Imobiliária Central',
        document: '11222333000144',
        email: 'financeiro@imobiliariacentral.com.br',
        phone: '(11) 3333-4444',
      },
    }),
    prisma.vendor.create({
      data: {
        organizationId: orgEmpresaDemo.id,
        name: 'Distribuidora ABC',
        document: '22333444000155',
        email: 'vendas@distribuidoraabc.com.br',
        phone: '(11) 4444-5555',
      },
    }),
    prisma.vendor.create({
      data: {
        organizationId: orgEmpresaDemo.id,
        name: 'Tech Solutions',
        document: '33444555000166',
        email: 'contato@techsolutions.com.br',
        phone: '(11) 5555-6666',
      },
    }),
  ]);

  console.log('  ✅ Vendors created:', vendors.length);

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        organizationId: orgEmpresaDemo.id,
        name: 'Pedro Santos',
        document: '12345678900',
        email: 'pedro.santos@email.com',
        phone: '(11) 98765-4321',
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: orgEmpresaDemo.id,
        name: 'Empresa XYZ Ltda',
        document: '44555666000177',
        email: 'financeiro@empresaxyz.com.br',
        phone: '(11) 6666-7777',
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: orgEmpresaDemo.id,
        name: 'Paula Oliveira',
        document: '98765432100',
        email: 'paula.oliveira@email.com',
        phone: '(11) 91234-5678',
      },
    }),
  ]);

  console.log('  ✅ Customers created:', customers.length);

  const today = new Date();
  const payables = await Promise.all([
    prisma.payable.create({
      data: {
        organizationId: orgEmpresaDemo.id,
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
        organizationId: orgEmpresaDemo.id,
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
        organizationId: orgEmpresaDemo.id,
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

  console.log('  ✅ Payables created:', payables.length);

  const receivables = await Promise.all([
    prisma.receivable.create({
      data: {
        organizationId: orgEmpresaDemo.id,
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
        organizationId: orgEmpresaDemo.id,
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
        organizationId: orgEmpresaDemo.id,
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

  console.log('  ✅ Receivables created:', receivables.length);

  // Payment for partial payable
  await prisma.payment.create({
    data: {
      organizationId: orgEmpresaDemo.id,
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

  await prisma.payable.update({
    where: { id: payables[2].id },
    data: {
      paidAmount: 600,
      status: AccountStatus.PARTIAL,
    },
  });

  // Payment for paid payable
  const paidPayable = await prisma.payable.create({
    data: {
      organizationId: orgEmpresaDemo.id,
      vendorId: vendors[0].id,
      categoryId: payableCategories[0].id,
      description: 'Aluguel do escritório - Novembro/2025',
      amount: 3500,
      dueDate: new Date(today.getFullYear(), today.getMonth() - 1, 10),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: AccountStatus.PENDING,
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: orgEmpresaDemo.id,
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

  await prisma.payable.update({
    where: { id: paidPayable.id },
    data: {
      paidAmount: 3500,
      status: AccountStatus.PAID,
    },
  });

  // Payment for paid receivable
  const paidReceivable = await prisma.receivable.create({
    data: {
      organizationId: orgEmpresaDemo.id,
      customerId: customers[2].id,
      categoryId: receivableCategories[0].id,
      description: 'Venda de serviços - Mês anterior',
      amount: 4200,
      dueDate: new Date(today.getFullYear(), today.getMonth() - 1, 20),
      paymentMethod: PaymentMethod.PIX,
      status: AccountStatus.PENDING,
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: orgEmpresaDemo.id,
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

  await prisma.receivable.update({
    where: { id: paidReceivable.id },
    data: {
      paidAmount: 4200,
      status: AccountStatus.PAID,
    },
  });

  console.log('  ✅ Payments created: 3');

  // ========================================
  // Seed data for Tech Startup Ltda
  // ========================================
  console.log('\n📦 Seeding Tech Startup Ltda data...');

  const techCategories = await Promise.all([
    prisma.category.create({
      data: {
        organizationId: orgTechStartup.id,
        name: 'Infraestrutura',
        color: '#3B82F6',
        type: CategoryType.PAYABLE,
      },
    }),
    prisma.category.create({
      data: {
        organizationId: orgTechStartup.id,
        name: 'Marketing',
        color: '#EC4899',
        type: CategoryType.PAYABLE,
      },
    }),
    prisma.category.create({
      data: {
        organizationId: orgTechStartup.id,
        name: 'Assinaturas',
        color: '#22C55E',
        type: CategoryType.RECEIVABLE,
      },
    }),
  ]);

  const techVendors = await Promise.all([
    prisma.vendor.create({
      data: {
        organizationId: orgTechStartup.id,
        name: 'AWS Cloud Services',
        document: '55666777000188',
        email: 'billing@aws.com',
        phone: '0800-777-8888',
      },
    }),
    prisma.vendor.create({
      data: {
        organizationId: orgTechStartup.id,
        name: 'Google Ads',
        document: '66777888000199',
        email: 'payments@google.com',
        phone: '0800-888-9999',
      },
    }),
  ]);

  const techCustomers = await Promise.all([
    prisma.customer.create({
      data: {
        organizationId: orgTechStartup.id,
        name: 'Cliente Enterprise A',
        document: '77888999000100',
        email: 'financeiro@enterprisea.com.br',
        phone: '(11) 93333-4444',
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: orgTechStartup.id,
        name: 'Cliente Enterprise B',
        document: '88999000000111',
        email: 'pagamentos@enterpriseb.com.br',
        phone: '(11) 94444-5555',
      },
    }),
  ]);

  await Promise.all([
    prisma.payable.create({
      data: {
        organizationId: orgTechStartup.id,
        vendorId: techVendors[0].id,
        categoryId: techCategories[0].id,
        description: 'Fatura AWS - Dezembro/2025',
        amount: 4850,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 15),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        status: AccountStatus.PENDING,
      },
    }),
    prisma.payable.create({
      data: {
        organizationId: orgTechStartup.id,
        vendorId: techVendors[1].id,
        categoryId: techCategories[1].id,
        description: 'Campanha Google Ads - Q4',
        amount: 7200,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 20),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        status: AccountStatus.PENDING,
      },
    }),
    prisma.receivable.create({
      data: {
        organizationId: orgTechStartup.id,
        customerId: techCustomers[0].id,
        categoryId: techCategories[2].id,
        description: 'Assinatura Anual - Enterprise A',
        amount: 24000,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 5),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: AccountStatus.PENDING,
      },
    }),
    prisma.receivable.create({
      data: {
        organizationId: orgTechStartup.id,
        customerId: techCustomers[1].id,
        categoryId: techCategories[2].id,
        description: 'Assinatura Mensal - Enterprise B',
        amount: 3500,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 1),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: AccountStatus.PAID,
        paidAmount: 3500,
      },
    }),
  ]);

  console.log('  ✅ Data seeded for Tech Startup Ltda');

  // ========================================
  // Seed data for Consultoria XYZ
  // ========================================
  console.log('\n📦 Seeding Consultoria XYZ data...');

  const consultoriaCategories = await Promise.all([
    prisma.category.create({
      data: {
        organizationId: orgConsultoriaXYZ.id,
        name: 'Despesas Operacionais',
        color: '#F97316',
        type: CategoryType.PAYABLE,
      },
    }),
    prisma.category.create({
      data: {
        organizationId: orgConsultoriaXYZ.id,
        name: 'Projetos de Consultoria',
        color: '#10B981',
        type: CategoryType.RECEIVABLE,
      },
    }),
  ]);

  const consultoriaCustomers = await Promise.all([
    prisma.customer.create({
      data: {
        organizationId: orgConsultoriaXYZ.id,
        name: 'Indústria ABC',
        document: '99000111000122',
        email: 'projetos@industriaabc.com.br',
        phone: '(21) 92222-3333',
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: orgConsultoriaXYZ.id,
        name: 'Varejo DEF',
        document: '00111222000133',
        email: 'contabil@varejodef.com.br',
        phone: '(21) 93333-4444',
      },
    }),
  ]);

  await Promise.all([
    prisma.receivable.create({
      data: {
        organizationId: orgConsultoriaXYZ.id,
        customerId: consultoriaCustomers[0].id,
        categoryId: consultoriaCategories[1].id,
        description: 'Consultoria em Processos - Fase 1',
        amount: 45000,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 25),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: AccountStatus.PENDING,
      },
    }),
    prisma.receivable.create({
      data: {
        organizationId: orgConsultoriaXYZ.id,
        customerId: consultoriaCustomers[1].id,
        categoryId: consultoriaCategories[1].id,
        description: 'Auditoria Contábil - Mensal',
        amount: 12000,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 10),
        paymentMethod: PaymentMethod.BOLETO,
        status: AccountStatus.PENDING,
      },
    }),
  ]);

  console.log('  ✅ Data seeded for Consultoria XYZ');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('\n👑 System Admin (acesso a todas as organizações):');
  console.log('   Email: admin@paytrack.com');
  console.log('   Password: admin123');
  console.log('\n🏢 Empresa Demo:');
  console.log('   Owner: owner@empresademo.com.br / senha123');
  console.log('   Viewer: viewer@empresademo.com.br / senha123');
  console.log('\n🚀 Tech Startup Ltda:');
  console.log('   Admin: admin@techstartup.com.br / senha123');
  console.log('\n💼 Consultoria XYZ:');
  console.log('   Owner: owner@consultoriaxyz.com.br / senha123');
  console.log('\n🔢 Contador Multi-org (acesso às 3 organizações):');
  console.log('   Email: contador@geral.com.br / senha123');
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
