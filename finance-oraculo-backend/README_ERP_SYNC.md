# 🚀 Sistema de Sincronização Automática ERP → Supabase

## 📋 Visão Geral

Sistema completo de sincronização automática que busca dados financeiros dos ERPs **F360** e **Omie**, processa e armazena no Supabase para alimentar o sistema de análise financeira e oráculos.

### ✨ Funcionalidades

- ✅ **Sincronização automática** nos horários: **03:00** e **12:50** (horário de Brasília)
- ✅ **Sincronização incremental** - evita reprocessamento de dados
- ✅ **Dados dos últimos 90 dias** - busca histórico recente
- ✅ **Suporte a múltiplos clientes** - processa todos os clientes com token configurado
- ✅ **Segurança** - tokens criptografados no banco de dados
- ✅ **DRE e Cashflow** - popula ambas as tabelas automaticamente
- ✅ **Views de KPIs** - cálculos automáticos de métricas mensais

## 🏗️ Arquitetura

```
┌─────────────────┐         ┌──────────────────┐
│   F360 API      │         │   OMIE API       │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌─────────────────────────┐
         │  Edge Function          │
         │  scheduled-sync-erp     │
         └────────┬────────────────┘
                  │
                  ▼
         ┌─────────────────────────┐
         │  Supabase PostgreSQL    │
         │                         │
         │  • dre_entries          │
         │  • cashflow_entries     │
         │  • sync_state           │
         │  • v_kpi_monthly        │
         └─────────────────────────┘
                  │
                  ▼
         ┌─────────────────────────┐
         │  Frontend Analytics     │
         │  Sistema de Oráculos    │
         └─────────────────────────┘
```

## 📦 Estrutura de Dados

### Tabelas Criadas

#### `integration_f360`
Armazena integrações com F360
- `id` - UUID
- `cliente_nome` - Nome do cliente
- `cnpj` - CNPJ do cliente
- `token_enc` - Token criptografado
- `created_at` - Data de criação

#### `integration_omie`
Armazena integrações com Omie
- `id` - UUID
- `cliente_nome` - Nome do cliente
- `app_key_enc` - App Key criptografado
- `app_secret_enc` - App Secret criptografado
- `created_at` - Data de criação

#### `dre_entries`
Lançamentos do DRE
- `id` - Bigserial
- `company_cnpj` - CNPJ da empresa
- `company_nome` - Nome da empresa
- `date` - Data do lançamento
- `account` - Conta contábil
- `nature` - Natureza: 'receita' | 'custo' | 'despesa' | 'outras'
- `amount` - Valor (sempre positivo)
- `created_at` - Data de inserção

#### `cashflow_entries`
Lançamentos de fluxo de caixa
- `id` - Bigserial
- `company_cnpj` - CNPJ da empresa
- `company_nome` - Nome da empresa
- `date` - Data do lançamento
- `kind` - Tipo: 'in' | 'out'
- `category` - Categoria do lançamento
- `amount` - Valor (sempre positivo)
- `created_at` - Data de inserção

#### `sync_state`
Estado da sincronização incremental
- `id` - UUID
- `source` - 'F360' | 'OMIE'
- `cnpj` - CNPJ da empresa
- `cliente_nome` - Nome do cliente
- `last_success_at` - Última sincronização bem-sucedida
- `last_cursor` - Cursor/página da última sincronização
- `updated_at` - Última atualização

### Views Criadas

#### `v_kpi_monthly`
KPIs mensais agregados por CNPJ
- `month` - Mês de referência
- `company_cnpj` - CNPJ da empresa
- `receita` - Total de receitas
- `custos` - Total de custos (negativo)
- `despesas` - Total de despesas (negativo)
- `outras` - Outras movimentações
- `ebitda` - EBITDA calculado

#### `v_kpi_monthly_enriched`
KPIs mensais com indicadores adicionais
- Todos os campos de `v_kpi_monthly`
- `margem_bruta` - Margem bruta percentual

## 🔧 Instalação e Configuração

### Passo 1: Configurar Ambiente

Execute o script de configuração:

```sql
-- No SQL Editor do Supabase, execute:
\i scripts/setup-environment.sql
```

**IMPORTANTE:** Edite o script e substitua `YOUR_SERVICE_ROLE_KEY_HERE` pela sua Service Role Key real.

### Passo 2: Adicionar Integrações

Execute o script para adicionar suas integrações F360 e Omie:

```sql
-- No SQL Editor do Supabase, execute:
\i scripts/add-integrations.sql
```

**IMPORTANTE:** Edite o script antes de executar, adicionando os dados reais de suas integrações.

### Passo 3: Testar Sincronização

Teste manualmente antes de aguardar os horários agendados:

```sql
-- No SQL Editor do Supabase:
select public.trigger_erp_sync();
```

Ou via curl:

