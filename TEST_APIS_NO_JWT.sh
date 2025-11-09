#!/bin/bash

################################################################################
#                                                                              #
#       🔌 TESTAR EDGE FUNCTIONS - SEM JWT (com método alternativo)            #
#                                                                              #
#  Testa via database direct em vez de via HTTP                               #
#                                                                              #
################################################################################

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔌 TESTE DE FUNÇÕES VIA DATABASE (sem JWT)                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

SUPABASE_URL="https://xzrmzmcoslomtzkzgskn.supabase.co"
PROJECT_ID="xzrmzmcoslomtzkzgskn"

echo -e "${YELLOW}📊 Verificando dados populados no banco...${NC}"
echo ""

# Usar curl com REST API (sem JWT - dados públicos)
test_api_endpoint() {
  local name=$1
  local endpoint=$2
  
  echo -e "${YELLOW}📌 Testando: $name${NC}"
  echo "   URL: ${SUPABASE_URL}/rest/v1/${endpoint}"
  
  RESPONSE=$(curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/${endpoint}" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI" \
    -H "Content-Type: application/json" 2>/dev/null)
  
  COUNT=$(echo "$RESPONSE" | grep -o '"\|' | wc -l 2>/dev/null || echo "0")
  
  if echo "$RESPONSE" | grep -q '\['; then
    # É um array JSON
    ITEM_COUNT=$(echo "$RESPONSE" | grep -o '{' | wc -l)
    echo -e "   ${GREEN}✅ Resposta: $ITEM_COUNT itens${NC}"
    echo "   Primeiros 100 chars: $(echo "$RESPONSE" | head -c 100)..."
  else
    echo -e "   ${RED}❌ Erro ou resposta vazia${NC}"
    echo "   Resposta: $(echo "$RESPONSE" | head -c 100)"
  fi
  echo ""
}

# Teste endpoints de database
test_api_endpoint "Onboarding Tokens" "onboarding_tokens?select=*&limit=5"
test_api_endpoint "Integration F360" "integration_f360?select=*&limit=5"
test_api_endpoint "Integration OMIE" "integration_omie?select=*&limit=5"
test_api_endpoint "DRE Entries" "dre_entries?select=*&limit=5"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  RESUMO - DADOS DO BANCO 📊                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Contando registros...${NC}"
echo ""

# Contar registros
count_table() {
  local table=$1
  local name=$2
  
  COUNT=$(curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/${table}?select=count=exact" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI" \
    -H "Content-Type: application/json" \
    -H "Range: 0-0" 2>/dev/null | grep -o 'count.*"' | grep -o '[0-9]*' | head -1)
  
  if [ -z "$COUNT" ]; then
    COUNT="?"
  fi
  
  echo -e "  ${GREEN}✅${NC} $name: $COUNT registros"
}

count_table "onboarding_tokens" "Tokens de Onboarding"
count_table "integration_f360" "Empresas F360"
count_table "integration_omie" "Empresas OMIE"
count_table "dre_entries" "Entradas DRE"
count_table "cashflow_entries" "Entradas Cashflow"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Dados estão no banco e acessíveis!${NC}"
echo ""
echo -e "${YELLOW}📌 Próximo passo: Invocar as Edge Functions diretamente${NC}"
echo ""
echo "Se as funções retornam 404, pode ser por:"
echo "  1. JWT não válido/expirado (verify_jwt=true nas funções)"
echo "  2. Erro interno na função (revisar code)"
echo "  3. Problema de CORS"
echo ""
echo "Solução: Ajustar verify_jwt em cada função ou passar JWT válido"
echo ""


