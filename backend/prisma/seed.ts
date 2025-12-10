import {
  PrismaClient,
  UserRole,
  CategoryType,
  PaymentMethod,
  AccountStatus,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default organization
  const organization = await prisma.organization.upsert({
    where: { document: "12345678000199" },
    update: {},
    create: {
      name: "Empresa Demo",
      document: "12345678000199",
      email: "contato@empresademo.com.br",
      phone: "(11) 99999-9999",
      address: "Rua Exemplo, 123 - São Paulo/SP",
    },
  });

  console.log("✅ Organization created:", organization.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: "admin@paytrack.com",
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      email: "admin@paytrack.com",
      password: hashedPassword,
      name: "Administrador",
      role: UserRole.OWNER,
    },
  });

  console.log("✅ Admin user created:", adminUser.email);

  // Create categories for payables
  const payableCategoriesData = [
    { name: "Aluguel", color: "#EF4444" },
    { name: "Fornecedores", color: "#F97316" },
    { name: "Serviços", color: "#8B5CF6" },
    { name: "Impostos", color: "#EC4899" },
    { name: "Salários", color: "#14B8A6" },
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

  console.log("✅ Payable categories created:", payableCategories.length);

  // Create categories for receivables
  const receivableCategoriesData = [
    { name: "Vendas", color: "#22C55E" },
    { name: "Serviços Prestados", color: "#3B82F6" },
    { name: "Comissões", color: "#F59E0B" },
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

  console.log("✅ Receivable categories created:", receivableCategories.length);

  // Create tags
  const tagsData = [
    { name: "Urgente", color: "#EF4444" },
    { name: "Recorrente", color: "#3B82F6" },
    { name: "Parcelado", color: "#8B5CF6" },
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

  console.log("✅ Tags created:", tags.length);

  // Create vendors
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        organizationId: organization.id,
        name: "Imobiliária Central",
        document: "11222333000144",
        email: "financeiro@imobiliariacentral.com.br",
        phone: "(11) 3333-4444",
      },
    }),
    prisma.vendor.create({
      data: {
        organizationId: organization.id,
        name: "Distribuidora ABC",
        document: "22333444000155",
        email: "vendas@distribuidoraabc.com.br",
        phone: "(11) 4444-5555",
      },
    }),
    prisma.vendor.create({
      data: {
        organizationId: organization.id,
        name: "Tech Solutions",
        document: "33444555000166",
        email: "contato@techsolutions.com.br",
        phone: "(11) 5555-6666",
      },
    }),
  ]);

  console.log("✅ Vendors created:", vendors.length);

  // Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        organizationId: organization.id,
        name: "João Silva",
        document: "12345678900",
        email: "joao.silva@email.com",
        phone: "(11) 98765-4321",
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: organization.id,
        name: "Empresa XYZ Ltda",
        document: "44555666000177",
        email: "financeiro@empresaxyz.com.br",
        phone: "(11) 6666-7777",
      },
    }),
    prisma.customer.create({
      data: {
        organizationId: organization.id,
        name: "Maria Oliveira",
        document: "98765432100",
        email: "maria.oliveira@email.com",
        phone: "(11) 91234-5678",
      },
    }),
  ]);

  console.log("✅ Customers created:", customers.length);

  // Create sample payables
  const today = new Date();
  const payables = await Promise.all([
    prisma.payable.create({
      data: {
        organizationId: organization.id,
        vendorId: vendors[0].id,
        categoryId: payableCategories[0].id,
        description: "Aluguel do escritório - Dezembro/2025",
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
        description: "Compra de mercadorias - NF 12345",
        amount: 8750.5,
        dueDate: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 15
        ),
        paymentMethod: PaymentMethod.BOLETO,
        status: AccountStatus.PENDING,
        documentNumber: "NF-12345",
      },
    }),
    prisma.payable.create({
      data: {
        organizationId: organization.id,
        vendorId: vendors[2].id,
        categoryId: payableCategories[2].id,
        description: "Manutenção de sistemas",
        amount: 1200,
        paidAmount: 600,
        dueDate: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 5
        ),
        paymentMethod: PaymentMethod.PIX,
        status: AccountStatus.PARTIAL,
      },
    }),
    prisma.payable.create({
      data: {
        organizationId: organization.id,
        vendorId: vendors[0].id,
        categoryId: payableCategories[0].id,
        description: "Aluguel do escritório - Novembro/2025",
        amount: 3500,
        paidAmount: 3500,
        dueDate: new Date(today.getFullYear(), today.getMonth() - 1, 10),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: AccountStatus.PAID,
      },
    }),
  ]);

  console.log("✅ Payables created:", payables.length);

  // Create sample receivables
  const receivables = await Promise.all([
    prisma.receivable.create({
      data: {
        organizationId: organization.id,
        customerId: customers[0].id,
        categoryId: receivableCategories[0].id,
        description: "Venda de produtos - Pedido #001",
        amount: 2500,
        dueDate: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 10
        ),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        status: AccountStatus.PENDING,
        documentNumber: "PED-001",
      },
    }),
    prisma.receivable.create({
      data: {
        organizationId: organization.id,
        customerId: customers[1].id,
        categoryId: receivableCategories[1].id,
        description: "Consultoria - Projeto Alpha",
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
        description: "Venda de serviços - Mês anterior",
        amount: 4200,
        paidAmount: 4200,
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
        description: "Comissão sobre vendas - Novembro",
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

  console.log("✅ Receivables created:", receivables.length);

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log("   Email: admin@paytrack.com");
  console.log("   Password: admin123");
}

(async () => {
  try {
    await main();
  } catch (e) {
    console.error("❌ Seed error:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
