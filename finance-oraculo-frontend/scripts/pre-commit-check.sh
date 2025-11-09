#!/bin/bash
set -euo pipefail

echo "🚀 Executando todas as verificações antes do commit..."
echo "════════════════════════════════════════════════════"
echo ""

FAILED=0

# 1. Segurança completa (auth + auditoria)
echo "📋 1/2 Segurança & Autenticação (npm run security:all)"
echo "────────────────────────────────────────────────────"
if npm run security:all; then
  echo ""
else
  FAILED=1
fi

# 2. Verificações de consistência de dados
echo ""
echo "📋 2/2 Verificações de Consistência de Dados (npm run data:consistency)"
echo "────────────────────────────────────────────────────"
if npm run data:consistency; then
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


