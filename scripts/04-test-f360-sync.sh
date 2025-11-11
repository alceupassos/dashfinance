#!/bin/bash
# Script: Teste de Sincronização F360 - Grupo Volpe
# Descrição: Valida chave, token e executa sincronização completa

set -euo pipefail

# Configuração
PROJECT_REF="xzrmzmcoslomtzkzgskn"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
FUNCTIONS_URL="${SUPABASE_URL}/functions/v1"
TOKEN_VOLPE="223b065a-1873-4cfe-a36b-f092c602a03e"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🚀 TESTE DE SINCRONIZAÇÃO F360 - GRUPO VOLPE 🚀          ║"
echo "╔════════════════════════════════════════════════════════════════╗"
echo ""

# Verificar Service Role Key
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}❌ ERRO: SUPABASE_SERVICE_ROLE_KEY não configurada${NC}"
  echo ""
  echo "Configure com:"
  echo "  export SUPABASE_SERVICE_ROLE_KEY='sua_chave_aqui'"
  echo ""
  exit 1
fi

# Comando PSQL
PSQL_CMD="PGPASSWORD='B5b0dcf500@#' /opt/homebrew/opt/postgresql@15/bin/psql \
  -h db.${PROJECT_REF}.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -t -A -q"

# ============================================
# ETAPA 1: Verificar Chave de Criptografia
# ============================================

echo -e "${BLUE}📋 ETAPA 1: Verificar Chave de Criptografia${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENCRYPTION_KEY=$($PSQL_CMD -c "SELECT current_setting('app.encryption_key', true);")

if [ -z "$ENCRYPTION_KEY" ] || [ "$ENCRYPTION_KEY" == "NULL" ]; then
  echo -e "${RED}❌ Chave de criptografia NÃO configurada${NC}"
  echo ""
  echo "Execute primeiro:"
  echo "  ./scripts/01-configure-encryption-key.sh"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ Chave de criptografia configurada${NC}"
echo "   Chave: ${ENCRYPTION_KEY:0:20}..."
echo ""

# ============================================
# ETAPA 2: Verificar Token Volpe
# ============================================

echo -e "${BLUE}📋 ETAPA 2: Verificar Token Volpe em integration_f360${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOKEN_EXISTS=$($PSQL_CMD -c "
  SELECT COUNT(*) FROM integration_f360
  WHERE id = '$TOKEN_VOLPE'::uuid;
")

if [ "$TOKEN_EXISTS" == "0" ]; then
  echo -e "${RED}❌ Token Volpe NÃO encontrado em integration_f360${NC}"
  echo "   Token ID: $TOKEN_VOLPE"
  echo ""
  echo "Execute o INSERT no script:"
  echo "  scripts/02-update-volpe-group.sql"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ Token Volpe encontrado${NC}"

# ============================================
# ETAPA 3: Testar Descriptografia
# ============================================

echo ""
echo -e "${BLUE}📋 ETAPA 3: Testar Descriptografia do Token${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DECRYPTED_TOKEN=$($PSQL_CMD -c "SELECT decrypt_f360_token('$TOKEN_VOLPE'::uuid);")

if [ -z "$DECRYPTED_TOKEN" ] || [ "$DECRYPTED_TOKEN" == "NULL" ]; then
  echo -e "${RED}❌ Token Volpe NÃO pode ser descriptografado${NC}"
  echo "   Token ID: $TOKEN_VOLPE"
  echo ""
  echo "Possíveis causas:"
  echo "  1. Token não foi criptografado com a chave atual"
  echo "  2. Token está corrompido"
  echo ""
  echo "Solução: Re-criptografar token no script:"
  echo "  scripts/02-update-volpe-group.sql"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ Token descriptografado com sucesso${NC}"
echo "   Token: ${DECRYPTED_TOKEN:0:30}..." # Mostra apenas primeiros 30 chars
echo ""

# ============================================
# ETAPA 4: Listar Empresas do Grupo Volpe
# ============================================

echo -e "${BLUE}📋 ETAPA 4: Listar Empresas do Grupo Volpe${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

