#!/bin/bash

# =====================================================
# IMPORTAR WORKFLOWS NO N8N via API
# Execute: bash IMPORTER_WORKFLOWS.sh
# =====================================================

set -e

echo "Importador de Workflows N8N"
echo "============================"
echo ""

N8N_URL="${N8N_URL:-http://localhost:5678}"
WORKFLOWS_DIR="${WORKFLOWS_DIR:-/dashfinance/n8n-workflows}"

echo "N8N URL: $N8N_URL"
echo "Workflows Dir: $WORKFLOWS_DIR"
echo ""

# =====================================================
# Verificar N8N está rodando
# =====================================================

echo "Verificando N8N..."
if ! curl -s "$N8N_URL/health" > /dev/null 2>&1; then
    echo "Erro: N8N não está respondendo em $N8N_URL"
    exit 1
fi
echo "N8N ativo!"
echo ""

# =====================================================
# Importar Workflow 1
# =====================================================

echo "Importando Workflow 01 (Resumo Executivo)..."

if [ -f "$WORKFLOWS_DIR/01_resumo_executivo_diario.json" ]; then
    RESPONSE=$(curl -s -X POST "$N8N_URL/api/v1/workflows" \
      -H "Content-Type: application/json" \
      -d @"$WORKFLOWS_DIR/01_resumo_executivo_diario.json")
    
    if echo "$RESPONSE" | grep -q '"id"'; then
        echo "Workflow 01 importado com sucesso!"
        WORKFLOW_ID_01=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        echo "  ID: $WORKFLOW_ID_01"
    else
        echo "Aviso: Workflow 01 pode já estar importado ou erro na importação"
    fi
else
    echo "Erro: Arquivo não encontrado: $WORKFLOWS_DIR/01_resumo_executivo_diario.json"
fi

echo ""

# =====================================================
# Importar Workflow 2
# =====================================================

echo "Importando Workflow 02 (Detector Saldo Crítico)..."

if [ -f "$WORKFLOWS_DIR/02_detector_saldo_critico_realtime.json" ]; then
    RESPONSE=$(curl -s -X POST "$N8N_URL/api/v1/workflows" \
      -H "Content-Type: application/json" \
      -d @"$WORKFLOWS_DIR/02_detector_saldo_critico_realtime.json")
    
    if echo "$RESPONSE" | grep -q '"id"'; then
        echo "Workflow 02 importado com sucesso!"
        WORKFLOW_ID_02=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        echo "  ID: $WORKFLOW_ID_02"
    else
        echo "Aviso: Workflow 02 pode já estar importado ou erro na importação"
    fi
else
    echo "Erro: Arquivo não encontrado: $WORKFLOWS_DIR/02_detector_saldo_critico_realtime.json"
fi

echo ""
echo "============================================"
echo "Importação concluída!"
echo "============================================"
echo ""
echo "Próximos passos:"
echo "1. Acesse: $N8N_URL"
echo "2. Configure credenciais para cada workflow"
echo "3. Teste manualmente antes de ativar"
echo ""

exit 0

