#!/bin/bash

# Script completo: Importa CSV e sincroniza dados F360
# Uso: ./scripts/import-and-sync.sh

set -e

echo "🚀 Iniciando processo de importação e sincronização F360"
echo ""

# Verificar variáveis de ambiente
if [ -z "$SUPABASE_URL" ]; then
  echo "⚠️  SUPABASE_URL não definido, usando padrão"
  export SUPABASE_URL="${SUPABASE_URL:-https://xzrmzmcoslomtzkzgskn.supabase.co}"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Erro: SUPABASE_SERVICE_ROLE_KEY não definido"
  echo "   Exporte a variável: export SUPABASE_SERVICE_ROLE_KEY='sua-chave'"
  exit 1
fi

if [ -z "$APP_KMS" ]; then
  echo "❌ Erro: APP_KMS não definido"
  echo "   Exporte a variável: export APP_KMS='sua-chave-kms'"
  exit 1
fi

CSV_FILE="${1:-CLIENTES_F360_com_TOKEN.csv}"

if [ ! -f "$CSV_FILE" ]; then
  echo "❌ Arquivo CSV não encontrado: $CSV_FILE"
  exit 1
fi

echo "📥 Passo 1: Importando clientes do CSV..."
echo "   Arquivo: $CSV_FILE"
echo ""

node scripts/import-f360-clients.mjs "$CSV_FILE"

if [ $? -ne 0 ]; then
  echo "❌ Falha na importação do CSV"
  exit 1
fi

echo ""
echo "⏳ Aguardando 2 segundos antes de sincronizar..."
sleep 2

echo ""
echo "🔄 Passo 2: Sincronizando dados do F360..."
echo ""

# Usar o script de invocação
./scripts/invoke-sync-f360.sh

if [ $? -ne 0 ]; then
  echo "❌ Falha na sincronização F360"
  exit 1
fi

echo ""
echo "✅ Processo concluído!"
echo ""
echo "📊 Próximos passos:"
echo "   1. Verifique os dados no dashboard"
echo "   2. Se necessário, agrege manualmente o Grupo Volpe:"
echo "      SELECT upsert_group_dre_entries('00026888098000');"
echo "      SELECT upsert_group_cashflow_entries('00026888098000');"

