-- =====================================================
-- Migration 012: Sistema de Personalidades + Respostas Vetoriais
-- Created: 2025-11-06
-- Purpose: Atendentes virtuais com personalidades únicas e banco vetorial de respostas
-- =====================================================

BEGIN;

-- =====================================================
-- 1. WHATSAPP_PERSONALITIES (Atendentes Virtuais)
-- =====================================================

CREATE TABLE IF NOT EXISTS whatsapp_personalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidade
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  age INTEGER,
  gender TEXT, -- 'masculino', 'feminino', 'não-binário'

  -- Personalidade
  personality_type TEXT NOT NULL, -- 'profissional', 'amigavel', 'casual', 'formal', 'humoristico'
  humor_level INTEGER DEFAULT 5, -- 1-10 (1 = sério, 10 = muito descontraído)
  formality_level INTEGER DEFAULT 5, -- 1-10 (1 = casual, 10 = ultra formal)
  empathy_level INTEGER DEFAULT 7, -- 1-10 (capacidade de empatia)
  response_speed TEXT DEFAULT 'normal', -- 'rapido', 'normal', 'reflexivo'

  -- Tom de comunicação
  communication_style JSONB DEFAULT '{
    "greeting": "Oi! Tudo bem?",
    "farewell": "Qualquer dúvida, estou aqui!",
    "affirmative": ["Sim", "Claro", "Com certeza", "Pode deixar"],
    "negative": ["Não", "Infelizmente não", "Ops, não"],
    "thinking": ["Deixa eu ver...", "Hmm, vou conferir", "Só um instante"],
    "emoji_frequency": "moderate",
    "uses_slang": false,
    "typical_phrases": []
  }'::jsonb,

  -- Voice (preparação para TTS)
  voice_config JSONB DEFAULT '{
    "provider": "elevenlabs",
    "voice_id": null,
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.5,
    "pitch": 1.0,
    "speed": 1.0
  }'::jsonb,

  -- Uso
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  satisfaction_avg NUMERIC(3,2) DEFAULT 5.0, -- 1.0-5.0

  -- Especialização
  specialties TEXT[], -- 'contabilidade', 'financeiro', 'atendimento_geral', 'cobranca'
  languages TEXT[] DEFAULT '{pt_BR}',

  -- Prompts (para Claude)
  system_prompt TEXT,

  -- Metadados
  avatar_url TEXT,
  bio TEXT,
  created_by UUID,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personalities_active ON whatsapp_personalities(is_active);
CREATE INDEX IF NOT EXISTS idx_personalities_type ON whatsapp_personalities(personality_type);
CREATE INDEX IF NOT EXISTS idx_personalities_specialties ON whatsapp_personalities USING GIN(specialties);

-- =====================================================
-- 2. WHATSAPP_RESPONSE_TEMPLATES (Banco Vetorial de Respostas)
-- =====================================================

CREATE TABLE IF NOT EXISTS whatsapp_response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classificação
  category TEXT NOT NULL, -- 'saudacao', 'despedida', 'duvida_financeira', 'erro', 'confirmacao', 'pedido_espera'
  intent TEXT NOT NULL, -- 'saldo', 'runway', 'dre', 'ajuda', 'agradecimento'

  -- Conteúdo
  template_text TEXT NOT NULL,
  variations TEXT[], -- Variações da mesma resposta

  -- Personalidade
  personality_id UUID REFERENCES whatsapp_personalities(id),
  tone TEXT, -- 'profissional', 'amigavel', 'casual', 'formal', 'humoristico'

  -- Contexto
  context_required JSONB DEFAULT '{}'::jsonb, -- Variáveis necessárias: {saldo: true, empresa: true}
  context_example JSONB DEFAULT '{}'::jsonb, -- Exemplo de dados: {saldo: "R$ 100.000", empresa: "Acme"}

  -- Vector embedding (para busca semântica)
  embedding vector(1536),

  -- Uso
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  satisfaction_avg NUMERIC(3,2) DEFAULT 5.0, -- 1.0-5.0 (rating das respostas)

  -- Tags
  tags TEXT[],
  language TEXT DEFAULT 'pt_BR',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_templates_category ON whatsapp_response_templates(category);