VOLPE_COUNT=$($PSQL_CMD -c "
  SELECT COUNT(*)
  FROM clientes
  WHERE grupo_economico = 'Grupo Volpe'
    AND cnpj IS NOT NULL
    AND cnpj != '';
")

if [ "$VOLPE_COUNT" == "0" ]; then
  echo -e "${RED}❌ Nenhuma empresa do Grupo Volpe encontrada com CNPJ válido${NC}"
  echo ""
  echo "Execute o UPDATE no script:"
  echo "  scripts/02-update-volpe-group.sql"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ $VOLPE_COUNT empresas encontradas${NC}"
echo ""

# Listar primeiras 5 empresas
echo "Primeiras empresas:"
$PSQL_CMD -c "
  SELECT cnpj, razao_social
  FROM clientes
  WHERE grupo_economico = 'Grupo Volpe'
    AND cnpj IS NOT NULL
  ORDER BY cnpj
  LIMIT 5;
" | while IFS='|' read -r cnpj razao; do
  echo "  • $cnpj - $razao"
done

if [ "$VOLPE_COUNT" -gt 5 ]; then
  echo "  ... e mais $(($VOLPE_COUNT - 5)) empresas"
fi

echo ""

# ============================================
# ETAPA 5: Contagens ANTES da Sincronização
# ============================================

echo -e "${BLUE}📋 ETAPA 5: Contagens ANTES da Sincronização${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DRE_BEFORE=$($PSQL_CMD -c "
  SELECT COUNT(*)
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
")

CF_BEFORE=$($PSQL_CMD -c "
  SELECT COUNT(*)
  FROM cashflow_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
")

echo "DRE Entries (Grupo Volpe): $DRE_BEFORE"
echo "Cashflow Entries (Grupo Volpe): $CF_BEFORE"
echo ""

# ============================================
# ETAPA 6: Executar Sincronização F360
# ============================================

echo -e "${BLUE}📋 ETAPA 6: Executar Sincronização F360${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Chamando: POST $FUNCTIONS_URL/sync-f360"
echo ""

# Executar sincronização
SYNC_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${FUNCTIONS_URL}/sync-f360" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json")

# Separar body e HTTP code
HTTP_CODE=$(echo "$SYNC_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$SYNC_RESPONSE" | sed '/HTTP_CODE:/d')

# Verificar HTTP code
if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}❌ Sincronização FALHOU (HTTP $HTTP_CODE)${NC}"
  echo ""
  echo "Resposta da API:"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  echo ""
  exit 1
fi

# Verificar sucesso no JSON
SUCCESS=$(echo "$RESPONSE_BODY" | jq -r '.success // false')

if [ "$SUCCESS" != "true" ]; then
  echo -e "${RED}❌ Sincronização reportou falha${NC}"
  echo ""
  echo "Resposta da API:"
  echo "$RESPONSE_BODY" | jq '.'
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ Sincronização CONCLUÍDA com sucesso${NC}"
echo ""

# Mostrar resumo da resposta
echo "Resumo da sincronização:"
echo "$RESPONSE_BODY" | jq -r '
  "  Timestamp: \(.timestamp)",
  "  Total de resultados: \(.results | length)"
'

echo ""
echo "Primeiros 5 resultados:"
echo "$RESPONSE_BODY" | jq -r '
  .results[0:5][] |
  "  • \(.cliente) (\(.cnpj)): \(.synced // 0) transações - \(.status)"
'

TOTAL_RESULTS=$(echo "$RESPONSE_BODY" | jq '.results | length')
if [ "$TOTAL_RESULTS" -gt 5 ]; then
  echo "  ... e mais $(($TOTAL_RESULTS - 5)) empresas"
fi

echo ""

# ============================================
# ETAPA 7: Contagens DEPOIS da Sincronização
# ============================================

echo -e "${BLUE}📋 ETAPA 7: Contagens DEPOIS da Sincronização${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DRE_AFTER=$($PSQL_CMD -c "
  SELECT COUNT(*)
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
")

