# PayTrack - Copilot Instructions Index

## Project Overview

Multi-tenant accounts payable/receivable system (Brazilian "contas a pagar e receber"). All data is organization-scoped through `organizationId` from JWT.

- **Stack**: NestJS 10 (backend), React 18 + Vite (frontend), Prisma 6 + PostgreSQL 16.
- **Ports**: API=3000, Frontend=5173, DB=5433.
- **Multi-Tenancy**: All queries filter by `organizationId` from JWT.

## Quick Start

- Run `make up` to start services.
- Access frontend at http://localhost:5173, API docs at http://localhost:3000/api/docs.
- Seed data: admin@paytrack.com / admin123.

## Architecture

- **Backend**: [backend-architecture.md](instructions/backend-architecture.md) - NestJS modules, Clean Architecture (refactored: payables, payments, receivables, reports; legacy: others).
- **Frontend**: [frontend-patterns.md](instructions/frontend-patterns.md) - React features, forms, data fetching, state.
- **Database**: [database-schema.md](instructions/database-schema.md) - Prisma models, enums, relations, multi-tenancy.
- **Testing & Quality**: [testing-quality.md](instructions/testing-quality.md) - Unit/E2E tests, linting, best practices.
- **Deployment**: [deployment-commands.md](instructions/deployment-commands.md) - Makefile, Docker, production.

## Module Guides

Detailed guides for specific modules:

- [Payables](instructions/module-guides/payables-guide.md) - Refactored Clean Architecture example.
- [Payments](instructions/module-guides/payments-guide.md)
- [Receivables](instructions/module-guides/receivables-guide.md)
- [Reports](instructions/module-guides/reports-guide.md)
- [Users](instructions/module-guides/users-guide.md) - Legacy monolithic example.
- [Auth](instructions/module-guides/auth-guide.md)
- [Organizations](instructions/module-guides/organizations-guide.md)
- [Dashboard](instructions/module-guides/dashboard-guide.md)
- [Batch Import](instructions/module-guides/batch-import-guide.md)
- [Admin](instructions/module-guides/admin-guide.md)
- [Health](instructions/module-guides/health-guide.md)
- [Categories](instructions/module-guides/categories-guide.md)
- [Tags](instructions/module-guides/tags-guide.md)
- [Vendors](instructions/module-guides/vendors-guide.md)
- [Customers](instructions/module-guides/customers-guide.md)

## Key Patterns

- **Auth**: JWT with roles (OWNER/ADMIN/ACCOUNTANT/VIEWER). See [backend-architecture.md](instructions/backend-architecture.md).
- **Forms**: react-hook-form + zod. See [frontend-patterns.md](instructions/frontend-patterns.md).
- **Data Fetching**: TanStack Query. See [frontend-patterns.md](instructions/frontend-patterns.md).
- **Multi-Tenancy**: Always filter by organizationId. See [database-schema.md](instructions/database-schema.md).

## API Conventions

- Base URL: `/api`.
- Monetary: Decimal(15,2) in DB, number in DTOs.
- Dates: UTC ISO strings.
- Errors: Portuguese.

## Commit Conventions

- Portuguese, conventional commits (feat:, fix:, docs:).

## File Naming

- Backend: kebab-case.
- Frontend: PascalCase components, camelCase utils.
- DTOs: grouped by feature.

For detailed code quality rules, see [testing-quality.md](instructions/testing-quality.md).
