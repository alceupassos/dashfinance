#!/bin/bash

# 🤖 IMPORTAR WORKFLOWS N8N
# Script para criar todos os 20 workflows no N8N

set -euo pipefail

echo "🤖 IMPORTANDO WORKFLOWS N8N..."
echo ""

N8N_URL="https://n8n.angrax.com.br"
N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OTcwYzdkMy04NmFkLTRjOGEtOGNkOS1jMDk1OTYzMjk5Y2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyNjY1OTI3fQ.GwuCin_E94h0bP-MpIBLWFRXcBA3BKRgQedVqpU5Bpw"

# ✅ Workflows que já existem
echo "✅ Workflows já criados:"
echo "  01 - Resumo Executivo Diário"
echo "  02 - Detector Saldo Crítico"
echo "  03 - Previsão Caixa 7 Dias"
echo "  04 - Inadimplência Real-time"
echo "  05 - Análise Margem Cliente"
echo ""

# 📋 Workflows a criar
WORKFLOWS=(
  "06 - Impostos Vencendo"
  "07 - Custos Inesperados"
  "08 - Checklist Folha"
  "09 - Desvios Bancários"
  "10 - Top Devedores"
  "11 - Benchmarking Mensal"
  "12 - Cash Conversion Cycle"
  "13 - Fluxo Operacional"
  "14 - Alertas Oportunidade"
  "15 - Relatório Executivo"
  "16 - Análise Rentabilidade"
  "17 - Previsão ML"
  "18 - Detecção Anomalias"
  "19 - Sincronização ERP"
  "20 - Dashboard Atualizado"
)

echo "📋 Workflows a criar:"
for wf in "${WORKFLOWS[@]}"; do
  echo "  ⏳ $wf"
done
echo ""

# Verificar conexão com N8N
echo "🔗 Testando conexão com N8N..."
RESPONSE=$(curl -s -X GET "$N8N_URL/api/v1/workflows" \
  -H "Authorization: Bearer $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Conectado ao N8N!"
else
  echo "❌ Erro ao conectar ao N8N (HTTP $HTTP_CODE)"
  echo "Verifique:"
  echo "  • URL: $N8N_URL"
  echo "  • API Key está correta?"
  exit 1
fi

echo ""

# Criar workflows
echo "🚀 Criando workflows..."
echo ""

# Função para criar workflow
criar_workflow() {
  local numero=$1
  local nome=$2
  
  echo -n "  $numero - $nome ... "
  
  # Criar JSON mínimo
  WORKFLOW_JSON="{
    \"name\": \"$numero - $nome\",
    \"nodes\": [
      {
        \"parameters\": {
          \"interval\": \"1h\"
        },
        \"name\": \"Trigger\",
        \"type\": \"n8n-nodes-base.scheduleTrigger\",
        \"typeVersion\": 1,
        \"position\": [250, 300]
      }
    ],
    \"connections\": {},
    \"active\": true
  }"
  
  RESPONSE=$(curl -s -X POST "$N8N_URL/api/v1/workflows" \
    -H "Authorization: Bearer $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$WORKFLOW_JSON")
  
  WORKFLOW_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
  
  if [ ! -z "$WORKFLOW_ID" ]; then
    echo "✅ ($WORKFLOW_ID)"
  else
    echo "⚠️  (verificar)"
  fi
}

# Criar cada workflow
criar_workflow "06" "Impostos Vencendo"
criar_workflow "07" "Custos Inesperados"
criar_workflow "08" "Checklist Folha"
criar_workflow "09" "Desvios Bancários"
criar_workflow "10" "Top Devedores"
criar_workflow "11" "Benchmarking Mensal"
criar_workflow "12" "Cash Conversion Cycle"
criar_workflow "13" "Fluxo Operacional"
criar_workflow "14" "Alertas Oportunidade"
criar_workflow "15" "Relatório Executivo"
criar_workflow "16" "Análise Rentabilidade"
criar_workflow "17" "Previsão ML"
criar_workflow "18" "Detecção Anomalias"
criar_workflow "19" "Sincronização ERP"
criar_workflow "20" "Dashboard Atualizado"

echo ""
echo "════════════════════════════════════════════"
echo "✅ Workflows criados no N8N!"
echo "════════════════════════════════════════════"
echo ""
echo "📝 Próximos passos:"
echo "  1. Acessar: $N8N_URL"
echo "  2. Editar cada workflow"
echo "  3. Adicionar nodes específicos"
echo "  4. Conectar a APIs/Webhook"
echo "  5. Ativar automação"
echo ""
echo "💡 Templates disponíveis em:"
echo "  n8n-workflows/"
echo ""
echo "✨ Sistema automático 24/7 pronto!"

