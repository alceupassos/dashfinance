-- Funções auxiliares para métricas

-- Obter uso de LLM por hora
create or replace function get_llm_usage_by_hour(hours_ago integer default 24)
returns table (
  hour timestamp,
  provider text,
  model text,
  total_tokens bigint,
  total_cost numeric,
  requests bigint
) as $$
begin
  return query
  select 
    date_trunc('hour', created_at) as hour,
    provider,
    model,
    sum(total_tokens)::bigint as total_tokens,
    sum(cost_usd) as total_cost,
    count(*)::bigint as requests
  from llm_token_usage
  where created_at >= now() - (hours_ago || ' hours')::interval
  group by date_trunc('hour', created_at), provider, model
  order by hour desc;
end;
$$ language plpgsql security definer;

-- Obter taxa de requisições por minuto
create or replace function get_request_rate_by_minute(minutes_ago integer default 60)
returns table (
  minute timestamp,
  endpoint text,
  requests bigint,
  avg_response_time numeric,
  error_rate numeric
) as $$
begin
  return query
  select 
    date_trunc('minute', created_at) as minute,
    endpoint,
    count(*)::bigint as requests,
    avg(response_time_ms) as avg_response_time,
    (count(*) filter (where status_code >= 400)::numeric / nullif(count(*), 0) * 100) as error_rate
  from access_logs
  where created_at >= now() - (minutes_ago || ' minutes')::interval
  group by date_trunc('minute', created_at), endpoint
  order by minute desc;
end;
$$ language plpgsql security definer;

-- Função para atualizar health check
create or replace function update_service_health(
  p_service_name text,
  p_status text,
  p_response_time_ms integer default null,
  p_error_message text default null
) returns void as $$
begin
  insert into system_health (service_name, status, response_time_ms, error_message, last_check_at)
  values (p_service_name, p_status, p_response_time_ms, p_error_message, now())
  on conflict (service_name) do update set
    status = excluded.status,
    response_time_ms = excluded.response_time_ms,
    error_message = excluded.error_message,
    last_check_at = excluded.last_check_at;
end;
$$ language plpgsql security definer;

-- Função para registrar acesso
create or replace function log_access(
  p_user_id uuid,
  p_email text,
  p_ip_address inet,
  p_user_agent text,
  p_endpoint text,
  p_method text,
  p_status_code integer,
  p_response_time_ms integer,
  p_request_size_bytes integer default null,
  p_response_size_bytes integer default null,
  p_error_message text default null
) returns void as $$
begin
  insert into access_logs (
    user_id, email, ip_address, user_agent, endpoint, method,
    status_code, response_time_ms, request_size_bytes, response_size_bytes, error_message
  )
  values (
    p_user_id, p_email, p_ip_address, p_user_agent, p_endpoint, p_method,
    p_status_code, p_response_time_ms, p_request_size_bytes, p_response_size_bytes, p_error_message
  );
end;
$$ language plpgsql security definer;

