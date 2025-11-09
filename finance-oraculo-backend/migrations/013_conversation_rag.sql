-- =====================================================
-- Migration 013: RAG de Conversas (Público + Por Cliente)
-- Created: 2025-11-06
-- Purpose: Repositório de conversas bem-sucedidas para aprendizado do sistema
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CONVERSATION_RAG (RAG de conversas bem-sucedidas)
-- =====================================================

CREATE TABLE IF NOT EXISTS conversation_rag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classificação
  rag_type TEXT NOT NULL CHECK (rag_type IN ('public', 'client_specific')),
  company_cnpj TEXT, -- NULL para public, CNPJ para client_specific

  -- Conversa
  user_question TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  context_used JSONB, -- Contexto que foi usado na resposta

  -- Categorização
  category TEXT, -- 'financeiro', 'tecnico', 'suporte', 'duvida_geral'
  intent TEXT, -- 'saldo', 'runway', 'dre', 'ajuda'
  complexity TEXT DEFAULT 'simple', -- simple, medium, complex

  -- Qualidade
  was_successful BOOLEAN DEFAULT true,
  required_human_intervention BOOLEAN DEFAULT false,
  user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),

  -- Embedding (vector search)
  question_embedding vector(1536),
  response_embedding vector(1536),

  -- Metadados
  personality_id UUID REFERENCES whatsapp_personalities(id),
  conversation_id UUID,
  language TEXT DEFAULT 'pt_BR',
  tags TEXT[],

  -- Uso
  times_retrieved INTEGER DEFAULT 0,
  last_retrieved TIMESTAMPTZ,
  relevance_score NUMERIC(3,2) DEFAULT 1.0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_rag_type ON conversation_rag(rag_type);
CREATE INDEX IF NOT EXISTS idx_conv_rag_cnpj ON conversation_rag(company_cnpj) WHERE company_cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conv_rag_category ON conversation_rag(category);
CREATE INDEX IF NOT EXISTS idx_conv_rag_intent ON conversation_rag(intent);
CREATE INDEX IF NOT EXISTS idx_conv_rag_successful ON conversation_rag(was_successful) WHERE was_successful = true;
CREATE INDEX IF NOT EXISTS idx_conv_rag_tags ON conversation_rag USING GIN(tags);

