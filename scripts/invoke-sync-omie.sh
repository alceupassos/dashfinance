#!/bin/bash

# Script para invocar a Edge Function sync-omie
# Uso: ./scripts/invoke-sync-omie.sh

set -e

SUPABASE_URL="${SUPABASE_URL:-https://xzrmzmcoslomtzkzgskn.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY}}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ Erro: SUPABASE_URL e SUPABASE_ANON_KEY devem estar definidos"
  echo "   Exporte as variáveis ou defina no arquivo .env"
  exit 1
fi

FUNCTION_URL="${SUPABASE_URL}/functions/v1/sync-omie"

echo "🔄 Invocando sync-omie..."
echo "   URL: $FUNCTION_URL"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  "$FUNCTION_URL")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Sincronização iniciada com sucesso!"
  echo ""
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ Erro ao invocar sync-omie (HTTP $HTTP_CODE)"
  echo ""
  echo "$BODY"
  exit 1
fi

