-- =========================
-- SISTEMA DE MONITORAMENTO E SEGURANÇA
-- =========================

-- Tabela de vulnerabilidades detectadas
create table if not exists security_vulnerabilities (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('critical', 'high', 'moderate', 'low')),
  package_name text not null,
  vulnerability_id text,
  title text not null,
  description text,
  affected_version text,
  fixed_version text,
  status text default 'open' check (status in ('open', 'fixed', 'ignored', 'false_positive')),
  detected_at timestamptz default now(),
  fixed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_security_vulnerabilities_severity on security_vulnerabilities(severity, status);
create index if not exists idx_security_vulnerabilities_status on security_vulnerabilities(status, detected_at desc);

-- Tabela de acessos e auditoria
create table if not exists access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  email text,
  ip_address inet,
  user_agent text,
  endpoint text not null,
  method text not null,
  status_code integer,
  response_time_ms integer,
  request_size_bytes integer,
  response_size_bytes integer,
  error_message text,
  created_at timestamptz default now()
);

create index if not exists idx_access_logs_user on access_logs(user_id, created_at desc);
create index if not exists idx_access_logs_endpoint on access_logs(endpoint, created_at desc);
create index if not exists idx_access_logs_created on access_logs(created_at desc);
create index if not exists idx_access_logs_ip on access_logs(ip_address, created_at desc);

-- Tabela de métricas do sistema
create table if not exists system_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_type text not null check (metric_type in ('edge_function', 'database', 'storage', 'auth', 'realtime', 'api')),
  metric_name text not null,
  metric_value numeric not null,
  unit text default 'count',
  tags jsonb,
  recorded_at timestamptz default now()
);

create index if not exists idx_system_metrics_type on system_metrics(metric_type, recorded_at desc);
create index if not exists idx_system_metrics_name on system_metrics(metric_name, recorded_at desc);
create index if not exists idx_system_metrics_recorded on system_metrics(recorded_at desc);

-- Tabela de controle de tokens LLM
create table if not exists llm_token_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  company_cnpj text,
  provider text not null check (provider in ('anthropic', 'openai', 'google', 'mistral')),
  model text not null,
  prompt_tokens integer not null,
  completion_tokens integer not null,
  total_tokens integer not null,
  cost_usd numeric(10,6),
  endpoint text,
  response_time_ms integer,
  created_at timestamptz default now()
);

create index if not exists idx_llm_token_usage_user on llm_token_usage(user_id, created_at desc);
create index if not exists idx_llm_token_usage_provider on llm_token_usage(provider, created_at desc);
create index if not exists idx_llm_token_usage_created on llm_token_usage(created_at desc);
create index if not exists idx_llm_token_usage_company on llm_token_usage(company_cnpj, created_at desc);

