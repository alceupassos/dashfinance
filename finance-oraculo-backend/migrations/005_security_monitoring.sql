-- ================================================
-- MIGRATION 005: Sistema de Monitoramento e Segurança
-- ================================================
-- Tabelas para tracking de segurança, tráfego, conexões e vulnerabilidades

-- ========================================
-- 1. SESSÕES ATIVAS (Tracking de conexões)
-- ========================================
create table if not exists active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  session_token text not null,
  ip_address inet not null,
  user_agent text,
  device_type text, -- 'desktop', 'mobile', 'tablet', 'api'
  location_country text,
  location_city text,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null,
  is_active boolean not null default true
);

create index idx_active_sessions_user on active_sessions(user_id);
create index idx_active_sessions_token on active_sessions(session_token);
create index idx_active_sessions_active on active_sessions(is_active);
create index idx_active_sessions_last_activity on active_sessions(last_activity_at);

-- ========================================
-- 2. TENTATIVAS DE LOGIN (Segurança)
-- ========================================
create table if not exists login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip_address inet not null,
  user_agent text,
  success boolean not null,
  failure_reason text, -- 'invalid_password', 'user_not_found', 'account_suspended', 'rate_limited'
  attempted_at timestamptz not null default now()
);

create index idx_login_attempts_email on login_attempts(email);
create index idx_login_attempts_ip on login_attempts(ip_address);
create index idx_login_attempts_attempted on login_attempts(attempted_at);
create index idx_login_attempts_success on login_attempts(success);

-- ========================================
-- 3. API REQUEST LOGS (Tráfego)
-- ========================================
create table if not exists api_request_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  function_name text not null, -- 'sync-f360', 'whatsapp-bot', etc.
  method text not null, -- 'GET', 'POST', 'PUT', 'DELETE'
  path text not null,
  status_code integer not null,
  response_time_ms integer,
  request_size_bytes integer,
  response_size_bytes integer,
  ip_address inet,
  user_agent text,
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_api_logs_user on api_request_logs(user_id);
create index idx_api_logs_function on api_request_logs(function_name);
create index idx_api_logs_status on api_request_logs(status_code);
create index idx_api_logs_created on api_request_logs(created_at);

-- ========================================
-- 4. VULNERABILIDADES DETECTADAS
-- ========================================
create table if not exists security_vulnerabilities (
  id uuid primary key default gen_random_uuid(),
  vulnerability_type text not null, -- 'sql_injection', 'xss', 'rate_limit_exceeded', 'suspicious_activity', 'weak_password'
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  description text not null,
  affected_component text, -- 'function_name', 'table_name', 'user_id'
  affected_id text,
  ip_address inet,
  user_id uuid references users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'false_positive')),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references users(id) on delete set null
);

create index idx_vulnerabilities_type on security_vulnerabilities(vulnerability_type);
create index idx_vulnerabilities_severity on security_vulnerabilities(severity);
create index idx_vulnerabilities_status on security_vulnerabilities(status);
create index idx_vulnerabilities_detected on security_vulnerabilities(detected_at);

-- ========================================
-- 5. RATE LIMITING (Controle de Taxa)
-- ========================================
create table if not exists rate_limit_tracking (
  id uuid primary key default gen_random_uuid(),
  identifier text not null, -- user_id, ip_address, ou api_key
  identifier_type text not null check (identifier_type in ('user', 'ip', 'api_key')),
  endpoint text not null,
  request_count integer not null default 1,
  window_start timestamptz not null,
  window_end timestamptz not null,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_rate_limit_identifier on rate_limit_tracking(identifier);
create index idx_rate_limit_endpoint on rate_limit_tracking(endpoint);
create index idx_rate_limit_window on rate_limit_tracking(window_start, window_end);

-- ========================================
-- 6. DATABASE HEALTH METRICS
-- ========================================
create table if not exists database_health_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_name text not null, -- 'connection_count', 'query_avg_time', 'table_size', 'index_usage'
  metric_value numeric not null,
  metric_unit text, -- 'count', 'ms', 'mb', 'percent'
  context jsonb, -- Dados adicionais contextuais
  recorded_at timestamptz not null default now()
);

create index idx_db_health_metric on database_health_metrics(metric_name);
create index idx_db_health_recorded on database_health_metrics(recorded_at);

-- ========================================
-- 7. BACKUP STATUS
-- ========================================
create table if not exists backup_status (
  id uuid primary key default gen_random_uuid(),
  backup_type text not null check (backup_type in ('full', 'incremental', 'snapshot')),
  status text not null check (status in ('running', 'completed', 'failed')),
  size_mb numeric,
  duration_seconds integer,
  backup_location text,
  error_message text,
  started_at timestamptz not null,
  completed_at timestamptz
);

