-- ================================================
-- MIGRATION 004: Sistema de Autenticação e Administração
-- ================================================
-- Sistema completo de usuários, roles, permissões e configurações

-- ========================================
-- 1. TABELA DE USUÁRIOS (integra com Supabase Auth)
-- ========================================
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  avatar_url text,
  role text not null check (role in ('admin', 'executivo_conta', 'franqueado', 'cliente', 'viewer')),
  company_cnpj text, -- Para role='cliente', vincula à empresa específica
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  created_by uuid references users(id),
  -- Cliente deve ter CNPJ da empresa
  constraint check_cliente_has_company check (
    (role = 'cliente' and company_cnpj is not null) or (role != 'cliente')
  )
);

create index idx_users_email on users(email);
create index idx_users_role on users(role);
create index idx_users_status on users(status);
create index idx_users_company_cnpj on users(company_cnpj);

-- ========================================
-- 2. PERMISSÕES POR USUÁRIO
-- ========================================
create table if not exists user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  resource text not null, -- 'clients', 'templates', 'reports', 'analytics', 'whatsapp', 'api_keys', 'llm_config'
  action text not null check (action in ('read', 'write', 'delete', 'execute')),
  created_at timestamptz not null default now(),
  unique(user_id, resource, action)
);

create index idx_user_permissions_user on user_permissions(user_id);
create index idx_user_permissions_resource on user_permissions(resource);

-- ========================================
-- 3. ACESSO DE USUÁRIOS A EMPRESAS (Multi-tenant)
-- ========================================
create table if not exists user_company_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  company_cnpj text not null,
  company_nome text not null,
  can_view boolean not null default true,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  granted_at timestamptz not null default now(),
  granted_by uuid references users(id),
  unique(user_id, company_cnpj)
);

create index idx_user_company_access_user on user_company_access(user_id);
create index idx_user_company_access_cnpj on user_company_access(company_cnpj);

-- ========================================
-- 4. FRANQUIAS
-- ========================================
create table if not exists franchises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references users(id) on delete restrict,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_franchises_owner on franchises(owner_user_id);

-- Empresas pertencentes a franquias
create table if not exists franchise_companies (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references franchises(id) on delete cascade,
  company_cnpj text not null,
  company_nome text not null,
  added_at timestamptz not null default now(),
  added_by uuid references users(id),
  unique(franchise_id, company_cnpj)
);

create index idx_franchise_companies_franchise on franchise_companies(franchise_id);
create index idx_franchise_companies_cnpj on franchise_companies(company_cnpj);

-- ========================================
-- 5. API KEYS MANAGEMENT
-- ========================================
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  key_name text not null, -- 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'F360_TOKEN', etc.
  key_value_encrypted bytea not null, -- Criptografado com pgcrypto
  provider text not null, -- 'openai', 'anthropic', 'f360', 'omie', 'evolution'
  key_type text not null check (key_type in ('llm', 'erp', 'whatsapp', 'other')),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  created_by uuid references users(id)
);

create index idx_api_keys_provider on api_keys(provider);
create index idx_api_keys_type on api_keys(key_type);
create index idx_api_keys_active on api_keys(is_active);

-- Funções para criptografar/descriptografar API keys
create or replace function encrypt_api_key(p_key_value text)
returns bytea
language plpgsql
security definer
as $$
begin
  return pgp_sym_encrypt(p_key_value::text, current_setting('app.settings.kms_secret', true));
end;
$$;

