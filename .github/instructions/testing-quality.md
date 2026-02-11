# Testing & Quality

## Testing Setup

- Framework: Jest for unit/E2E.
- Structure: `backend/tests/` with `e2e/`, `factories/`, `helpers/`.
- Commands: `npm run test` (unit), `npm run test:e2e` (E2E).

## Test Types

- **Unit**: Domain services without mocks.
- **Integration**: Use cases with repository mocks.
- **E2E**: Full API flows.

## Factories & Helpers

- Factories: Generate test data (e.g., `payable.factory.ts`).
- Helpers: Auth, shared setup.

## Code Quality

### TypeScript

- Explicit types always.
- Never use `any`; use specific types or `unknown`.
- Prisma types: `Prisma.PayableGetPayload<{include: ...}>`.
- Enums: Correct values (e.g., `AccountStatus.PARTIAL`).

### SonarQube/SonarLint

- Cognitive complexity ≤15.
- Formatting: Prettier/ESLint.
  - Multi-line arrays with trailing comma.
  - Break long strings/lines.
  - Break functions with >3 params.

### Best Practices

- Separation of concerns.
- Transaction management.
- Cache invalidation.
- Error messages in Portuguese.</content>
<parameter name="filePath">/home/arian/workspace/paytrack/.github/testing-quality.md