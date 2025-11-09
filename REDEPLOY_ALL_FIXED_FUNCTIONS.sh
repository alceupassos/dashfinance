#!/bin/bash

echo "🚀 Redeploy de Edge Functions Corrigidas"
echo "=========================================="
echo ""

cd /Users/alceualvespasssosmac/dashfinance/finance-oraculo-backend

FUNCTIONS=(
  "onboarding-tokens"
  "empresas-list"
  "relatorios-dre"
  "relatorios-cashflow"
  "relatorios-kpis"
  "whatsapp-conversations"
  "group-aliases-create"
)

SUCCESS=0
FAILED=0

for func in "${FUNCTIONS[@]}"; do
  echo "📦 Deploying $func..."
  if supabase functions deploy "$func" 2>&1 | tee /tmp/deploy_$func.log; then
    echo "✅ $func deployed successfully"
    ((SUCCESS++))
  else
    echo "❌ $func failed to deploy"
    cat /tmp/deploy_$func.log
    ((FAILED++))
  fi
  echo ""
done

echo "=========================================="
echo "📊 Resumo do Deploy:"
echo "   ✅ Sucesso: $SUCCESS/$((SUCCESS + FAILED))"
echo "   ❌ Falhas: $FAILED/$((SUCCESS + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 Todas as funções foram deployadas com sucesso!"
else
  echo "⚠️  Algumas funções falharam. Verifique os logs acima."
fi