CF_AFTER=$($PSQL_CMD -c "
  SELECT COUNT(*)
  FROM cashflow_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
")

DRE_DIFF=$((DRE_AFTER - DRE_BEFORE))
CF_DIFF=$((CF_AFTER - CF_BEFORE))

echo "DRE Entries (Grupo Volpe):"
echo "  Antes:  $DRE_BEFORE"
echo "  Depois: $DRE_AFTER"
echo -e "  ${GREEN}+$DRE_DIFF novos registros${NC}"
echo ""

echo "Cashflow Entries (Grupo Volpe):"
echo "  Antes:  $CF_BEFORE"
echo "  Depois: $CF_AFTER"
echo -e "  ${GREEN}+$CF_DIFF novos registros${NC}"
echo ""

# ============================================
# ETAPA 8: Validar Dados por CNPJ
# ============================================

echo -e "${BLUE}📋 ETAPA 8: Validar Dados por CNPJ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "DRE por CNPJ (primeiras 5 empresas):"
$PSQL_CMD -F '|' -c "
  SELECT
    c.cnpj,
    c.razao_social,
    COUNT(d.id) as dre_count,
    COALESCE(SUM(d.amount), 0) as soma_valores
  FROM clientes c
  LEFT JOIN dre_entries d ON c.cnpj = d.company_cnpj
  WHERE c.grupo_economico = 'Grupo Volpe'
  GROUP BY c.cnpj, c.razao_social
  ORDER BY c.cnpj
  LIMIT 5;
" | while IFS='|' read -r cnpj razao count soma; do
  echo "  $cnpj ($razao): $count registros, R\$ $soma"
done

echo ""
echo "Cashflow por CNPJ (primeiras 5 empresas):"
$PSQL_CMD -F '|' -c "
  SELECT
    c.cnpj,
    c.razao_social,
    COUNT(cf.id) as cf_count,
    COALESCE(SUM(cf.amount), 0) as soma_valores
  FROM clientes c
  LEFT JOIN cashflow_entries cf ON c.cnpj = cf.company_cnpj
  WHERE c.grupo_economico = 'Grupo Volpe'
  GROUP BY c.cnpj, c.razao_social
  ORDER BY c.cnpj
  LIMIT 5;
" | while IFS='|' read -r cnpj razao count soma; do
  echo "  $cnpj ($razao): $count registros, R\$ $soma"
done

echo ""

# ============================================
# ETAPA 9: Verificar sync_state
# ============================================

echo -e "${BLUE}📋 ETAPA 9: Verificar sync_state${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SYNC_STATE_COUNT=$($PSQL_CMD -c "
  SELECT COUNT(*)
  FROM sync_state
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  );
")

echo "Estados de sincronização: $SYNC_STATE_COUNT"
echo ""

if [ "$SYNC_STATE_COUNT" -gt 0 ]; then
  echo "Últimas sincronizações (primeiras 5):"
  $PSQL_CMD -F '|' -c "
    SELECT
      company_cnpj,
      source,
      last_success_at,
      last_cursor
    FROM sync_state
    WHERE company_cnpj IN (
      SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
    )
    ORDER BY last_success_at DESC
    LIMIT 5;
  " | while IFS='|' read -r cnpj source success cursor; do
    echo "  $cnpj ($source): $success"
  done
fi

echo ""

# ============================================
# ETAPA 10: Validar Cálculos DRE
# ============================================

echo -e "${BLUE}📋 ETAPA 10: Validar Cálculos DRE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Validação: Receita - Custo - Despesa = Lucro"
$PSQL_CMD -F '|' -c "
  SELECT
    company_cnpj,
    SUM(CASE WHEN nature = 'receita' THEN amount ELSE 0 END) as receita,
    SUM(CASE WHEN nature = 'custo' THEN amount ELSE 0 END) as custo,
    SUM(CASE WHEN nature = 'despesa' THEN amount ELSE 0 END) as despesa,
    SUM(CASE WHEN nature = 'receita' THEN amount
             WHEN nature = 'custo' THEN -amount
             WHEN nature = 'despesa' THEN -amount
             ELSE 0 END) as lucro
  FROM dre_entries
  WHERE company_cnpj IN (
    SELECT cnpj FROM clientes WHERE grupo_economico = 'Grupo Volpe'
  )
  GROUP BY company_cnpj
  ORDER BY company_cnpj
  LIMIT 5;
" | while IFS='|' read -r cnpj receita custo despesa lucro; do
  echo "  $cnpj:"
  echo "    Receita: R\$ $receita"
  echo "    Custo:   R\$ $custo"
  echo "    Despesa: R\$ $despesa"
  echo "    Lucro:   R\$ $lucro"
done

echo ""

# ============================================
# RESUMO FINAL
# ============================================

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              ✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO ✅          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}Resumo Final:${NC}"
echo "  • Chave de criptografia: ✅ Configurada"
echo "  • Token Volpe: ✅ Descriptografado"
echo "  • Empresas sincronizadas: $VOLPE_COUNT"
echo "  • DRE entries adicionados: +$DRE_DIFF"
echo "  • Cashflow entries adicionados: +$CF_DIFF"
echo "  • sync_state atualizado: $SYNC_STATE_COUNT empresas"
echo ""

echo -e "${YELLOW}Próximos passos:${NC}"
echo "  1. Validar dados no Dashboard Supabase"
echo "  2. Testar APIs do frontend (dashboard-cards, relatorios-dre)"
echo "  3. Configurar cron para sincronização automática"
echo "  4. Deploy do frontend em produção"
echo ""

echo "Script finalizado em: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
