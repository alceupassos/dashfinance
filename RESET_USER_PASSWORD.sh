#!/bin/bash

echo "🔐 Resetar Senha do Usuário Admin"
echo "==================================="
echo ""

EMAIL="alceu@angrax.com.br"
NEW_PASSWORD="Admin@123456"  # Nova senha temporária

echo "📧 Email: $EMAIL"
echo "🔑 Nova senha: $NEW_PASSWORD"
echo ""
echo "⚠️  IMPORTANTE: Troque esta senha após o primeiro login!"
echo ""

# Usar Supabase CLI para resetar senha
cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend

echo "Executando reset de senha..."
supabase db execute "
  UPDATE auth.users 
  SET 
    encrypted_password = crypt('$NEW_PASSWORD', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
  WHERE email = '$EMAIL';
"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Senha resetada com sucesso!"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 CREDENCIAIS DE LOGIN:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Email: $EMAIL"
  echo "Senha: $NEW_PASSWORD"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Agora você pode:"
  echo "  1. Editar GET_JWT_TOKEN.sh e colocar a senha: $NEW_PASSWORD"
  echo "  2. Rodar: ./GET_JWT_TOKEN.sh"
  echo "  3. Usar o JWT obtido para testar as APIs"
  echo ""
else
  echo ""
  echo "❌ Falha ao resetar senha!"
  echo "Tente via Supabase Dashboard:"
  echo "  https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/auth/users"
fi

