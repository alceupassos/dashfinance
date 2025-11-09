#!/bin/bash

echo "🧪 Testando empresas-list diretamente"
echo "======================================"

# Obter JWT
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

# Testar empresas-list
echo "📊 Chamando empresas-list..."
echo ""

RESPONSE=$(curl -s -X GET "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/empresas-list?limit=5" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 AGORA VEJA OS LOGS NO DASHBOARD:"
echo "https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/logs/edge-functions"
echo ""
echo "Clique em 'empresas-list' e procure por logs com [empresas-list@2.0.0]"
echo ""
echo "Os logs vão mostrar:"
echo "  - Quantos registros vieram do F360"
echo "  - Quantos registros vieram do OMIE"
echo "  - Se houve algum erro nas queries"
echo "  - Uma amostra dos dados retornados"

