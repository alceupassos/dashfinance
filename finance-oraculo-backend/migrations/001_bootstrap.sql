-- ========================================================
-- FINANCE ORACULO - BOOTSTRAP MIGRATION (Idempotente)
-- ========================================================
-- Aplique no SQL Editor do Supabase ou via CLI
-- Antes de rodar, configure a chave KMS:
-- select set_config('app.kms', 'B5b0dcf500@#', false);

set search_path = public;

-- Extensões necessárias
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- =========================
-- HELPERS
-- =========================
create or replace function public.only_digits(txt text)
returns text language sql immutable as $$
  select regexp_replace(coalesce(txt,''), '[^0-9]', '', 'g')
$$;

-- =========================
-- DIMENSÃO EMPRESAS
-- =========================
-- Garante índices úteis na tabela clientes existente
do $$
begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='idx_clientes_nome') then
    execute 'create index idx_clientes_nome on public.clientes using gin (nome_interno_cliente gin_trgm_ops)';
  end if;
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='idx_clientes_grupo') then
    execute 'create index idx_clientes_grupo on public.clientes (grupo)';
  end if;
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='idx_clientes_cnpj') then
    execute 'create index idx_clientes_cnpj on public.clientes (cnpj)';
  end if;
end $$;

-- =========================
-- INTEGRAÇÕES (tokens criptografados)
-- =========================
create table if not exists integration_f360 (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null,
  cnpj text not null,
  token_enc bytea not null,
  created_at timestamptz default now(),
  unique (cnpj, cliente_nome)
);

create table if not exists integration_omie (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null,
  app_key_enc bytea not null,
  app_secret_enc bytea not null,
  created_at timestamptz default now(),
  unique (cliente_nome)
);

-- =========================
-- ESTADO DE SINCRONIZAÇÃO
-- =========================
create table if not exists sync_state (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('F360','OMIE')),
  cnpj text,
  cliente_nome text,
  last_success_at timestamptz,
  last_cursor text,
  updated_at timestamptz default now()
);

-- =========================
-- FATOS FINANCEIROS
-- =========================
create table if not exists dre_entries (
  id bigserial primary key,
  company_cnpj text not null,
  company_nome text,
  date date not null,
  account text not null,               -- ex: Receita Bruta, COGS, Despesa Adm
  nature text not null,                -- 'receita' | 'custo' | 'despesa' | 'outras'
  amount numeric(18,2) not null,
  created_at timestamptz default now()
);
create index if not exists idx_dre_cnpj_date on dre_entries (company_cnpj, date);

create table if not exists cashflow_entries (
  id bigserial primary key,
  company_cnpj text not null,
  company_nome text,
  date date not null,
  kind text not null,                  -- 'in' | 'out'
  category text,                       -- livre (ex: recebimentos, fornecedores, folha, impostos)
  amount numeric(18,2) not null,
  created_at timestamptz default now()
);
create index if not exists idx_cf_cnpj_date on cashflow_entries (company_cnpj, date);

-- =========================
-- AGRUPADOR (Holding/Consolidação)
-- =========================
create table if not exists group_alias (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now(),
  unique(name)
);

create table if not exists group_alias_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references group_alias(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  added_at timestamptz default now(),
  unique(group_id, cliente_id)
);

-- =========================
-- VIEWS DE KPI (mensal)
-- =========================
create or replace view v_kpi_monthly as
select
  date_trunc('month', d.date)::date as month,
  d.company_cnpj,
  sum(case when nature='receita' then amount else 0 end) as receita,
  sum(case when nature='custo'   then amount else 0 end) * -1 as custos,
  sum(case when nature='despesa' then amount else 0 end) * -1 as despesas,
  sum(case when nature='outras'  then amount else 0 end) as outras,
  ( sum(case when nature='receita' then amount else 0 end)
  + sum(case when nature='custo'   then amount else 0 end)
  + sum(case when nature='despesa' then amount else 0 end) ) as ebitda
from dre_entries d
group by 1,2;

create or replace view v_kpi_monthly_enriched as
select
  m.month,
  m.company_cnpj,
  m.receita,
  m.custos,
  m.despesas,
  m.outras,
  m.ebitda,
  case when m.receita <> 0
       then (m.receita + m.custos) / m.receita
       else null end as margem_bruta
from v_kpi_monthly m;

