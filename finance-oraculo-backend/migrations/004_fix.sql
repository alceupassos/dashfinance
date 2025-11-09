-- Fix para Migration 004

-- 1. Corrigir view v_llm_monthly_usage (ambiguidade em created_at)
drop view if exists v_llm_monthly_usage;

create or replace view v_llm_monthly_usage as
select
  date_trunc('month', l.created_at)::date as month,
  lm.display_name as model_name,
  lp.display_name as provider_name,
  count(*) as request_count,
  sum(l.input_tokens) as total_input_tokens,
  sum(l.output_tokens) as total_output_tokens,
  sum(l.cost_usd) as total_cost_usd,
  avg(l.response_time_ms) as avg_response_time_ms,
  sum(case when l.success then 1 else 0 end)::float / count(*) * 100 as success_rate
from llm_usage_logs l
join llm_models lm on lm.id = l.llm_model_id
join llm_providers lp on lp.id = lm.provider_id
group by date_trunc('month', l.created_at), lm.display_name, lp.display_name
order by month desc, total_cost_usd desc;

-- 2. Adaptar audit_log existente (adicionar colunas faltantes)
alter table audit_log
  add column if not exists old_value jsonb,
  add column if not exists new_value jsonb;

-- Renomear table_name para resource_type se necessário
do $$
begin
  if exists(select 1 from information_schema.columns where table_name='audit_log' and column_name='table_name') then
    alter table audit_log rename column table_name to resource_type;
  end if;
end
$$;

-- Renomear timestamp para created_at se necessário
do $$
begin
  if exists(select 1 from information_schema.columns where table_name='audit_log' and column_name='timestamp') then
    alter table audit_log rename column timestamp to created_at;
  end if;
end
$$;

-- Renomear record_id para resource_id se necessário
do $$
begin
  if exists(select 1 from information_schema.columns where table_name='audit_log' and column_name='record_id') then
    alter table audit_log rename column record_id to resource_id;
    alter table audit_log alter column resource_id type text using resource_id::text;
  end if;
end
$$;

-- Adicionar índices faltantes
create index if not exists idx_audit_log_resource on audit_log(resource_type);
create index if not exists idx_audit_log_created on audit_log(created_at);

-- Habilitar RLS
alter table audit_log enable row level security;

select 'Migration 004 fix completed!' as status;
