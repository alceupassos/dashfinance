#!/bin/bash

# 🧪 Smoke Test - Testar todos os painéis visualmente
# Data: 09 Nov 2025
# Objetivo: Validação básica de renderização e funcionalidade

set -e

FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
TIMEOUT=30

echo "🧪 INICIANDO SMOKE TEST DOS PAINÉIS"
echo "========================================"
echo "URL: $FRONTEND_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de testes
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Função para testar URL
test_panel() {
  local panel_name="$1"
  local url="$2"
  local method="${3:-GET}"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -n "🔍 Testando $panel_name ... "
  
  # Fazer requisição
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time "$TIMEOUT" \
    -X "$method" \
    "$url" \
    -H "User-Agent: SmokeTest/1.0")
  
  # Validar resposta
  if [[ "$http_code" == "200" ]] || [[ "$http_code" == "301" ]] || [[ "$http_code" == "302" ]]; then
    echo -e "${GREEN}✓ OK (HTTP $http_code)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗ FALHA (HTTP $http_code)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# ============================================
# DASHBOARD PRINCIPAL
# ============================================
echo ""
echo -e "${YELLOW}📊 DASHBOARD PRINCIPAL${NC}"
test_panel "Dashboard" "$FRONTEND_URL/dashboard"

# ============================================
# ADMIN - SECURITY PANELS
# ============================================
echo ""
echo -e "${YELLOW}🔒 ADMIN - SECURITY${NC}"
test_panel "Security Overview" "$FRONTEND_URL/admin/security/overview"
test_panel "Active Sessions" "$FRONTEND_URL/admin/security/sessions"
test_panel "Traffic Monitor" "$FRONTEND_URL/admin/security/traffic"
test_panel "Database" "$FRONTEND_URL/admin/security/database"
test_panel "Backups" "$FRONTEND_URL/admin/security/backups"
test_panel "NOC Dashboard" "$FRONTEND_URL/admin/security/noc"

# ============================================
# ADMIN - ANALYTICS
# ============================================
echo ""
echo -e "${YELLOW}📈 ADMIN - ANALYTICS${NC}"
test_panel "User Usage" "$FRONTEND_URL/admin/analytics/user-usage"
test_panel "Mood Index" "$FRONTEND_URL/admin/analytics/mood-index"

# ============================================
# ADMIN - BILLING
# ============================================
echo ""
echo -e "${YELLOW}💰 ADMIN - BILLING${NC}"
test_panel "Plans" "$FRONTEND_URL/admin/billing/plans"
test_panel "Pricing" "$FRONTEND_URL/admin/billing/pricing"
test_panel "Invoices" "$FRONTEND_URL/admin/billing/invoices"
test_panel "Subscriptions" "$FRONTEND_URL/admin/billing/subscriptions"

# ============================================
# ADMIN - N8N & INTEGRATIONS
# ============================================
echo ""
echo -e "${YELLOW}🔧 ADMIN - N8N & INTEGRATIONS${NC}"
test_panel "N8N Monitor" "$FRONTEND_URL/admin/n8n/monitor"
test_panel "N8N Workflows" "$FRONTEND_URL/admin/n8n/workflows"
test_panel "Integration Config" "$FRONTEND_URL/admin/config/integrations"

# ============================================
# ADMIN - OTHER
# ============================================
echo ""
echo -e "${YELLOW}⚙️ ADMIN - OTHER${NC}"
test_panel "API Keys" "$FRONTEND_URL/admin/api-keys"
test_panel "Tokens" "$FRONTEND_URL/admin/tokens"
test_panel "Users" "$FRONTEND_URL/admin/users"
test_panel "Franchises" "$FRONTEND_URL/admin/franchises"
test_panel "LLM Config" "$FRONTEND_URL/admin/llm-config"
test_panel "RAG Search" "$FRONTEND_URL/admin/rag/search"

# ============================================
# ALERTAS
# ============================================
echo ""
echo -e "${YELLOW}🚨 ALERTAS${NC}"
test_panel "Alertas Dashboard" "$FRONTEND_URL/alertas/dashboard"

# ============================================
# FINANCEIRO
# ============================================
echo ""
echo -e "${YELLOW}💳 FINANCEIRO${NC}"
test_panel "Configurações Taxas" "$FRONTEND_URL/financeiro/configuracoes/taxas"
test_panel "Extratos" "$FRONTEND_URL/financeiro/extratos"
test_panel "Sincronizar" "$FRONTEND_URL/financeiro/extratos/sincronizar"

# ============================================
# ANÁLISES
# ============================================
echo ""
echo -e "${YELLOW}📋 ANÁLISES${NC}"
test_panel "Análises" "$FRONTEND_URL/analises"

# ============================================
# RELATÓRIOS (parcialmente completos)
# ============================================
echo ""
echo -e "${YELLOW}📊 RELATÓRIOS${NC}"
test_panel "Relatórios Home" "$FRONTEND_URL/relatorios"
test_panel "KPIs" "$FRONTEND_URL/relatorios/kpis"
test_panel "Cashflow" "$FRONTEND_URL/relatorios/cashflow"

# ============================================
# WHATSAPP
# ============================================
echo ""
echo -e "${YELLOW}💬 WHATSAPP${NC}"
test_panel "Config" "$FRONTEND_URL/whatsapp/config"
test_panel "Conversations" "$FRONTEND_URL/whatsapp/conversations"
test_panel "Scheduled" "$FRONTEND_URL/whatsapp/scheduled"
test_panel "Templates" "$FRONTEND_URL/whatsapp/templates"

# ============================================
# PROFILE
# ============================================
echo ""
echo -e "${YELLOW}👤 PROFILE${NC}"
test_panel "Profile" "$FRONTEND_URL/profile"
test_panel "Notifications" "$FRONTEND_URL/profile/notifications"

# ============================================
# OUTROS
# ============================================
echo ""
echo -e "${YELLOW}🔗 OUTROS${NC}"
test_panel "Grupos" "$FRONTEND_URL/grupos"
test_panel "Clientes" "$FRONTEND_URL/clientes"
test_panel "Config" "$FRONTEND_URL/config"
test_panel "Audit" "$FRONTEND_URL/audit"

# ============================================
# RESUMO
# ============================================
echo ""
echo "========================================"
echo -e "${YELLOW}📊 RESUMO DO SMOKE TEST${NC}"
echo "========================================"
echo -e "Total de painéis: ${TOTAL_TESTS}"
echo -e "${GREEN}Passou: ${PASSED_TESTS}${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}Falhou: ${FAILED_TESTS}${NC}"
else
  echo -e "${GREEN}Falhou: 0${NC}"
fi

# Calcular percentual
if [ $TOTAL_TESTS -gt 0 ]; then
  SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  echo -e "Taxa de sucesso: ${SUCCESS_RATE}%"
fi

echo ""

# Exit code baseado em falhas
if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}❌ SMOKE TEST FALHOU${NC}"
  exit 1
else
  echo -e "${GREEN}✅ SMOKE TEST PASSOU${NC}"
  exit 0
fi

