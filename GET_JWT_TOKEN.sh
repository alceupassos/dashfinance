#!/bin/bash

echo "🔐 Obtendo JWT Token para testes"
echo "=================================="
echo ""

# Credenciais (MUDE A SENHA SE NECESSÁRIO)
EMAIL="alceu@angrax.com.br"
PASSWORD="sua_senha_aqui"  # ⚠️ COLOQUE A SENHA CORRETA

SUPABASE_URL="https://xzrmzmcoslomtzkzgskn.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI"

echo "📧 Email: $EMAIL"
echo "🔗 URL: $SUPABASE_URL"
echo ""

# Fazer login
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Extrair access_token
ACCESS_TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Falha ao obter token!"
  echo ""
  echo "Resposta do servidor:"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  echo ""
  echo "⚠️  Verifique:"
  echo "   1. A senha está correta?"
  echo "   2. O usuário existe no Supabase?"
  echo "   3. O email foi confirmado?"
  exit 1
fi

echo "✅ Token obtido com sucesso!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 JWT TOKEN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$ACCESS_TOKEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Use este token nos testes:"
echo ""
echo "export JWT_TOKEN=\"$ACCESS_TOKEN\""
echo ""
echo "curl -X GET \\"
echo "  \"https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/empresas-list\" \\"
echo "  -H \"Authorization: Bearer \$JWT_TOKEN\" \\"
echo "  -H \"Content-Type: application/json\""
echo ""

# Salvar em arquivo
echo "$ACCESS_TOKEN" > .jwt_token
echo "💾 Token salvo em: .jwt_token"
echo ""
echo "Para usar em outros scripts:"
echo "  JWT_TOKEN=\$(cat .jwt_token)"

