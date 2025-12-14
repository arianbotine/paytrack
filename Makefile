.PHONY: up down logs logs-backend logs-frontend logs-db status restart \
        db-shell migrate migrate-deploy seed studio generate \
        install install-backend install-frontend clean init help

# ===========================================
# Desenvolvimento
# ===========================================

## Inicia todos os serviços (db, backend, frontend)
up:
	@./scripts/start-dev.sh

## Para todos os serviços
down:
	@./scripts/stop-dev.sh

## Reinicia todos os serviços
restart: down up

## Mostra status dos serviços
status:
	@echo "=== Status dos Serviços ==="
	@echo ""
	@echo "Database (Docker):"
	@docker compose ps db 2>/dev/null || echo "  Não está rodando"
	@echo ""
	@echo "Backend:"
	@if [ -f logs/backend.pid ] && kill -0 $$(cat logs/backend.pid) 2>/dev/null; then \
		echo "  Rodando (PID: $$(cat logs/backend.pid))"; \
	else \
		echo "  Não está rodando"; \
	fi
	@echo ""
	@echo "Frontend:"
	@if [ -f logs/frontend.pid ] && kill -0 $$(cat logs/frontend.pid) 2>/dev/null; then \
		echo "  Rodando (PID: $$(cat logs/frontend.pid))"; \
	else \
		echo "  Não está rodando"; \
	fi

# ===========================================
# Banco de Dados
# ===========================================

## Acessa o shell do PostgreSQL
db-shell:
	@docker compose exec db psql -U $${DB_USER:-paytrack} -d $${DB_NAME:-paytrack}

## Executa migrations do Prisma
migrate:
	@cd backend && npx prisma migrate dev --skip-seed

## Executa migrations em produção
migrate-deploy:
	@cd backend && npx prisma migrate deploy

## Executa seed do banco de dados
seed:
	@cd backend && npx prisma db seed

## Abre Prisma Studio
studio:
	@cd backend && npx prisma studio

## Regenera Prisma Client
generate:
	@cd backend && npx prisma generate

# ===========================================
# Instalação
# ===========================================

## Instala dependências do backend
install-backend:
	@cd backend && npm install

## Instala dependências do frontend
install-frontend:
	@cd frontend && npm install

## Instala todas as dependências
install: install-backend install-frontend
	@echo "Dependências instaladas com sucesso!"

# ===========================================
# Utilitários
# ===========================================

## Remove containers e volumes do banco
clean: down
	@docker compose down -v --remove-orphans 2>/dev/null || true
	@rm -f logs/*.pid
	@echo "Limpeza concluída!"

## Configuração inicial do projeto
init: clean install
	@echo "Iniciando banco de dados..."
	@docker compose up -d db
	@echo "Aguardando banco ficar pronto..."
	@sleep 5
	@cd backend && npx prisma migrate dev
	@cd backend && npx prisma db seed
	@docker compose stop db
	@echo ""
	@echo "PayTrack configurado com sucesso!"
	@echo "Execute 'make up' para iniciar o ambiente."

## Copia arquivos .env de exemplo
setup-env:
	@cp -n .env.example .env 2>/dev/null || true
	@cp -n backend/.env.example backend/.env 2>/dev/null || true
	@cp -n frontend/.env.example frontend/.env 2>/dev/null || true
	@echo "Arquivos .env criados (se não existiam)"

## Mostra ajuda
help:
	@echo "PayTrack - Comandos Disponíveis"
	@echo "================================"
	@echo ""
	@echo "Desenvolvimento:"
	@echo "  make up              - Inicia todos os serviços"
	@echo "  make down            - Para todos os serviços"
	@echo "  make restart         - Reinicia todos os serviços"
	@echo "  make status          - Mostra status dos serviços"
	@echo ""
	@echo "Logs:"
	@echo "  make logs            - Ver todos os logs"
	@echo "  make logs-backend    - Ver logs do backend"
	@echo "  make logs-frontend   - Ver logs do frontend"
	@echo "  make logs-db         - Ver logs do banco"
	@echo ""
	@echo "Banco de Dados:"
	@echo "  make db-shell        - Shell do PostgreSQL"
	@echo "  make migrate         - Executar migrations"
	@echo "  make seed            - Popular banco com dados"
	@echo "  make studio          - Abrir Prisma Studio"
	@echo "  make generate        - Regenerar Prisma Client"
	@echo ""
	@echo "Instalação:"
	@echo "  make install         - Instalar dependências"
	@echo "  make setup-env       - Criar arquivos .env"
	@echo "  make init            - Setup inicial completo"
	@echo "  make clean           - Limpar containers/volumes"
