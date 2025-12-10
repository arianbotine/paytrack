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

Each feature follows: `backend/src/modules/{feature}/`

- `{feature}.module.ts` - NestJS module
- `{feature}.controller.ts` - REST endpoints with Swagger decorators
- `{feature}.service.ts` - Business logic, Prisma queries
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
@ApiTags("Contas a Pagar")
@ApiBearerAuth()
@Controller("payables")
export class PayablesController {
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: "Criar nova conta a pagar" })
  async create(
    @CurrentUser("organizationId") orgId: string,
    @Body() dto: CreateDto
  ) {}
}
```

### Frontend Forms

Use `react-hook-form` + `zod` + MUI:

```typescript
const schema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
});
const { control, handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

### Data Fetching (Frontend)

```typescript
const { data } = useQuery({
  queryKey: ["payables"],
  queryFn: () => api.get("/payables"),
});
const mutation = useMutation({
  mutationFn: (data) => api.post("/payables", data),
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
- `Category` (typed: PAYABLE/RECEIVABLE), `Tag`, `Vendor`, `Customer`

## API Conventions

- Base URL: `/api` prefix (set in `main.ts`)
- Swagger docs: `/api/docs`
- All monetary values use `Decimal(15,2)` in Prisma, `number` in DTOs
- Dates: ISO strings in DTOs, converted to `Date` in services
- Error messages in Portuguese (Brazilian)

## File Naming

- Backend: kebab-case (`payables.service.ts`)
- Frontend: PascalCase for components (`PayablesPage.tsx`), camelCase for utilities
- DTOs: grouped by feature (`payable.dto.ts` contains Create, Update, Filter DTOs)
