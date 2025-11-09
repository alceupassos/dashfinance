-- =========================
-- SISTEMA DE PLANOS E COBRANÇA
-- =========================

-- Tabela de planos de serviço
create table if not exists service_plans (
  id uuid primary key default gen_random_uuid(),
  plan_name text not null unique, -- 'basic', 'professional', 'enterprise', 'oraculo'
  display_name text not null,
  description text,
  monthly_price_usd numeric(10,2) not null default 0,
  
  -- Limites de uso
  max_llm_tokens_per_month integer,
  max_llm_cost_per_month_usd numeric(10,2),
  max_whatsapp_messages_per_month integer,
  max_companies integer default 1,
  max_users integer default 1,
  max_storage_gb integer default 1,
  
  -- Recursos incluídos
  includes_ai_analysis boolean default false,
  includes_whatsapp_bot boolean default false,
  includes_automated_reports boolean default false,
  includes_api_access boolean default false,
  includes_custom_integrations boolean default false,
  includes_priority_support boolean default false,
  
  -- Configurações de cobrança
  billing_cycle text default 'monthly' check (billing_cycle in ('monthly', 'quarterly', 'yearly')),
  overage_enabled boolean default true,
  overage_rate_multiplier numeric(3,2) default 1.5, -- 1.5x o custo normal
  
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Inserir planos padrão
insert into service_plans (
  plan_name, display_name, description, monthly_price_usd,
  max_llm_tokens_per_month, max_llm_cost_per_month_usd,
  max_whatsapp_messages_per_month, max_companies, max_users,
  includes_ai_analysis, includes_whatsapp_bot, includes_automated_reports,
  includes_api_access, includes_priority_support
) values
  (
    'basic',
    'Básico',
    'Plano básico para pequenas empresas',
    49.00,
    100000, -- 100k tokens
    10.00, -- $10 em custos LLM
    500, -- 500 mensagens WhatsApp
    1, 1,
    true, false, false, false, false
  ),
  (
    'professional',
    'Profissional',
    'Plano completo para empresas em crescimento',
    149.00,
    500000, -- 500k tokens
    50.00, -- $50 em custos LLM
    2000, -- 2000 mensagens
    3, 5,
    true, true, true, true, false
  ),
  (
    'enterprise',
    'Enterprise',
    'Solução completa para grandes empresas',
    499.00,
    2000000, -- 2M tokens
    200.00, -- $200 em custos LLM
    10000, -- 10k mensagens
    10, 20,
    true, true, true, true, true
  ),
  (
    'oraculo',
    'Oráculo Premium',
    'Serviço de valor agregado: Oráculo especial para gerir sua empresa',
    999.00,
    10000000, -- 10M tokens
    1000.00, -- $1000 em custos LLM
    50000, -- 50k mensagens
    null, -- Ilimitado
    null, -- Ilimitado
    true, true, true, true, true
  )
on conflict (plan_name) do nothing;

-- Tabela de assinaturas de clientes
create table if not exists client_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null unique,
  plan_id uuid not null references service_plans(id),
  
  -- Status da assinatura
  status text not null default 'active' check (status in ('active', 'suspended', 'cancelled', 'trial')),
  trial_ends_at timestamptz,
  
  -- Datas de cobrança
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '1 month'),
  cancel_at_period_end boolean default false,
  cancelled_at timestamptz,
  
  -- Métricas do período atual
  llm_tokens_used_this_period integer default 0,
  llm_cost_this_period_usd numeric(10,2) default 0,
  whatsapp_messages_this_period integer default 0,
  
  -- Configurações de cobrança
  billing_email text,
  payment_method_id text, -- ID do método de pagamento (Stripe, etc)
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_client_subscriptions_cnpj on client_subscriptions(company_cnpj);
create index if not exists idx_client_subscriptions_status on client_subscriptions(status, current_period_end);
create index if not exists idx_client_subscriptions_plan on client_subscriptions(plan_id);

-- Tabela de cobranças (invoices)
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references client_subscriptions(id),
  company_cnpj text not null,
  
  -- Período da cobrança
  period_start timestamptz not null,
  period_end timestamptz not null,
  
  -- Valores
  base_amount_usd numeric(10,2) not null,
  overage_amount_usd numeric(10,2) default 0,
  total_amount_usd numeric(10,2) not null,
  
  -- Detalhes de uso
  llm_tokens_used integer,
  llm_cost_usd numeric(10,2),
  whatsapp_messages_used integer,
  
  -- Status de pagamento
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  payment_intent_id text, -- Stripe Payment Intent ID
  
  invoice_pdf_url text, -- URL do PDF da fatura
  created_at timestamptz default now()
);

create index if not exists idx_invoices_subscription on invoices(subscription_id, created_at desc);
create index if not exists idx_invoices_status on invoices(status, created_at desc);
create index if not exists idx_invoices_cnpj on invoices(company_cnpj, created_at desc);

-- Tabela de linhas de cobrança (invoice line items)
create table if not exists invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price_usd numeric(10,2) not null,
  total_price_usd numeric(10,2) not null,
  
  -- Tipo de item
  item_type text not null check (item_type in ('subscription', 'overage_llm', 'overage_whatsapp', 'addon', 'discount')),
  
  created_at timestamptz default now()
);

create index if not exists idx_invoice_line_items_invoice on invoice_line_items(invoice_id);

-- Função para calcular uso do período atual
create or replace function calculate_current_period_usage(
  p_company_cnpj text
) returns table (
  llm_tokens_used integer,
  llm_cost_usd numeric,
  whatsapp_messages_used integer
) as $$
declare
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  -- Buscar período atual da assinatura
  select current_period_start, current_period_end
  into v_period_start, v_period_end
  from client_subscriptions
  where company_cnpj = p_company_cnpj
    and status = 'active';

  if v_period_start is null then
    return;
  end if;

  -- Calcular uso de LLM
  return query
  select
    coalesce(sum(total_tokens), 0)::integer as llm_tokens_used,
    coalesce(sum(cost_usd), 0) as llm_cost_usd,
    0::integer as whatsapp_messages_used -- TODO: contar mensagens WhatsApp
  from llm_token_usage
  where company_cnpj = p_company_cnpj
    and created_at >= v_period_start
    and created_at < v_period_end;
end;
$$ language plpgsql security definer;

-- Função para verificar limites e calcular excedente
create or replace function check_usage_limits(
  p_company_cnpj text
) returns table (
  within_limits boolean,
  llm_tokens_remaining integer,
  llm_cost_remaining_usd numeric,
  whatsapp_messages_remaining integer,
  overage_llm_tokens integer,
  overage_llm_cost_usd numeric
) as $$
declare
  v_plan service_plans%rowtype;
  v_usage record;
  v_subscription client_subscriptions%rowtype;
begin
  -- Buscar assinatura e plano
  select cs.*, sp.*
  into v_subscription, v_plan
  from client_subscriptions cs
  join service_plans sp on sp.id = cs.plan_id
  where cs.company_cnpj = p_company_cnpj
    and cs.status = 'active';

  if v_subscription.id is null then
    return;
  end if;

  -- Calcular uso atual
  select * into v_usage
  from calculate_current_period_usage(p_company_cnpj);

  -- Calcular excedente
  return query
  select
    (v_usage.llm_tokens_used <= coalesce(v_plan.max_llm_tokens_per_month, 999999999) and
     v_usage.llm_cost_usd <= coalesce(v_plan.max_llm_cost_per_month_usd, 999999) and
     v_usage.whatsapp_messages_used <= coalesce(v_plan.max_whatsapp_messages_per_month, 999999)) as within_limits,
    greatest(coalesce(v_plan.max_llm_tokens_per_month, 999999999) - v_usage.llm_tokens_used, 0) as llm_tokens_remaining,
    greatest(coalesce(v_plan.max_llm_cost_per_month_usd, 999999) - v_usage.llm_cost_usd, 0) as llm_cost_remaining_usd,
    greatest(coalesce(v_plan.max_whatsapp_messages_per_month, 999999) - v_usage.whatsapp_messages_used, 0) as whatsapp_messages_remaining,
    greatest(v_usage.llm_tokens_used - coalesce(v_plan.max_llm_tokens_per_month, 0), 0) as overage_llm_tokens,
    greatest(v_usage.llm_cost_usd - coalesce(v_plan.max_llm_cost_per_month_usd, 0), 0) as overage_llm_cost_usd;
end;
$$ language plpgsql security definer;

