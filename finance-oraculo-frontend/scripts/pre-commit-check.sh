#!/bin/bash
set -euo pipefail

echo "🚀 Executando todas as verificações antes do commit..."
echo "════════════════════════════════════════════════════"
echo ""

FAILED=0

# 1. Testes de autenticação
echo "📋 1/3 Testes de Autenticação"
echo "────────────────────────────────────────────────────"
if ./scripts/test-auth.sh; then
  echo ""
else
  FAILED=1
fi

# 2. Verificações de segurança
echo ""
echo "📋 2/3 Verificações de Segurança"
echo "────────────────────────────────────────────────────"
if ./scripts/security-check.sh; then
  echo ""
else
  FAILED=1
fi

# 3. Verificações de consistência de dados
echo ""
echo "📋 3/3 Verificações de Consistência de Dados"
echo "────────────────────────────────────────────────────"
chmod +x ./scripts/data-consistency-check.sh
if ./scripts/data-consistency-check.sh; then
  echo ""
else
  # Não falhar commit por consistência, apenas avisar
  echo "⚠️  Avisos de consistência (não bloqueiam commit)"
fi

# Resultado final
echo ""
echo "════════════════════════════════════════════════════"
if [ $FAILED -eq 1 ]; then
  echo "❌ VERIFICAÇÕES FALHARAM - COMMIT CANCELADO"
  echo ""
  echo "⚠️  Corrija os problemas acima antes de commitar"
  echo ""
  exit 1
else
  echo "✅ Todas as verificações críticas passaram!"
  echo "✅ Commit permitido"
  echo ""
fi

exit 0