create index idx_backup_status on backup_status(status);
create index idx_backup_started on backup_status(started_at);

-- ========================================
-- 8. COMPLIANCE CHECKS
-- ========================================
create table if not exists compliance_checks (
  id uuid primary key default gen_random_uuid(),
  check_type text not null, -- 'gdpr', 'lgpd', 'pci_dss', 'sox'
  check_name text not null,
  passed boolean not null,
  details jsonb,
  checked_at timestamptz not null default now()
);

create index idx_compliance_type on compliance_checks(check_type);
create index idx_compliance_checked on compliance_checks(checked_at);

-- ========================================
-- 9. VIEWS PARA DASHBOARD DE SEGURANÇA
-- ========================================

-- View: Usuários ativos nas últimas 24h
create or replace view v_active_users_24h as
select
  u.id,
  u.email,
  u.full_name,
  u.role,
  count(distinct s.id) as active_sessions,
  max(s.last_activity_at) as last_activity,
  count(distinct s.ip_address) as unique_ips
from users u
left join active_sessions s on s.user_id = u.id and s.is_active = true
where s.last_activity_at >= now() - interval '24 hours'
group by u.id, u.email, u.full_name, u.role
order by last_activity desc;

-- View: Tentativas de login falhadas (últimas 24h)
create or replace view v_failed_logins_24h as
select
  email,
  ip_address,
  count(*) as failure_count,
  array_agg(distinct failure_reason) as reasons,
  min(attempted_at) as first_attempt,
  max(attempted_at) as last_attempt
from login_attempts
where success = false
  and attempted_at >= now() - interval '24 hours'
group by email, ip_address
having count(*) >= 3
order by failure_count desc;

-- View: Tráfego de API por hora (últimas 24h)
create or replace view v_api_traffic_hourly as
select
  date_trunc('hour', created_at) as hour,
  function_name,
  count(*) as request_count,
  avg(response_time_ms) as avg_response_time,
  count(*) filter (where status_code >= 400) as error_count,
  sum(request_size_bytes) as total_request_bytes,
  sum(response_size_bytes) as total_response_bytes
from api_request_logs
where created_at >= now() - interval '24 hours'
group by date_trunc('hour', created_at), function_name
order by hour desc, request_count desc;

-- View: Top IPs suspeitos (muitas requisições)
create or replace view v_suspicious_ips as
select
  ip_address,
  count(*) as request_count,
  count(*) filter (where status_code >= 400) as error_count,
  count(*) filter (where status_code = 401) as auth_failures,
  count(*) filter (where status_code = 429) as rate_limited,
  array_agg(distinct function_name) as accessed_functions,
  min(created_at) as first_seen,
  max(created_at) as last_seen
from api_request_logs
where created_at >= now() - interval '24 hours'
group by ip_address
having count(*) > 100
order by request_count desc;

-- View: Vulnerabilidades abertas por severidade
create or replace view v_open_vulnerabilities as
select
  severity,
  vulnerability_type,
  count(*) as count,
  array_agg(description order by detected_at desc) as recent_descriptions,
  min(detected_at) as oldest,
  max(detected_at) as newest
from security_vulnerabilities
where status = 'open'
group by severity, vulnerability_type
order by
  case severity
    when 'critical' then 1
    when 'high' then 2
    when 'medium' then 3
    when 'low' then 4
    else 5
  end;

-- View: Métricas de saúde do banco
create or replace view v_database_health_summary as
select
  metric_name,
  avg(metric_value) as avg_value,
  min(metric_value) as min_value,
  max(metric_value) as max_value,
  metric_unit,
  max(recorded_at) as last_recorded
from database_health_metrics
where recorded_at >= now() - interval '1 hour'
group by metric_name, metric_unit
order by metric_name;

-- ========================================
-- 10. FUNÇÕES DE SEGURANÇA
-- ========================================

