#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║              🔧 CORRIGINDO AUTENTICAÇÃO DO SUPABASE 🔧                   ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend

echo "📝 Atualizando .env.local..."
echo ""

cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_0FhTziCa81xIasbi7qFp_w_NW8cag8I
EOF

echo "✅ .env.local atualizado!"
echo ""
echo "📋 Conteúdo:"
cat .env.local
echo ""
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "🚀 PRÓXIMOS PASSOS:"
echo ""
echo "   1. Ctrl+C para parar npm run dev (se estiver rodando)"
echo ""
echo "   2. Limpar cache:"
echo "      rm -rf .next"
echo ""
echo "   3. Rodar dev novamente:"
echo "      npm run dev"
echo ""
echo "   4. Abrir navegador: http://localhost:3000"
echo ""
echo "   5. Fazer login:"
echo "      📧 Email: alceupassos@gmail.com"
echo "      🔑 Senha: Alceu322ie#"
echo ""
echo "════════════════════════════════════════════════════════════════════════════"

