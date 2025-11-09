#!/bin/bash

# Setup .env.local for Frontend

set -e

echo "🔧 Configurando .env.local do frontend..."
echo ""

# Navigate to frontend directory
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend

# Create .env.local file
cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://newczbjzzfkwwnpfmygm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDE1NTAsImV4cCI6MjA3NzUxNzU1MH0.BvV6F8jlYZ3M9X4kL2pQ7R9sT1uW5vZ8aB3cD6eF7gH

# Optional - Service Role Key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0MTU1MCwiZXhwIjoyMDc3NTE3NTUwfQ.LxDfg_OPvWS_Yc7Z-H1M3K6pJqLWvPzXc8K_JvWXz0U

# Optional - For local development
NEXT_PUBLIC_FUNCTIONS_URL=https://newczbjzzfkwwnpfmygm.functions.supabase.co
EOF

echo "✅ .env.local criado com sucesso!"
echo ""
echo "📋 Conteúdo do arquivo:"
echo "────────────────────────────"
cat .env.local
echo "────────────────────────────"
echo ""
echo "🚀 Próximos passos:"
echo "1. npm install (se não tiver feito)"
echo "2. npm run dev"
echo "3. Abrir http://localhost:3000"
echo "4. Login com:"
echo "   Email: alceu@angrax.com.br"
echo "   Senha: ALceu322ie#"

