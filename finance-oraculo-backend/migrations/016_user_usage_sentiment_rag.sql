-- =========================
-- SISTEMA DE USO POR USUÁRIO, ANÁLISE DE HUMOR E RAG
-- =========================

-- Tabela de uso do sistema por usuário
create table if not exists user_system_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_cnpj text,
  
  -- Métricas de uso
  session_start timestamptz not null,
  session_end timestamptz,
  session_duration_seconds integer,
  
  -- Ações realizadas
  pages_visited text[],
  features_used text[],
  api_calls_count integer default 0,
  llm_interactions_count integer default 0,
  whatsapp_messages_sent integer default 0,
  whatsapp_messages_received integer default 0,
  
  -- Dados de uso
  usage_data jsonb default '{}'::jsonb,
  
  created_at timestamptz default now()
);

create index if not exists idx_user_system_usage_user on user_system_usage(user_id, created_at desc);
create index if not exists idx_user_system_usage_company on user_system_usage(company_cnpj, created_at desc);
create index if not exists idx_user_system_usage_session on user_system_usage(session_start, session_end);

-- Tabela de análise de humor/sentimento das mensagens WhatsApp
create table if not exists whatsapp_sentiment_analysis (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references whatsapp_conversations(id) on delete cascade,
  company_cnpj text not null,
  phone_number text not null,
  message_id text,
  
  -- Análise de sentimento
  sentiment_score numeric(3,2) not null check (sentiment_score >= -1 and sentiment_score <= 1), -- -1 (muito negativo) a 1 (muito positivo)
  sentiment_label text not null check (sentiment_label in ('very_negative', 'negative', 'neutral', 'positive', 'very_positive')),
  
  -- Análise de tom
  tone text, -- 'formal', 'informal', 'friendly', 'angry', 'sad', 'excited', 'neutral'
  emotion text, -- 'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'
  
  -- Análise de interação
  engagement_level text check (engagement_level in ('low', 'medium', 'high', 'very_high')),
  response_urgency text check (response_urgency in ('low', 'medium', 'high', 'critical')),
  
  -- Dados da análise
  analysis_data jsonb default '{}'::jsonb,
  analyzed_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_whatsapp_sentiment_company on whatsapp_sentiment_analysis(company_cnpj, analyzed_at desc);
create index if not exists idx_whatsapp_sentiment_phone on whatsapp_sentiment_analysis(phone_number, analyzed_at desc);
create index if not exists idx_whatsapp_sentiment_score on whatsapp_sentiment_analysis(sentiment_score, analyzed_at desc);
create index if not exists idx_whatsapp_sentiment_label on whatsapp_sentiment_analysis(sentiment_label, analyzed_at desc);

-- Tabela de índice de humor ao longo do tempo (agregado)
create table if not exists mood_index_timeline (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  phone_number text, -- null = agregado de todos os números
  
  -- Período
  period_date date not null,
  period_type text not null check (period_type in ('hour', 'day', 'week', 'month')),
  
  -- Métricas agregadas
  avg_sentiment_score numeric(3,2) not null,
  sentiment_trend text check (sentiment_trend in ('improving', 'stable', 'declining')),
  
  -- Distribuição de sentimentos
  very_negative_count integer default 0,
  negative_count integer default 0,
  neutral_count integer default 0,
  positive_count integer default 0,
  very_positive_count integer default 0,
  
  -- Distribuição de emoções
  joy_count integer default 0,
  sadness_count integer default 0,
  anger_count integer default 0,
  fear_count integer default 0,
  surprise_count integer default 0,
  neutral_emotion_count integer default 0,
  
  -- Métricas de engajamento
  total_messages integer default 0,
  avg_engagement_level text,
  high_urgency_count integer default 0,
  
  created_at timestamptz default now(),
  unique(company_cnpj, phone_number, period_date, period_type)
);

create index if not exists idx_mood_index_company on mood_index_timeline(company_cnpj, period_date desc);
create index if not exists idx_mood_index_phone on mood_index_timeline(phone_number, period_date desc);
create index if not exists idx_mood_index_period on mood_index_timeline(period_type, period_date desc);

-- Tabela RAG (Retrieval Augmented Generation) - Memória de conversas por cliente
create table if not exists rag_conversations (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  phone_number text not null,
  
  -- Dados da conversa
  conversation_id uuid references whatsapp_conversations(id) on delete cascade,
  message_text text not null,
  message_direction text not null check (message_direction in ('inbound', 'outbound')),
  
  -- Embedding vetorial (para busca semântica)
  embedding vector(1536), -- OpenAI ada-002 ou similar
  
  -- Metadados
  message_timestamp timestamptz not null,
  sentiment_score numeric(3,2),
  sentiment_label text,
  topics text[], -- Tópicos extraídos da mensagem
  entities jsonb, -- Entidades nomeadas extraídas
  
  -- Contexto
  context_summary text, -- Resumo do contexto da conversa
  related_conversations uuid[], -- IDs de conversas relacionadas
  
  -- Status
  is_indexed boolean default false,
  indexed_at timestamptz,
  
  created_at timestamptz default now()
);

create index if not exists idx_rag_conversations_company on rag_conversations(company_cnpj, message_timestamp desc);
create index if not exists idx_rag_conversations_phone on rag_conversations(phone_number, message_timestamp desc);
create index if not exists idx_rag_conversations_indexed on rag_conversations(is_indexed, indexed_at);
create index if not exists idx_rag_conversations_topics on rag_conversations using gin(topics);

-- Índice para busca vetorial (requer extensão pgvector)
-- CREATE EXTENSION IF NOT EXISTS vector;
-- CREATE INDEX idx_rag_embedding ON rag_conversations USING ivfflat (embedding vector_cosine_ops);

-- Tabela de resumos de contexto por cliente (para RAG)
create table if not exists rag_context_summaries (
  id uuid primary key default gen_random_uuid(),
  company_cnpj text not null,
  phone_number text, -- null = resumo geral do cliente
  
  -- Resumo
  summary_text text not null,
  summary_type text not null check (summary_type in ('daily', 'weekly', 'monthly', 'conversation', 'topic')),
  
  -- Período
  period_start timestamptz,
  period_end timestamptz,
  
  -- Tópicos principais
  main_topics text[],
  key_insights text[],
  
  -- Métricas
  total_messages integer default 0,
  avg_sentiment numeric(3,2),
  
  -- Embedding do resumo
  summary_embedding vector(1536),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_rag_context_company on rag_context_summaries(company_cnpj, created_at desc);
create index if not exists idx_rag_context_phone on rag_context_summaries(phone_number, created_at desc);
create index if not exists idx_rag_context_type on rag_context_summaries(summary_type, created_at desc);

-- Função para analisar sentimento de uma mensagem
create or replace function analyze_whatsapp_sentiment(
  p_message_text text,
  p_company_cnpj text,
  p_phone_number text,
  p_conversation_id uuid default null,
  p_message_id text default null
) returns uuid as $$
declare
  v_sentiment_id uuid;
  v_sentiment_score numeric;
  v_sentiment_label text;
  v_tone text;
  v_emotion text;
  v_engagement text;
  v_urgency text;
begin
  -- Esta função será chamada pela Edge Function que usa LLM para análise
  -- Por enquanto, cria registro básico que será atualizado pela Edge Function
  
  insert into whatsapp_sentiment_analysis (
    conversation_id, company_cnpj, phone_number, message_id,
    sentiment_score, sentiment_label, tone, emotion, engagement_level, response_urgency
  )
  values (
    p_conversation_id, p_company_cnpj, p_phone_number, p_message_id,
    0, 'neutral', 'neutral', 'neutral', 'medium', 'low'
  )
  returning id into v_sentiment_id;

  return v_sentiment_id;
end;
$$ language plpgsql security definer;

-- Função para atualizar índice de humor (agregado diário)
create or replace function update_mood_index_daily(
  p_company_cnpj text,
  p_phone_number text default null,
  p_period_date date default current_date
) returns void as $$
declare
  v_avg_score numeric;
  v_trend text;
begin
  -- Calcular média de sentimento do dia
  select 
    avg(sentiment_score),
    case 
      when avg(sentiment_score) > 0.3 then 'improving'
      when avg(sentiment_score) < -0.3 then 'declining'
      else 'stable'
    end
  into v_avg_score, v_trend
  from whatsapp_sentiment_analysis
  where company_cnpj = p_company_cnpj
    and (p_phone_number is null or phone_number = p_phone_number)
    and analyzed_at::date = p_period_date;

  if v_avg_score is null then
    return;
  end if;

  -- Inserir ou atualizar índice do dia
  insert into mood_index_timeline (
    company_cnpj, phone_number, period_date, period_type,
    avg_sentiment_score, sentiment_trend,
    very_negative_count, negative_count, neutral_count, positive_count, very_positive_count,
    joy_count, sadness_count, anger_count, fear_count, surprise_count, neutral_emotion_count,
    total_messages, high_urgency_count
  )
  select
    p_company_cnpj,
    p_phone_number,
    p_period_date,
    'day',
    v_avg_score,
    v_trend,
    count(*) filter (where sentiment_label = 'very_negative'),
    count(*) filter (where sentiment_label = 'negative'),
    count(*) filter (where sentiment_label = 'neutral'),
    count(*) filter (where sentiment_label = 'positive'),
    count(*) filter (where sentiment_label = 'very_positive'),
    count(*) filter (where emotion = 'joy'),
    count(*) filter (where emotion = 'sadness'),
    count(*) filter (where emotion = 'anger'),
    count(*) filter (where emotion = 'fear'),
    count(*) filter (where emotion = 'surprise'),
    count(*) filter (where emotion = 'neutral'),
    count(*),
    count(*) filter (where response_urgency in ('high', 'critical'))
  from whatsapp_sentiment_analysis
  where company_cnpj = p_company_cnpj
    and (p_phone_number is null or phone_number = p_phone_number)
    and analyzed_at::date = p_period_date
  on conflict (company_cnpj, phone_number, period_date, period_type) do update set
    avg_sentiment_score = excluded.avg_sentiment_score,
    sentiment_trend = excluded.sentiment_trend,
    very_negative_count = excluded.very_negative_count,
    negative_count = excluded.negative_count,
    neutral_count = excluded.neutral_count,
    positive_count = excluded.positive_count,
    very_positive_count = excluded.very_positive_count,
    joy_count = excluded.joy_count,
    sadness_count = excluded.sadness_count,
    anger_count = excluded.anger_count,
    fear_count = excluded.fear_count,
    surprise_count = excluded.surprise_count,
    neutral_emotion_count = excluded.neutral_emotion_count,
    total_messages = excluded.total_messages,
    high_urgency_count = excluded.high_urgency_count;
end;
$$ language plpgsql security definer;

-- Função para indexar conversa no RAG
create or replace function index_conversation_for_rag(
  p_company_cnpj text,
  p_phone_number text,
  p_conversation_id uuid,
  p_message_text text,
  p_message_direction text,
  p_message_timestamp timestamptz,
  p_sentiment_score numeric default null,
  p_sentiment_label text default null,
  p_topics text[] default null,
  p_entities jsonb default null,
  p_embedding vector default null
) returns uuid as $$
declare
  v_rag_id uuid;
begin
  insert into rag_conversations (
    company_cnpj, phone_number, conversation_id,
    message_text, message_direction, message_timestamp,
    sentiment_score, sentiment_label, topics, entities, embedding,
    is_indexed, indexed_at
  )
  values (
    p_company_cnpj, p_phone_number, p_conversation_id,
    p_message_text, p_message_direction, p_message_timestamp,
    p_sentiment_score, p_sentiment_label, p_topics, p_entities, p_embedding,
    true, now()
  )
  returning id into v_rag_id;

  return v_rag_id;
end;
$$ language plpgsql security definer;

-- RLS Policies
alter table user_system_usage enable row level security;
alter table whatsapp_sentiment_analysis enable row level security;
alter table mood_index_timeline enable row level security;
alter table rag_conversations enable row level security;
alter table rag_context_summaries enable row level security;

-- Usuários podem ver seu próprio uso
create policy "Users can view own usage"
  on user_system_usage for select
  using (auth.uid() = user_id);

-- Admin pode ver todo uso
create policy "Admin can view all usage"
  on user_system_usage for select
  using (auth.jwt() ->> 'role' = 'admin');

-- Clientes podem ver análise de sentimento de suas conversas
create policy "Clients can view own sentiment"
  on whatsapp_sentiment_analysis for select
  using (
    company_cnpj in (
      select company_cnpj from companies
      where owner_id = auth.uid()
    )
  );

-- Admin pode ver todas as análises
create policy "Admin can view all sentiment"
  on whatsapp_sentiment_analysis for select
  using (auth.jwt() ->> 'role' = 'admin');

-- Clientes podem ver índice de humor de suas empresas
create policy "Clients can view own mood index"
  on mood_index_timeline for select
  using (
    company_cnpj in (
      select company_cnpj from companies
      where owner_id = auth.uid()
    )
  );

-- Clientes podem acessar RAG de suas conversas
create policy "Clients can access own RAG"
  on rag_conversations for select
  using (
    company_cnpj in (
      select company_cnpj from companies
      where owner_id = auth.uid()
    )
  );

-- Admin pode acessar todo RAG
create policy "Admin can access all RAG"
  on rag_conversations for select
  using (auth.jwt() ->> 'role' = 'admin');

