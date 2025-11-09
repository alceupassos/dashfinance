#!/bin/bash

# 🚀 SCRIPT PARA RODAR O FRONTEND AGORA
# Execute este script no seu terminal local (fora do Cursor)

echo "════════════════════════════════════════════════════════════"
echo "🚀 INICIANDO FINANCE ORÁCULO 4.0"
echo "════════════════════════════════════════════════════════════"
echo ""

# Ir para diretório do frontend
cd "$(dirname "$0")/finance-oraculo-frontend"

echo "📍 Diretório: $(pwd)"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado!"
    echo "📥 Instale em: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"
echo ""

# Verificar .env.local
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local não encontrado!"
    echo ""
    echo "Crie o arquivo .env.local com:"
    echo "───────────────────────────────────────────────────────────"
    cat << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://newczbjzzfkwwnpfmygm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDE1NTAsImV4cCI6MjA3NzUxNzU1MH0.BvV6F8jlYZ3M9X4kL2pQ7R9sT1uW5vZ8aB3cD6eF7gH

# API Base
NEXT_PUBLIC_API_BASE=https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1
EOF
    echo "───────────────────────────────────────────────────────────"
    exit 1
fi

echo "✅ .env.local encontrado"
echo ""

# Instalar dependências se não tiver node_modules
if [ ! -d "node_modules" ]; then
    echo "📥 Instalando dependências (primeira vez)..."
    npm install --legacy-peer-deps
    echo ""
fi

echo "════════════════════════════════════════════════════════════"
echo "🎉 TUDO PRONTO! Iniciando servidor..."
echo ""
echo "📌 Acesse em: http://localhost:3000"
echo ""
echo "🔐 Login com:"
echo "   📧 Email: alceu@angrax.com.br"
echo "   🔑 Senha: DashFinance2024"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Rodar o servidor
npm run dev

