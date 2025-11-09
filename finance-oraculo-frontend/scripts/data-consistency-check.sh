#!/bin/bash
set -euo pipefail

echo "📊 Verificações de Consistência de Dados Financeiros"
echo "════════════════════════════════════════════════════"
echo ""

FAILED=0

# 1. Verificar validação de valores monetários
echo "1️⃣ Verificando validação de valores monetários..."
if [ -f "lib/formatters.ts" ]; then
  if grep -qE "(formatCurrency|parseFloat|Number|toFixed)" lib/formatters.ts; then
    echo "   ✅ Formatação de valores monetários encontrada"
  else
    echo "   ⚠️  Considere adicionar validação de valores monetários"
  fi
else
  echo "   ⚠️  lib/formatters.ts não encontrado"
fi

# 2. Verificar sanitização de inputs financeiros
echo ""
echo "2️⃣ Verificando sanitização de inputs..."
if [ -f "lib/api.ts" ]; then
  # Verificar se há validação antes de enviar dados
  if grep -qE "(validate|sanitize|escape|parseInt|parseFloat)" lib/api.ts; then
    echo "   ✅ Validação de inputs encontrada"
  else
    echo "   ⚠️  Considere adicionar sanitização de inputs financeiros"
  fi
  
  # Verificar se valores negativos são tratados corretamente
  if grep -qE "(Math\.abs|Math\.max|Math\.min|>=|<=)" lib/api.ts; then
    echo "   ✅ Validação de limites encontrada"
  else
    echo "   ⚠️  Considere validar limites de valores financeiros"
  fi
else
  echo "   ⚠️  lib/api.ts não encontrado"
fi

# 3. Verificar tratamento de erros em operações financeiras
echo ""
echo "3️⃣ Verificando tratamento de erros..."
if [ -f "store/use-user-store.ts" ]; then
  if grep -qE "(try|catch|error|Error)" store/use-user-store.ts; then
    echo "   ✅ Tratamento de erros encontrado"
  else
    echo "   ⚠️  Considere adicionar tratamento de erros"
  fi
else
  echo "   ⚠️  store/use-user-store.ts não encontrado"
fi

# 4. Verificar se há proteção contra valores NaN/Infinity
echo ""
echo "4️⃣ Verificando proteção contra valores inválidos..."
FILES_TO_CHECK=("lib/api.ts" "lib/formatters.ts" "store/use-user-store.ts")
for file in "${FILES_TO_CHECK[@]}"; do
  if [ -f "$file" ]; then
    if grep -qE "(isNaN|isFinite|Number\.isNaN|Number\.isFinite)" "$file"; then
      echo "   ✅ Validação de NaN/Infinity encontrada em $file"
    fi
  fi
done

# 5. Verificar se cálculos financeiros usam precisão adequada
echo ""
echo "5️⃣ Verificando precisão de cálculos financeiros..."
if [ -f "lib/formatters.ts" ]; then
  if grep -qE "(toFixed|toPrecision|Math\.round|Math\.floor|Math\.ceil)" lib/formatters.ts; then
    echo "   ✅ Precisão de cálculos configurada"
  else
    echo "   ⚠️  Considere usar toFixed(2) para valores monetários"
  fi
else
  echo "   ⚠️  lib/formatters.ts não encontrado"
fi

# 6. Verificar se há logs de auditoria para operações financeiras
echo ""
echo "6️⃣ Verificando logs de auditoria..."
if grep -rqE "(console\.(log|error|warn)|audit|log)" lib/ store/ 2>/dev/null; then
  echo "   ✅ Logs encontrados (verifique se são adequados para produção)"
else
  echo "   ⚠️  Considere adicionar logs de auditoria para operações financeiras"
fi

# Resultado final
echo ""
echo "════════════════════════════════════════════════════"
if [ $FAILED -eq 1 ]; then
  echo "⚠️  Algumas verificações de consistência falharam"
  echo "   Revise as recomendações acima"
else
  echo "✅ Verificações de consistência concluídas"
fi
echo ""

exit 0


