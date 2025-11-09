#!/bin/bash

echo "🚀 Redeploy e Teste: empresas-list v2.0.0"
echo "=========================================="
echo ""

cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend

echo "1️⃣  Fazendo redeploy da função..."
supabase functions deploy empresas-list

if [ $? -ne 0 ]; then
  echo "❌ Falha no deploy!"
  exit 1
fi

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "2️⃣  Aguardando 3 segundos para propagação..."
sleep 3

echo ""
echo "3️⃣  Fazendo login..."
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
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "4️⃣  Testando empresas-list..."
echo ""

RESPONSE=$(curl -s -X GET \
  "https://xzrmzmcoslomtzkzgskn.supabase.co/functions/v1/empresas-list?limit=5" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq '.'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

VERSION=$(echo "$RESPONSE" | jq -r '.version // "unknown"')
TOTAL=$(echo "$RESPONSE" | jq -r '.total // 0')

echo "📊 Resultado:"
echo "   Versão: $VERSION"
echo "   Total: $TOTAL empresas"
echo ""

if [ "$VERSION" = "empresas-list@2.0.0" ]; then
  echo "✅ Versão correta deployada!"
else
  echo "⚠️  Versão esperada: empresas-list@2.0.0"
  echo "   Versão recebida: $VERSION"
fi

if [ "$TOTAL" -gt 0 ]; then
  echo "✅ SUCESSO! Empresas encontradas!"
  echo ""
  echo "Primeiras empresas:"
  echo "$RESPONSE" | jq -r '.empresas[:3] | .[] | "  • \(.nome_fantasia) (\(.cnpj))"'
else
  echo "❌ Lista ainda vazia!"
  echo ""
  echo "🔍 Verifique os logs da função:"
  echo "   supabase functions logs empresas-list"
  echo ""
  echo "Ou acesse:"
  echo "   https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/logs/edge-functions"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

