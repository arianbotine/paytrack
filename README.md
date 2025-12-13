# PayTrack - Sistema de Contas a Pagar e Receber

Sistema completo para gestão de contas a pagar e receber com arquitetura multi-tenant.

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js 18+** e **npm**
- **Docker** e **Docker Compose** (apenas para o banco de dados)

### Configuração Inicial

```bash
# 1. Clonar o repositório
git clone <repo-url>
cd paytrack

# 2. Copiar arquivos de ambiente (opcional, o .env.example já tem valores padrão)
cp .env.example .env

# 3. Iniciar a aplicação (instala deps, inicia DB, sincroniza schema)
make up
```

### Executar Seeds (Dados de Demonstração)

```bash
# Executar seeds com dados de demonstração
make db-seed
```

Credenciais de acesso: admin@paytrack.com / admin123

A aplicação estará disponível em:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api/docs
- **Database**: localhost:5433

### Credenciais de Acesso

- **Email**: admin@paytrack.com
- **Senha**: admin123

## 📊 Logs da Aplicação

Os logs são salvos automaticamente na pasta `logs/` em tempo real.

> **💡 Dica**: Os logs são **automaticamente limpos** a cada inicialização da aplicação (`make up`) para evitar acumulação de logs antigos durante o desenvolvimento.

### Estrutura dos Logs

```
logs/
├── backend.log      # Log do backend (NestJS)
├── frontend.log     # Log do frontend (Vite)
├── db.log           # Log do banco de dados (PostgreSQL)
├── backend.pid      # PID do processo backend
└── frontend.pid     # PID do processo frontend
```

### Visualizar Logs

```bash
# Menu interativo de logs
./view-logs.sh

# Ou comandos diretos:
./view-logs.sh all        # Todos os logs
./view-logs.sh backend    # Apenas backend
./view-logs.sh frontend   # Apenas frontend
./view-logs.sh db         # Apenas database

# Via Makefile
make logs            # Menu interativo
make logs-backend    # Logs do backend
make logs-frontend   # Logs do frontend
make logs-db         # Logs do banco
```

### Formato dos Logs

Cada linha de log inclui timestamp:

```
[2025-12-09 10:30:45] [Nest] 12345  - LOG [Bootstrap] Application is running on: http://localhost:3000
```

## 🛠️ Comandos de Desenvolvimento

### Makefile

```bash
# === Desenvolvimento ===
make setup           # Instalar dependências (inteligente)
make setup-force     # Forçar instalação de dependências
make db-up           # Iniciar PostgreSQL
make db-sync         # Sincronizar schema e gerar Prisma
make db-seed         # Executar seeds
make up              # Iniciar tudo (backend + frontend)
make down            # Parar tudo
make restart         # Reiniciar aplicações
make status          # Mostra status dos serviços

# === Logs ===
make logs            # Acompanhar todos os logs
make logs-backend    # Logs do backend
make logs-frontend   # Logs do frontend
make logs-db         # Logs do banco

# === Banco de Dados ===
make db-shell        # Shell do PostgreSQL
make migrate         # Executar migrations
make studio          # Abrir Prisma Studio
make generate        # Regenerar Prisma Client

# === Utilitários ===
make clean           # Limpar logs, node_modules, builds
make reset           # Resetar banco completamente

# === Ajuda ===
make help            # Lista todos os comandos
```

## ⚙️ Variáveis de Ambiente

Edite o arquivo `.env` na raiz do projeto:

| Variável       | Descrição                | Padrão                  |
| -------------- | ------------------------ | ----------------------- |
| `DB_USER`      | Usuário do PostgreSQL    | `paytrack`              |
| `DB_PASSWORD`  | Senha do PostgreSQL      | `paytrack123`           |
| `DB_NAME`      | Nome do banco            | `paytrack`              |
| `DB_PORT`      | Porta do PostgreSQL      | `5433`                  |
| `DATABASE_URL` | URL de conexão Prisma    | `postgresql://...`      |
| `API_PORT`     | Porta do backend         | `3000`                  |
| `WEB_PORT`     | Porta do frontend        | `5173`                  |
| `JWT_SECRET`   | Secret para JWT          | `super-secret-...`      |
| `VITE_API_URL` | URL da API para frontend | `http://localhost:3000` |

## 🗄️ Banco de Dados

O PostgreSQL roda em Docker para facilitar o setup:

- **Host**: localhost
- **Porta**: 5433 (configurável via `DB_PORT`)
- **Usuário**: paytrack
- **Senha**: paytrack123
- **Database**: paytrack

```bash
# Acessar shell do PostgreSQL
make db-shell

# Abrir Prisma Studio (interface visual)
make studio
```

## 🏗️ Arquitetura

- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + Vite + Material-UI + TanStack Query
- **Autenticação**: JWT com RBAC
- **Multi-tenant**: Suporte a múltiplas organizações
- **Desenvolvimento**: Backend e Frontend rodam localmente, apenas DB em Docker

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
# Parar todos os serviços graciosamente
make down
```
