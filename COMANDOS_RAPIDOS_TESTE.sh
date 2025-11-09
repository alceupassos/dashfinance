#!/bin/bash

# 🚀 COMANDOS RÁPIDOS PARA TESTE - Finance Oráculo 4.0
# Copie e cole cada seção conforme necessário

echo "════════════════════════════════════════════════════════════"
echo "🚀 COMANDOS RÁPIDOS PARA TESTE"
echo "════════════════════════════════════════════════════════════"

echo ""
echo "📋 PASSO 1: Preparar Frontend"
echo ""
echo "Copie e execute:"
echo "───────────────────────────────────────────────────────────"
cat << 'EOF'
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend
npm install --legacy-peer-deps
npm run dev
EOF
echo "───────────────────────────────────────────────────────────"

echo ""
echo "📋 PASSO 2: Abrir no Navegador"
echo ""
echo "   🔐 Login Page: http://localhost:3000/login"
echo "   📧 Email:      alceu@angrax.com.br"
echo "   🔑 Senha:      DashFinance2024"

echo ""
echo "📋 PASSO 3: Navegar para Telas de Teste"
echo ""
echo "Copie uma URL e cola no navegador:"
echo ""
echo "1️⃣  NOC Dashboard (Monitoramento)"
echo "    http://localhost:3000/admin/security/noc"
echo ""
echo "2️⃣  Invoices (Faturas)"
echo "    http://localhost:3000/admin/billing/invoices"
echo ""
echo "3️⃣  Usage Detail (Analytics com Gráficos)"
echo "    http://localhost:3000/admin/analytics/usage-detail"
echo ""
echo "4️⃣  RAG Search (Busca Semântica)"
echo "    http://localhost:3000/admin/rag/search"
echo ""
echo "5️⃣  N8N Workflows (Automação)"
echo "    http://localhost:3000/admin/n8n/workflows"

echo ""
echo "📋 PASSO 4: Testar Endpoints no Console (F12)"
echo ""
echo "Copie e cola no console do navegador (F12 → Console):"
echo ""
echo "────────────────────────────────────────────────────────────"
cat << 'EOF'
// Teste 1: Health Check
fetch('https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/health-check', {
  headers: {
    'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session.access_token
  }
}).then(r => r.json()).then(d => console.log('HEALTH:', d))

// Teste 2: Get Metrics
fetch('https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/get-monitoring-metrics', {
  headers: {
    'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session.access_token
  }
}).then(r => r.json()).then(d => console.log('METRICS:', d.metrics))

// Teste 3: Get Invoices (do Supabase)
const { data: invoices } = await supabase.from('yampi_invoices').select('*').limit(5)
console.log('INVOICES:', invoices)

// Teste 4: Get RAG Conversations
const { data: rag } = await supabase.from('rag_conversations').select('*').limit(5)
console.log('RAG:', rag)

// Teste 5: Get LLM Usage
const { data: usage } = await supabase.from('llm_token_usage').select('*').limit(5)
console.log('LLM USAGE:', usage)
EOF
echo "────────────────────────────────────────────────────────────"

echo ""
echo "📋 PASSO 5: Ver Logs (Se der erro)"
echo ""
echo "Copie e cola no console para ver detalhes do erro:"
echo ""
echo "────────────────────────────────────────────────────────────"
cat << 'EOF'
// Ativar debug do Supabase
localStorage.setItem('supabase.debug', 'true')
location.reload()

// Ver dados do usuário logado
const { data: { session } } = await supabase.auth.getSession()
console.log('USER:', session?.user)
console.log('TOKEN:', session?.access_token)
EOF
echo "────────────────────────────────────────────────────────────"

echo ""
echo "📋 PASSO 6: Teste com CURL (Opcional)"
echo ""
echo "Abra terminal diferente e execute (depois copie o TOKEN do console):"
echo ""
echo "────────────────────────────────────────────────────────────"
cat << 'EOF'
TOKEN="seu_access_token_aqui"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ld2N6Ymp6emZrd3ducGZteWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDE1NTAsImV4cCI6MjA3NzUxNzU1MH0.BvV6F8jlYZ3M9X4kL2pQ7R9sT1uW5vZ8aB3cD6eF7gH"

# Teste 1: Health Check
curl -X GET https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/health-check \
  -H "Authorization: Bearer $TOKEN"

# Teste 2: Get Invoices
curl -X GET "https://newczbjzzfkwwnpfmygm.supabase.co/rest/v1/yampi_invoices?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: $ANON_KEY"

# Teste 3: Get RAG Conversations
curl -X GET "https://newczbjzzfkwwnpfmygm.supabase.co/rest/v1/rag_conversations?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: $ANON_KEY"
EOF
echo "────────────────────────────────────────────────────────────"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✨ DICAS IMPORTANTES"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "✅ Se tudo funcionar:"
echo "   1. Todas as 26 telas devem carregar"
echo "   2. Dados reais aparecem na tabela"
echo "   3. Gráficos renderizam corretamente"
echo "   4. Sem erros no console (F12)"
echo ""
echo "❌ Se der erro:"
echo "   1. Verifique F12 → Console"
echo "   2. Verifique F12 → Network"
echo "   3. Verifique se Supabase está acessível"
echo "   4. Verifique .env.local está configurado"
echo "   5. Verifique se Edge Functions estão ACTIVE"
echo ""
echo "🔧 Verificar Edge Functions no Supabase:"
echo "   https://app.supabase.com → Project → Functions"
echo "   Deve mostrar 7 functions ACTIVE"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

