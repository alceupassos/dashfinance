#!/bin/bash
# ==========================================
# TESTE COMPLETO DE TODAS EDGE FUNCTIONS
# Com suporte a TIERS, output JSON e armazenamento
# ==========================================

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
OUTPUT_FORMAT="console"  # console ou json
TIER_FILTER=""           # 1, 2, 3, ou vazio (todos)
SAVE_RESULTS=false       # armazenar no Supabase?

while [[ $# -gt 0 ]]; do
  case $1 in
    --output)
      OUTPUT_FORMAT="$2"
      shift 2
      ;;
    --tier)
      TIER_FILTER="$2"
      shift 2
      ;;
    --save)
      SAVE_RESULTS=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

if [ "$OUTPUT_FORMAT" != "console" ]; then
  set +e
fi

# Carregar variáveis de ambiente
if [ -f "finance-oraculo-frontend/.env.local" ]; then
  export $(cat finance-oraculo-frontend/.env.local | grep -v '^#' | xargs)
fi

# Configurações
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
FUNCTIONS_URL="${SUPABASE_URL}/functions/v1"

if [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ]; then
  if [ "$OUTPUT_FORMAT" = "json" ]; then
    echo '{"error":"Variáveis de ambiente não configuradas","code":"ENV_MISSING"}'
  else
    echo -e "${RED}❌ Erro: Variáveis de ambiente não configuradas${NC}"
    echo "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY"
  fi
  exit 1
fi

if [ "$OUTPUT_FORMAT" = "console" ]; then
  echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  TESTE DE EDGE FUNCTIONS - SUPABASE   ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${YELLOW}🔗 URL Base: ${FUNCTIONS_URL}${NC}"
  if [ ! -z "$TIER_FILTER" ]; then
    echo -e "${YELLOW}🎯 Tier Filter: TIER ${TIER_FILTER}${NC}"
  fi
  echo ""
fi

# Contadores
TOTAL=0
PASSED=0
FAILED=0
RESULTS_JSON="[]"

# Função auxiliar para testar endpoint
test_function() {
  local NAME=$1
  local METHOD=$2
  local ENDPOINT=$3
  local PAYLOAD=$4
  local DESCRIPTION=$5
  local TIER=$6
  
  # Filtrar por tier se especificado
  if [ ! -z "$TIER_FILTER" ] && [ "$TIER" != "$TIER_FILTER" ]; then
    return
  fi
  
  TOTAL=$((TOTAL + 1))
  
  if [ "$OUTPUT_FORMAT" = "console" ]; then
    echo -e "${YELLOW}[${TOTAL}] Testando: ${NAME} (TIER ${TIER})${NC}"
    echo "    ${DESCRIPTION}"
  fi
  
  # Medir latência
  START_TIME=$(date +%s%N)
  
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
  
  END_TIME=$(date +%s%N)
  RESPONSE_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  IS_SUCCESS=false
  ERROR_MSG=""
  
  if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
    IS_SUCCESS=true
    if [ "$OUTPUT_FORMAT" = "console" ]; then
      echo -e "    ${GREEN}✓ Status: ${HTTP_CODE} | ⏱ ${RESPONSE_TIME_MS}ms${NC}"
      echo "    Response: $(echo $BODY | jq -c '.' 2>/dev/null || echo $BODY | head -c 100)"
    fi
    PASSED=$((PASSED + 1))
  else
    if [ "$OUTPUT_FORMAT" = "console" ]; then
      echo -e "    ${RED}✗ Status: ${HTTP_CODE} | ⏱ ${RESPONSE_TIME_MS}ms${NC}"
      ERROR_MSG=$(echo $BODY | jq -c '.error // .' 2>/dev/null || echo $BODY | head -c 200)
      echo "    Error: ${ERROR_MSG}"
    fi
    FAILED=$((FAILED + 1))
  fi
  
  if [ "$OUTPUT_FORMAT" = "console" ]; then
    echo ""
  fi
  
   # Adicionar ao JSON (escapar aspas duplas no error_msg)
   ERROR_MSG_ESCAPED=$(echo "$ERROR_MSG" | sed 's/"/\\"/g' | sed "s/'/\\'/g")
   RESULT=$(cat <<EOF
 {
   "name": "${NAME}",
   "tier": ${TIER},
   "method": "${METHOD}",
   "endpoint": "${ENDPOINT}",
   "http_status": ${HTTP_CODE},
   "response_time_ms": ${RESPONSE_TIME_MS},
   "is_success": ${IS_SUCCESS},
   "error_message": "${ERROR_MSG_ESCAPED}",
   "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
 }
EOF
)
   
   RESULTS_JSON=$(echo "$RESULTS_JSON" | jq -c ". += [${RESULT}]" 2>/dev/null || echo "$RESULTS_JSON")
}

