#!/bin/bash

# ===========================================
# PayTrack - Visualizador de Logs
# ===========================================

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

LOGS_DIR="$(dirname "$0")/logs"

show_menu() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       PayTrack - Logs Viewer          ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${YELLOW}Arquivos de Log Disponíveis:${NC}"
    echo ""
    
    # Backend
    if [ -f "$LOGS_DIR/backend.log" ]; then
        local size=$(du -h "$LOGS_DIR/backend.log" | cut -f1)
        local lines=$(wc -l < "$LOGS_DIR/backend.log")
        echo -e "  ${GREEN}●${NC} Backend:  $LOGS_DIR/backend.log ($size, $lines linhas)"
    else
        echo -e "  ${RED}○${NC} Backend:  Não encontrado"
    fi
    
    # Frontend
    if [ -f "$LOGS_DIR/frontend.log" ]; then
        local size=$(du -h "$LOGS_DIR/frontend.log" | cut -f1)
        local lines=$(wc -l < "$LOGS_DIR/frontend.log")
        echo -e "  ${GREEN}●${NC} Frontend: $LOGS_DIR/frontend.log ($size, $lines linhas)"
    else
        echo -e "  ${RED}○${NC} Frontend: Não encontrado"
    fi
    
    # Database
    if [ -f "$LOGS_DIR/db.log" ]; then
        local size=$(du -h "$LOGS_DIR/db.log" | cut -f1)
        local lines=$(wc -l < "$LOGS_DIR/db.log")
        echo -e "  ${GREEN}●${NC} Database: $LOGS_DIR/db.log ($size, $lines linhas)"
    else
        echo -e "  ${RED}○${NC} Database: Não encontrado"
    fi
    
    echo ""
    echo -e "${YELLOW}Comandos:${NC}"
    echo ""
    echo -e "  ${CYAN}1${NC}) Ver todos os logs (tempo real)"
    echo -e "  ${CYAN}2${NC}) Ver logs do Backend"
    echo -e "  ${CYAN}3${NC}) Ver logs do Frontend"
    echo -e "  ${CYAN}4${NC}) Ver logs do Database"
    echo -e "  ${CYAN}5${NC}) Limpar todos os logs"
    echo -e "  ${CYAN}q${NC}) Sair"
    echo ""
}

tail_all() {
    echo -e "${BLUE}Mostrando todos os logs (Ctrl+C para sair)...${NC}"
    echo ""
    tail -f "$LOGS_DIR/backend.log" "$LOGS_DIR/frontend.log" "$LOGS_DIR/db.log" 2>/dev/null
}

tail_backend() {
    if [ -f "$LOGS_DIR/backend.log" ]; then
        echo -e "${BLUE}Logs do Backend (Ctrl+C para sair)...${NC}"
        echo ""
        tail -f "$LOGS_DIR/backend.log"
    else
        echo -e "${RED}Arquivo de log do backend não encontrado${NC}"
    fi
}

tail_frontend() {
    if [ -f "$LOGS_DIR/frontend.log" ]; then
        echo -e "${BLUE}Logs do Frontend (Ctrl+C para sair)...${NC}"
        echo ""
        tail -f "$LOGS_DIR/frontend.log"
    else
        echo -e "${RED}Arquivo de log do frontend não encontrado${NC}"
    fi
}

tail_db() {
    if [ -f "$LOGS_DIR/db.log" ]; then
        echo -e "${BLUE}Logs do Database (Ctrl+C para sair)...${NC}"
        echo ""
        tail -f "$LOGS_DIR/db.log"
    else
        echo -e "${RED}Arquivo de log do database não encontrado${NC}"
    fi
}

clear_logs() {
    echo -e "${YELLOW}Tem certeza que deseja limpar todos os logs? (s/N)${NC}"
    read -r response
    if [[ "$response" =~ ^[Ss]$ ]]; then
        rm -f "$LOGS_DIR/backend.log" "$LOGS_DIR/frontend.log" "$LOGS_DIR/db.log"
        echo -e "${GREEN}Logs limpos com sucesso!${NC}"
    else
        echo "Operação cancelada."
    fi
}

# Se argumentos foram passados, executar diretamente
case "$1" in
    all)
        tail_all
        exit 0
        ;;
    backend)
        tail_backend
        exit 0
        ;;
    frontend)
        tail_frontend
        exit 0
        ;;
    db|database)
        tail_db
        exit 0
        ;;
    clear)
        clear_logs
        exit 0
        ;;
    help|--help|-h)
        echo "Uso: $0 [comando]"
        echo ""
        echo "Comandos:"
        echo "  all       - Ver todos os logs"
        echo "  backend   - Ver logs do backend"
        echo "  frontend  - Ver logs do frontend"
        echo "  db        - Ver logs do database"
        echo "  clear     - Limpar todos os logs"
        echo ""
        echo "Sem argumentos: abre menu interativo"
        exit 0
        ;;
esac

# Menu interativo
while true; do
    show_menu
    echo -ne "${CYAN}Escolha uma opção: ${NC}"
    read -r choice
    
    case $choice in
        1) tail_all ;;
        2) tail_backend ;;
        3) tail_frontend ;;
        4) tail_db ;;
        5) clear_logs ;;
        q|Q) 
            echo "Saindo..."
            exit 0
            ;;
        *)
            echo -e "${RED}Opção inválida${NC}"
            ;;
    esac
done