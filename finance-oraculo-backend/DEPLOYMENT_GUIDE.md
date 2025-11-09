# Guia de Deploy - Finance Oráculo Backend

Este guia fornece instruções passo a passo para fazer o deploy completo do sistema.

## Pré-requisitos

- [x] Supabase CLI instalado
- [x] Acesso ao projeto Supabase (xzrmzmcoslomtzkzgskn)
- [x] Permissões de admin no projeto

## Problema Identificado

O projeto `xzrmzmcoslomtzkzgskn` não aparece na sua lista de projetos do Supabase CLI. Isso pode indicar:

1. O projeto pertence a outra conta/organização
2. Você não tem permissões administrativas nesse projeto
3. É necessário um convite ou acesso adicional

## Opção 1: Deploy Manual (RECOMENDADO)

### Passo 1: Configurar o SQL

1. Acesse: https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/sql

2. Execute primeiro o arquivo `setup-sql.sql`:
   ```sql
   -- Copie e cole todo o conteúdo de setup-sql.sql
   ```

3. Depois execute o arquivo `migrations/001_bootstrap.sql`:
   ```sql
   -- Copie e cole todo o conteúdo de migrations/001_bootstrap.sql
   ```

4. Verifique se tudo foi criado:
   ```sql
   -- Verificar tabelas
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
     'integration_f360',
     'integration_omie',
     'sync_state',
     'dre_entries',
     'cashflow_entries',
     'group_alias',
     'group_alias_members'
   );

   -- Verificar views
   SELECT table_name
   FROM information_schema.views
   WHERE table_schema = 'public'
   AND table_name IN ('v_kpi_monthly', 'v_kpi_monthly_enriched', 'v_audit_health');

   -- Verificar funções
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN (
     'fn_kpi_monthly_grouped',
     'decrypt_f360_token',
     'decrypt_omie_keys',
     'refresh_sync_f360',
     'refresh_sync_omie'
   );

   -- Verificar jobs do pg_cron
   SELECT * FROM cron.job;
   ```

### Passo 2: Deploy das Edge Functions

#### 2.1 Via Interface Web (Mais Fácil)

1. Acesse: https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/functions

2. Para cada função, clique em "Deploy new function":

   **sync-f360:**
   - Nome: `sync-f360`
   - Copie o código de `functions/sync-f360/index.ts`
   - Importe também: `functions/common/db.ts` (criar como módulo compartilhado)

   **sync-omie:**
   - Nome: `sync-omie`
   - Copie o código de `functions/sync-omie/index.ts`

   **analyze:**
   - Nome: `analyze`
   - Copie o código de `functions/analyze/index.ts`

   **export-excel:**
   - Nome: `export-excel`
   - Copie o código de `functions/export-excel/index.ts`

   **upload-dre:**
   - Nome: `upload-dre`
   - Copie o código de `functions/upload-dre/index.ts`

#### 2.2 Via CLI (Se tiver acesso)

Se você conseguir obter acesso ao projeto via CLI:

```bash
# Vincular ao projeto
supabase link --project-ref xzrmzmcoslomtzkzgskn

# Deploy das funções
supabase functions deploy sync-f360 --no-verify-jwt
supabase functions deploy sync-omie --no-verify-jwt
supabase functions deploy analyze --no-verify-jwt
supabase functions deploy export-excel --no-verify-jwt
supabase functions deploy upload-dre --no-verify-jwt
```

### Passo 3: Configurar Secrets

#### 3.1 Via Interface Web

1. Acesse: https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/settings/functions

2. Adicione os seguintes secrets (Edge Function Secrets):

```
SUPABASE_URL=https://xzrmzmcoslomtzkzgskn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzI4NjIzfQ.716RfI9V2Vv3nGcx5rK4epnLddUUdFT3-doegfrXcmk
DATABASE_URL=postgresql://postgres:B5b0dcf500@#@db.xzrmzmcoslomtzkzgskn.supabase.co:6543/postgres?pgbouncer=true
OPENAI_API_KEY=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
ANTHROPIC_API_KEY=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
KMS_SECRET=B5b0dcf500@#
F360_API_BASE=https://app.f360.com.br/api
OMIE_API_BASE=https://app.omie.com.br/api/v1/
```

#### 3.2 Via CLI

Se você tiver acesso via CLI:

```bash
# Usar o script de deploy
chmod +x deploy.sh
./deploy.sh
```

Ou manualmente:

```bash
source .env

supabase secrets set \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY" \
  DATABASE_URL="$DATABASE_URL" \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  KMS_SECRET="$KMS_SECRET" \
  F360_API_BASE="$F360_API_BASE" \
  OMIE_API_BASE="$OMIE_API_BASE"
```

## Opção 2: Criar Novo Projeto Supabase

Se você não conseguir acesso ao projeto `xzrmzmcoslomtzkzgskn`:

1. Crie um novo projeto no Supabase:
   ```bash
   # Via interface web em https://supabase.com/dashboard
   ```

2. Atualize o arquivo `.env` com as novas credenciais

3. Atualize `PROJECT_REF` no `deploy.sh`

4. Execute o script de deploy:
   ```bash
   ./deploy.sh
   ```

## Verificação do Deploy

### 1. Verificar Tabelas e Dados

```sql
-- Contar registros nas integrações
SELECT 'F360' as source, COUNT(*) as total FROM integration_f360
UNION ALL
SELECT 'OMIE' as source, COUNT(*) as total FROM integration_omie;

-- Verificar health
SELECT * FROM v_audit_health;

-- Ver jobs agendados
SELECT * FROM cron.job;
```

### 2. Testar Edge Functions

```bash
# Testar sync-f360
curl -X POST https://xzrmzmcoslomtzkzgskn.functions.supabase.co/sync-f360 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI"

# Testar analyze
curl "https://xzrmzmcoslomtzkzgskn.functions.supabase.co/analyze?style=technical&cnpj=00052912647000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTI2MjMsImV4cCI6MjA3NzMyODYyM30.smtxh5O5vKzdLBK3GWVudfFQsNpwkzXgc1Qev2gIicI"
```

### 3. Ver Logs

Via CLI:
```bash
supabase functions logs sync-f360 --follow
supabase functions logs sync-omie --follow
```

Via interface:
https://supabase.com/dashboard/project/xzrmzmcoslomtzkzgskn/logs/functions

## Troubleshooting

### Erro: "Cannot find project ref"

**Solução:** Você não tem acesso ao projeto via CLI. Use o deploy manual via interface web.

### Erro: "pgcrypto extension not found"

**Solução:** Execute a migração SQL novamente. A extensão deve ser criada automaticamente.

### Erro: "decrypt_f360_token function does not exist"

**Solução:** A migração não foi aplicada completamente. Re-execute `migrations/001_bootstrap.sql`.

### Edge Functions retornam 500

**Solução:**
1. Verifique se os secrets foram configurados
2. Verifique os logs da função
3. Certifique-se de que a tabela `clientes` existe no banco

## Próximos Passos

Após o deploy bem-sucedido:

1. ✅ Testar sincronização F360 e OMIE
2. ✅ Criar um grupo/holding de teste
3. ✅ Testar análise com IA
4. ✅ Testar exportação de relatórios
5. ✅ Configurar dashboard frontend (se necessário)

## Suporte

Para problemas ou dúvidas:
- Verifique os logs das Edge Functions
- Consulte o README.md principal
- Execute queries de diagnóstico no SQL Editor
