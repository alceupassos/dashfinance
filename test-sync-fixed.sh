#!/bin/bash
set -euo pipefail

export SUPABASE_URL="https://xzrmzmcoslomtzkzgskn.supabase.co"
export ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Export SUPABASE_SERVICE_ROLE_KEY first}"
BASE="https://xzrmzmcoslomtzkzgskn.functions.supabase.co"

echo "=== REEXECUTANDO SINCRONIZAÇÃO APÓS CORREÇÕES ==="

echo "→ 1. Executando sync-f360..."
curl -sS -X POST "$BASE/sync-f360" \
  -H "Authorization: Bearer $ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.results | length // 0' | xargs echo "Empresas processadas:"

echo "→ 2. Executando scheduled-sync-erp..."
curl -sS -X POST "$BASE/scheduled-sync-erp" \
  -H "Authorization: Bearer $ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.results.f360 | length // 0' | xargs echo "F360 empresas processadas:"

echo "→ 3. Verificando dados populados..."
echo "DRE entries VOLPE DIADEMA:"
curl -sS "$SUPABASE_URL/rest/v1/dre_entries?company_cnpj=eq.00026888098000&select=id" \
  -H "apikey: $ROLE_KEY" -H "Authorization: Bearer $ROLE_KEY" | jq 'length'

echo "DRE entries VOLPE GRAJAU:"
curl -sS "$SUPABASE_URL/rest/v1/dre_entries?company_cnpj=eq.00026888098001&select=id" \
  -H "apikey: $ROLE_KEY" -H "Authorization: Bearer $ROLE_KEY" | jq 'length'

echo "Cashflow entries VOLPE DIADEMA:"
curl -sS "$SUPABASE_URL/rest/v1/cashflow_entries?company_cnpj=eq.00026888098000&select=id" \
  -H "apikey: $ROLE_KEY" -H "Authorization: Bearer $ROLE_KEY" | jq 'length'

echo "→ 4. Testando APIs finais..."
echo "Dashboard cards:"
curl -sS "$BASE/dashboard-cards?cnpj=00026888098000" \
  -H "Authorization: Bearer $ROLE_KEY" | jq '.receita_total // "null"' | xargs echo "Receita total:"

echo "Relatórios DRE:"
curl -sS "$BASE/relatorios-dre?company_cnpj=00026888098000&periodo=$(date +%Y-%m)" \
  -H "Authorization: Bearer $ROLE_KEY" | jq '.receitas.total // "null"' | xargs echo "Receitas total:"

echo "=== TESTE COMPLETO ==="