-- =========================
-- FUNÇÃO: KPI mensal por grupo/alias
-- =========================
create or replace function fn_kpi_monthly_grouped(group_name text, dt_from date, dt_to date)
returns table (
  month date,
  receita numeric,
  custos numeric,
  despesas numeric,
  outras numeric,
  ebitda numeric,
  margem_bruta numeric
) language sql stable as $$
  with members as (
    select cnpj, id
    from clientes c
    join group_alias_members gm on gm.cliente_id = c.id
    join group_alias g on g.id = gm.group_id
    where g.name = group_name
  ),
  base as (
    select date_trunc('month', d.date)::date as month,
           sum(case when nature='receita' then amount else 0 end) as receita,
           sum(case when nature='custo'   then amount else 0 end) * -1 as custos,
           sum(case when nature='despesa' then amount else 0 end) * -1 as despesas,
           sum(case when nature='outras'  then amount else 0 end) as outras
    from dre_entries d
    where d.company_cnpj in (select only_digits(cnpj) from members)
      and d.date between dt_from and dt_to
    group by 1
  )
  select
    month,
    receita, custos, despesas, outras,
    (receita - (custos + despesas)) as ebitda,
    case when receita <> 0 then (receita - custos)/receita else null end as margem_bruta
  from base
  order by month;
$$;

-- =========================
-- HEALTH/AUDIT
-- =========================
create or replace view v_audit_health as
with
dre_days as (
  select company_cnpj, count(*) as rows_dre
  from dre_entries
  where date >= now()::date - interval '120 days'
  group by 1
),
cf_days as (
  select company_cnpj, count(*) as rows_cf
  from cashflow_entries
  where date >= now()::date - interval '120 days'
  group by 1
)
select
  coalesce(d.company_cnpj, c.company_cnpj) as cnpj,
  s.source,
  s.last_success_at,
  coalesce(d.rows_dre,0) as dre_rows_120d,
  coalesce(c.rows_cf,0)  as cf_rows_120d,
  case when coalesce(d.rows_dre,0)=0 or coalesce(c.rows_cf,0)=0 then 'RED'
       when s.last_success_at < now() - interval '2 days' then 'YELLOW'
       else 'GREEN'
  end as health
from sync_state s
left join dre_days d on d.company_cnpj = s.cnpj
left join cf_days c on c.company_cnpj = s.cnpj;

-- =========================
-- GRANTS
-- =========================
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant select on tables to anon, authenticated;
grant usage on schema cron to postgres;

-- =========================
-- FUNÇÕES DE DECRIPTAÇÃO
-- =========================
create or replace function decrypt_f360_token(_id uuid)
returns text language sql security definer as $$
  select convert_from(pgp_sym_decrypt(token_enc, current_setting('app.kms', true)),'utf8')
  from integration_f360 where id=_id
$$;

create or replace function decrypt_omie_keys(_id uuid)
returns table (app_key text, app_secret text) language sql security definer as $$
  select convert_from(pgp_sym_decrypt(app_key_enc, current_setting('app.kms', true)),'utf8'),
         convert_from(pgp_sym_decrypt(app_secret_enc, current_setting('app.kms', true)),'utf8')
  from integration_omie where id=_id
$$;

