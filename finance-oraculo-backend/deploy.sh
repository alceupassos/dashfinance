#!/bin/bash
set -e

echo "=========================================="
echo "Finance Oráculo Backend - Deploy Script"
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variáveis
PROJECT_REF="xzrmzmcoslomtzkzgskn"

echo -e "${YELLOW}Step 1: Verificando Supabase CLI...${NC}"
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Supabase CLI não encontrado. Instalando...${NC}"
    brew install supabase/tap/supabase
else
    echo -e "${GREEN}✓ Supabase CLI encontrado${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Verificando login...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}Você não está logado. Execute: supabase login${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Login verificado${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Vinculando ao projeto...${NC}"
echo "Tentando vincular ao projeto: $PROJECT_REF"

# Criar arquivo de configuração
cat > .temp_password << EOF
B5b0dcf500@#
EOF

if supabase link --project-ref "$PROJECT_REF" --password "$(cat .temp_password)" 2>&1; then
    echo -e "${GREEN}✓ Projeto vinculado com sucesso${NC}"
    rm .temp_password
else
    echo -e "${RED}Erro ao vincular projeto.${NC}"
    echo ""
    echo "Por favor, vincule manualmente:"
    echo "  supabase link --project-ref $PROJECT_REF"
    rm .temp_password
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Aplicando migração SQL...${NC}"
echo "IMPORTANTE: Execute manualmente no SQL Editor do Supabase:"
echo ""
echo -e "${GREEN}-- Configure a chave KMS primeiro:${NC}"
echo "select set_config('app.kms', 'B5b0dcf500@#', false);"
echo "select set_config('app.service_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzI4NjIzfQ.716RfI9V2Vv3nGcx5rK4epnLddUUdFT3-doegfrXcmk', false);"
echo "select set_config('app.sync_f360_url', 'https://xzrmzmcoslomtzkzgskn.functions.supabase.co/sync-f360', false);"
echo "select set_config('app.sync_omie_url', 'https://xzrmzmcoslomtzkzgskn.functions.supabase.co/sync-omie', false);"
echo ""
echo -e "${GREEN}-- Depois execute o arquivo: migrations/001_bootstrap.sql${NC}"
echo ""
read -p "Pressione ENTER quando terminar de executar a migração SQL..."

echo ""
echo -e "${YELLOW}Step 5: Deploy das Edge Functions...${NC}"

FUNCTIONS=("sync-f360" "sync-omie" "analyze" "export-excel" "upload-dre")

for func in "${FUNCTIONS[@]}"; do
    echo "Deploying $func..."
    if supabase functions deploy "$func" --no-verify-jwt; then
        echo -e "${GREEN}✓ $func deployed${NC}"
    else
        echo -e "${RED}✗ Erro ao fazer deploy de $func${NC}"
    fi
done

echo ""
echo -e "${YELLOW}Step 6: Configurando secrets...${NC}"

# Ler variáveis do .env
source .env

echo "Configurando secrets das Edge Functions..."

supabase secrets set \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY" \
  DATABASE_URL="$DATABASE_URL" \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  KMS_SECRET="$KMS_SECRET" \
  F360_API_BASE="$F360_API_BASE" \
  OMIE_API_BASE="$OMIE_API_BASE"

echo -e "${GREEN}✓ Secrets configurados${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}Deploy concluído com sucesso!${NC}"
echo "=========================================="
echo ""
echo "URLs das Edge Functions:"
echo "  - sync-f360: https://$PROJECT_REF.functions.supabase.co/sync-f360"
echo "  - sync-omie: https://$PROJECT_REF.functions.supabase.co/sync-omie"
echo "  - analyze: https://$PROJECT_REF.functions.supabase.co/analyze"
echo "  - export-excel: https://$PROJECT_REF.functions.supabase.co/export-excel"
echo "  - upload-dre: https://$PROJECT_REF.functions.supabase.co/upload-dre"
echo ""
echo "Próximos passos:"
echo "  1. Teste as funções usando os exemplos no README.md"
echo "  2. Verifique os logs: supabase functions logs <function-name>"
echo "  3. Monitore a saúde: SELECT * FROM v_audit_health;"
echo ""
