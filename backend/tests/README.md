# Testes E2E - PayTrack Backend

## 🎯 Quick Start

```typescript
// 1. Importe os helpers
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { CategoryFactory } from '../../factories';

// 2. Setup do teste
let app, prisma, testSchema, accessToken, organizationId;

beforeAll(async () => {
  const context = await setupE2ETest();
  app = context.app;
  prisma = context.prisma;
  testSchema = context.testSchema;

  const auth = await createAuthenticatedUser(app, prisma);
  accessToken = auth.accessToken;
  organizationId = auth.organizationId;
});

afterAll(async () => {
  await teardownE2ETest({ app, prisma, testSchema });
});

// 3. Escreva seus testes
it('deve funcionar', async () => {
  const response = await request(app.getHttpServer())
    .get('/endpoint')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);
});
```

## Visão Geral

Esta documentação descreve as diretrizes e padrões para desenvolvimento de testes E2E (End-to-End) no backend do PayTrack. Os testes E2E validam o fluxo completo das APIs, incluindo chamadas HTTP e verificações no banco de dados.

### 🚀 Principais Recursos

- **Isolamento Total**: Schema PostgreSQL único por teste
- **Zero Boilerplate**: Helpers e factories eliminam código repetitivo
- **Multi-Tenancy**: Validação automática de isolamento por organização
- **Type-Safe**: TypeScript com tipos do Prisma
- **Factories Inteligentes**: Criação de dados realistas (CNPJ, CPF, etc.)

## Estrutura de Diretórios

```
backend/tests/
├── jest-e2e.json          # Configuração Jest para testes E2E
├── README.md              # Esta documentação
├── helpers/               # Helpers reutilizáveis
│   ├── test-setup.helper.ts  # Setup e teardown de ambiente
│   ├── auth.helper.ts        # Autenticação e criação de usuários
│   └── index.ts              # Barrel export
├── factories/             # Factories para criação de dados de teste
│   ├── category.factory.ts   # Factory de categorias
│   ├── vendor.factory.ts     # Factory de fornecedores
│   ├── customer.factory.ts   # Factory de clientes
│   └── index.ts              # Barrel export
└── e2e/                   # Testes organizados por feature
    ├── authentication/    # Testes de autenticação
    ├── categories/        # Testes de categorias
    ├── customers/         # Testes de clientes/devedores
    ├── vendors/           # Testes de fornecedores/credores
    ├── payables/          # Testes de contas a pagar
    ├── receivables/       # Testes de contas a receber
    ├── payments/          # Testes de pagamentos
    ├── users/             # Testes de usuários
    ├── organization/      # Testes de organizações
    ├── admin-users/       # Testes de administração de usuários
    ├── admin-organizations/# Testes de administração de organizações
    ├── dashboard/         # Testes de dashboard
    ├── health/            # Testes de health check
    └── tags/              # Testes de tags
```

## Configuração Jest