create or replace function decrypt_api_key(p_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_encrypted bytea;
begin
  select key_value_encrypted into v_encrypted
  from api_keys
  where id = p_id and is_active = true;

  if v_encrypted is null then
    return null;
  end if;

  return pgp_sym_decrypt(v_encrypted, current_setting('app.settings.kms_secret', true));
end;
$$;

-- ========================================
-- 6. LLM CONFIGURATION
-- ========================================
create table if not exists llm_providers (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null unique, -- 'openai', 'anthropic', 'google', etc.
  display_name text not null,
  api_key_id uuid references api_keys(id) on delete set null,
  is_active boolean not null default true,
  base_url text, -- Para APIs customizadas
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_llm_providers_active on llm_providers(is_active);

-- Modelos disponíveis por provider
create table if not exists llm_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references llm_providers(id) on delete cascade,
  model_name text not null, -- 'gpt-4o', 'claude-sonnet-4-5', etc.
  display_name text not null,
  model_type text not null check (model_type in ('fast', 'reasoning', 'complex')),
  cost_per_1k_input numeric(10, 6) not null default 0,
  cost_per_1k_output numeric(10, 6) not null default 0,
  context_window integer not null default 4096,
  supports_streaming boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(provider_id, model_name)
);

create index idx_llm_models_provider on llm_models(provider_id);
create index idx_llm_models_type on llm_models(model_type);
create index idx_llm_models_active on llm_models(is_active);

-- Configuração global de uso de LLMs
create table if not exists llm_usage_config (
  id uuid primary key default gen_random_uuid(),
  config_key text not null unique,
  -- 'whatsapp_bot_fast', 'whatsapp_bot_complex', 'reports_simple', 'reports_complex'
  llm_model_id uuid not null references llm_models(id) on delete restrict,
  fallback_model_id uuid references llm_models(id) on delete set null,
  max_tokens integer not null default 1000,
  temperature numeric(3, 2) not null default 0.7,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

create index idx_llm_usage_config_key on llm_usage_config(config_key);

-- ========================================
-- 7. LLM USAGE TRACKING (Consumo mensal)
-- ========================================
create table if not exists llm_usage_logs (
  id uuid primary key default gen_random_uuid(),
  llm_model_id uuid not null references llm_models(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  company_cnpj text, -- Opcional, para rastrear uso por empresa
  request_type text not null, -- 'whatsapp_bot', 'report', 'analysis', etc.
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  response_time_ms integer,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_llm_usage_logs_model on llm_usage_logs(llm_model_id);
create index idx_llm_usage_logs_user on llm_usage_logs(user_id);
create index idx_llm_usage_logs_created on llm_usage_logs(created_at);
create index idx_llm_usage_logs_company on llm_usage_logs(company_cnpj);

-- View para consumo mensal agregado
create or replace view v_llm_monthly_usage as
select
  date_trunc('month', created_at)::date as month,
  lm.display_name as model_name,
  lp.display_name as provider_name,
  count(*) as request_count,
  sum(input_tokens) as total_input_tokens,
  sum(output_tokens) as total_output_tokens,
  sum(cost_usd) as total_cost_usd,
  avg(response_time_ms) as avg_response_time_ms,
  sum(case when success then 1 else 0 end)::float / count(*) * 100 as success_rate
from llm_usage_logs l
join llm_models lm on lm.id = l.llm_model_id
join llm_providers lp on lp.id = lm.provider_id
group by date_trunc('month', created_at), lm.display_name, lp.display_name
order by month desc, total_cost_usd desc;

-- View para consumo mensal por usuário
create or replace view v_llm_user_monthly_usage as
select
  date_trunc('month', l.created_at)::date as month,
  u.email as user_email,
  u.full_name as user_name,
  lp.display_name as provider_name,
  count(*) as request_count,
  sum(l.cost_usd) as total_cost_usd
from llm_usage_logs l
join users u on u.id = l.user_id
join llm_models lm on lm.id = l.llm_model_id
join llm_providers lp on lp.id = lm.provider_id
where l.user_id is not null
group by date_trunc('month', l.created_at), u.email, u.full_name, lp.display_name
order by month desc, total_cost_usd desc;

-- ========================================
-- 8. TEMPLATE PERMISSIONS
-- ========================================
create table if not exists message_template_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  template_type text not null, -- 'snapshot', 'overdue_alert', etc.
  can_view boolean not null default true,
  can_edit boolean not null default false,
  can_create boolean not null default false,
  can_delete boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, template_type)
);

create index idx_template_permissions_user on message_template_permissions(user_id);

-- ========================================
-- 9. AUDIT LOG
-- ========================================
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  action text not null, -- 'create', 'update', 'delete', 'login', 'api_call', etc.
  resource_type text not null, -- 'user', 'company', 'template', 'api_key', etc.
  resource_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_log_user on audit_log(user_id);
create index idx_audit_log_action on audit_log(action);
create index idx_audit_log_resource on audit_log(resource_type);
create index idx_audit_log_created on audit_log(created_at);

-- ========================================
-- 10. FUNÇÕES DE PERMISSÃO
-- ========================================

-- Verificar se usuário tem permissão
create or replace function user_has_permission(
  p_user_id uuid,
  p_resource text,
  p_action text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_role text;
  v_has_permission boolean;
begin
  -- Admin tem todas as permissões
  select role into v_role from users where id = p_user_id;

  if v_role = 'admin' then
    return true;
  end if;

  -- Verificar permissão explícita
  select exists(
    select 1 from user_permissions
    where user_id = p_user_id
      and resource = p_resource
      and action = p_action
  ) into v_has_permission;

  return v_has_permission;
end;
$$;

-- Verificar se usuário tem acesso à empresa
create or replace function user_has_company_access(
  p_user_id uuid,
  p_company_cnpj text,
  p_access_type text default 'view' -- 'view', 'edit', 'delete'
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_role text;
  v_user_company text;
  v_has_access boolean;
  v_franchise_id uuid;
begin
  -- Buscar role e empresa do usuário
  select role, company_cnpj into v_role, v_user_company
  from users
  where id = p_user_id;

  -- Admin tem acesso a todas as empresas
  if v_role = 'admin' then
    return true;
  end if;

  -- Cliente só tem acesso à própria empresa
  if v_role = 'cliente' then
    -- Cliente sempre pode visualizar, mas edição/deleção são restritos
    if p_access_type = 'view' then
      return (v_user_company = p_company_cnpj);
    else
      return false; -- Clientes não podem editar/deletar
    end if;
  end if;

  -- Franqueado tem acesso a todas empresas da sua franquia
  if v_role = 'franqueado' then
    select f.id into v_franchise_id
    from franchises f
    where f.owner_user_id = p_user_id and f.active = true;

    if v_franchise_id is not null then
      select exists(
        select 1 from franchise_companies
        where franchise_id = v_franchise_id
          and company_cnpj = p_company_cnpj
      ) into v_has_access;

      if v_has_access then
        return true;
      end if;
    end if;
  end if;

  -- Verificar acesso explícito
  if p_access_type = 'view' then
    select can_view into v_has_access
    from user_company_access
    where user_id = p_user_id and company_cnpj = p_company_cnpj;
  elsif p_access_type = 'edit' then
    select can_edit into v_has_access
    from user_company_access
    where user_id = p_user_id and company_cnpj = p_company_cnpj;
  elsif p_access_type = 'delete' then
    select can_delete into v_has_access
    from user_company_access
    where user_id = p_user_id and company_cnpj = p_company_cnpj;
  end if;

  return coalesce(v_has_access, false);
end;
$$;

-- Obter empresas acessíveis pelo usuário
create or replace function get_user_accessible_companies(p_user_id uuid)
returns table(
  company_cnpj text,
  company_nome text,
  can_view boolean,
  can_edit boolean,
  can_delete boolean,
  access_source text -- 'admin', 'franchise', 'direct', 'owner'
)
language plpgsql
security definer
as $$
declare
  v_role text;
  v_user_company text;
  v_franchise_id uuid;
begin
  select role, company_cnpj into v_role, v_user_company
  from users
  where id = p_user_id;

  -- Admin vê todas as empresas
  if v_role = 'admin' then
    return query
    select distinct
      c.cnpj,
      c.nome,
      true as can_view,
      true as can_edit,
      true as can_delete,
      'admin'::text as access_source
    from clientes c
    where c.cnpj is not null;
    return;
  end if;

  -- Cliente vê apenas sua própria empresa
  if v_role = 'cliente' then
    return query
    select
      c.cnpj,
      c.nome,
      true as can_view,
      false as can_edit,
      false as can_delete,
      'owner'::text as access_source
    from clientes c
    where c.cnpj = v_user_company;
    return;
  end if;

  -- Franqueado vê empresas da franquia
  if v_role = 'franqueado' then
    select f.id into v_franchise_id
    from franchises f
    where f.owner_user_id = p_user_id and f.active = true;

    if v_franchise_id is not null then
      return query
      select
        fc.company_cnpj,
        fc.company_nome,
        true as can_view,
        true as can_edit,
        false as can_delete,
        'franchise'::text as access_source
      from franchise_companies fc
      where fc.franchise_id = v_franchise_id;
    end if;
  end if;

  -- Outros: acesso direto apenas
  return query
  select
    uca.company_cnpj,
    uca.company_nome,
    uca.can_view,
    uca.can_edit,
    uca.can_delete,
    'direct'::text as access_source
  from user_company_access uca
  where uca.user_id = p_user_id;
end;
$$;

-- ========================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilitar RLS nas tabelas sensíveis
alter table users enable row level security;
alter table user_permissions enable row level security;
alter table user_company_access enable row level security;
alter table franchises enable row level security;
alter table api_keys enable row level security;
alter table llm_providers enable row level security;
alter table llm_models enable row level security;
alter table llm_usage_config enable row level security;
alter table audit_log enable row level security;

-- Políticas para users
create policy "Users can view their own profile"
  on users for select
  using (auth.uid() = id);

create policy "Admins can view all users"
  on users for select
  using (
    exists(
      select 1 from users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can insert/update/delete users"
  on users for all
  using (
    exists(
      select 1 from users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Políticas para api_keys
create policy "Only admins can view API keys"
  on api_keys for select
  using (
    exists(
      select 1 from users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Only admins can manage API keys"
  on api_keys for all
  using (
    exists(
      select 1 from users
      where id = auth.uid() and role = 'admin'
    )
  );

-- ========================================
-- 12. SEED DATA
-- ========================================

-- Inserir providers LLM padrão
insert into llm_providers (provider_name, display_name, is_active) values
  ('openai', 'OpenAI', true),
  ('anthropic', 'Anthropic (Claude)', true),
  ('google', 'Google (Gemini)', false)
on conflict (provider_name) do nothing;

-- Inserir modelos LLM
with openai_provider as (
  select id from llm_providers where provider_name = 'openai'
),
anthropic_provider as (
  select id from llm_providers where provider_name = 'anthropic'
)
insert into llm_models (provider_id, model_name, display_name, model_type, cost_per_1k_input, cost_per_1k_output, context_window) values
  -- OpenAI
  ((select id from openai_provider), 'gpt-4o-mini', 'GPT-4o Mini', 'fast', 0.00015, 0.0006, 128000),
  ((select id from openai_provider), 'gpt-4o', 'GPT-4o', 'reasoning', 0.0025, 0.01, 128000),
  ((select id from openai_provider), 'o1', 'O1 (Reasoning)', 'complex', 0.015, 0.06, 200000),

  -- Anthropic
  ((select id from anthropic_provider), 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 'fast', 0.001, 0.005, 200000),
  ((select id from anthropic_provider), 'claude-sonnet-4-5-20250929', 'Claude Sonnet 4.5', 'reasoning', 0.003, 0.015, 200000),
  ((select id from anthropic_provider), 'claude-opus-4-20250514', 'Claude Opus 4', 'complex', 0.015, 0.075, 200000)
on conflict (provider_id, model_name) do nothing;

-- Inserir configuração padrão de uso
with fast_model as (
  select id from llm_models where model_name = 'claude-3-5-haiku-20241022'
),
reasoning_model as (
  select id from llm_models where model_name = 'claude-sonnet-4-5-20250929'
),
complex_model as (
  select id from llm_models where model_name = 'claude-opus-4-20250514'
)
insert into llm_usage_config (config_key, llm_model_id, fallback_model_id, max_tokens, temperature, description) values
  ('whatsapp_bot_fast', (select id from fast_model), (select id from reasoning_model), 300, 0.7, 'Respostas rápidas do bot WhatsApp'),
  ('whatsapp_bot_complex', (select id from reasoning_model), (select id from complex_model), 1000, 0.7, 'Análises complexas via WhatsApp'),
  ('reports_simple', (select id from reasoning_model), null, 2000, 0.5, 'Relatórios simples e resumos'),
  ('reports_complex', (select id from complex_model), (select id from reasoning_model), 4000, 0.3, 'Relatórios complexos com análise profunda'),
  ('analysis_financial', (select id from reasoning_model), null, 2000, 0.5, 'Análises financeiras detalhadas')
on conflict (config_key) do nothing;

-- ========================================
-- VERIFICAR SUCESSO DA MIGRAÇÃO
-- ========================================
select
  'Migration 004 completed successfully!' as status,
  (select count(*) from llm_providers) as llm_providers,
  (select count(*) from llm_models) as llm_models,
  (select count(*) from llm_usage_config) as llm_configs;
