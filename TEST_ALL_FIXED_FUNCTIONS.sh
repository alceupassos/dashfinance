#!/bin/bash

echo "🧪 Testando todas as Edge Functions corrigidas"
echo "=============================================="
echo ""

# Obter JWT
echo "🔐 Obtendo JWT..."
JWT_TOKEN=$(curl -s -X POST "https://xzrmzmcoslomtzkzgskn.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI" \
  -H "Content-Type: application/json" \
  -d '{"email":"alceu@angrax.com.br","password":"B5b0dcf500"}' | jq -r '.access_token')

if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" == "null" ]; then
  echo "❌ Falha ao obter JWT"
  exit 1
fi

echo "✅ JWT obtido"
echo ""

BASE_URL="https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1"

# Função auxiliar para testar
test_function() {
  local name=$1
  local endpoint=$2
  local method=${3:-GET}
  local body=${4:-}
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📌 Testando: $name"
  echo "   Endpoint: $method $endpoint"
  
  if [ "$method" == "GET" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/$endpoint" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json")
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/$endpoint" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body")
  fi
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ Status: $HTTP_CODE"
    echo "   Resposta:"
    echo "$BODY" | jq -C '.' 2>/dev/null || echo "$BODY"
  else
    echo "   ❌ Status: $HTTP_CODE"
    echo "   Erro:"
    echo "$BODY" | jq -C '.' 2>/dev/null || echo "$BODY"
  fi
  
  echo ""
}

# 1. empresas-list (já testada, mas vamos confirmar)
test_function "empresas-list" "empresas-list?limit=3"

# 2. onboarding-tokens
test_function "onboarding-tokens" "onboarding-tokens?limit=3"

# 3. relatorios-dre (precisa de cnpj)
CNPJ="00026888098000"  # VOLPE DIADEMA
test_function "relatorios-dre" "relatorios-dre?cnpj=$CNPJ&mes=2025-11"

# 4. relatorios-cashflow (precisa de cnpj)
test_function "relatorios-cashflow" "relatorios-cashflow?cnpj=$CNPJ&mes=2025-11"

# 5. relatorios-kpis (precisa de cnpj)
test_function "relatorios-kpis" "relatorios-kpis?cnpj=$CNPJ&periodo=2025-11"

# 6. whatsapp-conversations
test_function "whatsapp-conversations" "whatsapp-conversations?limit=3"

# 7. group-aliases-create (GET para listar)
test_function "group-aliases (list)" "group-aliases-create"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Teste completo!"
echo ""
echo "📊 Resumo:"
echo "   - empresas-list: Deve retornar 21 empresas"
echo "   - onboarding-tokens: Deve retornar tokens"
echo "   - relatorios-dre: Deve retornar DRE do CNPJ"
echo "   - relatorios-cashflow: Deve retornar cashflow do CNPJ"
echo "   - relatorios-kpis: Deve retornar KPIs do CNPJ"
echo "   - whatsapp-conversations: Deve retornar conversas"
echo "   - group-aliases: Deve retornar aliases"

