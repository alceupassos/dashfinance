#!/bin/bash

echo "🔧 Setup .env.local"
echo "════════════════════════════════════════════════════════════"

cd "$(dirname "$0")/finance-oraculo-frontend"

# Criar .env.local
cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://newczbjzzfkwwnpfmygm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDE1NTAsImV4cCI6MjA3NzUxNzU1MH0.BvV6F8jlYZ3M9X4kL2pQ7R9sT1uW5vZ8aB3cD6eF7gH

# API Base (para Edge Functions)
NEXT_PUBLIC_API_BASE=https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1

# Supabase Functions URL
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1
EOF

echo "✅ .env.local criado com sucesso!"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📍 Localização: $(pwd)/.env.local"
echo ""
echo "🎯 Próximo passo:"
echo ""
echo "   npm run lint -- --fix"
echo "   npm run dev"
echo ""
echo "════════════════════════════════════════════════════════════"

