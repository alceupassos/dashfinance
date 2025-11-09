#!/bin/bash
# ==========================================
# TESTE COMPLETO DE TODAS EDGE FUNCTIONS
# ==========================================

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TESTE DE EDGE FUNCTIONS - SUPABASE   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Carregar variáveis de ambiente
if [ -f "finance-oraculo-frontend/.env.local" ]; then
  export $(cat finance-oraculo-frontend/.env.local | grep -v '^#' | xargs)
fi

# Configurações
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
FUNCTIONS_URL="${SUPABASE_URL}/functions/v1"

if [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ]; then
  echo -e "${RED}❌ Erro: Variáveis de ambiente não configuradas${NC}"
  echo "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY"
  exit 1
fi

echo -e "${YELLOW}🔗 URL Base: ${FUNCTIONS_URL}${NC}"
echo ""

# Contadores
TOTAL=0
PASSED=0
FAILED=0

# Função auxiliar para testar endpoint
test_function() {
  local NAME=$1
  local METHOD=$2
  local ENDPOINT=$3
  local PAYLOAD=$4
  local DESCRIPTION=$5
  
  TOTAL=$((TOTAL + 1))
  echo -e "${YELLOW}[${TOTAL}] Testando: ${NAME}${NC}"
  echo "    ${DESCRIPTION}"
  
  if [ "$METHOD" = "GET" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" \
      -H "Authorization: Bearer ${ANON_KEY}" \
      -H "Content-Type: application/json" \
      "${FUNCTIONS_URL}/${ENDPOINT}")
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" \
      -X "${METHOD}" \
      -H "Authorization: Bearer ${ANON_KEY}" \
      -H "Content-Type: application/json" \
      -d "${PAYLOAD}" \
      "${FUNCTIONS_URL}/${ENDPOINT}")
  fi
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
    echo -e "    ${GREEN}✓ Status: ${HTTP_CODE}${NC}"
    echo "    Response: $(echo $BODY | jq -c '.' 2>/dev/null || echo $BODY | head -c 100)"
    PASSED=$((PASSED + 1))
  else
    echo -e "    ${RED}✗ Status: ${HTTP_CODE}${NC}"
    echo "    Error: $(echo $BODY | jq -c '.error // .' 2>/dev/null || echo $BODY | head -c 200)"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# ==========================================
# TESTES DAS EDGE FUNCTIONS
# ==========================================

# Datas para testes
TODAY=$(date +%Y-%m-%d)
ONE_MONTH_AGO=$(date -v-30d +%Y-%m-%d 2>/dev/null || date -d "30 days ago" +%Y-%m-%d)

echo -e "${BLUE}═══ NOVAS EDGE FUNCTIONS (RECÉM-CRIADAS) ═══${NC}"
echo ""

# 1. seed-realistic-data
test_function \
  "seed-realistic-data" \
  "POST" \
  "seed-realistic-data" \
  '{"mode":"minimal","clear_existing":false}' \
  "Popula dados realistas de teste"

# 2. whatsapp-simulator
test_function \
  "whatsapp-simulator" \
  "POST" \
  "whatsapp-simulator" \
  '{"action":"generate_test_users","count":5}' \
  "Gera usuários de teste do WhatsApp"

# 3. mood-index-timeline
test_function \
  "mood-index-timeline" \
  "GET" \
  "mood-index-timeline?date_from=${ONE_MONTH_AGO}&date_to=${TODAY}&granularity=daily" \
  "" \
  "Retorna timeline de humor dos clientes"

# 4. usage-details
test_function \
  "usage-details" \
  "GET" \
  "usage-details?date_from=${ONE_MONTH_AGO}&date_to=${TODAY}" \
  "" \
  "Retorna detalhes de uso do sistema"

# 5. full-test-suite
test_function \
  "full-test-suite" \
  "POST" \
  "full-test-suite" \
  '{}' \
  "Executa suite completa de testes"

echo -e "${BLUE}═══ EDGE FUNCTIONS CRÍTICAS EXISTENTES ═══${NC}"
echo ""

# 6. track-user-usage
test_function \
  "track-user-usage" \
  "POST" \
  "track-user-usage" \
  '{"user_id":"test-user","session_start":"'${TODAY}'T10:00:00Z","session_end":"'${TODAY}'T11:00:00Z","pages_visited":["/dashboard"],"features_used":["dashboard"]}' \
  "Registra uso do sistema"

# 7. llm-chat
test_function \
  "llm-chat" \
  "POST" \
  "llm-chat" \
  '{"message":"Olá, teste","company_cnpj":"11111111000101"}' \
  "Chat com LLM"

# 8. empresas-list
test_function \
  "empresas-list" \
  "GET" \
  "empresas-list" \
  "" \
  "Lista empresas disponíveis"

# 9. onboarding-tokens
test_function \
  "onboarding-tokens" \
  "GET" \
  "onboarding-tokens" \
  "" \
  "Lista tokens de onboarding"

# 10. relatorios-dre
test_function \
  "relatorios-dre" \
  "GET" \
  "relatorios-dre?company_cnpj=11111111000101&month=2025-10" \
  "" \
  "Relatório DRE"

# 11. relatorios-cashflow
test_function \
  "relatorios-cashflow" \
  "GET" \
  "relatorios-cashflow?company_cnpj=11111111000101&start_date=${ONE_MONTH_AGO}&end_date=${TODAY}" \
  "" \
  "Relatório de fluxo de caixa"

# 12. n8n-status
test_function \
  "n8n-status" \
  "GET" \
  "n8n-status" \
  "" \
  "Status das automações N8N"

# 13. whatsapp-conversations
test_function \
  "whatsapp-conversations" \
  "GET" \
  "whatsapp-conversations?company_cnpj=11111111000101" \
  "" \
  "Lista conversas do WhatsApp"

# 14. whatsapp-send
test_function \
  "whatsapp-send" \
  "POST" \
  "whatsapp-send" \
  '{"phone":"5511999999999","message":"Teste","company_cnpj":"11111111000101"}' \
  "Envia mensagem WhatsApp"

# 15. mood-index-timeline/[phone]
test_function \
  "mood-index-detail" \
  "GET" \
  "mood-index-timeline?phone=5511999999999&date_from=${ONE_MONTH_AGO}&date_to=${TODAY}" \
  "" \
  "Humor por telefone específico"

echo -e "${BLUE}═══ EDGE FUNCTIONS ADMINISTRATIVAS ═══${NC}"
echo ""

# 16. llm-metrics
test_function \
  "llm-metrics" \
  "GET" \
  "llm-metrics?date_from=${ONE_MONTH_AGO}&date_to=${TODAY}" \
  "" \
  "Métricas de uso do LLM"

# 17. rag-search
test_function \
  "rag-search" \
  "POST" \
  "rag-search" \
  '{"query":"teste","company_cnpj":"11111111000101"}' \
  "Busca no RAG"

# 18. rag-conversation
test_function \
  "rag-conversation" \
  "POST" \
  "rag-conversation" \
  '{"message":"Como está meu extrato?","company_cnpj":"11111111000101"}' \
  "Conversa com RAG"

# 19. import-bank-statement
test_function \
  "import-bank-statement" \
  "POST" \
  "import-bank-statement" \
  '{"company_cnpj":"11111111000101","source":"manual","transactions":[]}' \
  "Importa extrato bancário"

# 20. reconcile-bank
test_function \
  "reconcile-bank" \
  "POST" \
  "reconcile-bank" \
  '{"company_cnpj":"11111111000101","month":"2025-10"}' \
  "Reconcilia extrato bancário"

echo -e "${BLUE}═══ EDGE FUNCTIONS DE SEGURANÇA ═══${NC}"
echo ""

# 21. sync-bank-metadata
test_function \
  "sync-bank-metadata" \
  "POST" \
  "sync-bank-metadata" \
  '{"company_cnpj":"11111111000101"}' \
  "Sincroniza metadados bancários"

# 22. financial-alerts-update
test_function \
  "financial-alerts-update" \
  "POST" \
  "financial-alerts-update" \
  '{"alert_id":"test-alert","status":"acknowledged"}' \
  "Atualiza status de alerta"

# 23. group-aliases-create
test_function \
  "group-aliases-create" \
  "POST" \
  "group-aliases-create" \
  '{"group_name":"Teste","company_cnpj":"11111111000101","aliases":["teste1"]}' \
  "Cria aliases de grupo"

# 24. integrations-test
test_function \
  "integrations-test" \
  "POST" \
  "integrations-test" \
  '{"integration":"f360","company_cnpj":"11111111000101"}' \
  "Testa integrações"

# ==========================================
# RESUMO FINAL
# ==========================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           RESUMO DOS TESTES            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total de testes:     ${BLUE}${TOTAL}${NC}"
echo -e "  ${GREEN}✓ Passaram:          ${PASSED}${NC}"
echo -e "  ${RED}✗ Falharam:          ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 Todos os testes passaram!${NC}"
  echo ""
  exit 0
else
  SUCCESS_RATE=$(echo "scale=2; ($PASSED * 100) / $TOTAL" | bc)
  echo -e "${YELLOW}⚠️  Taxa de sucesso: ${SUCCESS_RATE}%${NC}"
  echo ""
  echo -e "${YELLOW}💡 Dica: Algumas funções podem precisar de deploy no Supabase${NC}"
  echo -e "${YELLOW}   Use o comando: supabase functions deploy <nome-funcao>${NC}"
  echo ""
  exit 1
fi

