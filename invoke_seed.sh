#!/bin/bash

# Buscar variáveis de ambiente
if [ -f "finance-oraculo-frontend/.env.local" ]; then
  export $(cat finance-oraculo-frontend/.env.local | grep -v '^#' | xargs)
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ]; then
  echo "❌ Erro: Variáveis de ambiente não configuradas"
  exit 1
fi

echo "🚀 Invocando seed-realistic-data..."
echo "URL: $SUPABASE_URL"

curl -X POST "${SUPABASE_URL}/functions/v1/seed-realistic-data" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "full",
    "clear_existing": false
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ Função invocada!"
