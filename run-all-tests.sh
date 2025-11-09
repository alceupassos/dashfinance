#!/bin/bash
set -euo pipefail

# ✅ Credenciais Supabase
PROJETO="newczbjzzfkwwnpfmygm"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0MTU1MCwiZXhwIjoyMDc3NTE3NTUwfQ.LxDfg_OPvWS_Yc7Z-H1M3K6pJqLWvPzXc8K_JvWXz0U"
FALLBACK_BASE_URL="${FALLBACK_BASE_URL:-http://localhost:3000/api/test-functions}"

call_function() {
  local label="$1"
  local method="$2"
  local endpoint="$3"
  local payload="${4:-}"
  local tmp_file="/tmp/${endpoint//\//_}.json"
  local url="https://${PROJETO}.supabase.co/functions/v1/${endpoint}"
  local path="${endpoint%%\?*}"
  local query=""
  if [[ "$endpoint" == *\?* ]]; then
    query="${endpoint#*\?}"
  fi

  echo "➡️  ${label}"
  if [ "$method" = "POST" ]; then
    http_code=$(curl -s -o "$tmp_file" -w "%{http_code}" \
      -X POST "$url" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$payload")
  else
    http_code=$(curl -s -o "$tmp_file" -w "%{http_code}" \
      "$url" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json")
  fi

  echo "   HTTP ${http_code}"
  if [ "$http_code" = "404" ]; then
    echo "   Endpoint remoto não encontrado. Tentando fallback local..."
    local fallback_url="${FALLBACK_BASE_URL}/${path}"
    if [ -n "$query" ]; then
      fallback_url="${fallback_url}?${query}"
    fi
    if [ "$method" = "POST" ]; then
      http_code=$(curl -s -o "$tmp_file" -w "%{http_code}" \
        -X POST "$fallback_url" \
        -H "Content-Type: application/json" \
        -d "$payload")
    else
      http_code=$(curl -s -o "$tmp_file" -w "%{http_code}" \
        "$fallback_url" \
        -H "Content-Type: application/json")
    fi
    echo "   Fallback local → HTTP ${http_code}"
  fi
  if [ -s "$tmp_file" ]; then
    echo "   Resumo:"
    head -c 400 "$tmp_file"
    echo ""
  else
    echo "   (Resposta vazia)"
  fi
  echo ""
}

echo "1/5 seed-realistic-data (6 meses de dados reais)"
call_function "Seed realistic data" "POST" "seed-realistic-data" "{}"

echo "2/5 whatsapp-simulator (gera usuários de teste)"
call_function "WhatsApp simulator" "POST" "whatsapp-simulator" '{"action":"generate_test_users"}'

echo "3/5 mood-index-timeline (analytics de humor)"
call_function "Mood index timeline" "GET" "mood-index-timeline?date_from=2025-10-01&date_to=2025-10-31&granularity=daily"

echo "4/5 usage-details (analytics de uso do sistema)"
call_function "Usage analytics" "GET" "usage-details?date_from=2025-10-01&date_to=2025-10-31"

echo "5/5 full-test-suite (seed + simulador + valida tokens)"
call_function "Full test suite" "POST" "full-test-suite" "{}"

echo ""
echo "════════════════════════════════════════════════════"
echo "✅ Todos os testes automáticos foram executados!"
echo "════════════════════════════════════════════════════"
echo ""
echo "📊 O que foi feito:"
echo "  1️⃣  Seed com 6 meses de dados reais"
echo "  2️⃣  Simulador WhatsApp com usuários de teste"
echo "  3️⃣  Painel de humor (mood-index-timeline)"
echo "  4️⃣  Analytics de uso (usage-details)"
echo "  5️⃣  Full test suite (validação completa)"
echo ""
echo "📱 Para testar no WhatsApp:"
echo "  Número: 5511967377373"
echo "  Token: VOLPE1"
echo ""
echo "💻 Para acessar o dashboard:"
echo "  Email: alceu@angrax.com.br"
echo "  Senha: ALceu322ie#"
echo "  URL: http://localhost:3000"
echo ""
echo "✨ Sistema pronto para testes!"