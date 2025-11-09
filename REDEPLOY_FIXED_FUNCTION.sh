#!/bin/bash

echo "🔧 Redeploy da função onboarding-tokens corrigida"
echo "=================================================="
echo ""

cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend

echo "✅ Correção aplicada:"
echo "   - Removido JOIN com tabela 'empresa' inexistente"
echo "   - Ajustado order by para 'created_at'"
echo ""

echo "📦 Fazendo deploy..."
supabase functions deploy onboarding-tokens

echo ""
echo "🧪 Testando função..."
curl -X GET \
  "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/onboarding-tokens" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI" \
  -H "Content-Type: application/json"

echo ""
echo ""
echo "✅ Deploy concluído!"

