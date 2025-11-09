# Setup de Sincronização Automática dos ERPs (F360 e Omie)

## ✅ O que foi implementado

1. **Tabelas criadas no Supabase:**
   - `integration_f360` - Armazena tokens criptografados do F360
   - `integration_omie` - Armazena app_key e app_secret criptografados do Omie
   - `dre_entries` - Armazena lançamentos do DRE
   - `cashflow_entries` - Armazena lançamentos de fluxo de caixa
   - `sync_state` - Controla estado da sincronização incremental
   - `v_kpi_monthly` e `v_kpi_monthly_enriched` - Views de KPIs mensais

2. **Edge Function criada:**
   - `scheduled-sync-erp` - Busca dados dos ERPs e popula o Supabase

3. **Cron Jobs configurados:**
   - **03:00 BRT** (06:00 UTC) - Sincronização matinal
   - **12:50 BRT** (15:50 UTC) - Sincronização da tarde

4. **Sincronização incremental:**
   - Usa `sync_state` para armazenar o último cursor/página processado
   - Busca apenas dados dos últimos 90 dias
   - Evita reprocessamento de dados já sincronizados

## 🔧 Configuração necessária

### Passo 1: Configurar variáveis de ambiente no Supabase

Execute no SQL Editor do Supabase:

```sql
-- Configurar chave de criptografia (use uma chave forte em produção!)
select set_config('app.kms', 'B5b0dcf500@#', false);

-- Configurar URL do projeto e service key
select set_config('app.project_url', 'https://newczbjzzfkwwnpfmygm.supabase.co', false);
select set_config('app.service_key', 'YOUR_SERVICE_ROLE_KEY_HERE', false);
```

**⚠️ IMPORTANTE:** Substitua `YOUR_SERVICE_ROLE_KEY_HERE` pela sua Service Role Key do Supabase.

### Passo 2: Adicionar integrações F360

Execute no SQL Editor do Supabase (após configurar a chave KMS no Passo 1):

```sql
-- Exemplo de inserção de integração F360
insert into integration_f360 (cliente_nome, cnpj, token_enc)
values (
  'NOME DA EMPRESA',
  only_digits('00.000.000/0000-00'),
  pgp_sym_encrypt('TOKEN_F360_AQUI', current_setting('app.kms', true))
);
```

### Passo 3: Adicionar integrações Omie

Execute no SQL Editor do Supabase:

```sql
-- Exemplo de inserção de integração Omie
insert into integration_omie (cliente_nome, app_key_enc, app_secret_enc)
values (
  'NOME DA EMPRESA',
  pgp_sym_encrypt('APP_KEY_AQUI', current_setting('app.kms', true)),
  pgp_sym_encrypt('APP_SECRET_AQUI', current_setting('app.kms', true))
);
```

## 🧪 Testar a sincronização manualmente

Você pode testar a sincronização antes dos horários agendados:

```bash
# Obter a URL do projeto
PROJECT_URL="https://newczbjzzfkwwnpfmygm.supabase.co"
SERVICE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"

# Executar sincronização
curl -X POST "${PROJECT_URL}/functions/v1/scheduled-sync-erp" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json"
```

Ou execute no SQL Editor:

```sql
select public.trigger_erp_sync();
```

## 📊 Monitorar sincronizações

### Ver estado das sincronizações:

```sql
select * from sync_state order by updated_at desc;
```

### Ver últimos lançamentos DRE:

```sql
select * from dre_entries 
order by created_at desc 
limit 100;
```

### Ver KPIs mensais:

```sql
select * from v_kpi_monthly_enriched 
where month >= date_trunc('month', now() - interval '6 months')
order by company_cnpj, month;
```

### Ver logs dos cron jobs:

```sql
select * from cron.job_run_details 
where jobid in (
  select jobid from cron.job 
  where jobname in ('erp_sync_morning', 'erp_sync_afternoon')
)
order by start_time desc;
```

## 🔐 Segurança

- Tokens são criptografados usando `pgcrypto` com chave simétrica
- Funções de decriptação são `SECURITY DEFINER`
- Service Role Key necessária para invocar Edge Functions
- Recomenda-se usar uma chave KMS forte em produção

## 📝 APIs dos ERPs

### F360
- Base URL: `https://api.f360.com.br/v1`
- Endpoint usado: `/lancamentos`
- Autenticação: Bearer Token

### Omie
- Base URL: `https://app.omie.com.br/api/v1`
- Endpoint usado: `/financas/contacorrente/`
- Autenticação: app_key + app_secret no body

## 🚀 Próximos passos

1. Adicionar todas as integrações F360 e Omie usando os scripts SQL acima
2. Configurar as variáveis de ambiente
3. Testar a sincronização manualmente
4. Aguardar os horários agendados (03:00 e 12:50 BRT)
5. Monitorar os logs e o estado das sincronizações

## ❓ Troubleshooting

### Erro: "Missing project_url or service_key configuration"
Execute o Passo 1 para configurar as variáveis de ambiente.

### Erro: "Failed to decrypt token"
Certifique-se de que a chave KMS foi configurada antes de inserir os dados.

### Sincronização não está executando
Verifique se os cron jobs foram criados:
```sql
select * from cron.job where jobname like 'erp_sync%';
```

### Dados não estão aparecendo
1. Verifique os logs da Edge Function no Supabase Dashboard
2. Execute a sincronização manualmente para ver erros detalhados
3. Verifique se os tokens/credenciais estão corretos

