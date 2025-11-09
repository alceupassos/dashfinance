#!/bin/bash

# Script para atualizar credenciais no .env.local

cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend

cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgsxn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzI4NjIzfQ.716RfI9V2Vv3nGcx5rK4epnLddUUdFT3-doegfrXcmk
EOF

echo "✅ .env.local atualizado com sucesso!"
echo ""
echo "📋 Conteúdo:"
cat .env.local
echo ""
echo "🔄 Agora você precisa:"
echo "   1. Parar o npm run dev (Ctrl+C)"
echo "   2. Recarregar o navegador (F5)"
echo "   3. Ou reiniciar: npm run dev"

