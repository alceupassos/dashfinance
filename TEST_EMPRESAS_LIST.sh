#!/bin/bash

echo "🧪 Testando empresas-list com debug"
echo "====================================="
echo ""

# Obter novo JWT
echo "1️⃣  Fazendo login..."
JWT_TOKEN=$(curl -s -X POST "https://xzrmzmcoslomtzkzgskn.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI" \
  -H "Content-Type: application/json" \
  -d '{"email":"alceu@angrax.com.br","password":"B5b0dcf500"}' | jq -r '.access_token')

if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" = "null" ]; then
  echo "❌ Falha ao obter JWT"
  exit 1
fi

echo "✅ JWT obtido"
echo ""

# Testar empresas-list
echo "2️⃣  Testando empresas-list..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET \
  "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/empresas-list?limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  TOTAL=$(echo "$BODY" | jq -r '.total // 0')
  echo "📊 Total de empresas: $TOTAL"
  echo ""
  
  if [ "$TOTAL" -gt 0 ]; then
    echo "✅ SUCESSO! Empresas encontradas:"
    echo "$BODY" | jq -r '.empresas[:5] | .[] | "  • \(.nome_fantasia) (\(.cnpj))"'
  else
    echo "⚠️  Lista vazia!"
    echo ""
    echo "Resposta completa:"
    echo "$BODY" | jq '.'
    echo ""
    echo "🔍 Possíveis causas:"
    echo "  1. Função não foi redeployada com o código corrigido"
    echo "  2. Erro na query dentro da função"
    echo "  3. SERVICE_ROLE_KEY incorreta"
    echo ""
    echo "💡 Solução:"
    echo "  cd finance-oraculo-backend"
    echo "  supabase functions deploy empresas-list"
  fi
else
  echo "❌ Erro HTTP $HTTP_STATUS"
  echo "$BODY" | jq '.'
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "3️⃣  Verificando dados no banco..."
echo ""

# Verificar se há dados
echo "Contando registros em integration_f360..."
curl -s -X GET \
  "https://xzrmzmcoslomtzkzgskn.supabase.co/rest/v1/integration_f360?select=count" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "Primeiras 3 empresas F360:"
curl -s -X GET \
  "https://xzrmzmcoslomtzkzgskn.supabase.co/rest/v1/integration_f360?select=cliente_nome,cnpj&limit=3" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI" \
  -H "Content-Type: application/json" | jq -r '.[] | "  • \(.cliente_nome) (\(.cnpj))"'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

