# Makefile para administração de desenvolvimento do projeto PayTrack
# Sistema de contas a pagar e receber - NestJS + React + PostgreSQL

SHELL := /bin/bash

.PHONY: help setup setup-force db-up db-sync up down restart clean reset studio logs tests mobile-setup mobile-start mobile-start-prod mobile-dev

# Variáveis
DOCKER_COMPOSE := docker compose
BACKEND_DIR := backend
FRONTEND_DIR := frontend
BFF_DIR := bff-mobile
MOBILE_DIR := mobile
LOGS_DIR := logs
DB_CONTAINER := db
DB_USER := paytrack
DB_NAME := paytrack
BACKEND_PORT := 3000
FRONTEND_PORT := 5173
BFF_PORT := 3001
PRISMA_STUDIO_PORT := 5555

# Comando padrão
help:
	@echo "Comandos disponíveis:"
	@echo "  setup       - Instalar dependências do backend e frontend (inteligente)"
	@echo "  setup-force - Forçar instalação de dependências (remove e reinstala)"
	@echo "  db-up       - Iniciar container PostgreSQL e aguardar saúde"
	@echo "  db-sync     - Sincronizar schema do banco e gerar cliente Prisma"
	@echo "  up          - Iniciar backend e frontend em modo desenvolvimento"
	@echo "  down        - Parar aplicações e banco de dados"
	@echo "  restart     - Reiniciar aplicações (down + up)"
	@echo "  clean       - Limpar logs, node_modules e builds"
	@echo "  reset       - Resetar banco de dados completamente"
	@echo "  studio      - Abrir Prisma Studio"
	@echo "  logs        - Mostrar últimas 300 linhas dos logs de todos os serviços"
	@echo "  logs-backend - Mostrar últimas 300 linhas dos logs do backend"
	@echo "  logs-frontend - Mostrar últimas 300 linhas dos logs do frontend"
	@echo "  logs-db     - Mostrar últimas 300 linhas dos logs do banco"
	@echo "  logs-bff    - Mostrar últimas 300 linhas dos logs do BFF"
	@echo "  status      - Mostrar status dos serviços"
	@echo "  migrate     - Reset banco + sincronizar schema + executar migrações completas"
	@echo "  migrate-deploy - Aplicar migrações pendentes (produção)"
	@echo "  generate    - Regenerar Prisma Client"
	@echo "  tests       - Executar testes e2e do backend"
	@echo ""
	@echo "Comandos Mobile:"
	@echo "  mobile-setup      - Instalar dependências do app mobile"
	@echo "  mobile-start      - Iniciar Expo apontando para BFF local"
	@echo "  mobile-start-prod - Iniciar Expo sem alterar o .env (usa URL atual)"
	@echo "  mobile-dev        - Iniciar ambiente completo (backend + BFF + frontend)"

