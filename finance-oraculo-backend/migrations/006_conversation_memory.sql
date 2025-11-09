-- ================================================
-- MIGRATION 006: Sistema de Memória de Conversação
-- ================================================
-- Implementa context window de 120 mensagens com resumo automático
-- e histórico completo para análise posterior

-- ========================================
-- 1. CONVERSATION CONTEXT (Memória Ativa)
-- ========================================
-- Armazena últimas 120 mensagens por conversa para context window
create table if not exists conversation_context (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references whatsapp_conversations(id) on delete cascade,
  user_phone text not null,
  user_cnpj text not null,
  message_role text not null check (message_role in ('user', 'assistant', 'system')),
  message_content text not null,
  message_tokens integer, -- Tokens estimados da mensagem
  llm_model_used text, -- Modelo usado para gerar resposta (se role=assistant)
  llm_cost_usd numeric(10, 6), -- Custo desta resposta específica
  metadata jsonb, -- { intent: 'query_balance', entities: ['caixa'], sentiment: 'neutral' }
  created_at timestamptz not null default now(),

  -- Índices para busca rápida
  constraint fk_conversation foreign key (conversation_id) references whatsapp_conversations(id)
);

create index idx_conversation_context_conv on conversation_context(conversation_id);
create index idx_conversation_context_created on conversation_context(created_at desc);
create index idx_conversation_context_phone on conversation_context(user_phone);
create index idx_conversation_context_cnpj on conversation_context(user_cnpj);

-- ========================================
-- 2. CONVERSATION SUMMARIES (Resumos)
-- ========================================
-- Resumos periódicos de conversas para reduzir context window
create table if not exists conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references whatsapp_conversations(id) on delete cascade,
  user_phone text not null,
  user_cnpj text not null,
  summary_text text not null, -- Resumo gerado por IA
  summary_tokens integer, -- Tokens do resumo
  messages_summarized integer not null, -- Quantas mensagens foram resumidas
  date_range_start timestamptz not null, -- Primeira mensagem do período
  date_range_end timestamptz not null, -- Última mensagem do período
  key_topics text[], -- ['caixa', 'dre', 'contas_a_pagar']
  key_decisions text[], -- Decisões ou conclusões importantes
  llm_model_used text, -- Modelo usado para gerar resumo
  created_at timestamptz not null default now()
);

create index idx_summaries_conversation on conversation_summaries(conversation_id);
create index idx_summaries_created on conversation_summaries(created_at desc);
create index idx_summaries_phone on conversation_summaries(user_phone);

