# Database Schema

## Prisma Setup

- ORM: Prisma 6 with PostgreSQL 16.
- Schema: `backend/prisma/schema.prisma`.
- Migrations: `backend/prisma/migrations/`.

## Key Models

- `Organization`: Root tenant.
- `User`: Unique email per org, roles (OWNER/ADMIN/ACCOUNTANT/VIEWER), lastLoginAt.
- `UserOrganization`: Junction for user-org relations.
- `Customer`, `Vendor`: Entities.
- `Category`: Typed (PAYABLE/RECEIVABLE).
- `Tag`: Labels.
- `Payable`/`Receivable`: Main transactions with installments.
- `PayableInstallment`/`ReceivableInstallment`: Breakdowns with tags.
- `Payment`: Transactions with reference field.
- `PaymentAllocation`: Links payments to installments.
- `AuditLog`: Change tracking.

## Enums

- `UserRole`: OWNER, ADMIN, ACCOUNTANT, VIEWER.
- `AccountStatus`: PENDING, PARTIAL, PAID. ⚠️ OVERDUE e CANCELLED foram removidos — não existem mais.
- `PaymentMethod`: CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PIX, BOLETO, CHECK, OTHER, ACCOUNT_DEBIT.
- `CategoryType`: PAYABLE, RECEIVABLE.
- `AuditAction`: CREATE, UPDATE, DELETE.

## Nomes reais das tabelas no banco (snake_case)

O Prisma mapeia os modelos para snake_case plural no PostgreSQL. Sempre usar esses nomes em queries SQL diretas:

| Modelo Prisma           | Tabela SQL                |
| ----------------------- | ------------------------- |
| `Payable`               | `payables`                |
| `PayableInstallment`    | `payable_installments`    |
| `Receivable`            | `receivables`             |
| `ReceivableInstallment` | `receivable_installments` |
| `Payment`               | `payments`                |
| `PaymentAllocation`     | `payment_allocations`     |
| `Category`              | `categories`              |
| `Vendor`                | `vendors`                 |
| `Customer`              | `customers`               |
| `Tag`                   | `tags`                    |
| `Organization`          | `organizations`           |
| `User`                  | `users`                   |
| `UserOrganization`      | `user_organizations`      |
| `AuditLog`              | `audit_logs`              |

Colunas também seguem snake_case: `organization_id`, `due_date`, `paid_amount`, `payment_date`, etc.

## Relations

- Organization cascades to all children.
- Multi-level tagging on installments via junction tables (PayableInstallmentTag, ReceivableInstallmentTag).
- Payments allocated across multiple installments.

## Multi-Tenancy

All tenant-scoped entities have `organizationId`. Queries always filter by it.

## Data Types

- Monetary: Decimal(15,2) in DB, number in DTOs.
- Dates: UTC ISO strings in DTOs, Date in services.
- Indexing: Added for payment reports (e.g., on organizationId, date fields).

## Migrations

Recent changes: Removed document numbers, added lastLoginAt, installment tags/notes, payment reference, removed overdue/cancelled statuses.</content>
<parameter name="filePath">/home/arian/workspace/paytrack/.github/database-schema.md
