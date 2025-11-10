#!/bin/bash

echo "🧪 Teste Final: onboarding-tokens"
echo "=================================="
echo ""
echo "⏱️  Aguardando 15 segundos para PostgREST processar..."
sleep 15

echo ""
echo "🔐 Obtendo JWT..."
JWT_TOKEN=$(curl -s -X POST "https://xzrmzmcoslomtzkzgskn.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI" \
  -H "Content-Type: application/json" \
  -d '{"email":"alceu@angrax.com.br","password":"B5b0dcf500"}' | jq -r '.access_token')

if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" == "null" ]; then
  echo "❌ Falha ao obter JWT"
  exit 1
fi

echo "✅ JWT obtido"
echo ""
echo "📊 Testando onboarding-tokens..."
echo ""

RESPONSE=$(curl -s -X GET "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/onboarding-tokens?limit=5" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se retornou tokens
TOTAL=$(echo "$RESPONSE" | jq -r '.total // 0')

if [ "$TOTAL" -gt 0 ]; then
  echo "✅ SUCESSO! Retornou $TOTAL tokens"
  echo ""
  echo "🎉 Problema do PostgREST cache RESOLVIDO!"
else
  echo "⚠️  Ainda retornando 0 tokens"
  echo ""
  echo "Possíveis causas:"
  echo "  1. Cache ainda não atualizou (aguarde mais 30s)"
  echo "  2. Verificar logs no Dashboard"
fi

