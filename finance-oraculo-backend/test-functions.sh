#!/bin/bash

# Script de teste das Edge Functions
# Use após o deploy para verificar se tudo está funcionando

PROJECT_REF="xzrmzmcoslomtzkzgskn"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI"

BASE_URL="https://$PROJECT_REF.functions.supabase.co"

echo "=========================================="
echo "Testando Edge Functions"
echo "=========================================="
echo ""

# Teste 1: Sync F360
echo "1. Testando sync-f360..."
curl -X POST "$BASE_URL/sync-f360" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Erro: resposta não é JSON válido"
echo ""

# Teste 2: Sync OMIE
echo "2. Testando sync-omie..."
curl -X POST "$BASE_URL/sync-omie" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Erro: resposta não é JSON válido"
echo ""

# Teste 3: Analyze (precisa de dados)
echo "3. Testando analyze (pode falhar se não houver dados)..."
curl -X GET "$BASE_URL/analyze?style=technical&cnpj=00052912647000&from=2025-01-01&to=2025-12-31" \
  -H "Authorization: Bearer $ANON_KEY" \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || echo "Erro: resposta não é JSON válido ou sem dados"
echo ""

# Teste 4: Export Excel (precisa de dados)
echo "4. Testando export-excel (pode falhar se não houver dados)..."
curl -X GET "$BASE_URL/export-excel?cnpj=00052912647000&from=2025-01-01&to=2025-12-31" \
  -H "Authorization: Bearer $ANON_KEY" \
  -w "\nStatus: %{http_code}\n" \
  -o test_export.xlsx \
  -s

if [ -f "test_export.xlsx" ]; then
  FILE_SIZE=$(wc -c < test_export.xlsx)
  if [ "$FILE_SIZE" -gt 1000 ]; then
    echo "✓ Excel exportado com sucesso (${FILE_SIZE} bytes)"
    rm test_export.xlsx
  else
    echo "✗ Excel muito pequeno ou vazio"
    cat test_export.xlsx
    rm test_export.xlsx
  fi
else
  echo "✗ Arquivo Excel não foi criado"
fi
echo ""

echo "=========================================="
echo "Testes concluídos!"
echo "=========================================="
echo ""
echo "Notas:"
echo "  - Os testes 3 e 4 podem falhar se ainda não houver dados sincronizados"
echo "  - Execute os syncs (1 e 2) primeiro e aguarde alguns minutos"
echo "  - Verifique os logs: supabase functions logs <function-name>"