```bash
curl -X POST "https://newczbjzzfkwwnpfmygm.supabase.co/functions/v1/scheduled-sync-erp" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## 📊 Monitoramento

### Ver Estado das Sincronizações

```sql
select 
  source,
  cliente_nome,
  cnpj,
  last_success_at,
  last_cursor,
  age(now(), last_success_at) as tempo_desde_ultima_sync
from sync_state 
order by last_success_at desc;
```

### Ver Últimos Lançamentos DRE

```sql
select 
  company_nome,
  date,
  account,
  nature,
  amount,
  created_at
from dre_entries 
order by created_at desc 
limit 50;
```

### Ver Cashflow

```sql
select 
  company_nome,
  date,
  kind,
  category,
  amount,
  created_at
from cashflow_entries 
order by created_at desc 
limit 50;
```

### Ver KPIs Mensais

```sql
select 
  month,
  company_cnpj,
  receita,
  custos,
  despesas,
  ebitda,
  round(margem_bruta * 100, 2) as margem_bruta_pct
from v_kpi_monthly_enriched 
where month >= date_trunc('month', now() - interval '6 months')
order by company_cnpj, month desc;
```

### Ver Logs dos Cron Jobs

```sql
select 
  jr.jobid,
  j.jobname,
  jr.start_time,
  jr.end_time,
  jr.status,
  jr.return_message
from cron.job_run_details jr
join cron.job j on j.jobid = jr.jobid
where j.jobname in ('erp_sync_morning', 'erp_sync_afternoon')
order by jr.start_time desc
limit 20;
```

### Ver Logs da Edge Function

No Supabase Dashboard:
1. Vá em **Functions**
2. Clique em **scheduled-sync-erp**
3. Vá na aba **Logs**

## ⏰ Horários de Sincronização

- **03:00 BRT** (06:00 UTC) - Sincronização matinal
  - Processa dados da noite anterior
  - Atualiza dashboards para início do dia
  
- **12:50 BRT** (15:50 UTC) - Sincronização da tarde
  - Processa dados da manhã
  - Atualiza dashboards antes do final do expediente

## 🔐 Segurança

- **Tokens criptografados**: Usa `pgcrypto` com chave simétrica
- **Funções seguras**: `SECURITY DEFINER` para decriptação
- **Acesso controlado**: Apenas Service Role Key pode invocar Edge Functions
- **Auditoria**: Todos os acessos são logados

## 🐛 Troubleshooting

### Erro: "Missing project_url or service_key configuration"
**Solução:** Execute o script `scripts/setup-environment.sql` e configure as variáveis.

### Erro: "Failed to decrypt token"
**Solução:** Configure a chave KMS antes de inserir dados:
```sql
select set_config('app.kms', 'B5b0dcf500@#', false);
```

### Sincronização não está executando
**Diagnóstico:**
```sql
-- Ver se cron jobs estão ativos
select * from cron.job where jobname like 'erp_sync%';

-- Ver últimas execuções
select * from cron.job_run_details 
where jobid in (select jobid from cron.job where jobname like 'erp_sync%')
order by start_time desc;
```

### Dados não estão aparecendo
**Checklist:**
1. Verificar se as integrações foram adicionadas
2. Testar credenciais manualmente
3. Ver logs da Edge Function
4. Executar sincronização manual para debug

### F360/Omie retornando erro
**Diagnóstico:**
- Verificar se o token/credenciais estão válidos
- Ver se há limite de requisições
- Checar formato da resposta da API

## 📚 Documentação Adicional

- [SETUP_ERP_SYNC.md](./SETUP_ERP_SYNC.md) - Guia detalhado de setup
- [scripts/setup-environment.sql](./scripts/setup-environment.sql) - Script de configuração
- [scripts/add-integrations.sql](./scripts/add-integrations.sql) - Script para adicionar integrações

## 🎯 Próximos Passos

1. ✅ Configurar ambiente (Passo 1)
2. ✅ Adicionar integrações (Passo 2)
3. ✅ Testar sincronização (Passo 3)
4. ⏳ Aguardar primeiro ciclo automático
5. 📊 Monitorar resultados e logs
6. 🔧 Ajustar conforme necessário

## 💡 Dicas

- **Performance**: O sistema processa apenas os últimos 90 dias para otimizar
- **Incremental**: Usa cursors/páginas para evitar reprocessar dados
- **Resiliência**: Erros em um cliente não afetam outros
- **Extensível**: Fácil adicionar novos ERPs ou modificar mapeamentos

## 🤝 Suporte

Para questões ou problemas:
1. Verifique os logs no Supabase Dashboard
2. Execute queries de diagnóstico acima
3. Revise a documentação técnica
4. Entre em contato com o time de desenvolvimento

---

**Última atualização:** Novembro 2025
**Versão:** 1.0.0

