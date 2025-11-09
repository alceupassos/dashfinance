#!/bin/bash

cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend

cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0FhTziCa81xIasbi7qFp_w_NW8cag8I
EOF

echo "✅ .env.local atualizado!"
echo ""
echo "Conteúdo:"
cat .env.local
echo ""
echo "🔄 Agora:"
echo "   1. Recarregue o navegador (F5)"
echo "   2. Tente fazer login novamente"

