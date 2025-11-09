#!/bin/bash

# Script para criar usuário no Supabase via API

SUPABASE_URL="https://xzrmzmcoslomtzkzgsxn.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzI4NjIzfQ.716RfI9V2Vv3nGcx5rK4epnLddUUdFT3-doegfrXcmk"

EMAIL="alceupassos@gmail.com"
PASSWORD="Alceu322ie#"

echo "🔄 Criando usuário no Supabase..."
echo ""

# Criar usuário via API
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"email_confirm\": true
  }")

echo "📋 Resposta do Supabase:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Verificar se foi criado com sucesso
if echo "$RESPONSE" | grep -q "id"; then
  echo "✅ Usuário criado com sucesso!"
  echo ""
  echo "📧 Email: ${EMAIL}"
  echo "🔑 Senha: ${PASSWORD}"
  echo ""
  echo "🚀 Agora você pode fazer login em http://localhost:3000"
else
  echo "❌ Erro ao criar usuário"
fi

