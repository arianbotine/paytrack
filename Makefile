.PHONY: up down logs build restart db-shell api-shell web-shell migrate seed studio

# Docker commands
up:
	docker-compose up -d

up-build:
	docker-compose up -d --build

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-api:
	docker-compose logs -f backend

logs-web:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f db

build:
	docker-compose build

restart:
	docker-compose restart

# Shell access
db-shell:
	docker-compose exec db psql -U paytrack -d paytrack

api-shell:
	docker-compose exec backend sh

web-shell:
	docker-compose exec frontend sh

# Prisma commands
migrate:
	docker-compose exec backend npx prisma migrate dev

migrate-prod:
	docker-compose exec backend npx prisma migrate deploy

seed:
	docker-compose exec backend npx prisma db seed

studio:
	cd backend && npx prisma studio

generate:
	docker-compose exec backend npx prisma generate

# Development
install-backend:
	cd backend && npm install

install-frontend:
	cd frontend && npm install

install: install-backend install-frontend

# Clean
clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

# Init project (first time setup)
init: up-build migrate seed
	@echo "PayTrack is ready! Access:"
	@echo "  - Frontend: http://localhost:5173"
	@echo "  - Backend:  http://localhost:3000"
