#!/bin/bash
set -euo pipefail

echo "🔒 Verificações de Segurança e Consistência"
echo "════════════════════════════════════════════════════"
echo ""

FAILED=0

# 1. Verificar vulnerabilidades críticas
echo "1️⃣ Verificando vulnerabilidades críticas..."
if npm audit --audit-level=moderate > /tmp/audit.log 2>&1; then
  echo "   ✅ Nenhuma vulnerabilidade crítica encontrada"
else
  echo "   ❌ VULNERABILIDADES CRÍTICAS ENCONTRADAS!"
  echo ""
  echo "   📋 Resumo das vulnerabilidades:"
  grep -E "(critical|high|moderate)" /tmp/audit.log | head -20
  echo ""
  echo "   ⚠️  AÇÃO NECESSÁRIA: Execute 'npm audit fix --force'"
  FAILED=1
fi

# 2. Verificar variáveis de ambiente sensíveis não commitadas
echo ""
echo "2️⃣ Verificando vazamento de credenciais..."
SENSITIVE_PATTERNS=(
  "password.*="
  "secret.*="
  "api.*key.*="
  "token.*="
  "service.*role.*="
  "anon.*key.*="
)

FOUND_SECRETS=0
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
  if git diff --cached 2>/dev/null | grep -qiE "$pattern" || \
     git diff 2>/dev/null | grep -qiE "$pattern"; then
    echo "   ⚠️  Possível credencial detectada no diff: $pattern"
    FOUND_SECRETS=1
  fi
done

if [ $FOUND_SECRETS -eq 0 ]; then
  echo "   ✅ Nenhuma credencial detectada no diff"
else
  echo "   ❌ CREDENCIAIS DETECTADAS NO CÓDIGO!"
  echo "   ⚠️  Remova credenciais antes de commitar"
  FAILED=1
fi

# 3. Verificar arquivos .env não commitados
echo ""
echo "3️⃣ Verificando arquivos sensíveis..."
if git ls-files --error-unmatch .env.local 2>/dev/null; then
  echo "   ❌ .env.local está sendo commitado!"
  echo "   ⚠️  Remova do git: git rm --cached .env.local"
  FAILED=1
else
  echo "   ✅ .env.local não está no git"
fi

# 4. Verificar RLS (Row Level Security) no Supabase
echo ""
echo "4️⃣ Verificando configuração de segurança..."
if [ -f ".env.local" ]; then
  if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && \
     grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
    echo "   ✅ Variáveis Supabase configuradas"
    
    # Verificar se não está usando service_role_key no frontend
    if grep -qi "SERVICE_ROLE_KEY" .env.local; then
      echo "   ❌ SERVICE_ROLE_KEY encontrado no frontend!"
      echo "   ⚠️  SERVICE_ROLE_KEY NUNCA deve estar no frontend!"
      echo "   ⚠️  Use apenas ANON_KEY no frontend"
      FAILED=1
    else
      echo "   ✅ Apenas ANON_KEY no frontend (correto)"
    fi
  else
    echo "   ⚠️  Variáveis Supabase não configuradas"
  fi
else
  echo "   ⚠️  Arquivo .env.local não encontrado"
fi

# 5. Verificar consistência de dados financeiros
echo ""
echo "5️⃣ Verificando consistência de dados financeiros..."
if [ -f "lib/api.ts" ]; then
  # Verificar se há validação de dados financeiros
  if grep -q "validate\|sanitize\|escape" lib/api.ts; then
    echo "   ✅ Validação de dados encontrada"
  else
    echo "   ⚠️  Considere adicionar validação de dados financeiros"
  fi
  
  # Verificar se está usando HTTPS
  if grep -q "http://" lib/api.ts 2>/dev/null && ! grep -q "localhost\|127.0.0.1" lib/api.ts 2>/dev/null; then
    echo "   ❌ HTTP detectado (deve ser HTTPS para produção)"
    FAILED=1
  else
    echo "   ✅ Apenas HTTPS ou localhost"
  fi
else
  echo "   ⚠️  Arquivo lib/api.ts não encontrado"
fi

# 6. Verificar dependências com vulnerabilidades conhecidas
echo ""
echo "6️⃣ Verificando dependências críticas..."
CRITICAL_DEPS=("next" "@supabase/supabase-js")
for dep in "${CRITICAL_DEPS[@]}"; do
  if grep -q "\"$dep\"" package.json; then
    VERSION=$(grep "\"$dep\"" package.json | sed 's/.*"\([^"]*\)".*/\1/')
    echo "   📦 $dep: $VERSION"
  fi
done

# Resultado final
echo ""
echo "════════════════════════════════════════════════════"
if [ $FAILED -eq 1 ]; then
  echo "❌ VERIFICAÇÕES DE SEGURANÇA FALHARAM!"
  echo ""
  echo "⚠️  CORREÇÕES NECESSÁRIAS ANTES DE PROSSEGUIR:"
  echo "   1. Execute: npm audit fix --force"
  echo "   2. Remova credenciais do código"
  echo "   3. Verifique .env.local não está no git"
  echo "   4. Use apenas ANON_KEY no frontend"
  echo ""
  exit 1
else
  echo "✅ Todas as verificações de segurança passaram!"
  echo ""
fi

exit 0