**Arquivo:** `backend/tests/jest-e2e.json`

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testMatch": ["**/*.e2e-spec.ts"],
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/../src/$1"
  },
  "maxWorkers": 1
}
```

**Características importantes:**

- `maxWorkers: 1`: Garante execução sequencial para evitar conflitos de banco
- `moduleNameMapper`: Mapeia imports `@/` para `src/`
- `testMatch`: Busca arquivos `*.e2e-spec.ts` recursivamente

## Exemplo Completo

📁 **Arquivo de Referência**: [`tests/e2e/EXAMPLE-COMPLETE.e2e-spec.ts.example`](e2e/EXAMPLE-COMPLETE.e2e-spec.ts.example)

Este arquivo demonstra **todas as boas práticas** em um único lugar:

- ✅ Setup e teardown com helpers
- ✅ Testes de CRUD completo (GET, POST, PUT, DELETE)
- ✅ Validação de multi-tenancy
- ✅ Testes de permissões por role
- ✅ Uso de factories para dados de teste
- ✅ Validação em múltiplas camadas (HTTP + banco)
- ✅ Testes de cenários de erro
- ✅ Fluxos complexos

**Use este arquivo como template** ao criar novos testes!

> **Nota**: O arquivo tem extensão `.example` para não rodar nos testes automáticos. Alguns testes são demonstrativos e podem falhar conforme a implementação real da API evolui.

## Isolamento de Banco de Dados

### Estratégia: Schema por Teste

Cada arquivo de teste cria um schema PostgreSQL único para isolamento completo. Esta abordagem garante:

- ✅ **Isolamento total** entre testes (zero vazamento de dados)
- ✅ **Testes independentes** que podem rodar em qualquer ordem
- ✅ **Paralelização segura** quando necessário
- ✅ **Debugging facilitado** (schema permanece após falha para análise)
- ✅ **Sem necessidade de mock** de banco de dados

### Implementação

Use os helpers `setupE2ETest()` e `teardownE2ETest()` para gerenciar o ciclo de vida:

```typescript
import { setupE2ETest, teardownE2ETest } from '../../helpers';

describe('Feature (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });
});
```

### Como Funciona

1. **Setup**: Cria schema com UUID único: `test_<uuid>`
2. **Isolamento**: Define `search_path` do PostgreSQL para o schema
3. **Execução**: Todas as queries do Prisma usam o schema isolado
4. **Cleanup**: Remove schema com `CASCADE` ao final do teste

## Helpers e Factories

### Helpers de Setup

**`setupE2ETest()`** - Inicializa ambiente de teste

```typescript
const context = await setupE2ETest();
// Retorna: { app, prisma, testSchema }
```

**`teardownE2ETest(context)`** - Limpa ambiente de teste

```typescript
await teardownE2ETest({ app, prisma, testSchema });
```

### Helpers de Autenticação

**`createAuthenticatedUser(app, prisma, options?)`** - Cria org, usuário e obtém token

```typescript
const { organizationId, userId, email, accessToken } =
  await createAuthenticatedUser(app, prisma, {
    role: 'OWNER', // OWNER | ADMIN | ACCOUNTANT | VIEWER
    isSystemAdmin: false,
    organizationName: 'My Org',
  });
```

**`createMultipleUsers(app, prisma, count, options?)`** - Cria múltiplos usuários

```typescript
const users = await createMultipleUsers(app, prisma, 3);
```

### Factories de Dados

**CategoryFactory** - Cria categorias de teste

```typescript
const factory = new CategoryFactory(prisma);

// Uma categoria
const category = await factory.create({
  organizationId,
  name: 'Despesas',
  type: 'PAYABLE',
});

// Múltiplas categorias
const categories = await factory.createMany(5, { organizationId });

// Categorias dos dois tipos
const [payable, receivable] = await factory.createBothTypes(organizationId);
```

**VendorFactory** - Cria fornecedores de teste

```typescript
const factory = new VendorFactory(prisma);

const vendor = await factory.create({
  organizationId,
  name: 'Fornecedor XYZ',
});

const vendors = await factory.createMany(3, { organizationId });
```

**CustomerFactory** - Cria clientes de teste

```typescript
const factory = new CustomerFactory(prisma);

const customer = await factory.create({
  organizationId,
  name: 'Cliente ABC',
});

const customers = await factory.createMany(3, { organizationId });
```

## Templates de Teste

### 1. Endpoint Público (sem autenticação)

```typescript
import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { setupE2ETest, teardownE2ETest } from '../../helpers';

describe('Health (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('GET /health - deve retornar status ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res: any) => {
        expect(res.body.status).toBe('ok');
        expect(res.body).toHaveProperty('timestamp');
      });
  });
});
```

### 2. Endpoint Protegido (com autenticação)

```typescript
import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { CategoryFactory } from '../../factories';

describe('Categories (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let accessToken: string;
  let organizationId: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    // Criar usuário autenticado
    const auth = await createAuthenticatedUser(app, prisma);
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('GET /categories - deve listar categorias', () => {
    return request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: any) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
```

### 3. Teste com Criação e Validação no Banco

```typescript
describe('Categories - POST (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let accessToken: string;
  let organizationId: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    const auth = await createAuthenticatedUser(app, prisma);
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('POST /categories - deve criar categoria e persistir no banco', async () => {
    const categoryData = {
      name: 'Nova Categoria',
      type: 'PAYABLE',
    };

    const response = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(categoryData)
      .expect(201);

    // Validar resposta
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(categoryData.name);

    // Validar persistência no banco
    const categoryInDb = await prisma.category.findUnique({
      where: { id: response.body.id },
    });

    expect(categoryInDb).toBeTruthy();
    expect(categoryInDb?.name).toBe(categoryData.name);
    expect(categoryInDb?.organizationId).toBe(organizationId);
  });
});
```

### 4. Teste com Dados de Setup (usando Factories)

```typescript
describe('Categories - GET with data (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let accessToken: string;
  let organizationId: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    const auth = await createAuthenticatedUser(app, prisma);
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;

    // Criar dados de teste usando factory
    const categoryFactory = new CategoryFactory(prisma);
    await categoryFactory.createMany(5, { organizationId });
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('GET /categories - deve retornar 5 categorias', () => {
    return request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res: any) => {
        expect(res.body).toHaveLength(5);
      });
  });
});
```

## Boas Práticas

### 1. Convenção de Nomes

- **Arquivos**: `feature-action.e2e-spec.ts` (ex: `categories-get.e2e-spec.ts`, `payables-post.e2e-spec.ts`)
- **Describes**: Em português brasileiro, descritivo (ex: `'Categories - GET (e2e)'`)
- **It statements**: Descrever comportamento esperado (ex: `'deve criar categoria e persistir no banco'`)

### 2. Estrutura de Testes

- **Um arquivo por endpoint principal** (GET, POST, PUT, DELETE separados)
- **Setup mínimo**: Criar apenas dados necessários para o teste
- **Factories sobre código repetitivo**: Use factories em vez de criar dados manualmente
- **Helpers sobre boilerplate**: Use helpers para setup/teardown padrão

### 3. Isolamento e Independência

- ✅ **Cada teste é independente**: Não dependa de ordem de execução
- ✅ **Schema isolado por arquivo**: Garantido pelo `setupE2ETest()`
- ✅ **Cleanup garantido**: Sempre use `teardownE2ETest()` no `afterAll`
- ✅ **Sem estado compartilhado**: Recrie dados em cada teste se necessário

### 4. Autenticação

- **Use `createAuthenticatedUser()`**: Cria org + user + token em uma chamada
- **Token no header**: `Authorization: Bearer ${accessToken}`
- **Roles específicos**: Configure role no helper quando necessário

```typescript
const auth = await createAuthenticatedUser(app, prisma, {
  role: 'ACCOUNTANT', // Em vez de OWNER padrão
});
```

### 5. Validação Completa

Sempre valide em múltiplas camadas:

```typescript
const response = await request(app.getHttpServer())
  .post('/endpoint')
  .send(data)
  .expect(201); // 1. Status HTTP

expect(response.body).toHaveProperty('id'); // 2. Estrutura de resposta
expect(response.body.name).toBe(data.name); // 3. Valores corretos

const record = await prisma.model.findUnique({
  where: { id: response.body.id },
}); // 4. Persistência no banco

expect(record).toBeTruthy();
expect(record?.organizationId).toBe(organizationId); // 5. Multi-tenancy
```

### 6. Factories para Dados de Teste

**Sempre prefira factories a criação manual**:

```typescript
// ❌ Evitar
await prisma.category.create({
  data: {
    id: randomUUID(),
    name: 'Test Category',
    type: 'PAYABLE',
    organizationId,
    isActive: true,
  },
});

// ✅ Preferir
const factory = new CategoryFactory(prisma);
await factory.create({ organizationId, name: 'Test Category' });
```

### 7. Tratamento de Erros

Teste cenários de sucesso E falha:

```typescript
it('POST /categories - deve retornar 400 para dados inválidos', () => {
  return request(app.getHttpServer())
    .post('/categories')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: '' }) // Nome vazio
    .expect(400)
    .expect((res: any) => {
      expect(res.body.message).toContain('validação');
    });
});
```

### 8. Performance

- **Crie dados em lote**: Use `createMany` quando possível
- **Evite await desnecessário**: Use `Promise.all()` para operações paralelas

```typescript
const [categories, vendors] = await Promise.all([
  categoryFactory.createMany(5, { organizationId }),
  vendorFactory.createMany(3, { organizationId }),
]);
```

### 9. Legibilidade

- **Comentários descritivos**: Explique o "porquê", não o "o quê"
- **Variáveis bem nomeadas**: `accessToken` > `token`, `organizationId` > `orgId`
- **Organize em seções**: Setup, execução, validação claramente separados

## Dependências

```json
{
  "devDependencies": {
    "@types/supertest": "^6.0.2",
    "supertest": "^6.3.4"
  }
}
```

## Execução dos Testes

### Todos os Testes E2E

```bash
cd backend
npm run test:e2e
```

### Teste Específico

```bash
cd backend
npx jest --config ./tests/jest-e2e.json --testPathPattern=categories
```

### Com Detecção de Handles Abertos

```bash
cd backend
npm run test:e2e -- --detectOpenHandles
```

### Debug Mode

```bash
cd backend
npx jest --config ./tests/jest-e2e.json --verbose --testPathPattern=categories
```

## Cobertura Atual

### ✅ Implementado

- Health Check (`GET /health`)
- Authentication (`POST /auth/login`)
- Categories (`GET /categories`, `POST /categories`)
- Vendors (`GET /vendors`)
- Customers (`GET /customers`)

### 🔄 Próximos a Implementar

- Payables (contas a pagar)
- Receivables (contas a receber)
- Payments (pagamentos)
- Users (gerenciamento)
- Organizations (gerenciamento)
- Dashboard
- Tags

## Padrões por Feature

### Payables (Contas a Pagar)

```typescript
import {
  setupE2ETest,
  teardownE2ETest,
  createAuthenticatedUser,
} from '../../helpers';
import { CategoryFactory, VendorFactory } from '../../factories';

describe('Payables - POST (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;
  let accessToken: string;
  let organizationId: string;
  let categoryId: string;
  let vendorId: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;

    const auth = await createAuthenticatedUser(app, prisma);
    accessToken = auth.accessToken;
    organizationId = auth.organizationId;

    // Criar dependências
    const categoryFactory = new CategoryFactory(prisma);
    const category = await categoryFactory.create({
      organizationId,
      type: 'PAYABLE',
    });
    categoryId = category.id;

    const vendorFactory = new VendorFactory(prisma);
    const vendor = await vendorFactory.create({ organizationId });
    vendorId = vendor.id;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('POST /payables - deve criar conta a pagar', async () => {
    const payableData = {
      description: 'Conta de luz',
      amount: 150.0,
      dueDate: '2026-12-31',
      vendorId,
      categoryId,
    };

    const response = await request(app.getHttpServer())
      .post('/payables')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payableData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.description).toBe(payableData.description);

    // Validar no banco
    const payable = await prisma.payable.findUnique({
      where: { id: response.body.id },
    });

    expect(payable?.organizationId).toBe(organizationId);
    expect(payable?.status).toBe('PENDING');
  });
});
```

### Payments (Pagamentos com Fluxo Complexo)

```typescript
describe('Payments - POST (e2e)', () => {
  // Setup similar ao Payables...

  it('POST /payments - deve registrar pagamento parcial e atualizar status', async () => {
    // 1. Criar payable de R$ 300
    const payable = await prisma.payable.create({
      data: {
        description: 'Teste',
        amount: 300,
        dueDate: new Date('2026-12-31'),
        organizationId,
        categoryId,
        vendorId,
        status: 'PENDING',
      },
    });

    // 2. Registrar pagamento de R$ 150 (50%)
    const paymentData = {
      payableId: payable.id,
      amount: 150,
      paymentDate: new Date().toISOString(),
    };

    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(paymentData)
      .expect(201);

    // 3. Validar status mudou para PARTIAL
    const updatedPayable = await prisma.payable.findUnique({
      where: { id: payable.id },
    });

    expect(updatedPayable?.status).toBe('PARTIAL');

    // 4. Registrar pagamento restante de R$ 150
    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...paymentData, amount: 150 })
      .expect(201);

    // 5. Validar status mudou para PAID
    const fullyPaidPayable = await prisma.payable.findUnique({
      where: { id: payable.id },
    });

    expect(fullyPaidPayable?.status).toBe('PAID');
  });
});
```

### Multi-Tenancy (Isolamento por Organização)

```typescript
describe('Categories - Multi-tenancy (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testSchema: string;

  beforeAll(async () => {
    const context = await setupE2ETest();
    app = context.app;
    prisma = context.prisma;
    testSchema = context.testSchema;
  });

  afterAll(async () => {
    await teardownE2ETest({ app, prisma, testSchema });
  });

  it('GET /categories - deve retornar apenas categorias da organização do usuário', async () => {
    // Criar duas organizações diferentes
    const [user1, user2] = await createMultipleUsers(app, prisma, 2);

    // Criar categorias para cada org
    const factory = new CategoryFactory(prisma);
    await factory.create({
      organizationId: user1.organizationId,
      name: 'Org 1 Cat',
    });
    await factory.create({
      organizationId: user2.organizationId,
      name: 'Org 2 Cat',
    });

    // User 1 deve ver apenas sua categoria
    const response1 = await request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', `Bearer ${user1.accessToken}`)
      .expect(200);

    expect(response1.body).toHaveLength(1);
    expect(response1.body[0].name).toBe('Org 1 Cat');

    // User 2 deve ver apenas sua categoria
    const response2 = await request(app.getHttpServer())
      .get('/categories')
      .set('Authorization', `Bearer ${user2.accessToken}`)
      .expect(200);

    expect(response2.body).toHaveLength(1);
    expect(response2.body[0].name).toBe('Org 2 Cat');
  });
});
```

## Troubleshooting

### Jest não sai após os testes

**Causa**: Handles abertos (timers, conexões, etc.)

**Solução**:

1. Verificar se serviços implementam `OnModuleDestroy`

```typescript
@Injectable()
export class MyService implements OnModuleDestroy {
  private interval: NodeJS.Timeout;

  constructor() {
    this.interval = setInterval(() => {}, 1000);
  }

  onModuleDestroy() {
    clearInterval(this.interval); // Limpar timer
  }
}
```

2. Usar `--detectOpenHandles` para debug

```bash
npm run test:e2e -- --detectOpenHandles
```

3. Garantir `teardownE2ETest()` no `afterAll`

### Erros de TypeScript em Testes

**Causa**: Imports incorretos ou tipos mal definidos

**Solução**:

1. Sempre use tipos específicos do Prisma

```typescript
// ❌ Evitar any
const user: any = await prisma.user.findUnique(...);

// ✅ Preferir tipos do Prisma
const user = await prisma.user.findUnique(...); // Tipo inferido
```

2. Importar factories e helpers corretamente

```typescript
import { setupE2ETest, createAuthenticatedUser } from '../../helpers';
import { CategoryFactory } from '../../factories';
```

### Testes Falhando Aleatoriamente

**Causa**: Dependência de ordem ou estado compartilhado

**Solução**:

1. Cada teste deve criar seus próprios dados
2. Não reutilizar IDs entre testes
3. Verificar isolamento de schema

```typescript
// Confirmar que schema está sendo usado
console.log('Test schema:', testSchema);
```

### Conflitos de Unique Constraint

**Causa**: Dados duplicados no mesmo schema

**Solução**:

1. Usar `randomUUID()` para valores únicos

```typescript
const email = `test_${randomUUID()}@example.com`;
```

2. Usar helpers que já garantem unicidade

```typescript
const auth = await createAuthenticatedUser(app, prisma);
// Email já é único automaticamente
```

### Timeout em Testes Longos

**Causa**: Operações demoradas ou setup complexo

**Solução**:

1. Aumentar timeout do Jest (se necessário)

```typescript
it('operação longa', async () => {
  // ...
}, 10000); // 10 segundos
```

2. Otimizar criação de dados

```typescript
// Use createMany em vez de múltiplos create
await factory.createMany(100, { organizationId });
```

### Erros de Conexão com Banco

**Causa**: Schema não foi criado ou configurado

**Solução**:

1. Sempre usar `setupE2ETest()`
2. Verificar DATABASE_URL no `.env`
3. Confirmar que PostgreSQL está rodando

```bash
make status # Verificar serviços
```

## Contribuição

### Checklist para Novos Testes

- [ ] Criar pasta na estrutura correta (`e2e/feature/`)
- [ ] Usar `setupE2ETest()` e `teardownE2ETest()`
- [ ] Para endpoints protegidos: usar `createAuthenticatedUser()`
- [ ] Usar factories para dados de teste
- [ ] Validar resposta HTTP E persistência no banco
- [ ] Testar cenários de sucesso E erro
- [ ] Seguir convenção de nomes de arquivo
- [ ] Executar todos os testes antes de commit
- [ ] Atualizar esta documentação se adicionar novos helpers/factories

### Exemplo de Workflow

1. **Criar arquivo de teste**

```bash
touch backend/tests/e2e/feature/feature-action.e2e-spec.ts
```

2. **Usar template apropriado** (público ou protegido)

3. **Criar factory se necessário**

```bash
touch backend/tests/factories/feature.factory.ts
```

4. **Executar o teste**

```bash
npm run test:e2e -- --testPathPattern=feature
```

5. **Validar todos os testes**

```bash
npm run test:e2e
```

### Criando Novos Helpers

Se identificar código repetitivo em 3+ testes, considere criar um helper:

1. Adicionar em `tests/helpers/`
2. Exportar no `index.ts`
3. Documentar neste README
4. Refatorar testes existentes para usar o helper

### Criando Novas Factories

Para cada entidade do Prisma, considere criar uma factory:

1. Adicionar em `tests/factories/`
2. Implementar métodos `create()` e `createMany()`
3. Gerar dados realistas (CNPJ, CPF, etc.)
4. Exportar no `index.ts`
5. Adicionar exemplo na documentação
