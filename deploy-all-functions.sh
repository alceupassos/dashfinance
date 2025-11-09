#!/bin/bash

# ==========================================
# DEPLOY AUTOMÁTICO DE EDGE FUNCTIONS
# ==========================================

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    DEPLOY DE EDGE FUNCTIONS           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está no diretório correto
if [ ! -d "finance-oraculo-backend/supabase/functions" ]; then
  echo -e "${RED}❌ Erro: Diretório finance-oraculo-backend/supabase/functions não encontrado${NC}"
  echo "Execute este script do diretório raiz do projeto"
  exit 1
fi

cd finance-oraculo-backend

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
  echo -e "${RED}❌ Erro: Supabase CLI não está instalado${NC}"
  echo "Instale com: brew install supabase/tap/supabase"
  exit 1
fi

# Parse arguments
TIER_FILTER=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --tier)
      TIER_FILTER="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🔍 Modo DRY RUN: nenhum deploy será feito${NC}"
  echo ""
fi

# Contadores
TOTAL=0
SUCCESS=0
FAILED=0

# Função para deploy
deploy_function() {
  local NAME=$1
  local TIER=$2
  
  # Filtrar por tier se especificado
  if [ ! -z "$TIER_FILTER" ] && [ "$TIER" != "$TIER_FILTER" ]; then
    return
  fi
  
  TOTAL=$((TOTAL + 1))
  
  echo -e "${YELLOW}[$TOTAL] Deploying: ${NAME} (TIER ${TIER})${NC}"
  
  if [ "$DRY_RUN" = true ]; then
    echo "    [DRY RUN] Would deploy: supabase functions deploy ${NAME}"
    SUCCESS=$((SUCCESS + 1))
  else
    if supabase functions deploy "${NAME}" --project-ref xzrmzmcoslomtzkzgskn 2>&1; then
      echo -e "    ${GREEN}✓ Deployed successfully${NC}"
      SUCCESS=$((SUCCESS + 1))
    else
      echo -e "    ${RED}✗ Failed to deploy${NC}"
      FAILED=$((FAILED + 1))
    fi
  fi
  
  echo ""
}

# ==========================================
# TIER 1: FUNÇÕES CRÍTICAS
# ==========================================

echo -e "${BLUE}═══ TIER 1: FUNÇÕES CRÍTICAS ═══${NC}"
echo ""

deploy_function "track-user-usage" 1
deploy_function "empresas-list" 1
deploy_function "llm-chat" 1
deploy_function "onboarding-tokens" 1
deploy_function "relatorios-dre" 1
deploy_function "relatorios-cashflow" 1
deploy_function "whatsapp-conversations" 1
deploy_function "whatsapp-send" 1
deploy_function "reconcile-bank" 1
deploy_function "financial-alerts-update" 1

# ==========================================
# TIER 2: FUNÇÕES DE MÉDIA PRIORIDADE
# ==========================================

echo -e "${BLUE}═══ TIER 2: FUNÇÕES DE MÉDIA PRIORIDADE ═══${NC}"
echo ""

deploy_function "mood-index-timeline" 2
deploy_function "usage-details" 2
deploy_function "n8n-status" 2
deploy_function "llm-metrics" 2
deploy_function "rag-search" 2
deploy_function "rag-conversation" 2
deploy_function "import-bank-statement" 2
deploy_function "sync-bank-metadata" 2
deploy_function "group-aliases-create" 2

# ==========================================
# TIER 3: FUNÇÕES DE TESTE/ADMIN
# ==========================================

echo -e "${BLUE}═══ TIER 3: FUNÇÕES DE TESTE/ADMIN ═══${NC}"
echo ""

deploy_function "seed-realistic-data" 3
deploy_function "whatsapp-simulator" 3
deploy_function "full-test-suite" 3
deploy_function "integrations-test" 3

# ==========================================
# RESUMO FINAL
# ==========================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           RESUMO DO DEPLOY             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total de funções:    ${BLUE}${TOTAL}${NC}"
echo -e "  ${GREEN}✓ Sucesso:           ${SUCCESS}${NC}"
echo -e "  ${RED}✗ Falhas:            ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 Todas as funções foram deployadas com sucesso!${NC}"
  echo ""
  echo -e "${YELLOW}💡 Próximos passos:${NC}"
  echo "   1. Teste as funções: ./test-all-edge-functions.sh"
  echo "   2. Configure secrets: supabase secrets set NOME_DA_VAR=valor"
  echo "   3. Acesse o dashboard: https://app.ifin.app.br/admin/mcp-dashboard"
  echo ""
  exit 0
else
  SUCCESS_RATE=$(echo "scale=2; ($SUCCESS * 100) / $TOTAL" | bc)
  echo -e "${YELLOW}⚠️  Taxa de sucesso: ${SUCCESS_RATE}%${NC}"
  echo ""
  echo -e "${YELLOW}💡 Dica: Verifique os erros acima e tente novamente${NC}"
  echo "   - Certifique-se que está logado: supabase login"
  echo "   - Verifique o link do projeto: supabase link --project-ref xzrmzmcoslomtzkzgskn"
  echo ""
  exit 1
fi

