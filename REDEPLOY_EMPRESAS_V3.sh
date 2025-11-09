#!/bin/bash

echo "🚀 Redeploy empresas-list v3 (com logs detalhados)"
echo "=================================================="

cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend

echo ""
echo "📦 Fazendo deploy..."
supabase functions deploy empresas-list

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🧪 Agora teste com:"
echo ""
echo "export JWT_TOKEN=\"\$(curl -s -X POST \"https://xzrmzmcoslomtzkzgskn.supabase.co/auth/v1/token?grant_type=password\" \\"
echo "  -H \"apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\":\"alceu@angrax.com.br\",\"password\":\"B5b0dcf500\"}' | jq -r '.access_token')\""
echo ""
echo "curl -s -X GET \"https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/empresas-list?limit=5\" \\"
echo "  -H \"Authorization: Bearer \$JWT_TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" | jq"
echo ""
echo "📋 Depois veja os logs no Dashboard:"
echo "https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/logs/edge-functions"

