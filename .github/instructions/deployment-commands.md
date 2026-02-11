# Deployment Commands

## Makefile Commands

### Development

```bash
make up              # Start all services (db + backend + frontend)
make down            # Stop all services
make status          # Show services status
make logs            # Interactive log viewer
make logs-backend    # Follow backend logs
make logs-frontend   # Follow frontend logs
make db-shell        # PostgreSQL shell
```

### Database

```bash
make migrate         # Run Prisma migrations
make seed            # Seed demo data (admin@paytrack.com / admin123)
make studio          # Open Prisma Studio
make generate        # Regenerate Prisma client
```

### Testing

```bash
cd backend
npm run test         # Unit tests
npm run test:e2e     # E2E tests
```

## Docker & Environment

- Docker Compose: `docker-compose.yml` for local dev.
- Ports: API=3000, Frontend=5173, DB=5433.
- Environment: `.env` for config.

## Production

- Platform: Render.
- Deployment: Via `render.yaml`.
- Hot reload: Enabled in dev for backend (NestJS) and frontend (Vite).</content>
<parameter name="filePath">/home/arian/workspace/paytrack/.github/deployment-commands.md