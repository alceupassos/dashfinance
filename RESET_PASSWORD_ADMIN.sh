#!/bin/bash

echo "🔐 Resetando senha via Admin API"
echo "=================================="
echo ""

SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzI4NjIzfQ.0g5H7VVOzKIxQdJ2Bk_hXlJ8kbPfLqPCPnJvCGfTJiI"
SUPABASE_URL="https://xzrmzmcoslomtzkzgskn.supabase.co"
USER_ID="8cce19a9-c75b-418b-9c70-a5a58ce21f97"
NEW_PASSWORD="DashFinance@2025"

echo "Resetando senha do usuário..."
RESPONSE=$(curl -s -X PUT "$SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$NEW_PASSWORD\",\"email_confirm\":true}")

echo "$RESPONSE" | jq '.'

if echo "$RESPONSE" | grep -q "\"id\""; then
  echo ""
  echo "✅ Senha resetada com sucesso!"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 CREDENCIAIS:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Email: alceu@angrax.com.br"
  echo "Senha: $NEW_PASSWORD"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Agora execute:"
  echo "  ./LOGIN_AND_TEST.sh"
else
  echo ""
  echo "❌ Falha ao resetar senha!"
fi

