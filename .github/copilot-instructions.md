# PayTrack - Copilot Instructions

## Project Overview

Multi-tenant accounts payable/receivable system (Brazilian "contas a pagar e receber"). All data is organization-scoped through `organizationId` from JWT.

## Architecture

### Stack

- **Backend**: NestJS 10 + Prisma 6 + PostgreSQL 16
- **Frontend**: React 18 + Vite + MUI 5 + TanStack Query + Zustand
- **Runtime**: Local development with PostgreSQL in Docker
- **Ports**: API=3000, Frontend=5173, DB=5433 (configurable via `.env`)

### Multi-Tenancy Pattern

Every database query must include `organizationId` from the authenticated user's JWT:

```typescript
// Always filter by organizationId from @CurrentUser decorator
async findAll(@CurrentUser("organizationId") organizationId: string) {
  return this.service.findAll(organizationId);
}
```

### Module Structure (Backend)

**Nova Arquitetura em Camadas** (seguindo SOLID e Clean Architecture):

Cada feature segue: `backend/src/modules/{feature}/`

```
{feature}/
├── repositories/             # Camada de Dados (Data Access Layer)
│   ├── {entity}.repository.ts
│   └── index.ts
├── domain/                   # Camada de Domínio (Business Rules Layer)
│   ├── {domain-logic}.service.ts
│   └── index.ts
├── use-cases/                # Camada de Aplicação (Application Layer)
│   ├── create-{entity}.use-case.ts
│   ├── update-{entity}.use-case.ts
│   ├── delete-{entity}.use-case.ts
│   ├── query-{entity}.use-case.ts
│   └── index.ts
├── {feature}.service.ts      # Application Service (coordenação)
├── {feature}.controller.ts   # REST endpoints
├── {feature}.module.ts       # NestJS module
└── dto/
    ├── {feature}.dto.ts
    └── index.ts
```

#### Responsabilidades por Camada

**1. Repositories (Camada de Dados)**

- **Responsabilidade**: Isolate database access via Prisma
- **Características**:
  - CRUD operations básicas
  - Query builders específicos
  - Transaction management
  - **NÃO** contém lógica de negócio
- **Exemplo**:

  ```typescript
  @Injectable()
  export class PayablesRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findMany(where, options) { ... }
    async findFirst(where, include) { ... }
    async create(data) { ... }
    async update(where, data) { ... }
    async delete(where) { ... }
    async transaction(callback) { ... }
  }
  ```

**2. Domain Services (Camada de Domínio)**

- **Responsabilidade**: Pure business logic, sem dependências externas
- **Características**:
  - Cálculos e algoritmos de negócio
  - Validações de regras de domínio
  - **NÃO** depende de repositories
  - **NÃO** faz I/O (banco, cache, APIs)
  - Fácil de testar (sem mocks)
- **Exemplo**:
  ```typescript
  @Injectable()
  export class InstallmentsCalculator {
    generateInstallments(amount, count, dates) { ... }
    calculateMonthlyDueDates(startDate, count) { ... }
    calculateStatus(paidAmount, totalAmount) { ... }
  }
  ```

**3. Use Cases (Camada de Aplicação)**

- **Responsabilidade**: Orquestrar uma operação específica de negócio
- **Características**:
  - Um arquivo = um caso de uso
  - Coordena Repositories + Domain Services
  - Gerencia transações
  - Invalida cache quando necessário
  - Contém fluxo completo da operação
- **Exemplo**:

  ```typescript
  @Injectable()
  export class CreatePayableUseCase {
    constructor(
      private readonly repository: PayablesRepository,
      private readonly calculator: InstallmentsCalculator,
      private readonly cache: CacheService
    ) {}

    async execute(organizationId, dto) {
      // 1. Validar com domain service
      // 2. Criar em transação
      // 3. Invalidar cache
      return result;
    }
  }
  ```

**4. Application Services (Camada de Coordenação)**

- **Responsabilidade**: Interface pública para Controllers
- **Características**:
  - Camada **fina** (thin layer)
  - Apenas delega para Use Cases
  - Mantém compatibilidade com Controllers
  - Pode ter operações auxiliares simples
