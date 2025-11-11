#!/bin/bash
# Script: Configurar Chave de Criptografia F360
# Descrição: Gera e configura chave app.encryption_key no Supabase

set -euo pipefail

echo "🔐 Configuração de Chave de Criptografia F360"
echo "=============================================="
echo ""

PROJECT_REF="xzrmzmcoslomtzkzgskn"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 ETAPA 1: Gerar Nova Chave Segura"
echo "-----------------------------------"

# Gerar chave de 32 bytes (256 bits)
NEW_KEY=$(openssl rand -base64 32)

echo -e "${GREEN}✅ Chave gerada com sucesso${NC}"
echo "   Chave: ${NEW_KEY:0:20}..." # Mostra apenas primeiros 20 chars
echo ""

echo "📋 ETAPA 2: Configurar no Supabase"
echo "----------------------------------"
echo ""
echo "Execute o seguinte comando:"
echo ""
echo -e "${YELLOW}supabase secrets set app.encryption_key='$NEW_KEY' --project-ref $PROJECT_REF${NC}"
echo ""
echo "Ou configure manualmente no Dashboard:"
echo "1. Acesse: https://supabase.com/dashboard/project/$PROJECT_REF/settings/vault"
echo "2. Clique em 'New Secret'"
echo "3. Name: app.encryption_key"
echo "4. Secret: $NEW_KEY"
echo "5. Salvar"
echo ""

read -p "Pressione ENTER após configurar a chave..."

echo ""
echo "📋 ETAPA 3: Validar Configuração"
echo "--------------------------------"

PSQL_CMD="PGPASSWORD='B5b0dcf500@#' /opt/homebrew/opt/postgresql@15/bin/psql \
  -h db.${PROJECT_REF}.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -t -A"

CURRENT_KEY=$($PSQL_CMD -c "SELECT current_setting('app.encryption_key', true);")

if [ -z "$CURRENT_KEY" ] || [ "$CURRENT_KEY" == "NULL" ]; then
  echo -e "${RED}❌ Chave NÃO foi configurada corretamente${NC}"
  echo "   Verifique se executou o comando acima"
  exit 1
fi

echo -e "${GREEN}✅ Chave configurada com sucesso${NC}"
echo "   Chave atual: ${CURRENT_KEY:0:20}..."
echo ""

echo "📋 ETAPA 4: Salvar Chave Localmente (Backup)"
echo "--------------------------------------------"

echo "$NEW_KEY" > .encryption_key_backup
chmod 600 .encryption_key_backup

echo -e "${GREEN}✅ Chave salva em: .encryption_key_backup${NC}"
echo -e "${YELLOW}⚠️  IMPORTANTE: Guarde esta chave em local seguro!${NC}"
echo ""

echo "=============================================="
echo -e "${GREEN}✅ CONFIGURAÇÃO CONCLUÍDA${NC}"
echo "=============================================="
echo ""
echo "Próximos passos:"
echo "1. Re-criptografar tokens existentes (SQL)"
echo "2. Executar script 02-update-volpe-group.sql"
echo ""
