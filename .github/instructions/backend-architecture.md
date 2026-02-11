# Backend Architecture

## NestJS Setup

- Framework: NestJS 10 with TypeScript.
- Structure: `backend/src/modules/{feature}/` for features, `shared/` for common utilities.
- Main entry: `main.ts` sets `/api` prefix, CORS, global pipes.

## Module Structures

### Clean Architecture (Refactored Modules)

Used in payables, payments, receivables, reports.

```
{feature}/
├── repositories/             # Data Access Layer
│   ├── {entity}.repository.ts
│   └── index.ts
├── domain/                   # Business Rules Layer
│   ├── {domain-logic}.service.ts
│   └── index.ts
├── use-cases/                # Application Layer
│   ├── create-{entity}.use-case.ts
│   ├── update-{entity}.use-case.ts
│   ├── delete-{entity}.use-case.ts
│   ├── query-{entity}.use-case.ts
│   └── index.ts
├── {feature}.service.ts      # Application Service (coordination)
├── {feature}.controller.ts   # REST endpoints
├── {feature}.module.ts       # NestJS module
└── dto/
    ├── {feature}.dto.ts
    └── index.ts
```

#### Layer Responsibilities

- **Repositories**: CRUD via Prisma, transactions. No business logic.
- **Domain Services**: Pure logic (calculations, validations). No I/O, easy to test.
- **Use Cases**: Orchestrate operations, manage transactions, invalidate cache.
- **Application Services**: Thin layer delegating to use cases.

### Legacy Structure

Used in users, auth, categories, etc.

- `{feature}.module.ts`
- `{feature}.controller.ts` - REST with Swagger.
- `{feature}.service.ts` - Monolithic business logic + Prisma queries.
- `dto/{feature}.dto.ts` - class-validator DTOs.

## Key Patterns

### Controllers

```typescript
@ApiTags('Contas a Pagar')
@ApiBearerAuth()
@Controller('payables')
export class PayablesController {
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async create(@CurrentUser('organizationId') orgId: string, @Body() dto: CreateDto) {}
}
```

### Multi-Tenancy

Always filter by `organizationId`:

```typescript
async findAll(@CurrentUser("organizationId") organizationId: string) {
  return this.service.findAll(organizationId);
}
```

### Authentication & Authorization

- JWT with refresh via `@nestjs/jwt`.
- `@Public()` skips auth, `@Roles()` restricts.
- Roles: OWNER, ADMIN, ACCOUNTANT, VIEWER.

### Error Handling

- Use NestJS exceptions: `NotFoundException`, `BadRequestException`.
- Messages in Portuguese.
- Include relevant context.

### Architecture Best Practices

- Separation of Concerns: One responsibility per class.
- Dependency Direction: Controllers → Services → Use Cases → Domain.
- Transactions: For multi-step operations.
- Cache: Invalidate after mutations affecting dashboard.</content>
<parameter name="filePath">/home/arian/workspace/paytrack/.github/backend-architecture.md