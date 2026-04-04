# PayTrack - Sistema de Contas a Pagar e Receber

Sistema completo para gestão de contas a pagar e receber com arquitetura multi-tenant.

## ✨ Funcionalidades

- ✅ **Formatação automática** de código ao salvar
- ✅ **Linting** integrado com correção automática
- ✅ **TypeScript** com tipagem rigorosa
- ✅ **Arquitetura multi-tenant** com isolamento por organização
- ✅ **API REST** completa com documentação Swagger
- ✅ **Frontend React** moderno com Material-UI
- ✅ **Banco PostgreSQL** com Prisma ORM
- ✅ **Autenticação JWT** com refresh tokens
- ✅ **Controle de permissões** baseado em roles
- ✅ **Gestão completa** de contas a pagar/receber
- ✅ **Sistema de pagamentos** com allocations
- ✅ **Dashboard** com métricas e relatórios

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

## 💻 Desenvolvimento

### Formatação Automática de Código

O projeto está configurado para **formatar automaticamente** o código ao salvar arquivos:

- **Prettier**: Formatação consistente (aspas simples, ponto e vírgula, indentação)
- **ESLint**: Linting com correção automática
- **EditorConfig**: Padronização básica de editor

#### Como Funciona

1. **Ao salvar** um arquivo (Ctrl/Cmd + S), o VS Code automaticamente:
   - Formata o código com Prettier
   - Corrige problemas simples de ESLint
   - Adiciona ponto e vírgula quando necessário

2. **Comandos manuais**:

   ```bash
   # Backend - Formatar código
   cd backend && npm run format

   # Backend - Verificar/corrigir linting
   cd backend && npm run lint -- --fix

   # Frontend - Verificar/corrigir linting
   cd frontend && npm run lint -- --fix
   ```

#### Extensões Recomendadas do VS Code

- **Prettier** (`esbenp.prettier-vscode`)
- **ESLint** (`dbaeumer.vscode-eslint`)
- **EditorConfig** (`editorconfig.editorconfig`)

Para mais detalhes, consulte [`FORMATTING.md`](FORMATTING.md).

## 📱 Desenvolvimento Mobile

O PayTrack inclui um **aplicativo mobile** (React Native + Expo) e um **BFF** (Backend for Frontend) que atua como intermediário entre o app e o backend principal.

### Arquitetura

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│   Mobile    │───▶│     BFF      │───▶│   Backend    │
│   (Expo)    │    │  (NestJS)    │    │   (NestJS)   │
│  :8081      │    │    :3001     │    │    :3000     │
└─────────────┘    └──────────────┘    └──────────────┘
```

- **Mobile**: React Native + Expo + React Native Paper
- **BFF**: NestJS na porta 3001, proxy/agregador para o backend
- **Backend**: API existente na porta 3000

### Pré-requisitos Mobile

- **Node.js 18+**
- **Expo CLI**: `npm install -g expo-cli` (opcional)
- **Expo Go** no celular ou emulador Android/iOS

### Iniciar Ambiente Mobile

```bash
# 1. Iniciar backend + frontend web (se ainda não estiver rodando)
make up

# 2. Iniciar BFF (em outro terminal)
make bff-up

# 3. Iniciar Expo (em outro terminal)
make mobile-start

# Ou tudo de uma vez (exceto Expo):
make mobile-dev
# Depois: make mobile-start
```

### Estrutura Mobile

```
bff-mobile/           # BFF - Backend for Frontend
├── src/
│   ├── modules/
│   │   ├── auth/         # Proxy de autenticação
│   │   ├── dashboard/    # Dashboard agregado
│   │   ├── payables/     # Contas a pagar
│   │   ├── receivables/  # Contas a receber
│   │   └── shared/       # Guards, decorators
│   └── infrastructure/   # HTTP client para backend

mobile/               # App React Native + Expo
├── app/
│   ├── (auth)/           # Telas de autenticação
│   │   ├── login.tsx
│   │   └── select-organization.tsx
│   └── (tabs)/           # Telas principais
│       ├── index.tsx     # Dashboard
│       ├── payables.tsx  # Contas a pagar
│       ├── receivables.tsx
│       └── profile.tsx
└── src/
    └── lib/              # API, stores, types
```

### Comandos Mobile (Makefile)

```bash
make bff-setup     # Instalar dependências do BFF
make bff-up        # Iniciar BFF (:3001)
make bff-down      # Parar BFF
make logs-bff      # Logs do BFF

make mobile-setup  # Instalar dependências do app
make mobile-start  # Iniciar Expo
make mobile-dev    # Iniciar backend + BFF (depois: make mobile-start)
```

### Endpoints do BFF

| Método | Endpoint                                                   | Descrição                 |
| ------ | ---------------------------------------------------------- | ------------------------- |
| POST   | `/bff/auth/login`                                          | Login                     |
| POST   | `/bff/auth/refresh`                                        | Refresh token             |
| POST   | `/bff/auth/select-organization`                            | Trocar organização        |
| GET    | `/bff/auth/me`                                             | Perfil do usuário         |
| GET    | `/bff/dashboard`                                           | Dashboard agregado        |
| GET    | `/bff/payables`                                            | Lista de contas a pagar   |
| GET    | `/bff/payables/:id`                                        | Detalhe de conta a pagar  |
| POST   | `/bff/payables/:id/installments/:installmentId/pay`        | Pagar parcela             |
| GET    | `/bff/receivables`                                         | Lista de contas a receber |
| POST   | `/bff/receivables/:id/installments/:installmentId/receive` | Receber parcela           |
| GET    | `/bff/health`                                              | Health check              |

### Testando o BFF

```bash
# Health check
curl http://localhost:3001/bff/health

# Login
curl -X POST http://localhost:3001/bff/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@paytrack.com","password":"admin123"}'
```

### Variáveis de Ambiente Mobile

| Variável              | Descrição             | Padrão                  |
| --------------------- | --------------------- | ----------------------- |
| `BFF_PORT`            | Porta do BFF          | `3001`                  |
| `BACKEND_URL`         | URL do backend        | `http://localhost:3000` |
| `BFF_JWT_SECRET`      | Secret JWT do BFF     | (usa JWT_SECRET)        |
| `EXPO_PUBLIC_BFF_URL` | URL do BFF para o app | `http://localhost:3001` |

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

## � Convenções de API

- Base URL: `/api` prefix
- Swagger docs: `/api/docs`
- Todos os valores monetários usam `Decimal(15,2)` no Prisma, `number` nos DTOs
- **Datas**: Strings ISO em DTOs, convertidas para `Date` nos serviços. O backend sempre trata datas como UTC e não realiza conversões de fuso horário. O frontend lida com conversões de fuso horário local para exibição e entrada de dados, enviando datas em UTC para o backend.
- Erros em português (Brasil)

## �📝 Funcionalidades

- ✅ Autenticação JWT com roles (OWNER, ADMIN, ACCOUNTANT, VIEWER)
- ✅ Gestão de organizações (multi-tenant)
- ✅ CRUD de usuários, devedores e fornecedores
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
