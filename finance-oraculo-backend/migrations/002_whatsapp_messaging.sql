-- ========================================================
-- WHATSAPP MESSAGING & CLIENT NOTIFICATIONS
-- ========================================================

set search_path = public;

-- =========================
-- TABELA DE SNAPSHOTS DIÁRIOS
-- =========================
create table if not exists daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  snapshot_date date not null,
  cash_balance numeric(18,2),
  available_for_payments numeric(18,2),
  runway_days integer,
  monthly_burn numeric(18,2),
  overdue_payables_count integer default 0,
  overdue_payables_amount numeric(18,2) default 0,
  overdue_receivables_count integer default 0,
  overdue_receivables_amount numeric(18,2) default 0,
  revenue_mtd numeric(18,2),
  ebitda_mtd numeric(18,2),
  ebitda_margin numeric(5,4),
  created_at timestamptz default now(),
  unique(company_cnpj, snapshot_date)
);

create index if not exists idx_daily_snapshots_cnpj_date on daily_snapshots(company_cnpj, snapshot_date desc);

-- =========================
-- TABELA DE MENSAGENS AGENDADAS
-- =========================
create table if not exists scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  phone_number text not null,
  message_type text not null, -- 'snapshot', 'overdue_alert', 'kpi_weekly', etc.
  message_template text not null,
  message_data jsonb,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  error_message text,
  created_at timestamptz default now()
);

create index if not exists idx_scheduled_messages_status on scheduled_messages(status, scheduled_for) where status = 'pending';
create index if not exists idx_scheduled_messages_cnpj on scheduled_messages(company_cnpj, created_at desc);

-- =========================
-- TABELA DE HISTÓRICO DE CONVERSAS
-- =========================
create table if not exists whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  phone_number text not null,
  message_direction text not null check (message_direction in ('inbound', 'outbound')),
  message_text text not null,
  message_data jsonb,
  response_text text,
  response_data jsonb,
  replied_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_whatsapp_conversations_cnpj on whatsapp_conversations(company_cnpj, created_at desc);
create index if not exists idx_whatsapp_conversations_phone on whatsapp_conversations(phone_number, created_at desc);