- **Exemplo**:

  ```typescript
  @Injectable()
  export class PayablesService {
    constructor(
      private readonly createUseCase: CreatePayableUseCase,
      private readonly updateUseCase: UpdatePayableUseCase // ... outros use cases
    ) {}

    async create(orgId, dto) {
      return this.createUseCase.execute(orgId, dto);
    }
  }
  ```

#### Quando Usar Cada Camada

**Criar Repository quando**:

- Precisar acessar dados do Prisma
- Precisar de query complexa reutilizável
- Quiser isolar mudanças do ORM

**Criar Domain Service quando**:

- Tiver lógica de cálculo complexa
- Tiver validação de regra de negócio
- Precisar compartilhar lógica entre módulos
- Quiser testar sem mocks

**Criar Use Case quando**:

- Tiver operação completa de negócio (Create, Update, Delete, etc.)
- Precisar coordenar múltiplos serviços
- Precisar gerenciar transação
- A operação tiver múltiplos passos

**NÃO criar camadas extras se**:

- Operação é trivial (ex: findAll sem lógica)
- Não há lógica de negócio complexa
- Módulo é muito simples (ex: Tags, Categories básicos)

#### Módulos Refatorados

✅ **Payables**: Implementa arquitetura completa
✅ **Payments**: Implementa arquitetura completa
✅ **Receivables**: Implementa arquitetura completa
⏳ **Users**: 497 linhas - candidato à refatoração
⏳ **Auth**: 391 linhas - candidato à refatoração

Ver documentação completa em: `backend/ARCHITECTURE_REFACTORING.md`

### Module Structure (Backend) - Legacy

**Nota**: Estrutura antiga ainda presente em alguns módulos:

- `{feature}.module.ts` - NestJS module
- `{feature}.controller.ts` - REST endpoints with Swagger decorators
- `{feature}.service.ts` - Business logic, Prisma queries (monolítico)
- `dto/{feature}.dto.ts` - class-validator DTOs with Swagger examples

### Feature Structure (Frontend)

Each feature follows: `frontend/src/features/{feature}/`

- `pages/{Feature}Page.tsx` - Main page component
- `index.ts` - Barrel exports

## Key Patterns

### Authentication & Authorization

- JWT auth with refresh tokens via `@nestjs/jwt`
- `@Public()` decorator skips auth, `@Roles(UserRole.OWNER, ...)` restricts access
- Frontend stores tokens in Zustand with localStorage persistence (`authStore.ts`)
- API client auto-refreshes tokens on 401 (`lib/api.ts`)

### Backend Controllers

```typescript
@ApiTags('Contas a Pagar')
@ApiBearerAuth()
@Controller('payables')
export class PayablesController {
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Criar nova conta a pagar' })
  async create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateDto
  ) {}
}
```

### Frontend Forms

Use `react-hook-form` + `zod` + MUI:

