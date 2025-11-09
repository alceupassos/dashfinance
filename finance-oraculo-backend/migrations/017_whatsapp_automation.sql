-- ============================================
-- Automação: WhatsApp → Análise de Sentimento → RAG
-- ============================================
-- Esta migration configura automação completa:
-- 1. Quando nova mensagem WhatsApp é salva → chamar análise de sentimento
-- 2. Job cron para processar mensagens em lote
-- 3. Função para chamar Edge Functions

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================
-- Tabela de controle de processamento
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  message_id UUID,
  processing_type TEXT NOT NULL CHECK (processing_type IN ('sentiment_analysis', 'rag_indexing', 'batch_processing')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_whatsapp_processing_log_status ON whatsapp_processing_log(status);
CREATE INDEX idx_whatsapp_processing_log_conversation ON whatsapp_processing_log(conversation_id);
CREATE INDEX idx_whatsapp_processing_log_created ON whatsapp_processing_log(created_at DESC);

-- ============================================
-- Função para chamar Edge Function via HTTP
-- ============================================
CREATE OR REPLACE FUNCTION call_edge_function_async(
  p_function_name TEXT,
  p_payload JSONB,
  p_max_retries INT DEFAULT 3
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_conversation_id UUID;
BEGIN
  -- Extrair conversation_id do payload
  v_conversation_id := p_payload->>'conversation_id';
  
  -- Criar log de processamento
  INSERT INTO whatsapp_processing_log (
    conversation_id,
    processing_type,
    status,
    max_retries
  ) VALUES (
    v_conversation_id::UUID,
    p_function_name,
    'pending',
    p_max_retries
  ) RETURNING id INTO v_log_id;

  -- Chamar Edge Function via pg_net (async)
  -- NOTA: Isso requer que PGRST_DB_AUX_ROLE_NAME esteja configurado
  PERFORM net.http_post(
    url := format(
      '%s/functions/v1/%s',
      current_setting('app.supabase_url'),
      p_function_name
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', format('Bearer %s', current_setting('app.supabase_key'))
    ),
    body := p_payload::text,
    timeout_milliseconds := 30000
  );

  -- Atualizar status para processing
  UPDATE whatsapp_processing_log
  SET status = 'processing', updated_at = now()
  WHERE id = v_log_id;

  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Registrar erro e marcar como falha
    UPDATE whatsapp_processing_log
    SET status = 'failed', error_message = SQLERRM, updated_at = now()
    WHERE id = v_log_id;
    
    RAISE WARNING 'Error calling edge function %: %', p_function_name, SQLERRM;
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger: Quando mensagem WhatsApp é salva
-- ============================================
-- NOTA: Este trigger assume que existe tabela whatsapp_conversations
-- Se usar outra estrutura, adaptar conforme necessário

CREATE OR REPLACE FUNCTION trigger_analyze_whatsapp_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Enfileirar análise de sentimento
  PERFORM call_edge_function_async(
    'analyze-whatsapp-sentiment',
    jsonb_build_object(
      'message_text', NEW.message_text,
      'company_cnpj', NEW.company_cnpj,
      'phone_number', NEW.phone_number,
      'conversation_id', NEW.id,
      'message_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger (se tabela existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_conversations') THEN
    DROP TRIGGER IF EXISTS trg_analyze_whatsapp_message ON whatsapp_conversations;
    
    CREATE TRIGGER trg_analyze_whatsapp_message
    AFTER INSERT ON whatsapp_conversations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_analyze_whatsapp_message();
    
    RAISE NOTICE 'Trigger criado: trg_analyze_whatsapp_message';
  ELSE
    RAISE WARNING 'Tabela whatsapp_conversations não encontrada. Trigger não criado.';
  END IF;
END $$;

-- ============================================
-- Job pg_cron para processamento em lote
-- ============================================
-- Executar a cada 10 minutos
SELECT cron.schedule('whatsapp-batch-processing', '*/10 * * * *', $$
  SELECT call_edge_function_async(
    'index-whatsapp-to-rag',
    jsonb_build_object(
      'action', 'batch_index',
      'limit', 100
    )
  );
$$);

-- ============================================
-- Função para reprocessar mensagens que falharam
-- ============================================
CREATE OR REPLACE FUNCTION retry_failed_whatsapp_processing()
RETURNS TABLE(
  reprocessed_count INTEGER,
  still_failed_count INTEGER
) AS $$
DECLARE
  v_reprocessed_count INTEGER := 0;
  v_still_failed_count INTEGER := 0;
  v_log_record RECORD;
BEGIN
  -- Buscar registros com falha que podem ser reprocessados
  FOR v_log_record IN 
    SELECT id, conversation_id, processing_type, retry_count, max_retries
    FROM whatsapp_processing_log
    WHERE status = 'failed' 
      AND retry_count < max_retries
      AND updated_at > now() - INTERVAL '1 hour'
    ORDER BY updated_at ASC
    LIMIT 50
  LOOP
    BEGIN
      -- Tentar reprocessar
      UPDATE whatsapp_processing_log
      SET status = 'pending', retry_count = retry_count + 1, updated_at = now()
      WHERE id = v_log_record.id;

      -- Chamar edge function novamente
      PERFORM call_edge_function_async(
        v_log_record.processing_type,
        jsonb_build_object(
          'conversation_id', v_log_record.conversation_id,
          'retry_attempt', retry_count
        )
      );

      v_reprocessed_count := v_reprocessed_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error retrying log %: %', v_log_record.id, SQLERRM;
    END;
  END LOOP;

  -- Contar ainda falhadas
  SELECT COUNT(*) INTO v_still_failed_count
  FROM whatsapp_processing_log
  WHERE status = 'failed';

  RETURN QUERY SELECT v_reprocessed_count, v_still_failed_count;
END;
$$ LANGUAGE plpgsql;

-- Job para reprocessar falhas (a cada hora)
SELECT cron.schedule('whatsapp-retry-failed', '0 * * * *', $$
  SELECT * FROM retry_failed_whatsapp_processing();
$$);

-- ============================================
-- View para monitorar automação
-- ============================================
CREATE OR REPLACE VIEW v_whatsapp_automation_status AS
SELECT
  processing_type,
  status,
  COUNT(*) as total,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_processing_time_seconds,
  MAX(updated_at) as last_updated
FROM whatsapp_processing_log
WHERE created_at > now() - INTERVAL '24 hours'
GROUP BY processing_type, status
ORDER BY processing_type, status;

-- ============================================
-- Permissões para pg_net
-- ============================================
GRANT EXECUTE ON FUNCTION net.http_post(TEXT, JSONB, JSONB, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION call_edge_function_async(TEXT, JSONB, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION retry_failed_whatsapp_processing() TO authenticated;

-- ============================================
-- Logs iniciais
-- ============================================
INSERT INTO audit_log (action, description, details) VALUES (
  'migration_executed',
  'Automação WhatsApp → Sentimento → RAG configurada',
  jsonb_build_object(
    'trigger', 'trg_analyze_whatsapp_message',
    'batch_job', 'whatsapp-batch-processing (a cada 10 min)',
    'retry_job', 'whatsapp-retry-failed (a cada hora)',
    'table', 'whatsapp_processing_log',
    'functions', ARRAY['call_edge_function_async', 'trigger_analyze_whatsapp_message', 'retry_failed_whatsapp_processing']
  )
) ON CONFLICT DO NOTHING;

