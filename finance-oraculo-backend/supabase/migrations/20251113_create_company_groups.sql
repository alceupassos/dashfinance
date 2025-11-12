-- Migration: Create company groups structure for aggregating data
-- This allows tokens that represent multiple companies (like Grupo Volpe) to have
-- consolidated data while maintaining individual company records

begin;

-- =============================================
-- COMPANY GROUPS (Synthetic companies)
-- =============================================

-- Table to represent groups (synthetic companies with fake CNPJs)
create table if not exists public.company_groups (
  id uuid primary key default gen_random_uuid(),
  group_cnpj text not null unique, -- Fake CNPJ for the group (e.g., 00026888098000 for Grupo Volpe)
  group_name text not null, -- Display name (e.g., "Grupo Volpe")
  description text,
  is_active boolean not null default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_groups_cnpj_idx on public.company_groups (group_cnpj);
create index if not exists company_groups_active_idx on public.company_groups (is_active);

-- Table to link groups with individual company CNPJs
create table if not exists public.company_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.company_groups(id) on delete cascade,
  member_cnpj text not null, -- Real CNPJ of individual company
  member_name text, -- Optional display name
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(group_id, member_cnpj)
);

create index if not exists company_group_members_group_idx on public.company_group_members (group_id);
create index if not exists company_group_members_cnpj_idx on public.company_group_members (member_cnpj);
create index if not exists company_group_members_active_idx on public.company_group_members (is_active);

-- =============================================
-- AGGREGATION FUNCTIONS
-- =============================================

-- Function to aggregate DRE entries for a group
create or replace function public.aggregate_dre_for_group(
  _group_cnpj text,
  _from_date date default null,
  _to_date date default null
)
returns table (
  company_cnpj text,
  date date,
  account text,
  nature text,
  amount numeric,
  company_nome text
)
as $$
begin
  return query
  select
    _group_cnpj as company_cnpj,
    d.date,
    d.account,
    d.nature,
    sum(d.amount) as amount,
    g.group_name as company_nome
  from public.company_groups g
  join public.company_group_members m on m.group_id = g.id and m.is_active = true
  join public.dre_entries d on d.company_cnpj = m.member_cnpj
  where g.group_cnpj = _group_cnpj
    and g.is_active = true
    and (_from_date is null or d.date >= _from_date)
    and (_to_date is null or d.date <= _to_date)
  group by d.date, d.account, d.nature, g.group_name
  order by d.date, d.account;
end;
$$ language plpgsql security definer;

-- Function to aggregate cashflow entries for a group
create or replace function public.aggregate_cashflow_for_group(
  _group_cnpj text,
  _from_date date default null,
  _to_date date default null
)
returns table (
  company_cnpj text,
  date date,
  kind text,
  category text,
  amount numeric,
  company_nome text
)
as $$
begin
  return query
  select
    _group_cnpj as company_cnpj,
    c.date,
    c.kind,
    c.category,
    sum(c.amount) as amount,
    g.group_name as company_nome
  from public.company_groups g
  join public.company_group_members m on m.group_id = g.id and m.is_active = true
  join public.cashflow_entries c on c.company_cnpj = m.member_cnpj
  where g.group_cnpj = _group_cnpj
    and g.is_active = true
    and (_from_date is null or c.date >= _from_date)
    and (_to_date is null or c.date <= _to_date)
  group by c.date, c.kind, c.category, g.group_name
  order by c.date, c.kind, c.category;
end;
$$ language plpgsql security definer;

-- Function to upsert aggregated DRE entries for a group
-- This creates/updates synthetic entries in dre_entries with the group CNPJ
create or replace function public.upsert_group_dre_entries(
  _group_cnpj text,
  _from_date date default null,
  _to_date date default null
)
returns integer
as $$
declare
  _group_name text;
  _count integer := 0;
begin
  -- Get group name
  select group_name into _group_name
  from public.company_groups
  where group_cnpj = _group_cnpj and is_active = true;
  
  if _group_name is null then
    raise exception 'Group not found: %', _group_cnpj;
  end if;

  -- Insert aggregated entries
  insert into public.dre_entries (
    company_cnpj,
    company_nome,
    date,
    account,
    nature,
    amount
  )
  select
    _group_cnpj,
    _group_name,
    date,
    account,
    nature,
    amount
  from public.aggregate_dre_for_group(_group_cnpj, _from_date, _to_date)
  on conflict (company_cnpj, date, account) 
  do update set
    amount = excluded.amount,
    company_nome = excluded.company_nome;

  get diagnostics _count = row_count;
  return _count;
end;
$$ language plpgsql security definer;

-- Function to upsert aggregated cashflow entries for a group
create or replace function public.upsert_group_cashflow_entries(
  _group_cnpj text,
  _from_date date default null,
  _to_date date default null
)
returns integer
as $$
declare
  _group_name text;
  _count integer := 0;
begin
  -- Get group name
  select group_name into _group_name
  from public.company_groups
  where group_cnpj = _group_cnpj and is_active = true;
  
  if _group_name is null then
    raise exception 'Group not found: %', _group_cnpj;
  end if;

  -- Insert aggregated entries
  insert into public.cashflow_entries (
    company_cnpj,
    company_nome,
    date,
    kind,
    category,
    amount
  )
  select
    _group_cnpj,
    _group_name,
    date,
    kind,
    category,
    amount
  from public.aggregate_cashflow_for_group(_group_cnpj, _from_date, _to_date)
  on conflict (company_cnpj, date, category, kind) 
  do update set
    amount = excluded.amount,
    company_nome = excluded.company_nome;

  get diagnostics _count = row_count;
  return _count;
end;
$$ language plpgsql security definer;

-- =============================================
-- VIEWS FOR CONSOLIDATED DATA
-- =============================================

-- View that shows groups with their members
create or replace view public.v_companies_with_groups as
select
  g.group_cnpj as company_cnpj,
  g.group_name as company_name,
  g.id as group_id,
  g.group_cnpj,
  g.group_name,
  true as is_group,
  array_agg(m.member_cnpj) as member_cnpjs
from public.company_groups g
join public.company_group_members m on m.group_id = g.id and m.is_active = true
where g.is_active = true
group by g.id, g.group_cnpj, g.group_name;

-- =============================================
-- RLS POLICIES
-- =============================================

alter table public.company_groups enable row level security;
alter table public.company_group_members enable row level security;

-- Allow read access to authenticated users
drop policy if exists company_groups_select on public.company_groups;
create policy company_groups_select on public.company_groups
  for select using (true);

drop policy if exists company_group_members_select on public.company_group_members;
create policy company_group_members_select on public.company_group_members
  for select using (true);

-- Allow write access only to service_role
drop policy if exists company_groups_write on public.company_groups;
create policy company_groups_write on public.company_groups
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists company_group_members_write on public.company_group_members;
create policy company_group_members_write on public.company_group_members
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Grant permissions
grant select on public.company_groups to anon, authenticated;
grant select on public.company_group_members to anon, authenticated;
grant select on public.v_companies_with_groups to anon, authenticated;

commit;

