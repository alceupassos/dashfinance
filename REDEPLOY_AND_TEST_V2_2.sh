#!/bin/bash

echo "🚀 Redeploy empresas-list v2.2.0 (total correto)"
echo "================================================="

cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend

echo ""
echo "📦 Fazendo deploy..."
supabase functions deploy empresas-list

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🧪 Testando com limit=5..."
echo ""

# Obter JWT
JWT_TOKEN=$(curl -s -X POST "https://xzrmzmcoslomtzkzgskn.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI" \
  -H "Content-Type: application/json" \
  -d '{"email":"alceu@angrax.com.br","password":"B5b0dcf500"}' | jq -r '.access_token')

RESPONSE=$(curl -s -X GET "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/empresas-list?limit=5" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Extrair valores
TOTAL=$(echo "$RESPONSE" | jq -r '.total')
RETURNED=$(echo "$RESPONSE" | jq -r '.returned')

echo "📊 Resultado:"
echo "   Total de empresas no banco: $TOTAL"
echo "   Empresas retornadas (limit): $RETURNED"
echo ""

if [ "$TOTAL" -gt "$RETURNED" ]; then
  echo "✅ CORRETO! Total ($TOTAL) > Retornadas ($RETURNED)"
else
  echo "⚠️  Verificar: Total deveria ser maior que retornadas"
fi