-- Registrar tentativa de login
create or replace function fn_log_login_attempt(
  p_email text,
  p_ip inet,
  p_user_agent text,
  p_success boolean,
  p_failure_reason text default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into login_attempts (email, ip_address, user_agent, success, failure_reason)
  values (p_email, p_ip, p_user_agent, p_success, p_failure_reason);

  -- Detectar força bruta
  if p_success = false then
    perform fn_detect_brute_force(p_email, p_ip);
  end if;
end;
$$;

-- Detectar ataque de força bruta
create or replace function fn_detect_brute_force(
  p_email text,
  p_ip inet
)
returns void
language plpgsql
security definer
as $$
declare
  v_failure_count integer;
begin
  -- Contar falhas nas últimas 15 minutos
  select count(*) into v_failure_count
  from login_attempts
  where email = p_email
    and ip_address = p_ip
    and success = false
    and attempted_at >= now() - interval '15 minutes';

  -- Se >= 5 falhas, criar vulnerabilidade
  if v_failure_count >= 5 then
    insert into security_vulnerabilities (
      vulnerability_type,
      severity,
      description,
      affected_component,
      affected_id,
      ip_address
    ) values (
      'brute_force',
      'high',
      format('Possível ataque de força bruta detectado: %s tentativas falhadas para %s', v_failure_count, p_email),
      'login',
      p_email,
      p_ip
    )
    on conflict do nothing;
  end if;
end;
$$;

-- Registrar requisição de API
create or replace function fn_log_api_request(
  p_user_id uuid,
  p_function_name text,
  p_method text,
  p_path text,
  p_status_code integer,
  p_response_time_ms integer,
  p_request_size integer,
  p_response_size integer,
  p_ip inet,
  p_user_agent text,
  p_error_message text default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into api_request_logs (
    user_id, function_name, method, path, status_code,
    response_time_ms, request_size_bytes, response_size_bytes,
    ip_address, user_agent, error_message
  ) values (
    p_user_id, p_function_name, p_method, p_path, p_status_code,
    p_response_time_ms, p_request_size, p_response_size,
    p_ip, p_user_agent, p_error_message
  );
end;
$$;

-- Verificar rate limit
create or replace function fn_check_rate_limit(
  p_identifier text,
  p_identifier_type text,
  p_endpoint text,
  p_max_requests integer,
  p_window_minutes integer
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count integer;
  v_window_start timestamptz;
  v_window_end timestamptz;
begin
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  v_window_end := now();

  -- Contar requisições na janela
  select count(*) into v_count
  from rate_limit_tracking
  where identifier = p_identifier
    and identifier_type = p_identifier_type
    and endpoint = p_endpoint
    and window_start >= v_window_start;

  -- Se excedeu o limite, bloquear
  if v_count >= p_max_requests then
    -- Registrar vulnerabilidade
    insert into security_vulnerabilities (
      vulnerability_type,
      severity,
      description,
      affected_component,
      affected_id
    ) values (
      'rate_limit_exceeded',
      'medium',
      format('Rate limit excedido: %s requisições em %s minutos', v_count, p_window_minutes),
      p_endpoint,
      p_identifier
    );

    return false;
  end if;

  -- Registrar esta requisição
  insert into rate_limit_tracking (
    identifier, identifier_type, endpoint, window_start, window_end
  ) values (
    p_identifier, p_identifier_type, p_endpoint, v_window_start, v_window_end
  );

  return true;
end;
$$;

-- Coletar métricas de saúde do banco
create or replace function fn_collect_database_metrics()
returns void
language plpgsql
security definer
as $$
declare
  v_connection_count integer;
  v_db_size_mb numeric;
  v_table_count integer;
begin
  -- Conexões ativas
  select count(*) into v_connection_count
  from pg_stat_activity
  where state = 'active';

  insert into database_health_metrics (metric_name, metric_value, metric_unit)
  values ('active_connections', v_connection_count, 'count');

  -- Tamanho do banco
  select pg_database_size(current_database()) / 1024.0 / 1024.0 into v_db_size_mb;

  insert into database_health_metrics (metric_name, metric_value, metric_unit)
  values ('database_size', v_db_size_mb, 'mb');

  -- Número de tabelas
  select count(*) into v_table_count
  from information_schema.tables
  where table_schema = 'public';

  insert into database_health_metrics (metric_name, metric_value, metric_unit)
  values ('table_count', v_table_count, 'count');
end;
$$;

-- ========================================
-- 11. JOB PARA COLETAR MÉTRICAS (pg_cron)
-- ========================================

-- A cada 5 minutos, coletar métricas
select cron.schedule(
  'collect_db_metrics_5min',
  '*/5 * * * *',
  $$SELECT fn_collect_database_metrics();$$
);

-- Limpar logs antigos (manter últimos 30 dias)
select cron.schedule(
  'cleanup_old_logs_daily',
  '0 2 * * *',
  $$
    DELETE FROM api_request_logs WHERE created_at < now() - interval '30 days';
    DELETE FROM login_attempts WHERE attempted_at < now() - interval '30 days';
    DELETE FROM active_sessions WHERE expires_at < now() - interval '7 days';
  $$
);

-- ========================================
-- VERIFICAR SUCESSO DA MIGRAÇÃO
-- ========================================
select
  'Migration 005 completed successfully!' as status,
  (select count(*) from information_schema.tables where table_name like '%session%' or table_name like '%login%' or table_name like '%security%') as new_tables,
  (select count(*) from pg_cron.job where jobname like '%metric%' or jobname like '%cleanup%') as new_jobs;