-- Vector indexes
CREATE INDEX IF NOT EXISTS idx_conv_rag_question_emb ON conversation_rag
  USING hnsw (question_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_conv_rag_response_emb ON conversation_rag
  USING hnsw (response_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- =====================================================
-- 2. FUNÇÕES AUXILIARES
-- =====================================================

-- Buscar conversas similares (RAG público + específico cliente)
CREATE OR REPLACE FUNCTION search_similar_conversations(
  p_question_embedding vector(1536),
  p_company_cnpj TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5,
  p_min_similarity NUMERIC DEFAULT 0.75
)
RETURNS TABLE (
  conversation_id UUID,
  user_question TEXT,
  bot_response TEXT,
  context_used JSONB,
  category TEXT,
  similarity NUMERIC,
  rag_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    conversation_rag.user_question,
    conversation_rag.bot_response,
    conversation_rag.context_used,
    conversation_rag.category,
    ROUND(1 - (question_embedding <=> p_question_embedding), 4) as similarity,
    conversation_rag.rag_type
  FROM conversation_rag
  WHERE
    was_successful = true
    AND (
      rag_type = 'public'
      OR (rag_type = 'client_specific' AND company_cnpj = p_company_cnpj)
    )
    AND (1 - (question_embedding <=> p_question_embedding)) >= p_min_similarity
  ORDER BY
    -- Priorizar RAG específico do cliente
    CASE WHEN rag_type = 'client_specific' THEN 0 ELSE 1 END,
    question_embedding <=> p_question_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Adicionar conversa ao RAG (se foi bem-sucedida)
CREATE OR REPLACE FUNCTION add_conversation_to_rag(
  p_question TEXT,
  p_response TEXT,
  p_context JSONB,
  p_cnpj TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_intent TEXT DEFAULT NULL,
  p_satisfaction INTEGER DEFAULT NULL,
  p_personality_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_rag_id UUID;
  v_rag_type TEXT;
BEGIN
  -- Determinar tipo de RAG
  v_rag_type := CASE WHEN p_cnpj IS NULL THEN 'public' ELSE 'client_specific' END;

  -- Inserir no RAG
  INSERT INTO conversation_rag (
    rag_type,
    company_cnpj,
    user_question,
    bot_response,
    context_used,
    category,
    intent,
    user_satisfaction,
    personality_id,
    was_successful
  ) VALUES (
    v_rag_type,
    p_cnpj,
    p_question,
    p_response,
    p_context,
    p_category,
    p_intent,
    p_satisfaction,
    p_personality_id,
    true
  )
  RETURNING id INTO v_rag_id;

  RETURN v_rag_id;
END;
$$ LANGUAGE plpgsql;

-- Incrementar uso de conversa RAG
CREATE OR REPLACE FUNCTION increment_rag_usage(p_rag_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE conversation_rag
  SET
    times_retrieved = times_retrieved + 1,
    last_retrieved = NOW()
  WHERE id = p_rag_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. TRIGGER: Auto-adicionar conversas bem-avaliadas ao RAG
-- =====================================================

CREATE OR REPLACE FUNCTION auto_add_to_rag()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_msg TEXT;
  v_satisfaction INTEGER;
BEGIN
  -- Apenas para mensagens outgoing bem-avaliadas
  IF NEW.direction = 'outgoing' AND NEW.metadata->>'satisfaction' IS NOT NULL THEN
    v_satisfaction := (NEW.metadata->>'satisfaction')::INTEGER;

    -- Se satisfação >= 4, adicionar ao RAG
    IF v_satisfaction >= 4 THEN
      -- Buscar mensagem anterior (incoming) como pergunta
      SELECT message_text INTO v_prev_msg
      FROM whatsapp_conversations
      WHERE phone_number = NEW.phone_number
        AND direction = 'incoming'
        AND created_at < NEW.created_at
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_prev_msg IS NOT NULL THEN
        PERFORM add_conversation_to_rag(
          p_question := v_prev_msg,
          p_response := NEW.message_text,
          p_context := NEW.metadata->'context',
          p_cnpj := NEW.company_cnpj,
          p_category := NEW.metadata->>'category',
          p_intent := NEW.metadata->>'intent',
          p_satisfaction := v_satisfaction,
          p_personality_id := (NEW.metadata->>'personality_id')::UUID
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_add_to_rag ON whatsapp_conversations;
CREATE TRIGGER trg_auto_add_to_rag
  AFTER INSERT ON whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_to_rag();

-- =====================================================
-- 4. POLICIES RLS
-- =====================================================

ALTER TABLE conversation_rag ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conv_rag_admin_all ON conversation_rag;
CREATE POLICY conv_rag_admin_all ON conversation_rag
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 5. SEEDS INICIAIS - Conversas Exemplo (Público)
-- =====================================================

INSERT INTO conversation_rag (
  rag_type, company_cnpj, user_question, bot_response,
  context_used, category, intent, complexity, was_successful,
  user_satisfaction, tags
) VALUES
  (
    'public', NULL,
    'Qual meu saldo?',
    'Seu saldo total é R$ 150.000,00. Disponível (após contas a pagar) fica em R$ 95.000,00.',
    '{"saldo_total": "R$ 150.000,00", "disponivel": "R$ 95.000,00"}'::jsonb,
    'financeiro', 'saldo', 'simple', true, 5,
    '{saldo, consulta, financeiro}'
  ),
  (
    'public', NULL,
    'Quanto tempo minha empresa aguenta operando?',
    'Com o caixa atual, sua empresa consegue operar por 6.5 meses. Isso está em nível saudável!',
    '{"runway_meses": 6.5, "status": "ok"}'::jsonb,
    'financeiro', 'runway', 'simple', true, 5,
    '{runway, metricas, projecao}'
  ),
  (
    'public', NULL,
    'Como faço para exportar o DRE?',
    'É super simples! Basta digitar: "Manda o DRE de [mês]". Por exemplo: "Manda o DRE de outubro". Eu gero o arquivo Excel e envio aqui mesmo no chat em até 10 segundos!',
    '{}'::jsonb,
    'suporte', 'dre', 'simple', true, 5,
    '{dre, export, tutorial}'
  ),
  (
    'public', NULL,
    'O que é burn rate?',
    'Burn rate é a taxa de queima de caixa mensal. É a diferença entre despesas e receitas mensais. Se você gasta R$ 100k/mês e fatura R$ 80k/mês, seu burn rate é R$ 20k/mês.',
    '{}'::jsonb,
    'educacional', 'conceito', 'simple', true, 5,
    '{burnrate, conceito, financeiro}'
  ),
  (
    'public', NULL,
    'Posso receber alertas de contas vencendo?',
    'Sim! O sistema já envia alertas automáticos via WhatsApp quando você tem contas vencendo em 3 dias. Os alertas chegam diariamente às 9h. Você pode configurar horários diferentes no painel admin.',
    '{}'::jsonb,
    'suporte', 'alertas', 'simple', true, 4,
    '{alertas, automacao, notificacoes}'
  ),
  (
    'public', NULL,
    'Como funciona a sincronização com F360?',
    'A sincronização acontece automaticamente a cada 2 horas. Você também pode forçar uma sincronização manual: se for admin, digite /sync-f360-now. Ou acesse o painel admin > Integrações > F360 > Sincronizar Agora.',
    '{}'::jsonb,
    'tecnico', 'sync', 'medium', true, 5,
    '{f360, sincronizacao, integracao}'
  ),
  (
    'public', NULL,
    'Qual diferença entre caixa e disponível?',
    'Caixa é o total em todas as contas bancárias. Disponível é o caixa MENOS os compromissos imediatos (contas a pagar). Use "Disponível" para decisões de investimento, pois é o dinheiro realmente livre.',
    '{}'::jsonb,
    'educacional', 'conceito', 'medium', true, 5,
    '{caixa, disponivel, conceito, financeiro}'
  ),
  (
    'public', NULL,
    'Meu runway está baixo, o que fazer?',
    'Se runway < 3 meses, é crítico! Ações imediatas: 1) Revisar despesas fixas (pode cortar algo?), 2) Acelerar recebíveis (cobrar clientes), 3) Considerar aporte de capital, 4) Pivotar produto se necessário. Quer que eu te ajude a montar um plano?',
    '{"runway_meses": 2.5}'::jsonb,
    'consultivo', 'runway', 'complex', true, 5,
    '{runway, critico, consultoria, planejamento}'
  ),
  (
    'public', NULL,
    'Como adicionar uma nova empresa?',
    'Para adicionar empresa (precisa ser admin ou franqueado): 1) Acesse Admin > Empresas, 2) Clique "Nova Empresa", 3) Preencha CNPJ e Razão Social, 4) Configure integrações, 5) Associe usuários. A empresa aparece em até 5 minutos.',
    '{}'::jsonb,
    'tecnico', 'cadastro', 'medium', true, 4,
    '{empresas, cadastro, admin}'
  ),
  (
    'public', NULL,
    'Posso mudar a personalidade do atendente?',
    'Sim! Temos 5 atendentes com personalidades diferentes: Marina (profissional), Carlos (formal), Júlia (descontraída), Roberto (humorístico) e Beatriz (equilibrada). Admins podem configurar no painel. Por padrão, o sistema escolhe automaticamente.',
    '{}'::jsonb,
    'suporte', 'personalidade', 'medium', true, 5,
    '{personalidade, atendentes, configuracao}'
  );

COMMIT;

-- =====================================================
-- VALIDAÇÃO
-- =====================================================

SELECT
  'conversation_rag' as tabela,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE rag_type = 'public') as public,
  COUNT(*) FILTER (WHERE rag_type = 'client_specific') as client_specific,
  ROUND(AVG(user_satisfaction), 1) as satisfacao_media
FROM conversation_rag;

SELECT '✅ Migration 013 executada com sucesso!' as message;

-- =====================================================
-- FIM DA MIGRATION 013
-- =====================================================
