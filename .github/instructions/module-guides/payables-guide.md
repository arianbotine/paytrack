# Payables Guide

## Overview

Refactored module following Clean Architecture. Handles payable transactions with installments.

## Structure

- `repositories/payables.repository.ts`: CRUD for payables and installments.
- `domain/installments-calculator.service.ts`: Calculations for installments.
- `use-cases/`: create-payable, update-payable, delete-payable-installment, get-payable-payments, etc.
- `payables.service.ts`: Coordinates use cases.
- `payables.controller.ts`: REST endpoints.
- `dto/payables.dto.ts`: DTOs for create/update.

## Key Use Cases

- `create-payable.use-case.ts`: Validates, calculates installments, creates in transaction.
- `get-payable-payments.use-case.ts`: Retrieves payments allocated to payable installments.

## Patterns

- Multi-tenancy: All queries filter by organizationId.
- Transactions: For multi-step operations.
- Domain logic: Pure calculations in domain services.</content>
<parameter name="filePath">/home/arian/workspace/paytrack/.github/module-guides/payables-guide.md