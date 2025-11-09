#!/bin/bash
set -euo pipefail

# ✅ Credenciais Supabase
PROJETO="newczbjzzfkwwnpfmygm"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0MTU1MCwiZXhwIjoyMDc3NTE3NTUwfQ.LxDfg_OPvWS_Yc7Z-H1M3K6pJqLWvPzXc8K_JvWXz0U"

echo "1/3 seed-realistic-data (6 meses de dados reais)"
curl -X POST "https://${PROJETO}.supabase.co/functions/v1/seed-realistic-data" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo "2/3 whatsapp-simulator (gera usuários de teste)"
curl -X POST "https://${PROJETO}.supabase.co/functions/v1/whatsapp-simulator" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"generate_test_users"}'

echo "3/3 full-test-suite (seed + simulador + valida tokens)"
curl -X POST "https://${PROJETO}.supabase.co/functions/v1/full-test-suite" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo ""
echo "════════════════════════════════════════════════════"
echo "✅ Todos os testes automáticos foram executados!"
echo "════════════════════════════════════════════════════"
echo ""
echo "📊 O que foi feito:"
echo "  1️⃣  Seed com 6 meses de dados reais"
echo "  2️⃣  Simulador WhatsApp com usuários de teste"
echo "  3️⃣  Full test suite (validação completa)"
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