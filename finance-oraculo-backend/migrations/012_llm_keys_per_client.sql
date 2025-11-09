-- =========================
-- CHAVES DE API LLM POR CLIENTE
-- =========================

-- Tabela de chaves de API LLM por empresa/cliente
create table if not exists llm_api_keys_per_client (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  provider text not null check (provider in ('anthropic', 'openai', 'google', 'mistral')),
  api_key_encrypted text not null, -- Chave criptografada usando pgcrypto
  is_active boolean default true,
  priority integer default 5, -- 1-10, menor = maior prioridade
  monthly_limit_usd numeric(10,2), -- Limite mensal em USD (opcional)
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id),
  unique(company_cnpj, provider)
);

create index if not exists idx_llm_keys_per_client_cnpj on llm_api_keys_per_client(company_cnpj);
create index if not exists idx_llm_keys_per_client_provider on llm_api_keys_per_client(provider, is_active);
create index if not exists idx_llm_keys_per_client_active on llm_api_keys_per_client(is_active, priority);

-- Função para obter chave de API do cliente (descriptografada)
-- Nota: Esta função retorna apenas se a chave existe e está ativa
-- A descriptografia real deve ser feita na Edge Function por segurança
create or replace function get_client_llm_api_key(
  p_company_cnpj text,
  p_provider text
) returns text as $$
declare
  v_encrypted_key text;
begin
  -- Buscar chave criptografada
  select api_key_encrypted into v_encrypted_key
  from llm_api_keys_per_client
  where company_cnpj = p_company_cnpj
    and provider = p_provider
    and is_active = true
  order by priority
  limit 1;

  -- Retornar a chave criptografada (descriptografia será feita na Edge Function)
  -- Isso evita expor a chave de descriptografia no banco
  return v_encrypted_key;
exception
  when others then
    -- Se falhar, retornar null (fallback para chave global)
    return null;
end;
$$ language plpgsql security definer;

-- Função para inserir/atualizar chave de API do cliente
-- Nota: A chave já deve vir criptografada da Edge Function
-- A Edge Function usa uma chave de criptografia armazenada em secrets
create or replace function set_client_llm_api_key(
  p_company_cnpj text,
  p_provider text,
  p_api_key_encrypted text,
  p_priority integer default 5,
  p_monthly_limit_usd numeric default null,
  p_notes text default null,
  p_user_id uuid default null
) returns void as $$
begin
  -- Inserir ou atualizar
  insert into llm_api_keys_per_client (
    company_cnpj, provider, api_key_encrypted, priority, monthly_limit_usd, notes, created_by
  )
  values (
    p_company_cnpj, p_provider, p_api_key_encrypted, p_priority, p_monthly_limit_usd, p_notes, p_user_id
  )
  on conflict (company_cnpj, provider) do update set
    api_key_encrypted = excluded.api_key_encrypted,
    priority = excluded.priority,
    monthly_limit_usd = excluded.monthly_limit_usd,
    notes = excluded.notes,
    updated_at = now(),
    created_by = excluded.created_by;
end;
$$ language plpgsql security definer;

-- View para custos por cliente (últimos 30 dias)
create or replace view v_llm_costs_per_client as
select
  company_cnpj,
  provider,
  model,
  sum(total_tokens) as total_tokens,
  sum(cost_usd) as total_cost_usd,
  count(*) as total_requests,
  min(created_at) as first_request,
  max(created_at) as last_request
from llm_token_usage
where company_cnpj is not null
  and created_at >= now() - interval '30 days'
group by company_cnpj, provider, model
order by total_cost_usd desc;

-- View para resumo mensal por cliente
create or replace view v_llm_monthly_costs_per_client as
select
  company_cnpj,
  date_trunc('month', created_at)::date as month,
  provider,
  sum(total_tokens) as total_tokens,
  sum(cost_usd) as total_cost_usd,
  count(*) as total_requests,
  avg(response_time_ms) as avg_response_time_ms
from llm_token_usage
where company_cnpj is not null
group by company_cnpj, date_trunc('month', created_at), provider
order by month desc, total_cost_usd desc;

-- RLS Policies
alter table llm_api_keys_per_client enable row level security;

-- Apenas admin pode ver/gerenciar chaves
create policy "Admin can view all client LLM keys"
  on llm_api_keys_per_client for select
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Admin can manage client LLM keys"
  on llm_api_keys_per_client for all
  using (auth.jwt() ->> 'role' = 'admin');

-- Função para verificar limite mensal do cliente
create or replace function check_client_llm_monthly_limit(
  p_company_cnpj text,
  p_provider text,
  p_additional_cost numeric
) returns boolean as $$
declare
  v_limit numeric;
  v_current_cost numeric;
begin
  -- Buscar limite configurado
  select monthly_limit_usd into v_limit
  from llm_api_keys_per_client
  where company_cnpj = p_company_cnpj
    and provider = p_provider
    and is_active = true;

  -- Se não houver limite, permitir
  if v_limit is null then
    return true;
  end if;

  -- Calcular custo atual do mês
  select coalesce(sum(cost_usd), 0) into v_current_cost
  from llm_token_usage
  where company_cnpj = p_company_cnpj
    and provider = p_provider
    and created_at >= date_trunc('month', now());

  -- Verificar se ultrapassaria o limite
  return (v_current_cost + p_additional_cost) <= v_limit;
end;
$$ language plpgsql security definer;

