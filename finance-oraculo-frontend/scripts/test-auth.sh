#!/bin/bash
set -euo pipefail

echo "🧪 Testando configuração de autenticação..."
echo ""

# Carregar variáveis de ambiente
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
  echo "✅ Arquivo .env.local carregado"
else
  echo "⚠️  Arquivo .env.local não encontrado"
fi

echo ""
echo "1️⃣ Verificando variáveis de ambiente..."

if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_URL não configurada"
  exit 1
fi
echo "   ✅ NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:40}..."

if [ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada"
  exit 1
fi
echo "   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:30}..."

echo ""
echo "2️⃣ Verificando arquivos..."

if [ ! -f "lib/supabase.ts" ]; then
  echo "❌ lib/supabase.ts não encontrado"
  exit 1
fi
echo "   ✅ lib/supabase.ts existe"

if [ ! -f "store/use-user-store.ts" ]; then
  echo "❌ store/use-user-store.ts não encontrado"
  exit 1
fi
echo "   ✅ store/use-user-store.ts existe"

echo ""
echo "3️⃣ Verificando imports..."

if ! grep -q "@/lib/supabase" store/use-user-store.ts; then
  echo "❌ Import do supabase não encontrado em use-user-store.ts"
  exit 1
fi
echo "   ✅ Import correto em use-user-store.ts"

if ! grep -q "supabase.auth.signInWithPassword" store/use-user-store.ts; then
  echo "❌ signInWithPassword não encontrado em use-user-store.ts"
  exit 1
fi
echo "   ✅ signInWithPassword encontrado"

echo ""
echo "4️⃣ Testando compilação TypeScript..."

if ! npm run build > /tmp/build-test.log 2>&1; then
  echo "❌ Erro na compilação:"
  tail -20 /tmp/build-test.log
  exit 1
fi
echo "   ✅ Build passou sem erros"

echo ""
echo "5️⃣ Testando lint..."

if ! npm run lint > /tmp/lint-test.log 2>&1; then
  echo "❌ Erro no lint:"
  cat /tmp/lint-test.log
  exit 1
fi
echo "   ✅ Lint passou sem erros"

echo ""
echo "✅ Todos os testes passaram!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Acesse http://localhost:3000/login"
echo "   2. Use: alceu@angrax.com.br / DashFinance2024"
echo "   3. Verifique o console do navegador (F12) para erros"
echo ""