-- =========================
-- TABELA DE CONFIGURAÇÕES DE CLIENTE
-- =========================
create table if not exists client_notifications_config (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null unique,
  phone_number text not null,
  daily_snapshot_enabled boolean default true,
  daily_snapshot_time time default '08:00:00',
  overdue_alerts_enabled boolean default true,
  weekly_kpi_enabled boolean default true,
  weekly_kpi_day integer default 1, -- 1=Monday
  monthly_dre_enabled boolean default true,
  cash_threshold numeric(18,2),
  runway_threshold_days integer default 30,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_client_notifications_config_cnpj on client_notifications_config(company_cnpj);

-- =========================
-- TABELA DE CACHE DE RESPOSTAS IA
-- =========================
create table if not exists ai_response_cache (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  question_hash text not null,
  question_text text not null,
  answer_text text not null,
  source_data jsonb,
  cache_expires_at timestamptz not null,
  created_at timestamptz default now(),
  unique(company_cnpj, question_hash)
);

create index if not exists idx_ai_response_cache_hash on ai_response_cache(company_cnpj, question_hash, cache_expires_at);

-- =========================
-- FUNÇÃO: CALCULAR SNAPSHOT DIÁRIO
-- =========================
create or replace function fn_calculate_daily_snapshot(p_cnpj text, p_date date default current_date)
returns jsonb language plpgsql as $$
declare
  v_result jsonb;
  v_revenue numeric;
  v_costs numeric;
  v_expenses numeric;
  v_ebitda numeric;
  v_margin numeric;
begin
  -- Calcular métricas DRE do mês
  select
    sum(case when nature='receita' then amount else 0 end),
    sum(case when nature='custo' then amount else 0 end) * -1,
    sum(case when nature='despesa' then amount else 0 end) * -1
  into v_revenue, v_costs, v_expenses
  from dre_entries
  where company_cnpj = only_digits(p_cnpj)
    and date >= date_trunc('month', p_date)::date
    and date <= p_date;

  v_ebitda := coalesce(v_revenue, 0) + coalesce(v_costs, 0) + coalesce(v_expenses, 0);
  v_margin := case when coalesce(v_revenue, 0) > 0 then v_ebitda / v_revenue else null end;

  -- Montar resultado
  v_result := jsonb_build_object(
    'company_cnpj', only_digits(p_cnpj),
    'snapshot_date', p_date,
    'revenue_mtd', coalesce(v_revenue, 0),
    'costs_mtd', coalesce(v_costs, 0),
    'expenses_mtd', coalesce(v_expenses, 0),
    'ebitda_mtd', v_ebitda,
    'ebitda_margin', v_margin,
    'cash_balance', 0, -- TODO: integrar com API bancária ou cashflow
    'available_for_payments', 0,
    'runway_days', 0,
    'monthly_burn', 0,
    'overdue_payables_count', 0,
    'overdue_payables_amount', 0,
    'overdue_receivables_count', 0,
    'overdue_receivables_amount', 0
  );

  return v_result;
end;
$$;

-- =========================
-- FUNÇÃO: ATUALIZAR SNAPSHOT (UPSERT)
-- =========================
create or replace function fn_update_daily_snapshot(p_cnpj text, p_date date default current_date)
returns void language plpgsql as $$
declare
  v_snapshot jsonb;
begin
  v_snapshot := fn_calculate_daily_snapshot(p_cnpj, p_date);

  insert into daily_snapshots (
    company_cnpj,
    snapshot_date,
    cash_balance,
    available_for_payments,
    runway_days,
    monthly_burn,
    revenue_mtd,
    ebitda_mtd,
    ebitda_margin,
    overdue_payables_count,
    overdue_payables_amount,
    overdue_receivables_count,
    overdue_receivables_amount
  ) values (
    v_snapshot->>'company_cnpj',
    (v_snapshot->>'snapshot_date')::date,
    (v_snapshot->>'cash_balance')::numeric,
    (v_snapshot->>'available_for_payments')::numeric,
    (v_snapshot->>'runway_days')::integer,
    (v_snapshot->>'monthly_burn')::numeric,
    (v_snapshot->>'revenue_mtd')::numeric,
    (v_snapshot->>'ebitda_mtd')::numeric,
    (v_snapshot->>'ebitda_margin')::numeric,
    (v_snapshot->>'overdue_payables_count')::integer,
    (v_snapshot->>'overdue_payables_amount')::numeric,
    (v_snapshot->>'overdue_receivables_count')::integer,
    (v_snapshot->>'overdue_receivables_amount')::numeric
  )
  on conflict (company_cnpj, snapshot_date)
  do update set
    cash_balance = excluded.cash_balance,
    available_for_payments = excluded.available_for_payments,
    runway_days = excluded.runway_days,
    monthly_burn = excluded.monthly_burn,
    revenue_mtd = excluded.revenue_mtd,
    ebitda_mtd = excluded.ebitda_mtd,
    ebitda_margin = excluded.ebitda_margin,
    overdue_payables_count = excluded.overdue_payables_count,
    overdue_payables_amount = excluded.overdue_payables_amount,
    overdue_receivables_count = excluded.overdue_receivables_count,
    overdue_receivables_amount = excluded.overdue_receivables_amount;
end;
$$;

-- =========================
-- FUNÇÃO: AGENDAR MENSAGEM
-- =========================
create or replace function fn_schedule_message(
  p_cnpj text,
  p_phone text,
  p_type text,
  p_template text,
  p_data jsonb,
  p_scheduled_for timestamptz default now()
)
returns uuid language plpgsql as $$
declare
  v_id uuid;
begin
  insert into scheduled_messages (
    company_cnpj,
    phone_number,
    message_type,
    message_template,
    message_data,
    scheduled_for
  ) values (
    only_digits(p_cnpj),
    p_phone,
    p_type,
    p_template,
    p_data,
    p_scheduled_for
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- =========================
-- VIEW: MENSAGENS PENDENTES
-- =========================
create or replace view v_pending_messages as
select
  sm.*,
  cnc.phone_number as config_phone,
  c.nome_interno_cliente as company_name
from scheduled_messages sm
left join client_notifications_config cnc on cnc.company_cnpj = sm.company_cnpj
left join clientes c on only_digits(c.cnpj) = sm.company_cnpj
where sm.status = 'pending'
  and sm.scheduled_for <= now()
order by sm.scheduled_for;

-- =========================
-- SEEDS: CONFIGURAÇÃO DE EXEMPLO
-- =========================
-- Adicionar configurações para alguns clientes
insert into client_notifications_config (
  company_cnpj,
  phone_number,
  daily_snapshot_enabled,
  daily_snapshot_time,
  cash_threshold,
  runway_threshold_days
)
select
  only_digits(cnpj),
  '5511999999999', -- Substituir pelo telefone real
  true,
  '08:00:00',
  50000,
  15
from integration_f360
where cnpj is not null
on conflict (company_cnpj) do nothing;

-- =========================
-- GRANTS
-- =========================
grant select, insert, update on daily_snapshots to authenticated, anon;
grant select, insert, update on scheduled_messages to authenticated, anon;
grant select, insert, update on whatsapp_conversations to authenticated, anon;
grant select, insert, update on client_notifications_config to authenticated, anon;
grant select, insert, update on ai_response_cache to authenticated, anon;

-- =========================
-- VERIFICAÇÃO
-- =========================
select 'Migration 002 completed successfully!' as status,
       (select count(*) from client_notifications_config) as clients_configured;
