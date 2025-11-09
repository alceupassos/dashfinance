#!/bin/bash

echo "🔐 Login e Teste de APIs"
echo "========================"
echo ""

# Credenciais
EMAIL="alceu@angrax.com.br"
PASSWORD="DashFinance@2025"

SUPABASE_URL="https://xzrmzmcoslomtzkzgskn.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI"

echo "📧 Fazendo login com: $EMAIL"
echo ""

# Fazer login
LOGIN_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Extrair access_token
JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ Falha ao obter JWT!"
  echo ""
  echo "Resposta do servidor:"
  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
  echo ""
  echo "⚠️  A senha pode estar incorreta. Tente:"
  echo "   1. Ir no Supabase Dashboard → Authentication → Users"
  echo "   2. Resetar a senha do usuário"
  echo "   3. Ou usar a senha que você sabe"
  exit 1
fi

echo "✅ Login realizado com sucesso!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 JWT TOKEN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$JWT_TOKEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Salvar token
echo "$JWT_TOKEN" > .jwt_token
echo "💾 Token salvo em: .jwt_token"
echo ""

# Testar APIs
echo "🧪 Testando APIs com JWT válido..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Testando: empresas-list"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET \
  "$SUPABASE_URL/functions/v1/empresas-list" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Status: $HTTP_STATUS"
  echo ""
  TOTAL=$(echo "$BODY" | jq -r '.total // 0' 2>/dev/null)
  echo "📊 Total de empresas: $TOTAL"
  echo ""
  echo "Primeiras 3 empresas:"
  echo "$BODY" | jq -r '.empresas[:3] | .[] | "  • \(.nome_fantasia) (\(.cnpj)) - F360: \(.integracao_f360), OMIE: \(.integracao_omie)"' 2>/dev/null
else
  echo "❌ Status: $HTTP_STATUS"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Testando: onboarding-tokens"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET \
  "$SUPABASE_URL/functions/v1/onboarding-tokens" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Status: $HTTP_STATUS"
  echo ""
  TOTAL=$(echo "$BODY" | jq -r '.total // 0' 2>/dev/null)
  echo "📊 Total de tokens: $TOTAL"
else
  echo "❌ Status: $HTTP_STATUS"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Testando: whatsapp-conversations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET \
  "$SUPABASE_URL/functions/v1/whatsapp-conversations" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Status: $HTTP_STATUS"
  echo ""
  TOTAL=$(echo "$BODY" | jq -r '.total // 0' 2>/dev/null)
  echo "📊 Total de conversas: $TOTAL"
else
  echo "❌ Status: $HTTP_STATUS"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Testes concluídos!"
echo ""
echo "Para usar o JWT em outros testes:"
echo "  export JWT_TOKEN=\$(cat .jwt_token)"
echo ""
echo "Ou copie o token acima e use:"
echo "  curl -H \"Authorization: Bearer \$JWT_TOKEN\" ..."

