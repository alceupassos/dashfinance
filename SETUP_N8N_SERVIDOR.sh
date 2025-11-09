#!/bin/bash

# =====================================================
# SETUP COMPLETO N8N - SERVIDOR 147
# Execute: bash SETUP_N8N_SERVIDOR.sh
# =====================================================

set -e

echo "Setup N8N - Servidor 147"
echo "=========================="
echo ""

# Diretórios
BASE_DIR="/dashfinance"
N8N_DIR="/root/n8n"
WORKFLOWS_DIR="$BASE_DIR/n8n-workflows"

mkdir -p "$WORKFLOWS_DIR"

# =====================================================
# Passo 1: Verificar Docker
# =====================================================

echo "Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "Docker não instalado!"
    exit 1
fi

docker ps > /dev/null 2>&1 || {
    echo "Docker daemon não está rodando!"
    exit 1
}

echo "Docker OK"
echo ""

# =====================================================
# Passo 2: Verificar N8N
# =====================================================

echo "Verificando N8N..."

if docker ps | grep -q n8n; then
    echo "N8N já está rodando!"
    N8N_STATUS="running"
else
    echo "N8N não está rodando"
    N8N_STATUS="stopped"
    
    # Tentar iniciar
    if [ -f "$N8N_DIR/docker-compose.yml" ]; then
        echo "Iniciando N8N via docker-compose..."
        cd "$N8N_DIR"
        docker-compose up -d
        sleep 10
        
        if docker ps | grep -q n8n; then
            echo "N8N iniciado com sucesso!"
            N8N_STATUS="running"
        else
            echo "Erro ao iniciar N8N"
            exit 1
        fi
    else
        echo "docker-compose.yml não encontrado em $N8N_DIR"
        exit 1
    fi
fi

echo "N8N Status: $N8N_STATUS"
echo ""

# =====================================================
# Passo 3: Testar N8N API
# =====================================================

echo "Testando API N8N..."
N8N_URL="http://localhost:5678"

for i in {1..10}; do
    if curl -s "$N8N_URL/health" > /dev/null 2>&1; then
        echo "N8N API respondendo: $N8N_URL"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "Erro: N8N não está respondendo"
        exit 1
    fi
    echo "Tentativa $i/10..."
    sleep 2
done

echo ""

# =====================================================
# Passo 4: Copiar Workflows
# =====================================================

echo "Copiando workflows..."

# Workflow 1
cat > "$WORKFLOWS_DIR/01_resumo_executivo_diario.json" << 'WORKFLOW1_EOF'
{
  "name": "01 - Resumo Executivo Diário",
  "nodes": [],
  "connections": {},
  "active": false,
  "settings": { "timezone": "America/Sao_Paulo" },
  "versionId": "1"
}
WORKFLOW1_EOF

# Workflow 2
cat > "$WORKFLOWS_DIR/02_detector_saldo_critico_realtime.json" << 'WORKFLOW2_EOF'
{
  "name": "02 - Detector Saldo Crítico (Real-Time)",
  "nodes": [],
  "connections": {},
  "active": false,
  "settings": { "timezone": "America/Sao_Paulo" },
  "versionId": "1"
}
WORKFLOW2_EOF

echo "Workflows copiados para: $WORKFLOWS_DIR"
echo ""

# =====================================================
# Passo 5: Instruções Finais
# =====================================================

echo "=============================================="
echo "Setup concluído!"
echo "=============================================="
echo ""
echo "Próximos passos:"
echo ""
echo "1. Acesse N8N:"
echo "   URL: http://localhost:5678"
echo "   ou: http://n8n.angrax.com.br"
echo ""
echo "2. Configure credenciais:"
echo "   - Settings → Credentials → New"
echo "   - Supabase (Host + Keys)"
echo "   - HTTP Header Auth (WASender)"
echo ""
echo "3. Importe workflows:"
echo "   - Import from File"
echo "   - Selecione JSON de: $WORKFLOWS_DIR"
echo ""
echo "4. Configure nodes:"
echo "   - Cada node precisa de credenciais"
echo "   - Teste com trigger manual"
echo ""
echo "5. Monitore Jessica:"
echo "   - Verifique recebimento no WhatsApp"
echo "   - Confira logs: docker logs n8n"
echo ""

exit 0

