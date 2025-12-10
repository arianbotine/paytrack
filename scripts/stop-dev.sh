#!/bin/bash

# ===========================================
# PayTrack - Script de Parada
# ===========================================
# Para todos os serviços de desenvolvimento:
# - Frontend Vite/React (local)
# - Backend NestJS (local)
# - PostgreSQL (Docker)

# set -e  # Removido para não falhar em kills

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

# Timeout para SIGTERM antes de SIGKILL (segundos)
TERM_TIMEOUT=5

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

# ===========================================
# Parar Processo com Graceful Shutdown
# ===========================================

stop_process() {
    local name=$1
    local pid_file="$LOGS_DIR/$name.pid"
    
    if [ ! -f "$pid_file" ]; then
        log_warning "$name: arquivo PID não encontrado"
        return 0
    fi
    
    local pid=$(cat "$pid_file")
    
    if ! kill -0 "$pid" 2>/dev/null; then
        log_warning "$name: processo não está rodando (PID: $pid)"
        rm -f "$pid_file"
        return 0
    fi
    
    log_info "Parando $name (PID: $pid)..."
    
    # Enviar SIGTERM
    kill -TERM "$pid" 2>/dev/null || true
    
    # Aguardar processo encerrar graciosamente
    local waited=0
    while [ $waited -lt $TERM_TIMEOUT ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            log_success "$name parado graciosamente ✓"
            rm -f "$pid_file"
            return 0
        fi
        sleep 1
        ((waited++))
        echo -ne "\r${YELLOW}[WAIT]${NC} Aguardando $name encerrar... ${waited}s/${TERM_TIMEOUT}s"
    done
    
    echo ""
    log_warning "$name não respondeu ao SIGTERM. Enviando SIGKILL..."
    
    # Enviar SIGKILL
    kill -KILL "$pid" 2>/dev/null || true
    
    # Aguardar um pouco mais
    sleep 1
    
    if ! kill -0 "$pid" 2>/dev/null; then
        log_success "$name forçadamente encerrado ✓"
    else
        log_error "Falha ao parar $name (PID: $pid)"
    fi
    
    rm -f "$pid_file"
}

# ===========================================
# Matar Processos Filhos (npm/node)
# ===========================================

kill_child_processes() {
    local name=$1
    local pid_file="$LOGS_DIR/$name.pid"
    
    if [ ! -f "$pid_file" ]; then
        return 0
    fi
    
    local parent_pid=$(cat "$pid_file")
    
    # Encontrar e matar processos filhos
    local children=$(pgrep -P "$parent_pid" 2>/dev/null || true)
    
    for child in $children; do
        if kill -0 "$child" 2>/dev/null; then
            log_info "Parando processo filho de $name (PID: $child)..."
            kill -TERM "$child" 2>/dev/null || true
            
            local waited=0
            while [ $waited -lt $TERM_TIMEOUT ]; do
                if ! kill -0 "$child" 2>/dev/null; then
                    break
                fi
                sleep 1
                ((waited++))
            done
            
            if kill -0 "$child" 2>/dev/null; then
                kill -KILL "$child" 2>/dev/null || true
            fi
        fi
    done
}

# ===========================================
# Limpeza Agressiva de Processos Node.js
# ===========================================

kill_node_processes_aggressive() {
    local name=$1
    log_info "Executando limpeza agressiva de processos $name..."
    
    # Tentar diferentes abordagens para matar processos relacionados
    local killed=false
    
    # 1. Matar processos por comando (mais específico)
    if [ "$name" = "backend" ]; then
        # Matar processos do NestJS
        if pkill -f "nest start" 2>/dev/null; then
            log_success "Processos NestJS parados ✓"
            killed=true
        fi
        # Matar processos node relacionados ao backend
        if pkill -f "backend/node_modules/.bin/nest" 2>/dev/null; then
            killed=true
        fi
    elif [ "$name" = "frontend" ]; then
        # Matar processos do Vite
        if pkill -f "vite" 2>/dev/null; then
            log_success "Processos Vite parados ✓"
            killed=true
        fi
        # Matar processos relacionados ao frontend
        if pkill -f "frontend/node_modules/.bin/vite" 2>/dev/null; then
            killed=true
        fi
    fi
    
    # 2. Matar processos npm relacionados ao projeto
    if pkill -f "npm run start:dev" 2>/dev/null; then
        log_success "Processos npm start:dev parados ✓"
        killed=true
    fi
    
    # 3. Matar processos que estão escutando nas portas específicas
    if [ "$name" = "backend" ]; then
        # Matar processos escutando na porta 3000
        local backend_pids=$(lsof -ti :3000 2>/dev/null || true)
        if [ -n "$backend_pids" ]; then
            log_info "Matando processos escutando na porta 3000: $backend_pids"
            echo "$backend_pids" | xargs kill -TERM 2>/dev/null || true
            sleep 1
            # Se ainda estiverem rodando, usar SIGKILL
            echo "$backend_pids" | xargs kill -KILL 2>/dev/null || true
            log_success "Processos na porta 3000 parados ✓"
            killed=true
        fi
    elif [ "$name" = "frontend" ]; then
        # Matar processos escutando na porta 5173
        local frontend_pids=$(lsof -ti :5173 2>/dev/null || true)
        if [ -n "$frontend_pids" ]; then
            log_info "Matando processos escutando na porta 5173: $frontend_pids"
            echo "$frontend_pids" | xargs kill -TERM 2>/dev/null || true
            sleep 1
            # Se ainda estiverem rodando, usar SIGKILL
            echo "$frontend_pids" | xargs kill -KILL 2>/dev/null || true
            log_success "Processos na porta 5173 parados ✓"
            killed=true
        fi
    fi
    
    # 4. Aguardar um pouco para os processos terminarem
    sleep 2
    
    # 5. Verificar se ainda há processos relacionados rodando
    local remaining_processes=""
    if [ "$name" = "backend" ]; then
        remaining_processes=$(pgrep -f "nest start" 2>/dev/null || true)
    elif [ "$name" = "frontend" ]; then
        remaining_processes=$(pgrep -f "vite" 2>/dev/null || true)
    fi
    
    if [ -n "$remaining_processes" ]; then
        log_warning "Encontrados processos remanescentes. Forçando parada..."
        # Usar SIGKILL para processos remanescentes
        if [ "$name" = "backend" ]; then
            pkill -9 -f "nest start" 2>/dev/null || true
        elif [ "$name" = "frontend" ]; then
            pkill -9 -f "vite" 2>/dev/null || true
        fi
        sleep 1
    fi
    
    if [ "$killed" = true ]; then
        log_success "Limpeza agressiva de $name concluída ✓"
    else
        log_info "Nenhum processo $name encontrado para parar"
    fi
}

# ===========================================
# Parar Banco de Dados (Docker)
# ===========================================

stop_database() {
    log_info "Parando banco de dados PostgreSQL..."
    
    cd "$ROOT_DIR"
    
    if docker compose ps db --status running 2>/dev/null | grep -q "paytrack-db"; then
        docker compose stop db
        log_success "Banco de dados parado ✓"
    else
        log_warning "Banco de dados não estava rodando"
    fi
}

# ===========================================
# Parar Log do Banco de Dados
# ===========================================

stop_db_log_process() {
    # Encontrar e matar processo que está logando o banco
    local db_log_pids=$(pgrep -f "docker compose logs -f db" 2>/dev/null || true)
    
    for pid in $db_log_pids; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done
}

# ===========================================
# Main
# ===========================================

main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║      PayTrack - Parando Ambiente      ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
    echo ""
    
    # Parar processos na ordem inversa
    log_info "Parando serviços..."
    echo ""
    
    # 1. Parar Frontend
    kill_child_processes "frontend"
    stop_process "frontend"
    
    # Se ainda houver processos frontend rodando, usar limpeza agressiva
    if pgrep -f "vite" >/dev/null 2>&1; then
        log_warning "Processos frontend ainda ativos. Executando limpeza agressiva..."
        kill_node_processes_aggressive "frontend"
    fi
    echo ""
    
    # 2. Parar Backend
    kill_child_processes "backend"
    stop_process "backend"
    
    # Sempre executar limpeza agressiva para backend (mais confiável que PID)
    log_info "Executando limpeza agressiva para backend..."
    kill_node_processes_aggressive "backend"
    echo ""
    
    # 3. Parar log do banco
    stop_db_log_process
    
    # 4. Parar banco de dados
    stop_database
    
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}   Todos os serviços foram parados!     ${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
}

main "$@"