# ==========================================
# TESTES DAS EDGE FUNCTIONS
# ==========================================

# Datas para testes
TODAY=$(date +%Y-%m-%d)
ONE_MONTH_AGO=$(date -v-30d +%Y-%m-%d 2>/dev/null || date -d "30 days ago" +%Y-%m-%d)

echo -e "${BLUE}═══ NOVAS EDGE FUNCTIONS (RECÉM-CRIADAS) ═══${NC}"
echo ""

# TIER 3: TESTES / ADMIN
# 1. seed-realistic-data
test_function \
  "seed-realistic-data" \
  "POST" \
  "seed-realistic-data" \
  '{"mode":"minimal","clear_existing":false}' \
  "Popula dados realistas de teste" \
  3

# 2. whatsapp-simulator
test_function \
  "whatsapp-simulator" \
  "POST" \
  "whatsapp-simulator" \
  '{"action":"generate_test_users","count":5}' \
  "Gera usuários de teste do WhatsApp" \
  3

# 3. mood-index-timeline
test_function \
  "mood-index-timeline" \
  "GET" \
  "mood-index-timeline?date_from=${ONE_MONTH_AGO}&date_to=${TODAY}&granularity=daily" \
  "" \
  "Retorna timeline de humor dos clientes" \
  2

# 4. usage-details
test_function \
  "usage-details" \
  "GET" \
  "usage-details?date_from=${ONE_MONTH_AGO}&date_to=${TODAY}" \
  "" \
  "Retorna detalhes de uso do sistema" \
  2

# 5. full-test-suite
test_function \
  "full-test-suite" \
  "POST" \
  "full-test-suite" \
  '{}' \
  "Executa suite completa de testes" \
  3

echo -e "${BLUE}═══ TIER 1: EDGE FUNCTIONS CRÍTICAS ═══${NC}"
echo ""

# TIER 1: CRITICAL
# 6. track-user-usage
test_function \
  "track-user-usage" \
  "POST" \
  "track-user-usage" \
  '{"user_id":"test-user","session_start":"'${TODAY}'T10:00:00Z","session_end":"'${TODAY}'T11:00:00Z","pages_visited":["/dashboard"],"features_used":["dashboard"]}' \
  "Registra uso do sistema" \
  1

# 8. empresas-list (moved before llm-chat as dependency)
test_function \
  "empresas-list" \
  "GET" \
  "empresas-list" \
  "" \
  "Lista empresas disponíveis" \
  1

# 7. llm-chat
test_function \
  "llm-chat" \
  "POST" \
  "llm-chat" \
  '{"message":"Olá, teste","company_cnpj":"11111111000101"}' \
  "Chat com LLM" \
  2

# 9. onboarding-tokens
test_function \
  "onboarding-tokens" \
  "GET" \
  "onboarding-tokens" \
  "" \
  "Lista tokens de onboarding" \
  1

# 10. relatorios-dre
test_function \
  "relatorios-dre" \
  "GET" \
  "relatorios-dre?company_cnpj=11111111000101&month=2025-10" \
  "" \
  "Relatório DRE" \
  1

# 11. relatorios-cashflow
test_function \
  "relatorios-cashflow" \
  "GET" \
  "relatorios-cashflow?company_cnpj=11111111000101&start_date=${ONE_MONTH_AGO}&end_date=${TODAY}" \
  "" \
  "Relatório de fluxo de caixa" \
  1

