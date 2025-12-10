#!/bin/bash

# ===========================================
# PayTrack - Script de Inicialização
# ===========================================
# Inicia todos os serviços de desenvolvimento:
# - PostgreSQL (Docker)
# - Backend NestJS (local)
# - Frontend Vite/React (local)

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretório raiz do projeto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOGS_DIR="$ROOT_DIR/logs"

# ===========================================
# Funções Auxiliares
# ===========================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# ===========================================
# Verificação de Dependências
# ===========================================

check_dependencies() {
    log_info "Verificando dependências..."
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js não encontrado. Instale Node.js >= 18"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js versão $NODE_VERSION encontrada. Requerido >= 18"
        exit 1
    fi
    log_success "Node.js $(node -v) ✓"
    
    # Verificar npm
    if ! command -v npm &> /dev/null; then
        log_error "npm não encontrado"
        exit 1
    fi
    log_success "npm $(npm -v) ✓"
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker não encontrado. Instale Docker Desktop ou Docker Engine"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon não está rodando. Inicie o Docker"
        exit 1
    fi
    log_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') ✓"
    
    # Verificar Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose não encontrado"
        exit 1
    fi
    log_success "Docker Compose ✓"
}

# ===========================================
# Carregar Variáveis de Ambiente
# ===========================================

load_env() {
    log_info "Carregando variáveis de ambiente..."
    
    # Arquivo .env na raiz
    if [ -f "$ROOT_DIR/.env" ]; then
        set -a
        source "$ROOT_DIR/.env"
        set +a
        log_success "Arquivo .env carregado"
    else
        log_warning "Arquivo .env não encontrado. Usando valores padrão."
        log_info "Execute: cp .env.example .env"
    fi
    
    # Valores padrão (fallbacks)
    export DB_USER="${DB_USER:-paytrack}"
    export DB_PASSWORD="${DB_PASSWORD:-paytrack123}"
    export DB_NAME="${DB_NAME:-paytrack}"
    export DB_PORT="${DB_PORT:-5433}"
    export DATABASE_URL="${DATABASE_URL:-postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME?schema=public}"
    export API_PORT="${API_PORT:-3000}"
    export WEB_PORT="${WEB_PORT:-5173}"
    export NODE_ENV="${NODE_ENV:-development}"
    export JWT_SECRET="${JWT_SECRET:-super-secret-jwt-key-change-in-production}"
    export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-super-secret-refresh-key-change-in-production}"
    export JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-15m}"
    export JWT_REFRESH_EXPIRES_IN="${JWT_REFRESH_EXPIRES_IN:-7d}"
    export VITE_API_URL="${VITE_API_URL:-http://localhost:$API_PORT}"
}

# ===========================================
# Preparar Diretório de Logs
# ===========================================