-- Tabela de configuração de LLM por tipo de tarefa
create table if not exists llm_model_config (
  id uuid primary key default gen_random_uuid(),
  task_type text not null unique check (task_type in ('ocr', 'analysis', 'chat', 'summary', 'alert', 'report')),
  provider text not null check (provider in ('anthropic', 'openai', 'google', 'mistral')),
  model text not null,
  max_tokens integer default 4000,
  temperature numeric(3,2) default 0.7,
  priority integer default 5, -- 1-10, menor = maior prioridade
  cost_per_1k_tokens numeric(10,6),
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Inserir configurações padrão
insert into llm_model_config (task_type, provider, model, max_tokens, temperature, priority, cost_per_1k_tokens) values
  ('ocr', 'anthropic', 'claude-3-haiku-20240307', 4000, 0.3, 1, 0.25),
  ('analysis', 'anthropic', 'claude-3-sonnet-20240229', 8000, 0.7, 2, 3.00),
  ('chat', 'anthropic', 'claude-3-haiku-20240307', 4000, 0.7, 3, 0.25),
  ('summary', 'anthropic', 'claude-3-haiku-20240307', 2000, 0.5, 4, 0.25),
  ('alert', 'anthropic', 'claude-3-haiku-20240307', 1000, 0.3, 5, 0.25),
  ('report', 'anthropic', 'claude-3-sonnet-20240229', 16000, 0.7, 2, 3.00)
on conflict (task_type) do nothing;

-- Tabela de status do sistema (health checks)
create table if not exists system_health (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  status text not null check (status in ('healthy', 'degraded', 'down', 'unknown')),
  response_time_ms integer,
  error_message text,
  last_check_at timestamptz default now(),
  created_at timestamptz default now()
);

create unique index if not exists idx_system_health_service on system_health(service_name);

-- Inserir serviços padrão
insert into system_health (service_name, status) values
  ('database', 'unknown'),
  ('edge_functions', 'unknown'),
  ('storage', 'unknown'),
  ('auth', 'unknown'),
  ('realtime', 'unknown'),
  ('api', 'unknown'),
  ('whatsapp', 'unknown'),
  ('n8n', 'unknown'),
  ('f360_integration', 'unknown'),
  ('omie_integration', 'unknown')
on conflict (service_name) do nothing;

-- Tabela de alertas de segurança
create table if not exists security_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null check (alert_type in ('vulnerability', 'unauthorized_access', 'rate_limit', 'data_breach', 'suspicious_activity', 'failed_auth')),
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  title text not null,
  description text,
  affected_resource text,
  ip_address inet,
  user_id uuid references auth.users(id),
  resolved boolean default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists idx_security_alerts_severity on security_alerts(severity, resolved, created_at desc);
create index if not exists idx_security_alerts_type on security_alerts(alert_type, resolved, created_at desc);
create index if not exists idx_security_alerts_resolved on security_alerts(resolved, created_at desc);

-- RLS Policies
alter table security_vulnerabilities enable row level security;
alter table access_logs enable row level security;
alter table system_metrics enable row level security;
alter table llm_token_usage enable row level security;
alter table llm_model_config enable row level security;
alter table system_health enable row level security;
alter table security_alerts enable row level security;

-- Políticas para admin apenas
create policy "Admin can view all security data"
  on security_vulnerabilities for select
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Admin can view all access logs"
  on access_logs for select
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Admin can view all system metrics"
  on system_metrics for select
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Admin can view all LLM token usage"
  on llm_token_usage for select
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Admin can manage LLM model config"
  on llm_model_config for all
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Admin can view system health"
  on system_health for select
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Admin can view security alerts"
  on security_alerts for select
  using (auth.jwt() ->> 'role' = 'admin');

-- Função para registrar métricas automaticamente
create or replace function record_system_metric(
  p_metric_type text,
  p_metric_name text,
  p_metric_value numeric,
  p_unit text default 'count',
  p_tags jsonb default '{}'::jsonb
) returns void as $$
begin
  insert into system_metrics (metric_type, metric_name, metric_value, unit, tags)
  values (p_metric_type, p_metric_name, p_metric_value, p_unit, p_tags);
end;
$$ language plpgsql security definer;

-- Função para registrar uso de tokens LLM
create or replace function record_llm_usage(
  p_user_id uuid,
  p_company_cnpj text,
  p_provider text,
  p_model text,
  p_prompt_tokens integer,
  p_completion_tokens integer,
  p_cost_usd numeric,
  p_endpoint text default null,
  p_response_time_ms integer default null
) returns void as $$
begin
  insert into llm_token_usage (
    user_id, company_cnpj, provider, model,
    prompt_tokens, completion_tokens, total_tokens,
    cost_usd, endpoint, response_time_ms
  )
  values (
    p_user_id, p_company_cnpj, p_provider, p_model,
    p_prompt_tokens, p_completion_tokens,
    p_prompt_tokens + p_completion_tokens,
    p_cost_usd, p_endpoint, p_response_time_ms
  );
end;
$$ language plpgsql security definer;

-- Função para obter modelo recomendado por tipo de tarefa
create or replace function get_recommended_llm_model(p_task_type text)
returns table (
  provider text,
  model text,
  max_tokens integer,
  temperature numeric,
  cost_per_1k_tokens numeric
) as $$
begin
  return query
  select 
    lmc.provider,
    lmc.model,
    lmc.max_tokens,
    lmc.temperature,
    lmc.cost_per_1k_tokens
  from llm_model_config lmc
  where lmc.task_type = p_task_type
    and lmc.enabled = true
  order by lmc.priority
  limit 1;
end;
$$ language plpgsql security definer;

