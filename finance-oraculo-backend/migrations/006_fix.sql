-- ================================================
-- FIX MIGRATION 006: Corrigir Erros
-- ================================================

-- Fix 1: Corrigir função fn_summarize_old_context (remover declaração de cursor não usada)
create or replace function fn_summarize_old_context(
  p_conversation_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
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

-- Fix 2: Corrigir view v_top_active_conversations (remover customer_name inexistente)
create or replace view v_top_active_conversations as
select
  ca.conversation_id,
  ca.user_phone,
  ca.user_cnpj,
  (select name from companies where cnpj = ca.user_cnpj limit 1) as company_name,
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
where ca.last_message_at >= now() - interval '7 days'
order by ca.total_messages desc;

-- Verificação
select 'Fix 006 applied successfully!' as status;