-- =========================
-- SEEDS - INTEGRAÇÕES F360
-- =========================
-- NOTA: Execute primeiro: select set_config('app.kms', 'B5b0dcf500@#', false);
insert into integration_f360 (cliente_nome, cnpj, token_enc)
select * from (values
  ('DEX INVEST COMERCIO E VAREJO LTDA (loja 392)', only_digits('00.052.912/6470-00'), pgp_sym_encrypt('174d090d-50f4-4e82-bf7b-1831b74680bf', current_setting('app.kms', true))),
  ('DEX INVEST COMERCIO E VAREJO LTDA (loja 393)', only_digits('00.052.912/6470-01'), pgp_sym_encrypt('174d090d-50f4-4e82-bf7b-1831b74680bf', current_setting('app.kms', true))),
  ('VOLPE DIADEMA (GRUPO VOLPE)', only_digits('00.026.888/0980-00'), pgp_sym_encrypt('223b065a-1873-4cfe-a36b-f092c602a03e', current_setting('app.kms', true))),
  ('VOLPE GRAJAU (GRUPO VOLPE)',  only_digits('00.026.888/0980-01'), pgp_sym_encrypt('223b065a-1873-4cfe-a36b-f092c602a03e', current_setting('app.kms', true))),
  ('VOLPE POA (GRUPO VOLPE)',     only_digits('00.026.888/0980-01'), pgp_sym_encrypt('223b065a-1873-4cfe-a36b-f092c602a03e', current_setting('app.kms', true))),
  ('VOLPE SANTO ANDRE (GRUPO VOLPE)', only_digits('00.026.888/0980-01'), pgp_sym_encrypt('223b065a-1873-4cfe-a36b-f092c602a03e', current_setting('app.kms', true))),
  ('VOLPE SAO MATEUS (GRUPO VOLPE)',  only_digits('00.026.888/0980-00'), pgp_sym_encrypt('223b065a-1873-4cfe-a36b-f092c602a03e', current_setting('app.kms', true))),
  ('AAS GONCALVES AUTOPECA',          only_digits('00.033.542/5530-00'), pgp_sym_encrypt('258a60f7-12bb-44c1-825e-7e9160c41c0d', current_setting('app.kms', true))),
  ('AGS AUTO PECAS PARACAMBI',        only_digits('00.050.716/8820-00'), pgp_sym_encrypt('258a60f7-12bb-44c1-825e-7e9160c41c0d', current_setting('app.kms', true))),
  ('ACQUA MUNDI ACADEMIA - FILIAL',   only_digits('00.017.100/9020-00'), pgp_sym_encrypt('5440d062-b2e9-4554-b33f-f1f783a85472', current_setting('app.kms', true))),
  ('ACQUA MUNDI ACADEMIA - MATRIZ',   only_digits('00.017.100/9020-00'), pgp_sym_encrypt('5440d062-b2e9-4554-b33f-f1f783a85472', current_setting('app.kms', true))),
  ('DERMOPLASTIK CENTRO MEDICO LTDA', only_digits('00.019.822/7980-00'), pgp_sym_encrypt('61b9bc06-1ada-485c-963b-69a4d7d91866', current_setting('app.kms', true))),
  ('CORPORE SUPLEMENTOS',             only_digits('00.005.792/5800-00'), pgp_sym_encrypt('7c006009-c8d4-4e15-99b5-8956148c710e', current_setting('app.kms', true))),
  ('A3 SOLUTION LTDA',                only_digits('00.022.702/7260-00'), pgp_sym_encrypt('9cab76ea-8476-4dc6-aec7-0d7247a13bae', current_setting('app.kms', true))),
  ('CLUBE DE CACA E TIRO',            only_digits('00.041.794/9110-00'), pgp_sym_encrypt('9f00c3fa-3dfe-4d7d-ac4d-dfc3f06ca982', current_setting('app.kms', true))),
  ('SANTA LOLLA - FLORIANO (GRUPO FOX 11)', only_digits('00.057.220/8440-00'), pgp_sym_encrypt('c021af1d-a524-4170-8270-c44da14f7be1', current_setting('app.kms', true))),
  ('ALL IN SP HAMBURGUERIA LTDA',     only_digits('00.043.212/2200-00'), pgp_sym_encrypt('d4077081-e407-4126-bf50-875aa63177a2', current_setting('app.kms', true)))
) s
on conflict do nothing;

-- =========================
-- SEEDS - INTEGRAÇÕES OMIE
-- =========================
insert into integration_omie (cliente_nome, app_key_enc, app_secret_enc)
select * from (values
  ('MANA POKE HOLDING LTDA',
    pgp_sym_encrypt('2077005256326', current_setting('app.kms', true)),
    pgp_sym_encrypt('42910292e952b4b9da3f29b12c23b336', current_setting('app.kms', true))),
  ('MED SOLUTIONS S.A. - SKY DERM',
    pgp_sym_encrypt('4293229373433', current_setting('app.kms', true)),
    pgp_sym_encrypt('ed057dc43bd89153719af75cbb55098b', current_setting('app.kms', true))),
  ('BRX IMPORTADORA - 0001-20 (ASR NEGOCIOS)',
    pgp_sym_encrypt('6626684373309', current_setting('app.kms', true)),
    pgp_sym_encrypt('476dcc4526ea8548af3123e9d5ef5769', current_setting('app.kms', true))),
  ('BEAUTY SOLUTIONS COMERCIO DE PRODUTOS COSMETICOS E CORRELATOS S.A.',
    pgp_sym_encrypt('2000530332801', current_setting('app.kms', true)),
    pgp_sym_encrypt('77f3477d3d80942106f21ee9b6cccc1a', current_setting('app.kms', true)))
) s
on conflict do nothing;

-- =========================
-- FUNÇÕES DE REFRESH (via pg_net)
-- =========================
create or replace function public.refresh_sync_f360()
returns void language plpgsql security definer as $$
begin
  perform net.http_post(
    url := current_setting('app.sync_f360_url', true),
    headers := jsonb_build_object('Authorization','Bearer '|| current_setting('app.service_key', true)),
    body := '{}'::jsonb
  );
end$$;

create or replace function public.refresh_sync_omie()
returns void language plpgsql security definer as $$
begin
  perform net.http_post(
    url := current_setting('app.sync_omie_url', true),
    headers := jsonb_build_object('Authorization','Bearer '|| current_setting('app.service_key', true)),
    body := '{}'::jsonb
  );
end$$;

-- =========================
-- AGENDAMENTOS (pg_cron)
-- =========================
-- F360: a cada 10 minutos
select cron.schedule('sync_f360_10min', '*/10 * * * *', 'select public.refresh_sync_f360()');

-- OMIE: a cada 15 minutos
select cron.schedule('sync_omie_15min', '*/15 * * * *', 'select public.refresh_sync_omie()');

-- =========================
-- FIM DA MIGRAÇÃO
-- =========================