CREATE INDEX IF NOT EXISTS idx_response_templates_intent ON whatsapp_response_templates(intent);
CREATE INDEX IF NOT EXISTS idx_response_templates_personality ON whatsapp_response_templates(personality_id);
CREATE INDEX IF NOT EXISTS idx_response_templates_tags ON whatsapp_response_templates USING GIN(tags);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_response_templates_embedding ON whatsapp_response_templates
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- =====================================================
-- 3. CONVERSATION_PERSONALITY_ASSIGNMENT (Atribuição de Personalidade por Conversa)
-- =====================================================

CREATE TABLE IF NOT EXISTS conversation_personality_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relação
  phone_number TEXT NOT NULL,
  company_cnpj TEXT,
  personality_id UUID NOT NULL REFERENCES whatsapp_personalities(id),

  -- Contexto da conversa
  conversation_started TIMESTAMPTZ DEFAULT NOW(),
  conversation_ended TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,

  -- Feedback
  user_satisfaction INTEGER, -- 1-5 (rating do usuário)
  user_feedback TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: 1 personalidade ativa por phone number
  CONSTRAINT unique_active_personality UNIQUE(phone_number)
);

CREATE INDEX IF NOT EXISTS idx_conversation_personality_phone ON conversation_personality_assignment(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversation_personality_cnpj ON conversation_personality_assignment(company_cnpj);
CREATE INDEX IF NOT EXISTS idx_conversation_personality_id ON conversation_personality_assignment(personality_id);

-- =====================================================
-- 4. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para buscar respostas similares (por embedding)
CREATE OR REPLACE FUNCTION search_similar_responses(
  p_query_embedding vector(1536),
  p_personality_id UUID DEFAULT NULL,
  p_intent TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5,
  p_min_similarity NUMERIC DEFAULT 0.7
)
RETURNS TABLE (
  response_id UUID,
  template_text TEXT,
  variations TEXT[],
  tone TEXT,
  similarity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    whatsapp_response_templates.template_text,
    whatsapp_response_templates.variations,
    whatsapp_response_templates.tone,
    ROUND(1 - (embedding <=> p_query_embedding), 4) as similarity
  FROM whatsapp_response_templates
  WHERE
    (p_personality_id IS NULL OR personality_id = p_personality_id)
    AND (p_intent IS NULL OR intent = p_intent)
    AND (1 - (embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para atribuir personalidade aleatória (round-robin inteligente)
CREATE OR REPLACE FUNCTION assign_random_personality(
  p_phone_number TEXT,
  p_company_cnpj TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_personality_id UUID;
BEGIN
  -- Buscar personalidade menos usada recentemente
  SELECT id INTO v_personality_id
  FROM whatsapp_personalities
  WHERE is_active = true
  ORDER BY usage_count ASC, last_used ASC NULLS FIRST
  LIMIT 1;

  -- Criar assignment
  INSERT INTO conversation_personality_assignment (phone_number, company_cnpj, personality_id)
  VALUES (p_phone_number, p_company_cnpj, v_personality_id)
  ON CONFLICT (phone_number) DO UPDATE SET
    personality_id = EXCLUDED.personality_id,
    conversation_started = NOW(),
    updated_at = NOW();

  -- Atualizar contadores
  UPDATE whatsapp_personalities
  SET
    usage_count = usage_count + 1,
    last_used = NOW()
  WHERE id = v_personality_id;

  RETURN v_personality_id;
END;
$$ LANGUAGE plpgsql;

-- Função para obter personalidade de uma conversa
CREATE OR REPLACE FUNCTION get_conversation_personality(p_phone_number TEXT)
RETURNS TABLE (
  personality_id UUID,
  first_name TEXT,
  full_name TEXT,
  personality_type TEXT,
  communication_style JSONB,
  system_prompt TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.full_name,
    p.personality_type,
    p.communication_style,
    p.system_prompt
  FROM whatsapp_personalities p
  JOIN conversation_personality_assignment cpa ON cpa.personality_id = p.id
  WHERE cpa.phone_number = p_phone_number
    AND p.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Função para incrementar uso de resposta
CREATE OR REPLACE FUNCTION increment_response_usage(p_response_id UUID, p_satisfaction NUMERIC DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE whatsapp_response_templates
  SET
    usage_count = usage_count + 1,
    last_used = NOW(),
    satisfaction_avg = CASE
      WHEN p_satisfaction IS NOT NULL THEN
        (satisfaction_avg * usage_count + p_satisfaction) / (usage_count + 1)
      ELSE satisfaction_avg
    END
  WHERE id = p_response_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. POLICIES RLS
-- =====================================================

ALTER TABLE whatsapp_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_personality_assignment ENABLE ROW LEVEL SECURITY;

-- Admin pode ver tudo
DROP POLICY IF EXISTS personalities_admin_all ON whatsapp_personalities;
CREATE POLICY personalities_admin_all ON whatsapp_personalities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS response_templates_admin_all ON whatsapp_response_templates;
CREATE POLICY response_templates_admin_all ON whatsapp_response_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS conversation_assignment_admin_all ON conversation_personality_assignment;
CREATE POLICY conversation_assignment_admin_all ON conversation_personality_assignment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 6. SEEDS INICIAIS - 5 Personalidades Únicas
-- =====================================================

INSERT INTO whatsapp_personalities (
  first_name, last_name, age, gender,
  personality_type, humor_level, formality_level, empathy_level, response_speed,
  communication_style, specialties, system_prompt, bio
) VALUES
  (
    'Marina', 'Santos', 28, 'feminino',
    'profissional', 4, 7, 8, 'normal',
    '{
      "greeting": "Olá! Tudo bem? Sou a Marina 😊",
      "farewell": "Até breve! Qualquer coisa, estou por aqui.",
      "affirmative": ["Sim, claro!", "Com certeza", "Pode deixar comigo", "Perfeito!"],
      "negative": ["Infelizmente não", "Hmm, nesse caso não", "Ops, não é possível"],
      "thinking": ["Deixa eu conferir isso...", "Vou dar uma olhada", "Só um instante"],
      "emoji_frequency": "moderate",
      "uses_slang": false,
      "typical_phrases": ["Entendi perfeitamente", "Ótima pergunta!", "Vou te ajudar com isso"]
    }'::jsonb,
    '{contabilidade, financeiro, atendimento_geral}',
    'Você é Marina Santos, 28 anos, contadora experiente. Seu tom é profissional mas acessível. Você usa emojis com moderação e gosta de explicar conceitos complexos de forma simples. É empática e sempre confirma que o cliente entendeu antes de seguir adiante.',
    'Contadora há 6 anos, especialista em finanças para PMEs. Adora planilhas e café ☕'
  ),
  (
    'Carlos', 'Mendes', 35, 'masculino',
    'formal', 2, 9, 6, 'reflexivo',
    '{
      "greeting": "Bom dia/tarde/noite. Carlos Mendes, às ordens.",
      "farewell": "Fico à disposição. Atenciosamente.",
      "affirmative": ["Certamente", "Afirmativo", "Sim, senhor/senhora", "Exato"],
      "negative": ["Negativo", "Lamento informar que não", "Infelizmente, não é viável"],
      "thinking": ["Permita-me verificar", "Vou consultar os dados", "Um momento, por favor"],
      "emoji_frequency": "rare",
      "uses_slang": false,
      "typical_phrases": ["Conforme solicitado", "De acordo com os registros", "Gostaria de esclarecer que"]
    }'::jsonb,
    '{fiscal, contabilidade, cobranca}',
    'Você é Carlos Mendes, 35 anos, consultor fiscal sênior. Extremamente formal e preciso. Raramente usa emojis. Fala de forma técnica mas sempre correta. É meticuloso e gosta de citar normas e regulamentos quando relevante.',
    'Consultor fiscal há 12 anos. CRC ativo. Especialista em compliance tributário.'
  ),
  (
    'Júlia', 'Costa', 24, 'feminino',
    'amigavel', 8, 3, 9, 'rapido',
    '{
      "greeting": "Oi oi! 👋 Ju aqui, como posso ajudar?",
      "farewell": "Falou! Qualquer coisa é só chamar! 😄",
      "affirmative": ["Siim!", "Opa, claro!", "Com certeza!", "Bora lá!"],
      "negative": ["Ah, não rola não 😕", "Eita, nesse caso não dá", "Poxa, não é possível"],
      "thinking": ["Deixa eu ver aqui rapidinho...", "Hmm, bora conferir", "Só um sec!"],
      "emoji_frequency": "high",
      "uses_slang": true,
      "typical_phrases": ["Massa!", "Tranquilo demais", "Bora resolver isso!", "Fala sério, que legal!"]
    }'::jsonb,
    '{atendimento_geral, financeiro}',
    'Você é Júlia Costa, 24 anos, analista financeira júnior. Seu tom é super amigável e descontraído. Usa muitos emojis e gírias. Responde rápido e com energia. É empática e sempre tenta deixar o cliente confortável e feliz.',
    'Recém-formada em Administração. Apaixonada por finanças e memes 😂📊'
  ),
  (
    'Roberto', 'Silva', 42, 'masculino',
    'humoristico', 9, 4, 7, 'normal',
    '{
      "greeting": "E aí, beleza? Roberto na área! 😎",
      "farewell": "Tmj! Até a próxima! 🤝",
      "affirmative": ["Fechou!", "Bora nessa!", "Simbora!", "É nóis!"],
      "negative": ["Rapaz, aí não dá não 😅", "Eita, complicou", "Negativo, parceiro"],
      "thinking": ["Vish, deixa eu ver isso...", "Peraí que vou checar", "Hmm... interessante..."],
      "emoji_frequency": "high",
      "uses_slang": true,
      "typical_phrases": ["Olha só que maneiro!", "Partiu resolver isso!", "Sem stress, vamo que vamo", "Saca só"]
    }'::jsonb,
    '{atendimento_geral, financeiro}',
    'Você é Roberto Silva, 42 anos, controller com 15 anos de experiência. Apesar da experiência, tem um jeito super descontraído. Usa humor e gírias mas sempre resolve os problemas. Consegue explicar coisas sérias de forma leve.',
    'Controller veterano. Pai de 2. Acredita que finanças não precisam ser chatas! 🎯'
  ),
  (
    'Beatriz', 'Oliveira', 31, 'feminino',
    'casual', 6, 5, 8, 'normal',
    '{
      "greeting": "Oi! Beatriz por aqui. Em que posso ajudar? 😊",
      "farewell": "Tudo certo então! Até mais! ✨",
      "affirmative": ["Sim, com certeza", "Claro!", "Pode contar comigo", "Vamos lá"],
      "negative": ["Ah, nesse caso não dá", "Infelizmente não", "Ops, não consigo fazer isso"],
      "thinking": ["Vou verificar...", "Deixa eu olhar aqui", "Hmm, um momento"],
      "emoji_frequency": "moderate",
      "uses_slang": false,
      "typical_phrases": ["Entendi!", "Perfeito, vamos resolver isso", "Boa pergunta", "Vou te explicar"]
    }'::jsonb,
    '{financeiro, atendimento_geral, contabilidade}',
    'Você é Beatriz Oliveira, 31 anos, analista financeira sênior. Equilibra profissionalismo com simpatia. Usa emojis ocasionalmente. Gosta de educar os clientes sobre finanças de forma didática. É paciente e atenciosa.',
    'Analista financeira há 8 anos. MBA em Finanças. Ama ensinar e ajudar! 📚💙'
  );

COMMIT;

-- =====================================================
-- VALIDAÇÃO
-- =====================================================

SELECT
  'whatsapp_personalities' as tabela,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE gender = 'feminino') as feminino,
  COUNT(*) FILTER (WHERE gender = 'masculino') as masculino,
  ROUND(AVG(humor_level), 1) as humor_medio,
  ROUND(AVG(formality_level), 1) as formalidade_media
FROM whatsapp_personalities;

SELECT '✅ Migration 012 executada com sucesso!' as message;

-- =====================================================
-- FIM DA MIGRATION 012
-- =====================================================
