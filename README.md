# PayTrack - Sistema de Contas a Pagar e Receber

Sistema completo para gestão de contas a pagar e receber com arquitetura multi-tenant.

## 🚀 Início Rápido

### Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ (opcional, para desenvolvimento local)

### Executar a Aplicação

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ou usando Makefile
make up
```

A aplicação estará disponível em:

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs

### Credenciais de Acesso

- **Email**: admin@paytrack.com
- **Senha**: admin123

## 📊 Logs da Aplicação

Os logs são salvos automaticamente na pasta `logs/` com informações de PID no nome do arquivo.

### Estrutura dos Logs

```
logs/
├── backend_pid<PID>.log     # Log do backend (NestJS)
└── frontend_pid<PID>.log    # Log do frontend (Vite)
```

### Visualizar Logs

```bash
# Ver informações sobre logs disponíveis
./view-logs.sh

# Seguir logs em tempo real
tail -f logs/$(ls -t logs/backend_pid*.log | head -1)
tail -f logs/$(ls -t logs/frontend_pid*.log | head -1)

# Ver logs completos
cat logs/$(ls -t logs/backend_pid*.log | head -1)
cat logs/$(ls -t logs/frontend_pid*.log | head -1)
```

# Seguir logs do backend em tempo real

tail -f logs/backend/$(ls -t logs/backend/ | head -1)

# Seguir logs do frontend em tempo real

tail -f logs/frontend/$(ls -t logs/frontend/ | head -1)

# Ver logs via Docker

docker-compose logs -f backend
docker-compose logs -f frontend

````

### Formato dos Logs

Cada linha de log inclui:

- Timestamp: `[2025-12-08 23:18:16]`
- PID do processo: `[PID:1]`
- Mensagem original

## 🛠️ Desenvolvimento

### Com Docker (Recomendado)

```bash
# Iniciar desenvolvimento
docker-compose up -d

# Editar código localmente - hot-reload automático
# Backend: backend/src/
# Frontend: frontend/src/
````

### Localmente (Sem Docker)

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend (terminal separado)
cd frontend
npm install
npm run dev
```

## 🗄️ Banco de Dados

- **PostgreSQL**: localhost:5433
- **Credenciais**: paytrack/paytrack123

## 🏗️ Arquitetura

- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + Vite + Material-UI + TanStack Query
- **Autenticação**: JWT com RBAC
- **Multi-tenant**: Suporte a múltiplas organizações

## 📝 Funcionalidades

- ✅ Autenticação JWT com roles (OWNER, ADMIN, ACCOUNTANT, VIEWER)
- ✅ Gestão de organizações (multi-tenant)
- ✅ CRUD de usuários, clientes e fornecedores
- ✅ Contas a pagar e receber
- ✅ Categorias e tags
- ✅ Baixa de contas (pagamentos)
- ✅ Dashboard com métricas
- ✅ Alertas visuais para vencimentos

## 🛑 Parar a Aplicação

```bash
# Parar todos os serviços
docker-compose down

# Ou usando Makefile
make down
```
