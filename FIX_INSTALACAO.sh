#!/bin/bash

echo "🔧 FIX INSTALAÇÃO - Finance Oráculo"
echo "════════════════════════════════════════════════════════════"
echo ""

cd "$(dirname "$0")/finance-oraculo-frontend"

echo "📍 Limpando instalação anterior..."
rm -rf node_modules package-lock.json

echo ""
echo "📥 Instalando dependências do zero..."
npm install --legacy-peer-deps

echo ""
echo "📥 Instalando @supabase/supabase-js especificamente..."
npm install @supabase/supabase-js --save --legacy-peer-deps

echo ""
echo "📥 Instalando recharts (para gráficos)..."
npm install recharts --save

echo ""
echo "✅ Instalação completa!"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🎯 Próximo passo:"
echo ""
echo "   npm run dev"
echo ""
echo "Depois acesse: http://localhost:3000"
echo "════════════════════════════════════════════════════════════"

