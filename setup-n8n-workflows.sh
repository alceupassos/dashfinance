#!/bin/bash
set -euo pipefail

echo "🚀 Setup N8N Workflows - Finance Oráculo 4.0"
echo "════════════════════════════════════════════════════════════"

# Variáveis
N8N_HOST="${N8N_HOST:-http://localhost:5678}"
N8N_API_KEY="${N8N_API_KEY:-}"
WORKFLOWS_DIR="./n8n-workflows"

echo ""
echo "1️⃣ Verificando conexão com N8N..."
if ! curl -s "$N8N_HOST/api/v1/workflows" -H "X-N8N-API-KEY: $N8N_API_KEY" > /dev/null 2>&1; then
  echo "⚠️  N8N não está acessível em $N8N_HOST"
  echo "   Verifique se N8N está rodando (docker-compose up n8n)"
  exit 1
fi
echo "✅ N8N está acessível"

echo ""
echo "2️⃣ Importando workflows..."

# Função para importar workflow
import_workflow() {
  local workflow_file=$1
  local workflow_name=$(basename "$workflow_file" .json)
  
  echo ""
  echo "   📥 Importando: $workflow_name"
  
  local workflow_json=$(cat "$workflow_file")
  
  # Criar workflow via API
  local response=$(curl -s -X POST "$N8N_HOST/api/v1/workflows" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$workflow_json")
  
  local workflow_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$workflow_id" ]; then
    echo "   ❌ Falha ao importar $workflow_name"
    echo "   Resposta: $response"
    return 1
  fi
  
  echo "   ✅ Importado com ID: $workflow_id"
  
  # Ativar workflow
  curl -s -X PATCH "$N8N_HOST/api/v1/workflows/$workflow_id" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"active": true}' > /dev/null
  
  echo "   🟢 Ativado!"
}

# Importar cada workflow
if [ -d "$WORKFLOWS_DIR" ]; then
  for workflow_file in "$WORKFLOWS_DIR"/*.json; do
    if [ -f "$workflow_file" ]; then
      import_workflow "$workflow_file"
    fi
  done
else
  echo "❌ Diretório $WORKFLOWS_DIR não encontrado"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Workflows Importados com Sucesso!"
echo ""
echo "Workflows Ativados:"
echo "  1. ✅ WhatsApp → Sentiment → RAG Pipeline"
echo "  2. ✅ Cobrança Automática Diária (18:00 UTC)"
echo "  3. ✅ Relatório Diário de Sistema (09:00 UTC)"
echo ""
echo "🔗 Acesse N8N em: $N8N_HOST"
echo "════════════════════════════════════════════════════════════"