# 12. n8n-status
test_function \
  "n8n-status" \
  "GET" \
  "n8n-status" \
  "" \
  "Status das automações N8N" \
  2

# 13. whatsapp-conversations
test_function \
  "whatsapp-conversations" \
  "GET" \
  "whatsapp-conversations?company_cnpj=11111111000101" \
  "" \
  "Lista conversas do WhatsApp" \
  1

# 14. whatsapp-send
test_function \
  "whatsapp-send" \
  "POST" \
  "whatsapp-send" \
  '{"phone":"5511999999999","message":"Teste","company_cnpj":"11111111000101"}' \
  "Envia mensagem WhatsApp" \
  1

# 15. mood-index-detail
test_function \
  "mood-index-detail" \
  "GET" \
  "mood-index-timeline?phone=5511999999999&date_from=${ONE_MONTH_AGO}&date_to=${TODAY}" \
  "" \
  "Humor por telefone específico" \
  2

echo -e "${BLUE}═══ TIER 2: EDGE FUNCTIONS MEDIUM PRIORITY ═══${NC}"
echo ""

# TIER 2: MEDIUM
# 16. llm-metrics
test_function \
  "llm-metrics" \
  "GET" \
  "llm-metrics?date_from=${ONE_MONTH_AGO}&date_to=${TODAY}" \
  "" \
  "Métricas de uso do LLM" \
  2

# 17. rag-search
test_function \
  "rag-search" \
  "POST" \
  "rag-search" \
  '{"query":"teste","company_cnpj":"11111111000101"}' \
  "Busca no RAG" \
  2

# 18. rag-conversation
test_function \
  "rag-conversation" \
  "POST" \
  "rag-conversation" \
  '{"message":"Como está meu extrato?","company_cnpj":"11111111000101"}' \
  "Conversa com RAG" \
  2

# 19. import-bank-statement
test_function \
  "import-bank-statement" \
  "POST" \
  "import-bank-statement" \
  '{"company_cnpj":"11111111000101","source":"manual","transactions":[]}' \
  "Importa extrato bancário" \
  2

# 20. reconcile-bank
test_function \
  "reconcile-bank" \
  "POST" \
  "reconcile-bank" \
  '{"company_cnpj":"11111111000101","month":"2025-10"}' \
  "Reconcilia extrato bancário" \
  1

echo -e "${BLUE}═══ TIER 1 & 2: REMAINING FUNCTIONS ═══${NC}"
echo ""

# 21. sync-bank-metadata
test_function \
  "sync-bank-metadata" \
  "POST" \
  "sync-bank-metadata" \
  '{"company_cnpj":"11111111000101"}' \
  "Sincroniza metadados bancários" \
  2

# 22. financial-alerts-update
test_function \
  "financial-alerts-update" \
  "POST" \
  "financial-alerts-update" \
  '{"alert_id":"test-alert","status":"acknowledged"}' \
  "Atualiza status de alerta" \
  1

# 23. group-aliases-create
test_function \
  "group-aliases-create" \
  "POST" \
  "group-aliases-create" \
  '{"group_name":"Teste","company_cnpj":"11111111000101","aliases":["teste1"]}' \
  "Cria aliases de grupo" \
  2

# 24. integrations-test
test_function \
  "integrations-test" \
  "POST" \
  "integrations-test" \
  '{"integration":"f360","company_cnpj":"11111111000101"}' \
  "Testa integrações" \
  3

# ==========================================
# RESUMO FINAL
# ==========================================

if [ "$OUTPUT_FORMAT" = "json" ]; then
  # Output JSON with summary
  SUCCESS_RATE=$(echo "scale=2; ($PASSED * 100) / $TOTAL" | bc 2>/dev/null || echo 0)
  SUMMARY=$(cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total": ${TOTAL},
  "passed": ${PASSED},
  "failed": ${FAILED},
  "success_rate": ${SUCCESS_RATE},
  "tier_filter": "${TIER_FILTER:-all}",
  "results": ${RESULTS_JSON}
}
EOF
)
  echo "$SUMMARY"
  
  if [ $FAILED -eq 0 ]; then
    exit 0
  else
    exit 1
  fi
else
  # Console output
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
fi