-- Função para criar fatura ao final do período
create or replace function create_period_invoice(
  p_company_cnpj text
) returns uuid as $$
declare
  v_subscription client_subscriptions%rowtype;
  v_plan service_plans%rowtype;
  v_usage record;
  v_limits record;
  v_invoice_id uuid;
  v_base_amount numeric;
  v_overage_amount numeric;
  v_total_amount numeric;
begin
  -- Buscar assinatura e plano
  select cs.*, sp.*
  into v_subscription, v_plan
  from client_subscriptions cs
  join service_plans sp on sp.id = cs.plan_id
  where cs.company_cnpj = p_company_cnpj
    and cs.status = 'active';

  if v_subscription.id is null then
    raise exception 'No active subscription found';
  end if;

  -- Calcular uso
  select * into v_usage from calculate_current_period_usage(p_company_cnpj);
  select * into v_limits from check_usage_limits(p_company_cnpj);

  -- Calcular valores
  v_base_amount := v_plan.monthly_price_usd;
  
  -- Calcular excedente se habilitado
  if v_plan.overage_enabled and v_limits.overage_llm_cost_usd > 0 then
    v_overage_amount := v_limits.overage_llm_cost_usd * v_plan.overage_rate_multiplier;
  else
    v_overage_amount := 0;
  end if;

  v_total_amount := v_base_amount + v_overage_amount;

  -- Criar fatura
  insert into invoices (
    subscription_id, company_cnpj,
    period_start, period_end,
    base_amount_usd, overage_amount_usd, total_amount_usd,
    llm_tokens_used, llm_cost_usd, whatsapp_messages_used,
    status
  )
  values (
    v_subscription.id, p_company_cnpj,
    v_subscription.current_period_start, v_subscription.current_period_end,
    v_base_amount, v_overage_amount, v_total_amount,
    v_usage.llm_tokens_used, v_usage.llm_cost_usd, v_usage.whatsapp_messages_used,
    'pending'
  )
  returning id into v_invoice_id;

  -- Criar linhas da fatura
  insert into invoice_line_items (invoice_id, description, quantity, unit_price_usd, total_price_usd, item_type)
  values
    (v_invoice_id, v_plan.display_name || ' - ' || to_char(v_subscription.current_period_start, 'Mon YYYY'), 1, v_base_amount, v_base_amount, 'subscription');

  if v_overage_amount > 0 then
    insert into invoice_line_items (invoice_id, description, quantity, unit_price_usd, total_price_usd, item_type)
    values
      (v_invoice_id, 'Excedente LLM (' || round(v_limits.overage_llm_tokens / 1000.0, 2) || 'k tokens)', 1, v_overage_amount, v_overage_amount, 'overage_llm');
  end if;

  -- Atualizar período da assinatura
  update client_subscriptions
  set
    current_period_start = current_period_end,
    current_period_end = current_period_end + interval '1 month',
    llm_tokens_used_this_period = 0,
    llm_cost_this_period_usd = 0,
    whatsapp_messages_this_period = 0
  where id = v_subscription.id;

  return v_invoice_id;
end;
$$ language plpgsql security definer;

-- RLS Policies
alter table service_plans enable row level security;
alter table client_subscriptions enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;

-- Todos podem ver planos ativos
create policy "Anyone can view active plans"
  on service_plans for select
  using (is_active = true);

-- Admin pode gerenciar planos
create policy "Admin can manage plans"
  on service_plans for all
  using (auth.jwt() ->> 'role' = 'admin');

-- Clientes podem ver sua própria assinatura
create policy "Clients can view own subscription"
  on client_subscriptions for select
  using (
    company_cnpj in (
      select company_cnpj from companies
      where owner_id = auth.uid()
    )
  );

-- Admin pode ver todas as assinaturas
create policy "Admin can view all subscriptions"
  on client_subscriptions for select
  using (auth.jwt() ->> 'role' = 'admin');

-- Clientes podem ver suas próprias faturas
create policy "Clients can view own invoices"
  on invoices for select
  using (
    company_cnpj in (
      select company_cnpj from companies
      where owner_id = auth.uid()
    )
  );

-- Admin pode ver todas as faturas
create policy "Admin can view all invoices"
  on invoices for select
  using (auth.jwt() ->> 'role' = 'admin');