# Instalar dependências
setup:
	@if [ ! -d "$(BACKEND_DIR)/node_modules" ]; then \
		echo "Instalando dependências do backend..."; \
		cd $(BACKEND_DIR) && npm install; \
	else \
		echo "Dependências do backend já instaladas."; \
	fi
	@if [ ! -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo "Instalando dependências do frontend..."; \
		cd $(FRONTEND_DIR) && npm install; \
	else \
		echo "Dependências do frontend já instaladas."; \
	fi
	@if [ ! -d "$(BFF_DIR)/node_modules" ]; then \
		echo "Instalando dependências do BFF..."; \
		cd $(BFF_DIR) && npm install; \
	else \
		echo "Dependências do BFF já instaladas."; \
	fi
	@echo "Setup concluído."

# Forçar instalação de dependências
setup-force:
	@echo "Forçando instalação de dependências do backend..."
	@cd $(BACKEND_DIR) && rm -rf node_modules package-lock.json && npm install
	@echo "Forçando instalação de dependências do frontend..."
	@cd $(FRONTEND_DIR) && rm -rf node_modules package-lock.json && npm install
	@echo "Forçando instalação de dependências do BFF..."
	@cd $(BFF_DIR) && rm -rf node_modules package-lock.json && npm install
	@echo "Setup forçado concluído."

# Iniciar PostgreSQL
db-up:
	@echo "Iniciando PostgreSQL..."
	@$(DOCKER_COMPOSE) up -d $(DB_CONTAINER)
	@echo "Aguardando PostgreSQL ficar saudável..."
	@sleep 3
	@timeout 30 sh -c 'until nc -z localhost 5433 >/dev/null 2>&1; do sleep 0.5; done' || (echo "Erro: PostgreSQL não ficou saudável em 33s"; exit 1)
	@echo "PostgreSQL pronto."

# Sincronizar banco e gerar Prisma
db-sync:
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@echo "Sincronizando schema do banco..."
	@set -a && . .env && set +a && cd $(BACKEND_DIR) && npx prisma db push --accept-data-loss
	@echo "Gerando cliente Prisma..."
	@set -a && . .env && set +a && cd $(BACKEND_DIR) && npx prisma generate
	@echo "Sincronização concluída."

# Iniciar aplicações
up: setup db-up db-sync
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@if [ ! -f $(BACKEND_DIR)/.env ]; then cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env; echo "Criado backend/.env a partir do .env.example — revise as variáveis."; fi
	@if [ ! -f $(BFF_DIR)/.env ]; then cp $(BFF_DIR)/.env.example $(BFF_DIR)/.env; echo "Criado bff-mobile/.env a partir do .env.example — revise as variáveis."; fi
	@set -a && . .env && set +a
	@mkdir -p $(LOGS_DIR)
	@echo "Iniciando backend..."
	@cd $(BACKEND_DIR) && (npm run start:dev > ../$(LOGS_DIR)/backend.log 2>&1 & echo $$! > ../$(LOGS_DIR)/.pids.backend)
	@echo "Backend iniciado (PID: $$(cat $(LOGS_DIR)/.pids.backend))"
	@echo "Iniciando frontend..."
	@cd $(FRONTEND_DIR) && (npm run dev > ../$(LOGS_DIR)/frontend.log 2>&1 & echo $$! > ../$(LOGS_DIR)/.pids.frontend)
	@echo "Frontend iniciado (PID: $$(cat $(LOGS_DIR)/.pids.frontend))"
	@echo "Iniciando BFF Mobile..."
	@cd $(BFF_DIR) && (npm run start:dev > ../$(LOGS_DIR)/bff.log 2>&1 & echo $$! > ../$(LOGS_DIR)/.pids.bff)
	@echo "BFF iniciado (PID: $$(cat $(LOGS_DIR)/.pids.bff))"
	@echo "Aplicações iniciadas. Use 'make logs' para acompanhar logs."
	@echo ""
	@echo "🌐 Links de acesso:"
	@echo "  📡 API Backend:    http://localhost:$(BACKEND_PORT)"
	@echo "  📄 API Docs:       http://localhost:$(BACKEND_PORT)/api/docs"
	@echo "  🖥️  Frontend:       http://localhost:$(FRONTEND_PORT)"
	@echo "  📱 BFF Mobile:     http://localhost:$(BFF_PORT)/bff"
	@echo "  📚 BFF Swagger:    http://localhost:$(BFF_PORT)/bff/docs"
	@echo "  🗄️  Prisma Studio:  http://localhost:$(PRISMA_STUDIO_PORT)"

# Parar aplicações e banco
down:
	@echo "Parando aplicações..."
	@-if [ -f $(LOGS_DIR)/.pids.backend ]; then kill $$(cat $(LOGS_DIR)/.pids.backend) 2>/dev/null || true; rm -f $(LOGS_DIR)/.pids.backend; fi
	@-if [ -f $(LOGS_DIR)/.pids.frontend ]; then kill $$(cat $(LOGS_DIR)/.pids.frontend) 2>/dev/null || true; rm -f $(LOGS_DIR)/.pids.frontend; fi
	@-if [ -f $(LOGS_DIR)/.pids.bff ]; then kill $$(cat $(LOGS_DIR)/.pids.bff) 2>/dev/null || true; rm -f $(LOGS_DIR)/.pids.bff; fi
	@-pkill -9 -f "nest start" || true
	@-pkill -9 -f "vite" || true
	@-pkill -f "expo start" || true
	@-pkill -f "metro" || true
	@sleep 2
	@-lsof -ti:$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	@-lsof -ti:$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@-lsof -ti:$(BFF_PORT) | xargs kill -9 2>/dev/null || true
	@-lsof -ti:8081 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:8082 | xargs kill -9 2>/dev/null || true
	@echo "Parando PostgreSQL..."
	@$(DOCKER_COMPOSE) down
	@echo "Limpando logs antigos..."
	@rm -f $(LOGS_DIR)/*.log
	@echo "Tudo parado e limpo."

# Reiniciar aplicações
restart: down up

# Limpar arquivos temporários
clean:
	@echo "Limpando logs..."
	@rm -rf $(LOGS_DIR)/*.log
	@echo "Limpando arquivos PID..."
	@rm -f $(LOGS_DIR)/.pids.*
	@echo "Limpando node_modules..."
	@rm -rf $(BACKEND_DIR)/node_modules $(FRONTEND_DIR)/node_modules $(BFF_DIR)/node_modules $(MOBILE_DIR)/node_modules
	@echo "Limpando builds..."
	@rm -rf $(BACKEND_DIR)/dist $(FRONTEND_DIR)/dist $(BFF_DIR)/dist
	@echo "Limpeza concluída."

# Resetar banco completamente
reset:
	@echo "Resetando banco de dados..."
	@$(DOCKER_COMPOSE) down -v
	@echo "Banco resetado."

# Abrir Prisma Studio
studio:
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@echo "Abrindo Prisma Studio em http://localhost:$(PRISMA_STUDIO_PORT)"
	@set -a && . .env && set +a && cd $(BACKEND_DIR) && npx prisma studio

# Acompanhar logs
logs:
	@echo "Mostrando últimas 300 linhas dos logs..."
	@tail -n 300 $(LOGS_DIR)/backend.log
	@tail -n 300 $(LOGS_DIR)/frontend.log
	@$(DOCKER_COMPOSE) logs --tail=300 $(DB_CONTAINER)

# Logs individuais
logs-backend:
	@tail -n 300 $(LOGS_DIR)/backend.log

logs-frontend:
	@tail -n 300 $(LOGS_DIR)/frontend.log

logs-db:
	@$(DOCKER_COMPOSE) logs --tail=300 $(DB_CONTAINER)

# Status dos serviços
status:
	@echo "=== Status dos Serviços ==="
	@echo ""
	@echo "Database (Docker):"
	@$(DOCKER_COMPOSE) ps $(DB_CONTAINER) 2>/dev/null || echo "  Não está rodando"
	@echo ""
	@echo "Backend:"
	@if [ -f $(LOGS_DIR)/.pids.backend ] && kill -0 $$(cat $(LOGS_DIR)/.pids.backend) 2>/dev/null; then \
		echo "  Rodando (PID: $$(cat $(LOGS_DIR)/.pids.backend))"; \
	else \
		echo "  Não está rodando"; \
	fi
	@echo ""
	@echo "Frontend:"
	@if [ -f $(LOGS_DIR)/.pids.frontend ] && kill -0 $$(cat $(LOGS_DIR)/.pids.frontend) 2>/dev/null; then \
		echo "  Rodando (PID: $$(cat $(LOGS_DIR)/.pids.frontend))"; \
	else \
		echo "  Não está rodando"; \
	fi
	@echo ""
	@echo "BFF Mobile:"
	@if [ -f $(LOGS_DIR)/.pids.bff ] && kill -0 $$(cat $(LOGS_DIR)/.pids.bff) 2>/dev/null; then \
		echo "  Rodando (PID: $$(cat $(LOGS_DIR)/.pids.bff))"; \
	else \
		echo "  Não está rodando"; \
	fi

# Banco de dados
migrate: reset db-up migrate-deploy generate

migrate-deploy:
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@set -a && . .env && set +a && cd $(BACKEND_DIR) && npx prisma migrate deploy

generate:
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@set -a && . .env && set +a && cd $(BACKEND_DIR) && npx prisma generate

# Executar testes e2e do backend
tests:
	@echo "Executando testes e2e do backend..."
	@cd $(BACKEND_DIR) && npm run test:e2e

# ==============================================================================
# Comandos Mobile (Expo) - Logs BFF
# ==============================================================================

logs-bff:
	@tail -n 300 $(LOGS_DIR)/bff.log

# ==============================================================================
# Comandos Mobile (Expo)
# ==============================================================================

# Instalar dependências do app mobile
mobile-setup:
	@if [ ! -d "$(MOBILE_DIR)/node_modules" ]; then \
		echo "Instalando dependências do app mobile..."; \
		cd $(MOBILE_DIR) && npm install; \
	else \
		echo "Dependências do app mobile já instaladas."; \
	fi

# Iniciar Expo (app mobile) - aponta para BFF local
mobile-start: mobile-setup
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@if [ ! -f $(MOBILE_DIR)/.env ]; then cp $(MOBILE_DIR)/.env.example $(MOBILE_DIR)/.env; echo "Criado mobile/.env a partir do .env.example — configure os EXPO_PUBLIC_GOOGLE_*_CLIENT_ID."; fi
	@set -a && . ./.env && set +a && \
		BFF_URL="http://$$MOBILE_HOST_IP:$(BFF_PORT)" && \
		if grep -q "^EXPO_PUBLIC_BFF_URL=" $(MOBILE_DIR)/.env; then \
			sed -i "s|^EXPO_PUBLIC_BFF_URL=.*|EXPO_PUBLIC_BFF_URL=$$BFF_URL|" $(MOBILE_DIR)/.env; \
		else \
			echo "EXPO_PUBLIC_BFF_URL=$$BFF_URL" >> $(MOBILE_DIR)/.env; \
		fi
	@echo "Usando EXPO_PUBLIC_BFF_URL=$(shell set -a && . ./.env && set +a && echo http://$$MOBILE_HOST_IP:$(BFF_PORT) 2>/dev/null || grep EXPO_PUBLIC_BFF_URL $(MOBILE_DIR)/.env 2>/dev/null || echo '(ver mobile/.env)')"
	@-pkill -f "expo start" 2>/dev/null || true
	@-pkill -f "metro" 2>/dev/null || true
	@-lsof -ti:8081 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:8082 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo "Iniciando Expo..."
	@set -a && . ./.env && set +a && cd $(MOBILE_DIR) && REACT_NATIVE_PACKAGER_HOSTNAME=$$MOBILE_HOST_IP npx expo start --lan --clear

# Iniciar Expo sem alterar o .env (usa a URL configurada manualmente)
mobile-start-prod: mobile-setup
	@echo "Usando EXPO_PUBLIC_BFF_URL=$(shell grep EXPO_PUBLIC_BFF_URL $(MOBILE_DIR)/.env 2>/dev/null || echo '(não definida)')"
	@echo "Encerrando instâncias anteriores do Expo/Metro..."
	@-pkill -f "expo start" 2>/dev/null || true
	@-pkill -f "metro" 2>/dev/null || true
	@-lsof -ti:8081 | xargs kill -9 2>/dev/null || true
	@-lsof -ti:8082 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo "Iniciando Expo..."
	@set -a && . ./.env && set +a && cd $(MOBILE_DIR) && REACT_NATIVE_PACKAGER_HOSTNAME=$$MOBILE_HOST_IP npx expo start --lan --clear

# Iniciar ambiente completo para mobile (backend + bff + frontend)
mobile-dev: up
	@echo ""
	@echo "Execute 'make mobile-start' em outro terminal para iniciar o Expo."
