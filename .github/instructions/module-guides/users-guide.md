# Users Guide

## Overview

Legacy monolithic module. Handles user management.

## Structure

- `users.service.ts`: Business logic and Prisma queries.
- `users.controller.ts`: REST endpoints.
- `users.module.ts`: NestJS module.
- `dto/users.dto.ts`: DTOs.

## Patterns

- Monolithic service with all logic.
- Multi-tenancy via organizationId.
- Roles: OWNER, ADMIN, etc.</content>
<parameter name="filePath">/home/arian/workspace/paytrack/.github/module-guides/users-guide.md