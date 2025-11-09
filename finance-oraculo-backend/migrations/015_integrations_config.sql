-- =========================
-- CONFIGURAÇÕES CENTRALIZADAS DE INTEGRAÇÕES
-- =========================

-- Tabela de configurações de integrações
create table if not exists integration_configs (
  id uuid primary key default gen_random_uuid(),
  integration_name text not null unique,
  display_name text not null,
  category text not null check (category in ('payment', 'llm', 'erp', 'whatsapp', 'storage', 'email', 'analytics', 'other')),
  
  -- Credenciais (criptografadas)
  api_key_encrypted text,
  api_secret_encrypted text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  
  -- Configurações específicas (JSON)
  config_data jsonb default '{}'::jsonb,
  
  -- Status
  is_active boolean default false,
  is_configured boolean default false,
  
  -- Metadados
  description text,
  documentation_url text,
  icon_url text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- Inserir integrações padrão
insert into integration_configs (
  integration_name, display_name, category, description, documentation_url
) values
  -- Pagamentos
  ('yampi', 'Yampi', 'payment', 'Plataforma de e-commerce e pagamentos', 'https://developers.yampi.com.br'),
  ('stripe', 'Stripe', 'payment', 'Gateway de pagamentos internacional', 'https://stripe.com/docs/api'),
  ('pagseguro', 'PagSeguro', 'payment', 'Gateway de pagamentos brasileiro', 'https://dev.pagseguro.uol.com.br'),
  
  -- LLM
  ('anthropic', 'Anthropic Claude', 'llm', 'API do Claude (Anthropic)', 'https://docs.anthropic.com'),
  ('openai', 'OpenAI GPT', 'llm', 'API do GPT (OpenAI)', 'https://platform.openai.com/docs'),
  ('google_ai', 'Google AI', 'llm', 'API do Gemini (Google)', 'https://ai.google.dev/docs'),
  
  -- ERP
  ('f360', 'F360', 'erp', 'Integração com F360', null),
  ('omie', 'Omie', 'erp', 'Integração com Omie', 'https://developer.omie.com.br'),
  
  -- WhatsApp
  ('wasender', 'WASender', 'whatsapp', 'API de WhatsApp WASender', null),
  ('evolution_api', 'Evolution API', 'whatsapp', 'API de WhatsApp Evolution', 'https://doc.evolution-api.com'),
  
  -- Storage
  ('aws_s3', 'AWS S3', 'storage', 'Armazenamento AWS S3', 'https://docs.aws.amazon.com/s3'),
  ('google_cloud_storage', 'Google Cloud Storage', 'storage', 'Armazenamento Google Cloud', 'https://cloud.google.com/storage/docs'),
  
  -- Email
  ('sendgrid', 'SendGrid', 'email', 'Serviço de email transacional', 'https://docs.sendgrid.com'),
  ('resend', 'Resend', 'email', 'API de email moderna', 'https://resend.com/docs'),
  
  -- Analytics
  ('google_analytics', 'Google Analytics', 'analytics', 'Analytics do Google', 'https://developers.google.com/analytics'),
  ('mixpanel', 'Mixpanel', 'analytics', 'Plataforma de analytics', 'https://developer.mixpanel.com')
on conflict (integration_name) do nothing;

create index if not exists idx_integration_configs_category on integration_configs(category);
create index if not exists idx_integration_configs_active on integration_configs(is_active);

-- Tabela de histórico de configurações (auditoria)
create table if not exists integration_config_history (
  id uuid primary key default gen_random_uuid(),
  integration_config_id uuid not null references integration_configs(id) on delete cascade,
  changed_by uuid references auth.users(id),
  change_type text not null check (change_type in ('created', 'updated', 'activated', 'deactivated', 'deleted')),
  old_values jsonb,
  new_values jsonb,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_integration_config_history_config on integration_config_history(integration_config_id, created_at desc);

-- Função para atualizar configuração de integração
-- Nota: As credenciais já vêm criptografadas da Edge Function
create or replace function update_integration_config(
  p_integration_name text,
  p_api_key text default null,
  p_api_secret text default null,
  p_access_token text default null,
  p_refresh_token text default null,
  p_config_data jsonb default null,
  p_is_active boolean default null,
  p_user_id uuid default null
) returns void as $$
declare
  v_config_id uuid;
  v_old_values jsonb;
begin
  -- Buscar ID da configuração
  select id into v_config_id
  from integration_configs
  where integration_name = p_integration_name;

  if v_config_id is null then
    raise exception 'Integration not found: %', p_integration_name;
  end if;

  -- Buscar valores antigos para auditoria
  select to_jsonb(ic.*) into v_old_values
  from integration_configs ic
  where ic.id = v_config_id;

  -- Atualizar configuração
  update integration_configs
  set
    api_key_encrypted = case when p_api_key is not null then p_api_key else api_key_encrypted end,
    api_secret_encrypted = case when p_api_secret is not null then p_api_secret else api_secret_encrypted end,
    access_token_encrypted = case when p_access_token is not null then p_access_token else access_token_encrypted end,
    refresh_token_encrypted = case when p_refresh_token is not null then p_refresh_token else refresh_token_encrypted end,
    config_data = case when p_config_data is not null then p_config_data else config_data end,
    is_active = case when p_is_active is not null then p_is_active else is_active end,
    is_configured = case 
      when p_api_key is not null or p_api_secret is not null or p_access_token is not null or
           (p_config_data is not null and jsonb_typeof(p_config_data) = 'object' and jsonb_object_keys(p_config_data) is not null)
      then true 
      else is_configured 
    end,
    updated_at = now(),
    updated_by = p_user_id
  where id = v_config_id;

  -- Registrar no histórico
  insert into integration_config_history (
    integration_config_id, changed_by, change_type, old_values, new_values
  )
  values (
    v_config_id, p_user_id, 'updated', v_old_values,
    (select to_jsonb(ic.*) from integration_configs ic where ic.id = v_config_id)
  );
end;
$$ language plpgsql security definer;

-- RLS Policies
alter table integration_configs enable row level security;
alter table integration_config_history enable row level security;

-- Apenas admin pode gerenciar configurações
create policy "Admin can manage integration configs"
  on integration_configs for all
  using (auth.jwt() ->> 'role' = 'admin');

-- Apenas admin pode ver histórico
create policy "Admin can view integration history"
  on integration_config_history for select
  using (auth.jwt() ->> 'role' = 'admin');