```typescript
const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
});
const { control, handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

### Data Fetching (Frontend)

```typescript
const { data } = useQuery({
  queryKey: ['payables'],
  queryFn: () => api.get('/payables'),
});
const mutation = useMutation({
  mutationFn: data => api.post('/payables', data),
});
```

## Commands

### Development

```bash
make up              # Start all services (db + backend + frontend) - logs are automatically cleaned
make down            # Stop all services
make status          # Show services status
make logs            # Interactive log viewer
make logs-backend    # Follow backend logs
make logs-frontend   # Follow frontend logs
make db-shell        # PostgreSQL shell
```

> **Hot Reload**: Both backend (NestJS) and frontend (Vite) have hot reload enabled natively. Code changes in `backend/src/` and `frontend/src/` are reflected automatically.

### Database

```bash
make migrate         # Run Prisma migrations
make seed            # Seed demo data (admin@paytrack.com / admin123)
make studio          # Open Prisma Studio
make generate        # Regenerate Prisma client
```

### Testing

```bash
# In backend directory
cd backend
npm run test         # Unit tests
npm run test:e2e     # E2E tests
```

## Database Schema

Key entities in `backend/prisma/schema.prisma`:

- `Organization` → root tenant, cascades to all children
- `User` → unique email per org, roles: OWNER, ADMIN, ACCOUNTANT, VIEWER
- `Payable`/`Receivable` → main transaction types with status tracking
- `Payment` + `PaymentAllocation` → supports partial payments across multiple accounts
- `Category` (typed: PAYABLE/RECEIVABLE), `Tag`, `Vendor`, `Customer` (Devedor)

## API Conventions

- Base URL: `/api` prefix (set in `main.ts`)
- Swagger docs: `/api/docs`
- All monetary values use `Decimal(15,2)` in Prisma, `number` in DTOs
- Dates: ISO strings in DTOs, converted to `Date` in services. Backend always treats dates as UTC without time zone conversions. Frontend handles local time zone for user inputs and displays, sending dates in UTC to backend.
- Error messages in Portuguese (Brazilian)

## Commit Conventions

- **Language**: Always write commit messages in Portuguese (Brazilian)
- **Format**: Use conventional commits format (`feat:`, `fix:`, `docs:`, etc.)
- **Description**: Be descriptive and explain what was changed and why
- **Examples**:
  - `feat: adicionar funcionalidade de keep-alive do servidor`
  - `fix: corrigir configuração de CORS para produção`
  - `docs: atualizar documentação do sistema de wakeup`

## File Naming

- Backend: kebab-case (`payables.service.ts`)
- Frontend: PascalCase for components (`PayablesPage.tsx`), camelCase for utilities
- DTOs: grouped by feature (`payable.dto.ts` contains Create, Update, Filter DTOs)

## Code Quality & Best Practices

### TypeScript

- **Tipos Explícitos**: Sempre usar tipos explícitos em parâmetros de callbacks e retornos de função
- **NUNCA usar `any`**:
  - ❌ **PROIBIDO**: `const data: any`, `as any`, `(item: any) =>`
  - ✅ **Usar**: Tipos específicos do Prisma, interfaces, type aliases, ou `unknown` quando realmente necessário
  - ✅ **Prisma Types**: Usar `Prisma.PayableGetPayload<{include: ...}>` para tipos com includes
  - ✅ **Helper Types**: Criar tipos auxiliares em `shared/types/prisma-helpers.ts`
  - ✅ **Unknown**: Usar `unknown` e fazer type guards quando tipo é realmente desconhecido
- **Enum Values**: Usar valores corretos do Prisma (ex: `AccountStatus.PARTIAL` não `PARTIALLY_PAID`)
- **Type Assertions**: Apenas quando absolutamente necessário e com comentário explicativo

### SonarQube/SonarLint

- **Cognitive Complexity**: Máximo 15 por função
- **Formatação**: Seguir regras do Prettier/ESLint
  - Arrays multi-linha: um item por linha com trailing comma
  - Strings longas: quebrar em múltiplas linhas se > 80 caracteres
  - Parâmetros de função: quebrar se > 3 parâmetros
- **Padrões**:

  ```typescript
  // ✅ Correto
  const items = array.map(item => ({ ...item }));
  const status = condition ? value1 : value2;

  // ❌ Evitar
  const items = array.map(item => ({ ...item })); // parênteses desnecessários
  const status = !condition ? value2 : value1; // condição negada
  ```

### Arquitetura

- **Separation of Concerns**: Cada classe deve ter uma única responsabilidade
- **Dependency Direction**: Dependências apontam para dentro
  - Controllers → Services → Use Cases → Domain Services
  - Domain Services **NÃO** dependem de nada
- **Transaction Management**: Sempre usar transactions para operações multi-step
- **Cache Invalidation**: Invalidar cache após mutations que afetam dashboard
- **Error Handling**:
  - Lançar exceções específicas do NestJS (`NotFoundException`, `BadRequestException`)
  - Mensagens de erro em português brasileiro
  - Incluir contexto relevante no erro

### Testing

- **Unit Tests**: Testar Domain Services sem mocks
- **Integration Tests**: Testar Use Cases com mocks de repositories
- **E2E Tests**: Testar fluxos completos via API

### Database

- **Status Enum**: `PENDING`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED`
- **Monetary Values**: Sempre usar `MoneyUtils.toDecimal()` para converter numbers
- **Dates**: Usar `parseDateOnly()` para datas sem hora, `parseDatetime()` para timestamps
- **Multi-tenancy**: **SEMPRE** filtrar por `organizationId` em queries
