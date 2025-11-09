#!/bin/bash
set -e

echo "=========================================="
echo "Executando migração SQL no Supabase"
echo "=========================================="
echo ""

# Variáveis
DB_URL="postgresql://postgres:B5b0dcf500@#@db.projeto.supabase.co:5432/postgres"

# Verificar se psql está instalado
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) não encontrado."
    echo ""
    echo "Instalando via Homebrew..."
    brew install postgresql@15

    # Adicionar ao PATH
    export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
fi

echo "✅ PostgreSQL client encontrado"
echo ""

# Passo 1: Setup inicial
echo "📝 Passo 1: Configurando variáveis de sessão..."
psql "$DB_URL" -f setup-sql.sql

if [ $? -eq 0 ]; then
    echo "✅ Setup inicial concluído"
else
    echo "❌ Erro no setup inicial"
    exit 1
fi

echo ""

# Passo 2: Executar migração V2
echo "📝 Passo 2: Executando migração principal..."
psql "$DB_URL" -f migrations/001_bootstrap_v2.sql

if [ $? -eq 0 ]; then
    echo "✅ Migração concluída com sucesso!"
else
    echo "❌ Erro na migração"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Migração completa!"
echo "=========================================="
echo ""

# Verificação
echo "Verificando resultados..."
psql "$DB_URL" -c "SELECT 'OK' as status, (SELECT count(*) FROM integration_f360) as f360_count, (SELECT count(*) FROM integration_omie) as omie_count, (SELECT count(*) FROM cron.job) as cron_jobs;"

echo ""
echo "Próximo passo: Deploy das Edge Functions"
echo "Execute: ./deploy.sh"
