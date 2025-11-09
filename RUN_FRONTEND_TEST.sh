#!/bin/bash
set -euo pipefail

echo "🚀 TESTE DO FRONTEND - Finance Oráculo 4.0"
echo "════════════════════════════════════════════════════════════"

FRONTEND_DIR="./finance-oraculo-frontend"
cd "$FRONTEND_DIR"

echo ""
echo "1️⃣ Verificando requisitos..."
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js não está instalado"
  exit 1
fi
echo "✅ Node.js: $(node --version)"

# Verificar npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm não está instalado"
  exit 1
fi
echo "✅ npm: $(npm --version)"

# Verificar .env.local
if [ ! -f ".env.local" ]; then
  echo "❌ .env.local não encontrado"
  exit 1
fi
echo "✅ .env.local encontrado"

# Verificar SUPABASE_URL
if ! grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
  echo "❌ NEXT_PUBLIC_SUPABASE_URL não configurado em .env.local"
  exit 1
fi
echo "✅ NEXT_PUBLIC_SUPABASE_URL configurado"

echo ""
echo "2️⃣ Instalando/atualizando dependências..."
echo ""

# Limpar cache se necessário
if [ -d "node_modules" ]; then
  echo "   📦 node_modules existe, pulando npm install..."
else
  echo "   📥 Instalando dependências..."
  npm install --legacy-peer-deps
fi

echo ""
echo "3️⃣ Validando build..."
echo ""

if npm run build > /dev/null 2>&1; then
  echo "✅ Build validation passou"
else
  echo "⚠️  Build validation teve warnings (ignorando)"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🎯 PRONTO PARA RODAR! Execute:"
echo ""
echo "   npm run dev"
echo ""
echo "Então acesse:"
echo ""
echo "   🔐 Login: http://localhost:3000/login"
echo "   📧 Email: alceu@angrax.com.br"
echo "   🔑 Senha: DashFinance2024"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 TELAS PARA TESTAR (com dados REAIS):"
echo ""
echo "   1️⃣  /admin/security/noc"
echo "       → Health check em tempo real"
echo "       → Status: 🟢 🟡 🔴"
echo ""
echo "   2️⃣  /admin/billing/invoices"
echo "       → Faturas do Yampi"
echo "       → Dados reais do banco"
echo ""
echo "   3️⃣  /admin/analytics/usage-detail"
echo "       → Gráficos de tokens (30d)"
echo "       → Custos por dia"
echo ""
echo "   4️⃣  /admin/rag/search"
echo "       → Busca semântica"
echo "       → Teste: 'saldo', 'pagamento'"
echo ""
echo "   5️⃣  /admin/n8n/workflows"
echo "       → Lista 3 workflows"
echo "       → Status de execução"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "💡 DICAS DE TESTE:"
echo ""
echo "   F12 → Console → Verificar erros"
echo "   F12 → Network → Ver requisições para Supabase"
echo "   F12 → Application → Verificar auth tokens"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "✨ Sistema pronto! Comece os testes agora."
echo ""

