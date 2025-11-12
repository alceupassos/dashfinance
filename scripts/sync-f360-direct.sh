#!/bin/bash
# Script para sincronizar dados F360 diretamente via HTTP
# Usa a função RPC get_f360_integrations para evitar problemas de cache

set -e

SUPABASE_URL="${SUPABASE_URL:-https://xzrmzmcoslomtzkzgskn.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-$(grep SUPABASE_ANON_KEY .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' || echo '')}"

if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ SUPABASE_ANON_KEY não encontrado. Configure no .env ou exporte a variável."
  exit 1
fi

echo "🔄 Sincronizando dados F360..."
echo "   URL: $SUPABASE_URL/functions/v1/sync-f360"

# Invocar Edge Function
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/functions/v1/sync-f360")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ Sincronização concluída!"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ Erro ao sincronizar (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi

