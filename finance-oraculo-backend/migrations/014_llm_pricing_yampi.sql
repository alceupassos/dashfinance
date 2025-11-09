-- =========================
-- SISTEMA DE PRECIFICAÇÃO LLM E INTEGRAÇÃO YAMPI
-- =========================

-- Tabela de precificação de modelos LLM
create table if not exists llm_pricing (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('anthropic', 'openai', 'google', 'mistral')),
  model text not null,
  
  -- Custos reais (o que pagamos)
  cost_per_1k_input_tokens numeric(10,6) not null default 0,
  cost_per_1k_output_tokens numeric(10,6) not null default 0,
  
  -- Preço para cliente (o que cobramos)
  price_per_1k_input_tokens numeric(10,6) not null,
  price_per_1k_output_tokens numeric(10,6) not null,
  
  -- Margem de lucro (multiplicador)
  markup_multiplier numeric(4,2) default 3.5,
  
  -- Status
  is_active boolean default true,
  notes text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(provider, model)
);

-- Inserir precificação padrão (3.5x markup)
insert into llm_pricing (
  provider, model,
  cost_per_1k_input_tokens, cost_per_1k_output_tokens,
  price_per_1k_input_tokens, price_per_1k_output_tokens,
  markup_multiplier
) values
  -- Anthropic Claude
  ('anthropic', 'claude-3-5-haiku-20241022', 0.001, 0.005, 0.0035, 0.0175, 3.5),
  ('anthropic', 'claude-sonnet-4-5-20250929', 0.003, 0.015, 0.0105, 0.0525, 3.5),
  ('anthropic', 'claude-opus-4-20250514', 0.015, 0.075, 0.0525, 0.2625, 3.5),
  
  -- OpenAI
  ('openai', 'gpt-4o-mini', 0.00015, 0.0006, 0.000525, 0.0021, 3.5),
  ('openai', 'gpt-4o', 0.0025, 0.01, 0.00875, 0.035, 3.5),
  ('openai', 'o1', 0.015, 0.06, 0.0525, 0.21, 3.5)
on conflict (provider, model) do nothing;

create index if not exists idx_llm_pricing_provider_model on llm_pricing(provider, model);
create index if not exists idx_llm_pricing_active on llm_pricing(is_active);

-- Tabela de configuração Yampi
create table if not exists yampi_config (
  id uuid primary key default gen_random_uuid(),
  api_key text not null, -- Criptografado
  store_id text,
  environment text default 'production' check (environment in ('sandbox', 'production')),
  webhook_secret text, -- Para validar webhooks do Yampi
  
  -- Configurações de produtos
  product_id_llm_tokens text, -- ID do produto no Yampi para tokens LLM
  product_id_whatsapp_messages text, -- ID do produto no Yampi para mensagens WhatsApp
  
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela de faturas Yampi (sincronização)
create table if not exists yampi_invoices (
  id uuid primary key default gen_random_uuid(),
  yampi_order_id text not null unique,
  yampi_invoice_id text,
  
  company_cnpj text not null,
  
  -- Valores
  total_amount_usd numeric(10,2) not null,
  base_amount_usd numeric(10,2),
  overage_amount_usd numeric(10,2),
  
  -- Detalhes de uso
  period_start timestamptz,
  period_end timestamptz,
  llm_tokens_used integer,
  llm_cost_usd numeric(10,2),
  whatsapp_messages_used integer,
  
  -- Status
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  yampi_status text, -- Status do Yampi
  
  -- Dados do Yampi
  yampi_data jsonb,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_yampi_invoices_order on yampi_invoices(yampi_order_id);
create index if not exists idx_yampi_invoices_cnpj on yampi_invoices(company_cnpj);
create index if not exists idx_yampi_invoices_status on yampi_invoices(status);

-- Função para calcular preço para cliente baseado no custo
create or replace function calculate_client_price(
  p_provider text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer
) returns numeric as $$
declare
  v_pricing llm_pricing%rowtype;
  v_total_price numeric;
begin
  -- Buscar precificação
  select * into v_pricing
  from llm_pricing
  where provider = p_provider
    and model = p_model
    and is_active = true;

  if v_pricing.id is null then
    -- Se não encontrar, usar markup padrão de 3.5x sobre custos conhecidos
    -- Valores padrão aproximados
    if p_provider = 'anthropic' and p_model like 'claude-3-5-haiku%' then
      v_total_price := (p_input_tokens / 1000.0 * 0.001 + p_output_tokens / 1000.0 * 0.005) * 3.5;
    elsif p_provider = 'anthropic' and p_model like 'claude-sonnet%' then
      v_total_price := (p_input_tokens / 1000.0 * 0.003 + p_output_tokens / 1000.0 * 0.015) * 3.5;
    elsif p_provider = 'openai' and p_model = 'gpt-4o-mini' then
      v_total_price := (p_input_tokens / 1000.0 * 0.00015 + p_output_tokens / 1000.0 * 0.0006) * 3.5;
    else
      -- Fallback genérico
      v_total_price := (p_input_tokens / 1000.0 * 0.001 + p_output_tokens / 1000.0 * 0.005) * 3.5;
    end if;
  else
    -- Usar precificação configurada
    v_total_price := 
      (p_input_tokens / 1000.0 * v_pricing.price_per_1k_input_tokens) +
      (p_output_tokens / 1000.0 * v_pricing.price_per_1k_output_tokens);
  end if;

  return round(v_total_price, 6);
end;
$$ language plpgsql security definer;

-- Função para registrar uso com preço calculado
create or replace function record_llm_usage_with_pricing(
  p_user_id uuid,
  p_company_cnpj text,
  p_provider text,
  p_model text,
  p_prompt_tokens integer,
  p_completion_tokens integer,
  p_endpoint text default null,
  p_response_time_ms integer default null
) returns uuid as $$
declare
  v_usage_id uuid;
  v_actual_cost numeric;
  v_client_price numeric;
begin
  -- Calcular custo real (o que pagamos)
  select 
    (p_prompt_tokens / 1000.0 * cost_per_1k_input_tokens) +
    (p_completion_tokens / 1000.0 * cost_per_1k_output_tokens)
  into v_actual_cost
  from llm_pricing
  where provider = p_provider
    and model = p_model
    and is_active = true;

  -- Se não encontrar precificação, usar valores padrão
  if v_actual_cost is null then
    if p_provider = 'anthropic' and p_model like 'claude-3-5-haiku%' then
      v_actual_cost := (p_prompt_tokens / 1000.0 * 0.001) + (p_completion_tokens / 1000.0 * 0.005);
    elsif p_provider = 'anthropic' and p_model like 'claude-sonnet%' then
      v_actual_cost := (p_prompt_tokens / 1000.0 * 0.003) + (p_completion_tokens / 1000.0 * 0.015);
    elsif p_provider = 'openai' and p_model = 'gpt-4o-mini' then
      v_actual_cost := (p_prompt_tokens / 1000.0 * 0.00015) + (p_completion_tokens / 1000.0 * 0.0006);
    else
      v_actual_cost := (p_prompt_tokens / 1000.0 * 0.001) + (p_completion_tokens / 1000.0 * 0.005);
    end if;
  end if;

  -- Calcular preço para cliente
  v_client_price := calculate_client_price(p_provider, p_model, p_prompt_tokens, p_completion_tokens);

  -- Registrar uso
  insert into llm_token_usage (
    user_id, company_cnpj, provider, model,
    prompt_tokens, completion_tokens, total_tokens,
    cost_usd, endpoint, response_time_ms
  )
  values (
    p_user_id, p_company_cnpj, p_provider, p_model,
    p_prompt_tokens, p_completion_tokens,
    p_prompt_tokens + p_completion_tokens,
    v_actual_cost, -- Custo real
    p_endpoint, p_response_time_ms
  )
  returning id into v_usage_id;

  -- Registrar preço cobrado separadamente (para relatórios)
  -- Podemos adicionar uma coluna client_price_usd na tabela llm_token_usage se necessário

  return v_usage_id;
end;
$$ language plpgsql security definer;

-- View para relatório de margem de lucro
create or replace view v_llm_profit_margin as
select
  date_trunc('day', ltu.created_at)::date as date,
  ltu.provider,
  ltu.model,
  sum(ltu.total_tokens) as total_tokens,
  sum(ltu.cost_usd) as total_cost_usd,
  sum(calculate_client_price(ltu.provider, ltu.model, ltu.prompt_tokens, ltu.completion_tokens)) as total_client_price_usd,
  sum(calculate_client_price(ltu.provider, ltu.model, ltu.prompt_tokens, ltu.completion_tokens)) - sum(ltu.cost_usd) as profit_usd,
  case 
    when sum(ltu.cost_usd) > 0 
    then ((sum(calculate_client_price(ltu.provider, ltu.model, ltu.prompt_tokens, ltu.completion_tokens)) - sum(ltu.cost_usd)) / sum(ltu.cost_usd) * 100)
    else 0
  end as profit_margin_percent,
  count(*) as total_requests
from llm_token_usage ltu
where ltu.created_at >= now() - interval '30 days'
group by date_trunc('day', ltu.created_at), ltu.provider, ltu.model
order by date desc, profit_usd desc;

-- RLS Policies
alter table llm_pricing enable row level security;
alter table yampi_config enable row level security;
alter table yampi_invoices enable row level security;

-- Admin pode gerenciar precificação
create policy "Admin can manage LLM pricing"
  on llm_pricing for all
  using (auth.jwt() ->> 'role' = 'admin');

-- Admin pode gerenciar configuração Yampi
create policy "Admin can manage Yampi config"
  on yampi_config for all
  using (auth.jwt() ->> 'role' = 'admin');

-- Admin pode ver todas as faturas Yampi
create policy "Admin can view Yampi invoices"
  on yampi_invoices for select
  using (auth.jwt() ->> 'role' = 'admin');

-- Clientes podem ver suas próprias faturas
create policy "Clients can view own Yampi invoices"
  on yampi_invoices for select
  using (
    company_cnpj in (
      select company_cnpj from companies
      where owner_id = auth.uid()
    )
  );

