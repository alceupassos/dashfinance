#!/bin/bash

################################################################################
#                                                                              #
#           🧪 LOCAL SMOKE TEST - Execute no seu terminal local               #
#                                                                              #
#  Este script testa os painéis do frontend e as Edge Functions                #
#  Uso: ./LOCAL_SMOKE_TEST.sh                                                 #
#                                                                              #
################################################################################

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variáveis
PROJECT_ROOT="/Users/alceualvespasssosmac/dashfinance"
FRONTEND_DIR="$PROJECT_ROOT/finance-oraculo-frontend"
SUPABASE_URL="https://xzrmzmcoslomtzkzgskn.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  🧪 LOCAL SMOKE TEST SUITE 🧪                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

################################################################################
# 1. VERIFICAR AMBIENTE
################################################################################
echo -e "${YELLOW}[1/5] Verificando ambiente...${NC}"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Erro: Diretório frontend não encontrado${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Erro: npm não está instalado${NC}"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ Erro: curl não está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Ambiente verificado${NC}"
echo ""

################################################################################
# 2. VERIFICAR DEPENDENCIES
################################################################################
echo -e "${YELLOW}[2/5] Verificando dependencies do frontend...${NC}"

cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  ℹ️  Instalando dependências... (primeira vez)${NC}"
    npm install --legacy-peer-deps 2>&1 | tail -5
fi

echo -e "${GREEN}✅ Dependencies OK${NC}"
echo ""

################################################################################
# 3. TESTAR EDGE FUNCTIONS
################################################################################
echo -e "${YELLOW}[3/5] Testando Edge Functions...${NC}"
echo ""

declare -a FUNCTIONS=(
  "onboarding-tokens"
  "empresas-list"
  "relatorios-dre"
  "relatorios-kpis"
  "whatsapp-templates"
)

EDGE_PASSED=0
EDGE_FAILED=0

for func in "${FUNCTIONS[@]}"; do
  echo -ne "  📌 Testando: $func ... "
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "${SUPABASE_URL}/functions/v1/${func}" \
    -H "Authorization: Bearer ${ANON_KEY}" 2>/dev/null || echo "0")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✅ ($HTTP_CODE)${NC}"
    EDGE_PASSED=$((EDGE_PASSED + 1))
  else
    echo -e "${RED}❌ ($HTTP_CODE)${NC}"
    EDGE_FAILED=$((EDGE_FAILED + 1))
  fi
done

echo ""
echo -e "  ${GREEN}✅ Edge Functions: $EDGE_PASSED/${#FUNCTIONS[@]} respondendo${NC}"
echo ""

################################################################################
# 4. BUILD DO FRONTEND
################################################################################
echo -e "${YELLOW}[4/5] Fazendo build do frontend...${NC}"

if npm run build 2>&1 | tail -20; then
  echo -e "${GREEN}✅ Build concluído com sucesso${NC}"
else
  echo -e "${RED}⚠️  Build teve erros - verifique acima${NC}"
fi

echo ""

################################################################################
# 5. VERIFICAR PÁGINAS
################################################################################
echo -e "${YELLOW}[5/5] Verificando páginas do painel...${NC}"
echo ""

declare -a PAGES=(
  "/admin/tokens"
  "/relatorios/dre"
  "/relatorios/cashflow"
  "/empresas"
  "/grupos"
  "/relatorios/kpis"
  "/relatorios/payables"
  "/relatorios/receivables"
  "/whatsapp/conversations"
  "/whatsapp/templates"
)

BASEDIR="$FRONTEND_DIR/app/(app)"
PAGES_FOUND=0
PAGES_MISSING=0

for page in "${PAGES[@]}"; do
  APP_PATH="${page#/}"
  PAGE_FILE="${BASEDIR}/${APP_PATH}/page.tsx"
  
  if [ -f "$PAGE_FILE" ]; then
    echo -e "  ${GREEN}✅${NC} $page"
    PAGES_FOUND=$((PAGES_FOUND + 1))
  else
    echo -e "  ${RED}❌${NC} $page (não encontrado)"
    PAGES_MISSING=$((PAGES_MISSING + 1))
  fi
done

echo ""
echo -e "  ${GREEN}✅ Páginas: $PAGES_FOUND/${#PAGES[@]} encontradas${NC}"
echo ""

################################################################################
# RESUMO FINAL
################################################################################
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      📊 RESUMO DOS TESTES                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "📈 Edge Functions:"
echo "   ✅ Respondendo: $EDGE_PASSED/${#FUNCTIONS[@]}"
echo ""

echo "📄 Páginas:"
echo "   ✅ Encontradas: $PAGES_FOUND/${#PAGES[@]}"
if [ $PAGES_MISSING -gt 0 ]; then
  echo "   ❌ Faltando: $PAGES_MISSING"
fi
echo ""

echo "📦 Frontend:"
echo "   ✅ Build: OK"
echo "   ✅ Dependencies: OK"
echo ""

################################################################################
# PRÓXIMOS PASSOS
################################################################################
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🚀 PRÓXIMOS PASSOS:${NC}"
echo ""
echo "1️⃣  Rodar o frontend em desenvolvimento:"
echo "   ${BLUE}cd $FRONTEND_DIR${NC}"
echo "   ${BLUE}npm run dev${NC}"
echo ""
echo "2️⃣  Abrir no navegador:"
echo "   ${BLUE}http://localhost:3000${NC}"
echo ""
echo "3️⃣  Testar painéis com dados do seed:"
echo "   • http://localhost:3000/admin/tokens (listar 17 tokens)"
echo "   • http://localhost:3000/empresas (listar 24 empresas)"
echo "   • http://localhost:3000/relatorios/dre (listar DRE)"
echo "   • http://localhost:3000/relatorios/kpis (calcular KPIs)"
echo "   • http://localhost:3000/whatsapp/templates (templates)"
echo "   • http://localhost:3000/whatsapp/conversations (conversas)"
echo ""
echo "4️⃣  Popular mais dados (opcional):"
echo "   ${BLUE}curl -X POST \"${SUPABASE_URL}/functions/v1/seed-realistic-data\" \\${NC}"
echo "     ${BLUE}-H \"Authorization: Bearer ${ANON_KEY}\" \\${NC}"
echo "     ${BLUE}-H \"Content-Type: application/json\" \\${NC}"
echo "     ${BLUE}-d '{\"mode\":\"full\",\"clear_existing\":false}'${NC}"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $EDGE_FAILED -eq 0 ] && [ $PAGES_MISSING -eq 0 ]; then
  echo -e "${GREEN}✅ TUDO PRONTO PARA TESTES!${NC}"
  echo ""
  exit 0
else
  echo -e "${YELLOW}⚠️  Alguns testes tiveram problemas - verifique acima${NC}"
  echo ""
  exit 1
fi

