#!/bin/bash

################################################################################
#                                                                              #
#              🚀 RODAR FRONTEND EM DESENVOLVIMENTO                            #
#                                                                              #
#  Este script inicia o frontend em modo desenvolvimento                       #
#  Uso: ./RUN_FRONTEND.sh                                                     #
#                                                                              #
################################################################################

set -e

# Cores
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="/Users/alceualvespasssosmac/dashfinance"
FRONTEND_DIR="$PROJECT_ROOT/finance-oraculo-frontend"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              🚀 INICIANDO FRONTEND EM DEV MODE 🚀              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Ir pro diretório
cd "$FRONTEND_DIR"

echo -e "${YELLOW}📦 Verificando dependências...${NC}"
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}  Instalando dependências...${NC}"
  npm install --legacy-peer-deps
fi

echo ""
echo -e "${GREEN}✅ Dependências OK${NC}"
echo ""

echo -e "${YELLOW}🔧 Verificando .env.local...${NC}"
if [ ! -f ".env.local" ]; then
  echo -e "${YELLOW}  ⚠️  .env.local não encontrado${NC}"
  echo -e "${YELLOW}  Copiar de .env.example se houver...${NC}"
else
  echo -e "${GREEN}✅ .env.local encontrado${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  🎯 INICIANDO SERVIDOR...                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✨ Frontend rodando em:${NC}"
echo -e "${GREEN}   👉 http://localhost:3000${NC}"
echo ""

echo -e "${YELLOW}📋 Painéis disponíveis:${NC}"
echo "   • /admin/tokens"
echo "   • /relatorios/dre"
echo "   • /relatorios/cashflow"
echo "   • /empresas"
echo "   • /grupos"
echo "   • /relatorios/kpis"
echo "   • /relatorios/payables"
echo "   • /relatorios/receivables"
echo "   • /whatsapp/conversations"
echo "   • /whatsapp/templates"
echo ""

echo -e "${YELLOW}💡 Dicas:${NC}"
echo "   • Pressione Ctrl+C para parar"
echo "   • Alterações em arquivos recarregam automaticamente"
echo "   • Verifique o console para erros"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Iniciar dev server
npm run dev

