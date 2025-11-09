#!/bin/bash

echo "🚀 Redeploy onboarding-tokens (fix auth)"
echo "========================================="

cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend

echo ""
echo "📦 Fazendo deploy..."
supabase functions deploy onboarding-tokens

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🧪 Testando..."
echo ""

# Obter JWT
JWT_TOKEN=$(curl -s -X POST "https://xzrmzmcoslomtzkzgskn.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI" \
  -H "Content-Type: application/json" \
  -d '{"email":"alceu@angrax.com.br","password":"B5b0dcf500"}' | jq -r '.access_token')

curl -s -X GET "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/onboarding-tokens?limit=3" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq

echo ""
echo "✅ Se retornou tokens, está funcionando!"

