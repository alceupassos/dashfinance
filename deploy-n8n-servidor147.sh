#!/bin/bash

# =====================================================
# DEPLOY N8N NO SERVIDOR 147
# Execute este script no servidor 147
# =====================================================

set -e

echo "Iniciando deploy N8N no Servidor 147..."
echo ""

# Variáveis
N8N_URL="http://n8n.angrax.com.br"
N8N_DOCKER_COMPOSE_DIR="/root/n8n"  # Ajuste conforme seu setup
WORKFLOWS_DIR="/root/dashfinance/n8n-workflows"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# =====================================================
# Passo 1: Verificar se N8N está ativo
# =====================================================

echo "Verificando se N8N está ativo..."
echo ""

if curl -s "$N8N_URL/health" > /dev/null 2>&1; then
    echo "N8N já está rodando!"
    echo "URL: $N8N_URL"
else
    echo "N8N não está respondendo. Iniciando..."
    echo ""
    
    # Verificar se docker-compose.yml existe
    if [ ! -f "$N8N_DOCKER_COMPOSE_DIR/docker-compose.yml" ]; then
        echo "Erro: docker-compose.yml não encontrado em $N8N_DOCKER_COMPOSE_DIR"
        exit 1
    fi
    
    cd "$N8N_DOCKER_COMPOSE_DIR"
    
    echo "Rodando: docker-compose up -d"
    docker-compose up -d
    
    echo "Aguardando N8N iniciar..."
    sleep 10
    
    if curl -s "$N8N_URL/health" > /dev/null 2>&1; then
        echo "N8N iniciado com sucesso!"
    else
        echo "Erro: N8N não conseguiu iniciar"
        exit 1
    fi
fi

echo ""

# =====================================================
# Passo 2: Verificar workflows
# =====================================================

echo "Verificando workflows..."
echo ""

if [ ! -f "$WORKFLOWS_DIR/01_resumo_executivo_diario.json" ]; then
    echo "Erro: Arquivo 01_resumo_executivo_diario.json não encontrado"
    exit 1
fi

if [ ! -f "$WORKFLOWS_DIR/02_detector_saldo_critico_realtime.json" ]; then
    echo "Erro: Arquivo 02_detector_saldo_critico_realtime.json não encontrado"
    exit 1
fi

echo "Workflows encontrados:"
echo "  1. 01_resumo_executivo_diario.json"
echo "  2. 02_detector_saldo_critico_realtime.json"
echo ""

# =====================================================
# Passo 3: Importar Workflows via API N8N
# =====================================================

echo "Importando workflows no N8N..."
echo ""

# Workflow 1
echo "Importando Workflow 01 (Resumo Executivo)..."
curl -X POST "$N8N_URL/api/v1/workflows" \
  -H "Content-Type: application/json" \
  -d @"$WORKFLOWS_DIR/01_resumo_executivo_diario.json" \
  2>/dev/null

if [ $? -eq 0 ]; then
    echo "Workflow 01 importado com sucesso!"
else
    echo "Aviso: Workflow 01 pode já estar importado"
fi

echo ""

# Workflow 2
echo "Importando Workflow 02 (Detector Saldo Crítico)..."
curl -X POST "$N8N_URL/api/v1/workflows" \
  -H "Content-Type: application/json" \
  -d @"$WORKFLOWS_DIR/02_detector_saldo_critico_realtime.json" \
  2>/dev/null

if [ $? -eq 0 ]; then
    echo "Workflow 02 importado com sucesso!"
else
    echo "Aviso: Workflow 02 pode já estar importado"
fi

echo ""

# =====================================================
# Passo 4: Verificar Credenciais
# =====================================================

echo "Verificando credenciais necessárias..."
echo ""
echo "Certifique-se de configurar no N8N:"
echo "  1. Supabase (Host + API Keys)"
echo "  2. HTTP Header Auth (WASender)"
echo ""

# =====================================================
# Passo 5: Status Final
# =====================================================

echo "=========================================="
echo "Deploy concluído!"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo "  1. Acesse: $N8N_URL"
echo "  2. Configure credenciais nos workflows"
echo "  3. Ative os workflows"
echo "  4. Teste com trigger manual"
echo ""
echo "Workflows importados:"
echo "  - 01: Resumo Executivo Diário (08:00)"
echo "  - 02: Detector Saldo Crítico (30min)"
echo ""

exit 0

