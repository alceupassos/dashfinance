#!/bin/bash
set -euo pipefail

echo "🧪 Validar Rotas do Frontend - Finance Oráculo"
echo "════════════════════════════════════════════════════════════"

FRONTEND_DIR="./finance-oraculo-frontend"
PASSED=0
FAILED=0

# Array de rotas para validar
declare -a ROUTES=(
  # Security
  "/admin/security/overview"
  "/admin/security/noc"
  "/admin/security/traffic"
  "/admin/security/sessions"
  "/admin/security/database"
  "/admin/security/backups"
  
  # Billing
  "/admin/billing/invoices"
  "/admin/billing/plans"
  "/admin/billing/subscriptions"
  "/admin/billing/pricing"
  "/admin/billing/yampi-config"
  
  # Analytics
  "/admin/analytics/user-usage"
  "/admin/analytics/usage-detail"
  "/admin/analytics/mood-index"
  
  # RAG
  "/admin/rag/search"
  
  # N8N
  "/admin/n8n/workflows"
  "/admin/n8n/monitor"
  
  # Config
  "/admin/config/integrations"
  "/admin/tokens"
  "/admin/llm/optimizer"
  "/admin/llm/keys-per-client"
  "/admin/llm-costs-per-client"
  "/admin/clientes-whatsapp"
)

echo ""
echo "1️⃣ Verificando arquivos de página..."
echo ""

for route in "${ROUTES[@]}"; do
  # Converter rota para caminho de arquivo
  # /admin/security/overview → admin/security/overview/page.tsx
  filepath="$FRONTEND_DIR/app/(app)${route}/page.tsx"
  
  # Suportar rotas dinâmicas como /admin/rag/context/[id]
  if [[ $route == *"["* ]]; then
    # Já contém [], manter como está
    filepath="$FRONTEND_DIR/app/(app)${route}/page.tsx"
  fi
  
  if [ -f "$filepath" ]; then
    echo "✅ $route"
    ((PASSED++))
  else
    echo "❌ $route (arquivo não encontrado: $filepath)"
    ((FAILED++))
  fi
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "2️⃣ Verificando dependências..."
echo ""

# Verificar package.json
if grep -q "recharts" "$FRONTEND_DIR/package.json"; then
  echo "✅ recharts instalado"
  ((PASSED++))
else
  echo "❌ recharts não encontrado em package.json"
  ((FAILED++))
fi

if grep -q "@supabase/supabase-js" "$FRONTEND_DIR/package.json"; then
  echo "✅ @supabase/supabase-js instalado"
  ((PASSED++))
else
  echo "❌ @supabase/supabase-js não encontrado"
  ((FAILED++))
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "3️⃣ Verificando configuração..."
echo ""

if [ -f "$FRONTEND_DIR/.env.local" ]; then
  echo "✅ .env.local existe"
  ((PASSED++))
  
  if grep -q "NEXT_PUBLIC_SUPABASE_URL" "$FRONTEND_DIR/.env.local"; then
    echo "✅ NEXT_PUBLIC_SUPABASE_URL configurado"
    ((PASSED++))
  else
    echo "❌ NEXT_PUBLIC_SUPABASE_URL não configurado"
    ((FAILED++))
  fi
else
  echo "❌ .env.local não encontrado"
  ((FAILED++))
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "📊 RESULTADO FINAL"
echo ""
echo "✅ Passou: $PASSED"
echo "❌ Falhou: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 TODAS AS VALIDAÇÕES PASSARAM!"
  echo ""
  echo "📖 Próximo passo: npm run dev"
  echo ""
  echo "Então acesse:"
  echo "  http://localhost:3000/login"
  echo ""
  echo "Credenciais:"
  echo "  Email: alceu@angrax.com.br"
  echo "  Senha: DashFinance2024"
else
  echo "⚠️  Algumas validações falharam. Corrija antes de rodar npm run dev"
  exit 1
fi

echo "════════════════════════════════════════════════════════════"

