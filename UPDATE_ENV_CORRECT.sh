#!/bin/bash

cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend

cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_0FhTziCa81xIasbi7qFp_w_NW8cag8I
EOF

echo "✅ .env.local atualizado com as chaves CORRETAS!"
echo ""
echo "Conteúdo:"
cat .env.local
echo ""
echo "🔄 Agora:"
echo "   1. Ctrl+C para parar npm run dev"
echo "   2. Rodar npm run dev novamente"
echo "   3. Recarregue o navegador (F5)"
echo "   4. Tente fazer login"