-- ========================================
-- 3. LLM ROUTING RULES (Regras de Roteamento)
-- ========================================
-- Define quando usar qual modelo baseado em complexidade da pergunta
create table if not exists llm_routing_rules (
  id uuid primary key default gen_random_uuid(),
  rule_name text unique not null,
  rule_description text,
  priority integer not null default 0, -- Maior prioridade = verifica primeiro

  -- Condições (todas devem ser true para aplicar a regra)
  min_tokens integer, -- Mínimo de tokens na pergunta
  max_tokens integer, -- Máximo de tokens na pergunta
  keywords text[], -- Keywords que indicam complexidade
  intent_patterns text[], -- Padrões de intenção (regex)
  requires_reasoning boolean default false, -- Requer raciocínio complexo
  requires_calculation boolean default false, -- Requer cálculos
  requires_multiple_queries boolean default false, -- Requer múltiplas consultas ao DB

  -- Ação: qual modelo usar
  recommended_model_id uuid references llm_models(id),
  fallback_model_id uuid references llm_models(id),

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_routing_priority on llm_routing_rules(priority desc) where is_active = true;

-- ========================================
-- 4. CONVERSATION ANALYTICS
-- ========================================
-- Métricas de qualidade e eficiência das conversas
create table if not exists conversation_analytics (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references whatsapp_conversations(id) on delete cascade,
  user_phone text not null,
  user_cnpj text not null,

  -- Métricas de engajamento
  total_messages integer not null default 0,
  user_messages integer not null default 0,
  bot_messages integer not null default 0,
  avg_response_time_seconds numeric(10, 2),

  -- Métricas de qualidade
  successful_queries integer not null default 0, -- Perguntas respondidas com sucesso
  failed_queries integer not null default 0, -- Perguntas que falharam
  off_topic_queries integer not null default 0, -- Perguntas fora de escopo

  -- Métricas de custo
  total_cost_usd numeric(10, 6) not null default 0,
  total_tokens_input integer not null default 0,
  total_tokens_output integer not null default 0,

  -- Modelos usados (agregado)
  models_used jsonb, -- { "claude-sonnet-4.5": 5, "gpt-4o-mini": 10 }

  -- Topics mais discutidos
  top_topics text[],

  -- Timestamps
  first_message_at timestamptz,
  last_message_at timestamptz,
  updated_at timestamptz not null default now()
);

create index idx_analytics_conversation on conversation_analytics(conversation_id);
create index idx_analytics_phone on conversation_analytics(user_phone);
create index idx_analytics_updated on conversation_analytics(updated_at desc);

-- ========================================
-- 5. FUNÇÕES PARA GERENCIAMENTO DE MEMÓRIA
-- ========================================

-- Função: Adicionar mensagem ao context
create or replace function fn_add_message_to_context(
  p_conversation_id uuid,
  p_user_phone text,
  p_user_cnpj text,
  p_role text,
  p_content text,
  p_tokens integer default null,
  p_llm_model text default null,
  p_cost_usd numeric default null,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_message_id uuid;
  v_context_count integer;
begin
  -- Inserir mensagem
  insert into conversation_context (
    conversation_id, user_phone, user_cnpj, message_role,
    message_content, message_tokens, llm_model_used, llm_cost_usd, metadata
  ) values (
    p_conversation_id, p_user_phone, p_user_cnpj, p_role,
    p_content, p_tokens, p_llm_model, p_cost_usd, p_metadata
  ) returning id into v_message_id;

  -- Contar mensagens no context atual
  select count(*) into v_context_count
  from conversation_context
  where conversation_id = p_conversation_id;

  -- Se passou de 120 mensagens, resumir as mais antigas
  if v_context_count > 120 then
    perform fn_summarize_old_context(p_conversation_id);
  end if;

  return v_message_id;
end;
$$;

-- Função: Resumir context antigo (quando passa de 120 mensagens)
create or replace function fn_summarize_old_context(
  p_conversation_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_messages_to_summarize record[];
  v_oldest_messages cursor for
    select *
    from conversation_context
    where conversation_id = p_conversation_id
    order by created_at asc
    limit 40; -- Resumir as 40 mais antigas
begin
  -- Marcar mensagens para resumo (na prática, a IA vai processar)
  -- Esta função apenas deleta as antigas após criar um resumo placeholder

  -- Criar resumo placeholder (será preenchido por Edge Function)
  insert into conversation_summaries (
    conversation_id, user_phone, user_cnpj,
    summary_text, messages_summarized,
    date_range_start, date_range_end
  )
  select
    p_conversation_id,
    (select user_phone from conversation_context where conversation_id = p_conversation_id limit 1),
    (select user_cnpj from conversation_context where conversation_id = p_conversation_id limit 1),
    '[PENDING SUMMARIZATION] ' || count(*) || ' messages to summarize',
    count(*),
    min(created_at),
    max(created_at)
  from conversation_context
  where conversation_id = p_conversation_id
    and id in (
      select id from conversation_context
      where conversation_id = p_conversation_id
      order by created_at asc
      limit 40
    );

  -- Deletar as 40 mensagens mais antigas (já foram resumidas)
  delete from conversation_context
  where conversation_id = p_conversation_id
    and id in (
      select id from conversation_context
      where conversation_id = p_conversation_id
      order by created_at asc
      limit 40
    );
end;
$$;

-- Função: Obter context completo para LLM (últimas 120 + resumos)
create or replace function fn_get_conversation_context(
  p_conversation_id uuid,
  p_limit integer default 120
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
  v_summaries jsonb;
  v_messages jsonb;
begin
  -- Buscar resumos antigos
  select jsonb_agg(
    jsonb_build_object(
      'role', 'system',
      'content', '📋 Resumo de conversas anteriores:\n\n' || summary_text,
      'timestamp', created_at,
      'type', 'summary'
    ) order by created_at asc
  ) into v_summaries
  from conversation_summaries
  where conversation_id = p_conversation_id;

  -- Buscar mensagens recentes
  select jsonb_agg(
    jsonb_build_object(
      'role', message_role,
      'content', message_content,
      'timestamp', created_at,
      'tokens', message_tokens,
      'model', llm_model_used,
      'metadata', metadata,
      'type', 'message'
    ) order by created_at asc
  ) into v_messages
  from (
    select *
    from conversation_context
    where conversation_id = p_conversation_id
    order by created_at desc
    limit p_limit
  ) recent
  order by created_at asc;

  -- Combinar resumos + mensagens
  v_result := jsonb_build_object(
    'conversation_id', p_conversation_id,
    'summaries', coalesce(v_summaries, '[]'::jsonb),
    'messages', coalesce(v_messages, '[]'::jsonb),
    'total_summaries', (select count(*) from conversation_summaries where conversation_id = p_conversation_id),
    'total_messages', (select count(*) from conversation_context where conversation_id = p_conversation_id)
  );

  return v_result;
end;
$$;

-- Função: Escolher modelo LLM baseado em regras
create or replace function fn_route_to_best_llm(
  p_question text,
  p_estimated_tokens integer default null,
  p_requires_reasoning boolean default false,
  p_requires_calculation boolean default false
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_matched_rule record;
  v_result jsonb;
  v_tokens integer;
begin
  -- Estimar tokens se não fornecido (aprox: 1 token = 4 caracteres)
  v_tokens := coalesce(p_estimated_tokens, length(p_question) / 4);

  -- Buscar regra que melhor se aplica (por prioridade)
  select * into v_matched_rule
  from llm_routing_rules r
  where r.is_active = true
    and (r.min_tokens is null or v_tokens >= r.min_tokens)
    and (r.max_tokens is null or v_tokens <= r.max_tokens)
    and (r.requires_reasoning = false or r.requires_reasoning = p_requires_reasoning)
    and (r.requires_calculation = false or r.requires_calculation = p_requires_calculation)
    and (
      r.keywords is null
      or exists (
        select 1 from unnest(r.keywords) as keyword
        where lower(p_question) like '%' || lower(keyword) || '%'
      )
    )
  order by r.priority desc
  limit 1;

  -- Se encontrou regra, retornar modelo recomendado
  if found then
    select jsonb_build_object(
      'rule_matched', v_matched_rule.rule_name,
      'model_id', v_matched_rule.recommended_model_id,
      'model_name', (select model_name from llm_models where id = v_matched_rule.recommended_model_id),
      'fallback_model_id', v_matched_rule.fallback_model_id,
      'estimated_tokens', v_tokens,
      'reasoning', jsonb_build_object(
        'min_tokens', v_matched_rule.min_tokens,
        'max_tokens', v_matched_rule.max_tokens,
        'requires_reasoning', v_matched_rule.requires_reasoning,
        'requires_calculation', v_matched_rule.requires_calculation
      )
    ) into v_result;
  else
    -- Regra padrão: usar modelo mais barato
    select jsonb_build_object(
      'rule_matched', 'default',
      'model_id', (
        select id from llm_models
        where is_active = true
        order by cost_per_1k_input_tokens asc
        limit 1
      ),
      'model_name', (
        select model_name from llm_models
        where is_active = true
        order by cost_per_1k_input_tokens asc
        limit 1
      ),
      'estimated_tokens', v_tokens,
      'reasoning', jsonb_build_object(
        'reason', 'No specific rule matched, using cheapest model'
      )
    ) into v_result;
  end if;

  return v_result;
end;
$$;

-- Função: Atualizar analytics da conversa
create or replace function fn_update_conversation_analytics(
  p_conversation_id uuid,
  p_user_phone text,
  p_user_cnpj text,
  p_is_user_message boolean,
  p_success boolean default true,
  p_off_topic boolean default false,
  p_tokens_input integer default 0,
  p_tokens_output integer default 0,
  p_cost_usd numeric default 0,
  p_model_used text default null,
  p_response_time_seconds numeric default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_analytics_id uuid;
  v_models_used jsonb;
begin
  -- Buscar ou criar analytics
  select id, models_used into v_analytics_id, v_models_used
  from conversation_analytics
  where conversation_id = p_conversation_id;

  if not found then
    -- Criar novo registro
    insert into conversation_analytics (
      conversation_id, user_phone, user_cnpj,
      total_messages, user_messages, bot_messages,
      successful_queries, failed_queries, off_topic_queries,
      total_cost_usd, total_tokens_input, total_tokens_output,
      models_used, first_message_at, last_message_at
    ) values (
      p_conversation_id, p_user_phone, p_user_cnpj,
      1, case when p_is_user_message then 1 else 0 end, case when p_is_user_message then 0 else 1 end,
      case when p_success then 1 else 0 end, case when not p_success then 1 else 0 end, case when p_off_topic then 1 else 0 end,
      p_cost_usd, p_tokens_input, p_tokens_output,
      case when p_model_used is not null then jsonb_build_object(p_model_used, 1) else '{}'::jsonb end,
      now(), now()
    );
  else
    -- Atualizar modelo usado
    if p_model_used is not null then
      v_models_used := coalesce(v_models_used, '{}'::jsonb) ||
        jsonb_build_object(
          p_model_used,
          coalesce((v_models_used->>p_model_used)::integer, 0) + 1
        );
    end if;

    -- Atualizar existente
    update conversation_analytics
    set
      total_messages = total_messages + 1,
      user_messages = user_messages + case when p_is_user_message then 1 else 0 end,
      bot_messages = bot_messages + case when p_is_user_message then 0 else 1 end,
      successful_queries = successful_queries + case when p_success then 1 else 0 end,
      failed_queries = failed_queries + case when not p_success then 1 else 0 end,
      off_topic_queries = off_topic_queries + case when p_off_topic then 1 else 0 end,
      total_cost_usd = total_cost_usd + p_cost_usd,
      total_tokens_input = total_tokens_input + p_tokens_input,
      total_tokens_output = total_tokens_output + p_tokens_output,
      models_used = v_models_used,
      avg_response_time_seconds = case
        when p_response_time_seconds is not null
        then (coalesce(avg_response_time_seconds, 0) * bot_messages + p_response_time_seconds) / (bot_messages + 1)
        else avg_response_time_seconds
      end,
      last_message_at = now(),
      updated_at = now()
    where id = v_analytics_id;
  end if;
end;
$$;

-- ========================================
-- 6. POPULAR REGRAS DE ROTEAMENTO DE LLM
-- ========================================

-- Regra 1: Perguntas simples e diretas → Modelo mais barato
insert into llm_routing_rules (
  rule_name, rule_description, priority,
  max_tokens, keywords, requires_reasoning, requires_calculation, requires_multiple_queries,
  recommended_model_id, fallback_model_id
) values (
  'simple_query',
  'Perguntas simples e diretas sobre dados básicos',
  10,
  50, -- Até 50 tokens
  array['saldo', 'caixa', 'quanto', 'valor', 'total', 'hoje'],
  false, false, false,
  (select id from llm_models where model_name = 'claude-3-5-haiku-20241022' limit 1),
  (select id from llm_models where model_name = 'gpt-4o-mini' limit 1)
);

-- Regra 2: Perguntas com cálculos → Modelo intermediário
insert into llm_routing_rules (
  rule_name, rule_description, priority,
  min_tokens, keywords, requires_reasoning, requires_calculation, requires_multiple_queries,
  recommended_model_id, fallback_model_id
) values (
  'calculation_query',
  'Perguntas que exigem cálculos ou comparações',
  20,
  30,
  array['calcular', 'comparar', 'diferença', 'variação', 'percentual', 'média', 'projeção'],
  false, true, false,
  (select id from llm_models where model_name = 'claude-sonnet-4.5' limit 1),
  (select id from llm_models where model_name = 'gpt-4o' limit 1)
);

-- Regra 3: Perguntas complexas com raciocínio → Modelo mais caro
insert into llm_routing_rules (
  rule_name, rule_description, priority,
  min_tokens, keywords, requires_reasoning, requires_calculation, requires_multiple_queries,
  recommended_model_id, fallback_model_id
) values (
  'complex_reasoning',
  'Perguntas complexas que exigem análise profunda e raciocínio',
  30,
  80,
  array['analisar', 'estratégia', 'recomendação', 'insights', 'tendência', 'previsão', 'cenário', 'otimizar'],
  true, false, true,
  (select id from llm_models where model_name = 'claude-opus-4-20250514' limit 1),
  (select id from llm_models where model_name = 'claude-sonnet-4.5' limit 1)
);

-- Regra 4: Análise de DRE → Modelo avançado
insert into llm_routing_rules (
  rule_name, rule_description, priority,
  min_tokens, keywords, requires_reasoning, requires_calculation, requires_multiple_queries,
  recommended_model_id, fallback_model_id
) values (
  'dre_analysis',
  'Análise de DRE e demonstrativos financeiros',
  25,
  40,
  array['dre', 'demonstrativo', 'resultado', 'ebitda', 'lucro', 'prejuízo', 'margem', 'receita x despesa'],
  true, true, true,
  (select id from llm_models where model_name = 'claude-sonnet-4.5' limit 1),
  (select id from llm_models where model_name = 'gpt-4o' limit 1)
);

-- Regra 5: Múltiplas consultas (ex: "compare últimos 3 meses") → Modelo intermediário
insert into llm_routing_rules (
  rule_name, rule_description, priority,
  min_tokens, keywords, requires_reasoning, requires_calculation, requires_multiple_queries,
  recommended_model_id, fallback_model_id
) values (
  'multiple_queries',
  'Perguntas que exigem consultar múltiplos períodos ou fontes',
  15,
  60,
  array['últimos', 'compare', 'histórico', 'evolução', 'trimestre', 'semestre', 'ano'],
  false, true, true,
  (select id from llm_models where model_name = 'claude-sonnet-4.5' limit 1),
  (select id from llm_models where model_name = 'gpt-4o-mini' limit 1)
);

-- ========================================
-- 7. VIEWS PARA ANÁLISE DE CONVERSAS
-- ========================================

-- View: Conversas mais ativas (últimos 7 dias)
create or replace view v_top_active_conversations as
select
  ca.conversation_id,
  ca.user_phone,
  ca.user_cnpj,
  c.customer_name,
  ca.total_messages,
  ca.user_messages,
  ca.bot_messages,
  ca.successful_queries,
  ca.failed_queries,
  ca.off_topic_queries,
  round((ca.successful_queries::numeric / nullif(ca.user_messages, 0) * 100), 2) as success_rate,
  ca.total_cost_usd,
  ca.avg_response_time_seconds,
  ca.models_used,
  ca.first_message_at,
  ca.last_message_at
from conversation_analytics ca
left join whatsapp_conversations c on c.id = ca.conversation_id
where ca.last_message_at >= now() - interval '7 days'
order by ca.total_messages desc;

-- View: Custo por usuário (mensal)
create or replace view v_conversation_cost_by_user as
select
  date_trunc('month', ca.last_message_at)::date as month,
  ca.user_phone,
  ca.user_cnpj,
  count(distinct ca.conversation_id) as total_conversations,
  sum(ca.total_messages) as total_messages,
  sum(ca.successful_queries) as total_successful_queries,
  sum(ca.total_cost_usd) as total_cost_usd,
  sum(ca.total_tokens_input) as total_tokens_input,
  sum(ca.total_tokens_output) as total_tokens_output,
  avg(ca.avg_response_time_seconds) as avg_response_time_seconds
from conversation_analytics ca
group by date_trunc('month', ca.last_message_at), ca.user_phone, ca.user_cnpj
order by month desc, total_cost_usd desc;

-- View: Performance por modelo LLM
create or replace view v_llm_performance_by_model as
select
  lm.model_name,
  lm.display_name,
  lp.provider_name,
  count(cc.id) as times_used,
  avg(cc.message_tokens) as avg_tokens_per_response,
  sum(cc.llm_cost_usd) as total_cost_usd,
  avg(cc.llm_cost_usd) as avg_cost_per_response,
  count(distinct cc.conversation_id) as unique_conversations
from conversation_context cc
join llm_models lm on lm.model_name = cc.llm_model_used
join llm_providers lp on lp.id = lm.provider_id
where cc.message_role = 'assistant'
  and cc.created_at >= now() - interval '30 days'
group by lm.model_name, lm.display_name, lp.provider_name
order by times_used desc;

-- ========================================
-- 8. JOB PARA CRIAR RESUMOS AUTOMÁTICOS
-- ========================================

-- A cada hora, identificar conversas que precisam de resumo
select cron.schedule(
  'create_conversation_summaries_hourly',
  '0 * * * *', -- A cada hora
  $$
    -- Buscar conversas com mais de 100 mensagens não resumidas
    SELECT fn_summarize_old_context(conversation_id)
    FROM (
      SELECT conversation_id, COUNT(*) as msg_count
      FROM conversation_context
      GROUP BY conversation_id
      HAVING COUNT(*) > 100
    ) subquery;
  $$
);

-- ========================================
-- VERIFICAR SUCESSO DA MIGRAÇÃO
-- ========================================
select
  'Migration 006 completed successfully!' as status,
  (select count(*) from information_schema.tables where table_name in ('conversation_context', 'conversation_summaries', 'llm_routing_rules', 'conversation_analytics')) as new_tables,
  (select count(*) from llm_routing_rules where is_active = true) as routing_rules,
  (select count(*) from pg_cron.job where jobname like '%summar%') as new_jobs;
