#!/bin/bash

################################################################################
#                                                                              #
#           🔌 TESTAR EDGE FUNCTIONS APIs LOCALMENTE                           #
#                                                                              #
#  Este script testa as 11 Edge Functions deployadas                           #
#  Uso: ./TEST_APIS.sh                                                        #
#                                                                              #
################################################################################

# Variáveis
SUPABASE_URL="https://xzrmzmcoslomtzkzgskn.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           🔌 TESTE DE EDGE FUNCTIONS - APIs 🔌               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

PASSED=0
FAILED=0

test_endpoint() {
  local method=$1
  local endpoint=$2
  local name=$3
  local data=$4
  
  echo -e "${YELLOW}📌 Testando: $name${NC}"
  echo "   Método: $method"
  echo "   URL: ${SUPABASE_URL}/functions/v1/${endpoint}"
  
  if [ "$method" = "GET" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
      "${SUPABASE_URL}/functions/v1/${endpoint}" \
      -H "Authorization: Bearer ${ANON_KEY}" \
      -H "Content-Type: application/json")
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
      "${SUPABASE_URL}/functions/v1/${endpoint}" \
      -H "Authorization: Bearer ${ANON_KEY}" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  echo "   Status: $HTTP_CODE"
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "   ${GREEN}✅ SUCESSO${NC}"
    echo "   Resposta: $(echo "$BODY" | head -c 80)..."
    PASSED=$((PASSED + 1))
  else
    echo -e "   ${RED}❌ FALHA${NC}"
    echo "   Erro: $(echo "$BODY" | head -c 80)"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

################################################################################
# TESTE DAS FUNÇÕES
################################################################################

echo -e "${YELLOW}═════════════════════════════════════════════════════════════════${NC}"
echo "GRUPO 1: RELATÓRIOS E CONFIGURAÇÃO"
echo -e "${YELLOW}═════════════════════════════════════════════════════════════════${NC}"
echo ""

test_endpoint "GET" "onboarding-tokens" "Listar Tokens de Onboarding" ""
test_endpoint "GET" "empresas-list" "Listar Empresas (F360 + OMIE)" ""
test_endpoint "GET" "relatorios-dre" "Relatório DRE" ""
test_endpoint "GET" "relatorios-cashflow" "Relatório Cashflow" ""

echo ""
echo -e "${YELLOW}═════════════════════════════════════════════════════════════════${NC}"
echo "GRUPO 2: KPIs E PAYABLES/RECEIVABLES"
echo -e "${YELLOW}═════════════════════════════════════════════════════════════════${NC}"
echo ""

test_endpoint "GET" "relatorios-kpis" "KPIs Calculados" ""
test_endpoint "GET" "relatorios-payables" "Contas a Pagar" ""
test_endpoint "GET" "relatorios-receivables" "Contas a Receber" ""

echo ""
echo -e "${YELLOW}═════════════════════════════════════════════════════════════════${NC}"
echo "GRUPO 3: WHATSAPP E GERENCIAMENTO"
echo -e "${YELLOW}═════════════════════════════════════════════════════════════════${NC}"
echo ""

test_endpoint "GET" "whatsapp-templates" "Listar Templates WhatsApp" ""
test_endpoint "GET" "whatsapp-conversations" "Listar Conversas WhatsApp" ""
test_endpoint "POST" "group-aliases-create" "Criar Group Alias" '{"group_name":"Test","company_cnpj":"00026888098000"}'

echo ""
echo -e "${YELLOW}═════════════════════════════════════════════════════════════════${NC}"
echo "GRUPO 4: SEED DE DADOS"
echo -e "${YELLOW}═════════════════════════════════════════════════════════════════${NC}"
echo ""

test_endpoint "POST" "seed-realistic-data" "Seed Realistic Data (Minimal)" '{"mode":"minimal","clear_existing":false}'

################################################################################
# RESUMO
################################################################################
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    📊 RESUMO DOS TESTES 📊                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
  RATE=$((PASSED * 100 / TOTAL))
  echo -e "✅ Passaram: ${GREEN}$PASSED${NC}"
  echo -e "❌ Falharam: ${RED}$FAILED${NC}"
  echo -e "📊 Taxa de sucesso: ${YELLOW}${RATE}%${NC}"
else
  echo "Nenhum teste foi executado"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ TODAS AS APIS RESPONDERAM COM SUCESSO!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Algumas APIs tiveram problemas${NC}"
  echo ""
  echo -e "${YELLOW}Dicas para debug:${NC}"
  echo "  • Verifique se a URL do Supabase está correta"
  echo "  • Verifique se o token ANON_KEY é válido"
  echo "  • Verifique a conexão com a internet"
  echo "  • Verifique os logs das Edge Functions no Supabase"
  exit 1
fi

