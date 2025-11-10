#!/bin/bash
# Comandos para Próxima Sessão – DashFinance
# Executar após banho/descanso

set -euo pipefail

echo "🚀 INICIANDO PRÓXIMA SESSÃO – DashFinance"
echo "=========================================="

# ============================================
# PASSO 1: Restaurar Autenticação JWT
# ============================================
echo ""
echo "PASSO 1: Restaurar Autenticação JWT"
echo "-----------------------------------"
echo "⚠️  MANUAL: Editar os seguintes arquivos e restaurar validação JWT:"
echo "   1. supabase/functions/dashboard-cards/index.ts"
echo "   2. supabase/functions/relatorios-dre/index.ts"
echo "   3. supabase/functions/oracle-response/index.ts"
echo ""
echo "Padrão de restauração:"
echo "  const { data: { user }, error: authError } = await supabase.auth.getUser(token);"
echo "  if (authError || !user) {"
echo "    return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, ... });"
echo "  }"
echo ""

# ============================================
# PASSO 2: Configurar Chave F360
# ============================================
echo ""
echo "PASSO 2: Configurar Chave F360"
echo "------------------------------"
echo "⚠️  MANUAL: Executar no SQL Editor do Supabase:"
echo ""
echo "-- Validar chave atual:"
echo "SELECT current_setting('app.encryption_key', true) as current_key;"
echo ""
echo "-- Testar descriptografia:"
echo "SELECT decrypt_f360_token('63520d44-fe1d-4c45-a127-d9abfb6dc85f');"
echo ""
echo "Se retornar NULL, a chave está incorreta."
echo "Configurar com:"
echo "  supabase secrets set app.encryption_key='CHAVE_CORRETA' --project-ref xzrmzmcoslomtzkzgskn"
echo ""

# ============================================
# PASSO 3: Executar Deduplicação
# ============================================
echo ""
echo "PASSO 3: Executar Deduplicação"
echo "------------------------------"
echo "⚠️  MANUAL: Executar no SQL Editor do Supabase:"
echo ""
cat << 'EOF'
-- Deduplicação DRE
WITH d AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY company_cnpj, date, account, nature, amount
           ORDER BY id
         ) AS rn
  FROM dre_entries
)
DELETE FROM dre_entries USING d WHERE dre_entries.id = d.id AND d.rn > 1;

-- Deduplicação Cashflow
WITH c AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY company_cnpj, date, amount, kind, category
           ORDER BY id
         ) AS rn
  FROM cashflow_entries
)
DELETE FROM cashflow_entries USING c WHERE cashflow_entries.id = c.id AND c.rn > 1;

-- Criar índices únicos
CREATE UNIQUE INDEX IF NOT EXISTS ux_dre_entries_unique
ON dre_entries(company_cnpj, date, account, nature, amount);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cashflow_entries_unique
ON cashflow_entries(company_cnpj, date, amount, kind, category);
EOF
echo ""

# ============================================
# PASSO 4: Deploy Backend (após restaurar auth)
# ============================================
echo ""
echo "PASSO 4: Deploy Backend"
echo "----------------------"
echo "Executar:"
echo ""
cat << 'EOF'
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend

# Deploy funções atualizadas
supabase functions deploy dashboard-cards --project-ref xzrmzmcoslomtzkzgskn
supabase functions deploy relatorios-dre --project-ref xzrmzmcoslomtzkzgskn
supabase functions deploy oracle-response --project-ref xzrmzmcoslomtzkzgskn

# Aguardar 5 segundos
sleep 5

echo "✅ Backend deployado"
EOF
echo ""

# ============================================
# PASSO 5: Testar APIs com JWT Real
# ============================================
echo ""
echo "PASSO 5: Testar APIs com JWT Real"
echo "--------------------------------"
echo "⚠️  MANUAL: Obter JWT de usuário real e testar:"
echo ""
cat << 'EOF'
# 1. Fazer login para obter JWT
JWT=$(curl -s -X POST https://xzrmzmcoslomtzkzgskn.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"sua_senha"}' | jq -r '.access_token')

# 2. Testar dashboard-cards
curl -s "https://xzrmzmcoslomtzkzgskn.functions.supabase.co/dashboard-cards?cnpj=00026888098000" \
  -H "Authorization: Bearer $JWT" | jq '.cards[0:3]'

# 3. Testar relatorios-dre
curl -s "https://xzrmzmcoslomtzkzgskn.functions.supabase.co/relatorios-dre?company_cnpj=00026888098000&periodo=2025-11" \
  -H "Authorization: Bearer $JWT" | jq '.receita_bruta, .custos, .lucro_liquido'

# 4. Testar oracle-response
curl -s -X POST "https://xzrmzmcoslomtzkzgskn.functions.supabase.co/oracle-response" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"question":"Como está o fluxo de caixa?","company_cnpj":"00026888098000"}' | jq '.resposta'
EOF
echo ""

# ============================================
# PASSO 6: Deploy Frontend
# ============================================
echo ""
echo "PASSO 6: Deploy Frontend"
echo "----------------------"
echo "Executar:"
echo ""
cat << 'EOF'
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-frontend

# Build
npm run build

# Deploy (escolha seu provedor)
# Vercel: vercel deploy --prod
# Netlify: netlify deploy --prod
# Manual: npm run deploy

echo "✅ Frontend deployado"
EOF
echo ""

# ============================================
# PASSO 7: Configurar Agendamentos
# ============================================
echo ""
echo "PASSO 7: Configurar Agendamentos"
echo "-------------------------------"
echo "⚠️  MANUAL: No Dashboard Supabase:"
echo "   1. Ir para Functions > scheduled-sync-erp"
echo "   2. Clicar em 'Cron Job'"
echo "   3. Configurar: 0 */6 * * * (a cada 6 horas)"
echo "   4. Salvar"
echo ""

# ============================================
# PASSO 8: Validar Sistema Completo
# ============================================
echo ""
echo "PASSO 8: Validar Sistema Completo"
echo "--------------------------------"
echo "Checklist final:"
echo ""
echo "□ Autenticação JWT restaurada"
echo "□ Chave F360 configurada e testada"
echo "□ Deduplicação executada"
echo "□ Backend deployado"
echo "□ APIs testadas com JWT real"
echo "□ Frontend deployado"
echo "□ Agendamentos configurados"
echo "□ Dashboard exibindo dados"
echo "□ DRE exibindo dados"
echo "□ Oráculo respondendo com Haiku 4.5"
echo "□ Enter enviando mensagens"
echo ""

echo "=========================================="
echo "✅ PRÓXIMA SESSÃO PRONTA!"
echo "=========================================="
