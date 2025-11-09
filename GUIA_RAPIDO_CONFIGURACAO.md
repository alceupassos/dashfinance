# 🚀 GUIA RÁPIDO - Configuração do Sistema ERP

## ✅ STATUS: IMPLEMENTAÇÃO COMPLETA

Todo o backend foi implementado e está pronto para uso. Você só precisa configurar!

---

## 📋 CHECKLIST RÁPIDO (30 minutos)

### ☑️ Passo 1: Configurar Ambiente (5 min)

1. Abra o **Supabase Dashboard** → **SQL Editor**
2. Abra o arquivo: `finance-oraculo-backend/scripts/setup-environment.sql`
3. **EDITE a linha 23:** Substitua `YOUR_SERVICE_ROLE_KEY_HERE` pela sua Service Role Key
   - Encontre em: Dashboard → Settings → API → service_role (secret)
4. Execute o script completo
5. Confira se todos os checks estão ✅

### ☑️ Passo 2: Adicionar Integrações F360 (10 min)

1. Abra: `finance-oraculo-backend/scripts/add-integrations.sql`
2. Substitua os exemplos pelos seus dados reais:

```sql
select set_config('app.kms', 'B5b0dcf500@#', false);

insert into integration_f360 (cliente_nome, cnpj, token_enc)
values 
  ('CLIENTE 1', only_digits('00.000.000/0000-00'), pgp_sym_encrypt('token1', current_setting('app.kms', true))),
  ('CLIENTE 2', only_digits('11.111.111/0001-11'), pgp_sym_encrypt('token2', current_setting('app.kms', true)))
on conflict (cnpj, cliente_nome) do update set token_enc = excluded.token_enc;
```

3. Execute o script
4. Verifique: `select * from integration_f360;`

### ☑️ Passo 3: Adicionar Integrações Omie (10 min)

No mesmo arquivo (`add-integrations.sql`):

```sql
insert into integration_omie (cliente_nome, app_key_enc, app_secret_enc)
values 
  ('CLIENTE 1', 
   pgp_sym_encrypt('app_key_1', current_setting('app.kms', true)),
   pgp_sym_encrypt('app_secret_1', current_setting('app.kms', true)))
on conflict (cliente_nome) do update 
set app_key_enc = excluded.app_key_enc, app_secret_enc = excluded.app_secret_enc;
```

Execute e verifique: `select * from integration_omie;`

### ☑️ Passo 4: Testar Sincronização (5 min)

```sql
-- No SQL Editor:
select public.trigger_erp_sync();

-- Aguarde alguns segundos e verifique:
select count(*) as total_dre from dre_entries;
select count(*) as total_cashflow from cashflow_entries;

-- Ver dados:
select * from dre_entries order by created_at desc limit 10;
```

### ☑️ Passo 5: Verificar Agendamento

```sql
-- Ver se os cron jobs estão ativos:
select jobname, schedule, active from cron.job 
where jobname like 'erp_sync%';
```

**Deve mostrar:**
- `erp_sync_morning` - `0 6 * * *` - active: true
- `erp_sync_afternoon` - `50 15 * * *` - active: true

---

## 🎯 PRONTO! Sistema Configurado

### O que vai acontecer agora?

✅ **Hoje às 12:50 BRT (15:50 UTC):** Primeira sincronização automática
✅ **Amanhã às 03:00 BRT (06:00 UTC):** Segunda sincronização automática
✅ **Todos os dias:** Duas sincronizações automáticas

### Como monitorar?

```sql
-- Ver estado das sincronizações:
select * from sync_state order by updated_at desc;

-- Ver KPIs mensais:
select * from v_kpi_monthly_enriched 
where month >= date_trunc('month', now() - interval '3 months')
order by month desc;

-- Ver logs dos cron jobs:
select j.jobname, jr.start_time, jr.status, jr.return_message
from cron.job_run_details jr
join cron.job j on j.jobid = jr.jobid
where j.jobname like 'erp_sync%'
order by jr.start_time desc
limit 10;
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

Se precisar de mais detalhes, consulte:

1. **`IMPLEMENTACAO_COMPLETA_ERP_SYNC.md`** - Visão geral completa
2. **`README_ERP_SYNC.md`** - Documentação técnica detalhada
3. **`SETUP_ERP_SYNC.md`** - Guia de setup passo a passo
4. **`MIGRATIONS_APPLIED.md`** - Histórico de migrações
5. Este arquivo - Guia rápido

---

## 🆘 PRECISA DE AJUDA?

### Erro comum #1: "Missing project_url or service_key"
**Solução:** Execute o Passo 1 acima

### Erro comum #2: "Failed to decrypt token"
**Solução:** Execute antes de inserir dados:
```sql
select set_config('app.kms', 'B5b0dcf500@#', false);
```

### Erro comum #3: Dados não aparecem
**Debug:**
```sql
-- Ver se há integrações:
select * from integration_f360;
select * from integration_omie;

-- Ver logs da última execução:
select * from cron.job_run_details 
order by start_time desc limit 1;

-- Executar manualmente e ver erro:
select public.trigger_erp_sync();
```

### Ver logs da Edge Function
Supabase Dashboard → Functions → scheduled-sync-erp → Logs

---

## ✨ PRÓXIMOS PASSOS OPCIONAIS

1. **Adicionar mais clientes** - Basta executar mais INSERTs no script de integrações
2. **Alterar horários** - Modificar os cron jobs se necessário
3. **Criar relatórios** - Usar as views de KPIs no frontend
4. **Configurar alertas** - Criar triggers para notificações
5. **Exportar dados** - Usar a função `export-excel` existente

---

## 💡 DICAS PRO

### Execução Manual Quando Precisar
```sql
select public.trigger_erp_sync();
```

### Ver Receita Total do Mês Atual
```sql
select sum(receita) as receita_total_mes
from v_kpi_monthly
where month = date_trunc('month', now());
```

### Comparar Mês Atual vs Anterior
```sql
with dados as (
  select 
    month,
    sum(receita) as receita,
    sum(ebitda) as ebitda
  from v_kpi_monthly
  where month >= date_trunc('month', now() - interval '1 month')
  group by month
)
select 
  (select receita from dados where month = date_trunc('month', now())) as receita_atual,
  (select receita from dados where month = date_trunc('month', now() - interval '1 month')) as receita_anterior,
  round(
    ((select receita from dados where month = date_trunc('month', now())) - 
     (select receita from dados where month = date_trunc('month', now() - interval '1 month'))) /
    nullif((select receita from dados where month = date_trunc('month', now() - interval '1 month')), 0) * 100, 
    2
  ) as variacao_percentual;
```

---

## 🎊 TUDO PRONTO!

Seu sistema de sincronização ERP está configurado e operacional!

**Status:** ✅ FUNCIONANDO  
**Próxima sincronização:** Hoje às 12:50 BRT  
**Frequência:** 2x por dia (03:00 e 12:50 BRT)  
**Dados:** Últimos 90 dias sincronizados incrementalmente  

Qualquer dúvida, consulte a documentação completa ou os logs no Supabase Dashboard.

---

**Criado em:** Novembro 8, 2025  
**Versão:** 1.0.0  
**Tempo estimado de configuração:** 30 minutos