prepare_logs_dir() {
    log_info "Preparando diretório de logs..."
    mkdir -p "$LOGS_DIR"
    
    # Limpar logs antigos para evitar acumulação
    log_info "Limpando logs antigos..."
    rm -f "$LOGS_DIR"/*.log "$LOGS_DIR"/*.pid
    
    log_success "Diretório de logs: $LOGS_DIR"
}

# ===========================================
# Verificar se Serviços já Estão Rodando
# ===========================================

check_running_services() {
    local has_running=false
    
    if [ -f "$LOGS_DIR/backend.pid" ]; then
        if kill -0 $(cat "$LOGS_DIR/backend.pid") 2>/dev/null; then
            log_warning "Backend já está rodando (PID: $(cat "$LOGS_DIR/backend.pid"))"
            has_running=true
        else
            rm -f "$LOGS_DIR/backend.pid"
        fi
    fi
    
    if [ -f "$LOGS_DIR/frontend.pid" ]; then
        if kill -0 $(cat "$LOGS_DIR/frontend.pid") 2>/dev/null; then
            log_warning "Frontend já está rodando (PID: $(cat "$LOGS_DIR/frontend.pid"))"
            has_running=true
        fi
    else
        rm -f "$LOGS_DIR/frontend.pid"
    fi
    
    if [ "$has_running" = true ]; then
        log_error "Serviços já estão rodando. Execute 'make down' primeiro."
        exit 1
    fi
}

# ===========================================
# Iniciar Banco de Dados (Docker)
# ===========================================

start_database() {
    log_info "Iniciando banco de dados PostgreSQL..."
    
    cd "$ROOT_DIR"
    docker compose up -d db
    
    log_info "Aguardando banco de dados ficar pronto..."
    
    # Aguardar healthcheck
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker compose exec -T db pg_isready -U "$DB_USER" &> /dev/null; then
            log_success "Banco de dados pronto! ✓"
            
            # Salvar logs do banco
            docker compose logs -f db 2>&1 | while read line; do
                echo "[$(timestamp)] $line"
            done >> "$LOGS_DIR/db.log" &
            
            return 0
        fi
        
        echo -ne "\r${YELLOW}[WAIT]${NC} Tentativa $attempt/$max_attempts..."
        sleep 1
        ((attempt++))
    done
    
    echo ""
    log_error "Timeout aguardando banco de dados"
    exit 1
}

# ===========================================
# Iniciar Backend (NestJS)
# ===========================================

start_backend() {
    log_info "Iniciando backend NestJS..."
    
    cd "$ROOT_DIR/backend"
    
    # Verificar se node_modules existe
    if [ ! -d "node_modules" ]; then
        log_warning "node_modules não encontrado. Executando npm install..."
        npm install
    fi
    
    # Gerar Prisma Client se necessário
    if [ ! -d "node_modules/.prisma" ]; then
        log_info "Gerando Prisma Client..."
        npx prisma generate
    fi
    
    # Iniciar backend com logs
    (
        npm run start:dev 2>&1 | while IFS= read -r line; do
            echo "[$(timestamp)] $line"
        done >> "$LOGS_DIR/backend.log"
    ) &
    
    local backend_pid=$!
    echo $backend_pid > "$LOGS_DIR/backend.pid"
    
    log_info "Backend iniciado (PID: $backend_pid)"
    
    # Aguardar backend ficar pronto
    log_info "Aguardando backend ficar pronto..."
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$API_PORT/api" > /dev/null 2>&1; then
            log_success "Backend pronto! ✓"
            return 0
        fi
        
        # Verificar se processo ainda está rodando
        if ! kill -0 $backend_pid 2>/dev/null; then
            log_error "Backend falhou ao iniciar. Verifique os logs: $LOGS_DIR/backend.log"
            exit 1
        fi
        
        echo -ne "\r${YELLOW}[WAIT]${NC} Tentativa $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done
    
    echo ""
    log_warning "Backend pode ainda estar iniciando. Verifique os logs."
}

# ===========================================
# Iniciar Frontend (Vite/React)
# ===========================================

start_frontend() {
    log_info "Iniciando frontend Vite/React..."
    
    cd "$ROOT_DIR/frontend"
    
    # Verificar se node_modules existe
    if [ ! -d "node_modules" ]; then
        log_warning "node_modules não encontrado. Executando npm install..."
        npm install
    fi
    
    # Iniciar frontend com logs
    (
        npm run dev 2>&1 | while IFS= read -r line; do
            echo "[$(timestamp)] $line"
        done >> "$LOGS_DIR/frontend.log"
    ) &
    
    local frontend_pid=$!
    echo $frontend_pid > "$LOGS_DIR/frontend.pid"
    
    log_info "Frontend iniciado (PID: $frontend_pid)"
    
    # Aguardar frontend ficar pronto
    log_info "Aguardando frontend ficar pronto..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$WEB_PORT" > /dev/null 2>&1; then
            log_success "Frontend pronto! ✓"
            return 0
        fi
        
        # Verificar se processo ainda está rodando
        if ! kill -0 $frontend_pid 2>/dev/null; then
            log_error "Frontend falhou ao iniciar. Verifique os logs: $LOGS_DIR/frontend.log"
            exit 1
        fi
        
        echo -ne "\r${YELLOW}[WAIT]${NC} Tentativa $attempt/$max_attempts..."
        sleep 1
        ((attempt++))
    done
    
    echo ""
    log_warning "Frontend pode ainda estar iniciando. Verifique os logs."
}

# ===========================================
# Exibir Informações Finais
# ===========================================

show_info() {
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}   PayTrack - Ambiente de Desenvolvimento${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "  ${BLUE}Frontend:${NC}  http://localhost:$WEB_PORT"
    echo -e "  ${BLUE}Backend:${NC}   http://localhost:$API_PORT"
    echo -e "  ${BLUE}Swagger:${NC}   http://localhost:$API_PORT/api/docs"
    echo -e "  ${BLUE}Database:${NC}  localhost:$DB_PORT"
    echo ""
    echo -e "  ${YELLOW}Logs:${NC}"
    echo -e "    Backend:  $LOGS_DIR/backend.log"
    echo -e "    Frontend: $LOGS_DIR/frontend.log"
    echo -e "    Database: $LOGS_DIR/db.log"
    echo ""
    echo -e "  ${YELLOW}Comandos úteis:${NC}"
    echo -e "    make logs          - Ver todos os logs"
    echo -e "    make logs-backend  - Ver logs do backend"
    echo -e "    make logs-frontend - Ver logs do frontend"
    echo -e "    make down          - Parar todos os serviços"
    echo ""
    echo -e "${GREEN}=========================================${NC}"
}

# ===========================================
# Main
# ===========================================

main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     PayTrack - Iniciando Ambiente     ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
    echo ""
    
    check_dependencies
    load_env
    prepare_logs_dir
    check_running_services
    start_database
    start_backend
    start_frontend
    show_info
}

main "$@"
