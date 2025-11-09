# Migrações Aplicadas no Supabase

## ✅ Migrações Executadas com Sucesso

### 1. `enable_extensions` ✅
**Data:** Novembro 8, 2025
**Descrição:** Habilitar extensões necessárias

```sql
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
```

**Status:** ✅ Aplicada com sucesso

---

### 2. `create_dre_tables` ✅
**Data:** Novembro 8, 2025
**Descrição:** Criar tabelas principais do sistema ERP

**Tabelas criadas:**
- `integration_f360` - Integrações F360
- `integration_omie` - Integrações Omie
- `sync_state` - Estado de sincronização
- `dre_entries` - Lançamentos DRE
- `cashflow_entries` - Lançamentos cashflow

**Índices criados:**
- `idx_dre_cnpj_date` - Otimiza queries por CNPJ e data no DRE
- `idx_dre_date` - Otimiza queries por data no DRE
- `idx_dre_nature` - Otimiza queries por natureza no DRE
- `idx_cf_cnpj_date` - Otimiza queries por CNPJ e data no cashflow
- `idx_cf_date` - Otimiza queries por data no cashflow
- `idx_cf_kind` - Otimiza queries por tipo no cashflow

**Unique constraints:**
- `(cnpj, cliente_nome)` em `integration_f360`
- `(cliente_nome)` em `integration_omie`
- `(source, cnpj, cliente_nome)` em `sync_state`
- `(company_cnpj, date, account)` em `dre_entries`
- `(company_cnpj, date, category, kind)` em `cashflow_entries`

**Status:** ✅ Aplicada com sucesso

---

### 3. `create_views_and_decrypt_functions` ✅
**Data:** Novembro 8, 2025
**Descrição:** Criar views de KPIs e funções de descriptografia

**Views criadas:**
- `v_kpi_monthly` - Agregação mensal de KPIs por CNPJ
- `v_kpi_monthly_enriched` - KPIs com indicadores calculados (margem bruta, etc)

**Funções criadas:**
- `decrypt_f360_token(_id uuid)` - Decripta token F360 de forma segura
- `decrypt_omie_keys(_id uuid)` - Decripta app_key e app_secret do Omie

**Status:** ✅ Aplicada com sucesso

---

### 4. `setup_cron_jobs_erp_sync` ✅
**Data:** Novembro 8, 2025
**Descrição:** Configurar cron jobs e função de trigger

**Função criada:**
- `trigger_erp_sync()` - Invoca a Edge Function de sincronização via pg_net

**Cron jobs criados:**
- `erp_sync_morning` - Executa às 06:00 UTC (03:00 BRT) todos os dias
- `erp_sync_afternoon` - Executa às 15:50 UTC (12:50 BRT) todos os dias

**Configuração:**
- Timeout de 5 minutos (300000ms)
- Usa pg_net para chamadas HTTP assíncronas
- Requer variáveis `app.project_url` e `app.service_key`

**Status:** ✅ Aplicada com sucesso

---

## 📊 Edge Functions Deployadas

### `scheduled-sync-erp` ✅
**ID:** 78a3bb8c-cfbb-4acd-80c4-17f51ef1f2d0
**Versão:** 1
**Status:** ACTIVE
**Deploy:** Novembro 8, 2025

**Arquivos:**
- `index.ts` - Handler principal
- `common/db.ts` - Funções de banco de dados compartilhadas

**Funcionalidades:**
- Sincronização F360 (busca lançamentos via API)
- Sincronização Omie (busca lançamentos via API)
- Processamento e transformação de dados
- Upsert em `dre_entries` e `cashflow_entries`
- Atualização de `sync_state` para sincronização incremental
- Suporte a múltiplos clientes
- Tratamento de erros individualizado
- Logs detalhados

---

## 🔄 Rollback (se necessário)

Caso precise reverter as migrações:

```sql
-- Remover cron jobs
select cron.unschedule('erp_sync_morning');
select cron.unschedule('erp_sync_afternoon');

-- Remover função de trigger
drop function if exists public.trigger_erp_sync();

-- Remover funções de descriptografia
drop function if exists decrypt_f360_token(uuid);
drop function if exists decrypt_omie_keys(uuid);

-- Remover views
drop view if exists v_kpi_monthly_enriched;
drop view if exists v_kpi_monthly;

-- Remover tabelas (CUIDADO: Apaga todos os dados!)
drop table if exists cashflow_entries cascade;
drop table if exists dre_entries cascade;
drop table if exists sync_state cascade;
drop table if exists integration_omie cascade;
drop table if exists integration_f360 cascade;

-- Remover extensões (se não forem usadas em outro lugar)
-- drop extension if exists pg_net;
-- drop extension if exists pg_cron;
-- drop extension if exists pg_trgm;
-- drop extension if exists pgcrypto;
```

**⚠️ ATENÇÃO:** O rollback completo apaga todos os dados! Faça backup antes.

---

## 📝 Próximas Migrações Possíveis

Funcionalidades que podem ser adicionadas no futuro:

1. **Tabela de audit logs** - Rastrear todas as mudanças
2. **Tabela de alertas** - Notificações de anomalias
3. **Tabela de budgets** - Comparação com orçamento
4. **View de tendências** - Análise de crescimento
5. **Função de exportação PDF** - Relatórios automatizados
6. **Tabela de snapshots diários** - Cache de métricas
7. **Webhook para notificações** - Integração externa

---

## 🧪 Testar Integridade

Execute estas queries para verificar se tudo está funcionando:

```sql
-- Verificar extensões
select * from pg_extension 
where extname in ('pgcrypto', 'pg_trgm', 'pg_cron', 'pg_net');

-- Verificar tabelas
select table_name 
from information_schema.tables 
where table_schema = 'public' 
and table_name in (
  'integration_f360', 'integration_omie', 
  'sync_state', 'dre_entries', 'cashflow_entries'
);

-- Verificar views
select table_name 
from information_schema.views 
where table_schema = 'public' 
and table_name in ('v_kpi_monthly', 'v_kpi_monthly_enriched');

-- Verificar funções
select routine_name 
from information_schema.routines 
where routine_schema = 'public' 
and routine_name in (
  'decrypt_f360_token', 'decrypt_omie_keys', 
  'trigger_erp_sync', 'only_digits'
);

-- Verificar cron jobs
select * from cron.job 
where jobname in ('erp_sync_morning', 'erp_sync_afternoon');

-- Verificar índices
select indexname 
from pg_indexes 
where schemaname = 'public' 
and tablename in ('dre_entries', 'cashflow_entries');
```

---

## ✅ Checklist de Validação

- [x] Extensões habilitadas
- [x] Tabelas criadas com constraints
- [x] Índices otimizados
- [x] Views funcionando
- [x] Funções de descriptografia seguras
- [x] Função de trigger configurada
- [x] Cron jobs agendados
- [x] Edge Function deployada
- [x] Documentação completa

---

**Última atualização:** Novembro 8, 2025
**Status:** ✅ TODAS AS MIGRAÇÕES APLICADAS COM SUCESSO

