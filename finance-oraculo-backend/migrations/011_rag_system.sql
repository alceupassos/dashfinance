-- =====================================================
-- Migration 011: RAG System (Vector Search + Embeddings)
-- Created: 2025-11-06
-- Purpose: Sistema RAG para contexto inteligente em conversas WhatsApp
-- =====================================================

BEGIN;

-- =====================================================
-- 1. HABILITAR EXTENSÃO pgvector
-- =====================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 2. RAG_DOCUMENTS (Documentos indexados)
-- =====================================================

CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  document_type TEXT NOT NULL, -- 'faq', 'tutorial', 'financial_concept', 'company_data'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,

  -- Metadados
  company_cnpj TEXT, -- NULL para docs gerais, CNPJ para docs específicos de empresa
  category TEXT, -- 'contabilidade', 'fiscal', 'financeiro', 'operacional', 'produto'
  tags TEXT[],
  language TEXT DEFAULT 'pt_BR',

  -- Vector embedding (OpenAI text-embedding-3-small: 1536 dimensions)
  embedding vector(1536),

  -- Tracking
  view_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  relevance_score NUMERIC(3,2) DEFAULT 1.0, -- 0.0-1.0

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_docs_type ON rag_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_rag_docs_cnpj ON rag_documents(company_cnpj);
CREATE INDEX IF NOT EXISTS idx_rag_docs_category ON rag_documents(category);
CREATE INDEX IF NOT EXISTS idx_rag_docs_tags ON rag_documents USING GIN(tags);

-- Vector similarity search index (HNSW - Hierarchical Navigable Small World)
CREATE INDEX IF NOT EXISTS idx_rag_docs_embedding ON rag_documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- =====================================================
-- 3. RAG_QUERIES (Histórico de consultas RAG)
-- =====================================================

CREATE TABLE IF NOT EXISTS rag_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Query info
  query_text TEXT NOT NULL,
  query_embedding vector(1536),

  -- Context
  phone_number TEXT,
  company_cnpj TEXT,
  conversation_id UUID REFERENCES whatsapp_conversations(id),

  -- Results
  documents_found INTEGER DEFAULT 0,
  top_document_id UUID REFERENCES rag_documents(id),
  avg_similarity NUMERIC(5,4), -- 0.0000-1.0000

  -- Performance
  search_duration_ms INTEGER,
  llm_used BOOLEAN DEFAULT false,
  llm_model TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_queries_phone ON rag_queries(phone_number);
CREATE INDEX IF NOT EXISTS idx_rag_queries_cnpj ON rag_queries(company_cnpj);
CREATE INDEX IF NOT EXISTS idx_rag_queries_created ON rag_queries(created_at DESC);

-- =====================================================
-- 4. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para buscar documentos similares (vector similarity search)
CREATE OR REPLACE FUNCTION search_similar_documents(
  p_query_embedding vector(1536),
  p_company_cnpj TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5,
  p_min_similarity NUMERIC DEFAULT 0.7
)
RETURNS TABLE (
  document_id UUID,
  title TEXT,
  content TEXT,
  summary TEXT,
  category TEXT,
  similarity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    rag_documents.title,
    rag_documents.content,
    rag_documents.summary,
    rag_documents.category,
    ROUND(1 - (embedding <=> p_query_embedding), 4) as similarity
  FROM rag_documents
  WHERE
    (p_company_cnpj IS NULL OR company_cnpj = p_company_cnpj OR company_cnpj IS NULL)
    AND (1 - (embedding <=> p_query_embedding)) >= p_min_similarity
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar documentos por texto (full-text search + vector)
CREATE OR REPLACE FUNCTION hybrid_search_documents(
  p_query TEXT,
  p_query_embedding vector(1536),
  p_company_cnpj TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  document_id UUID,
  title TEXT,
  content TEXT,
  summary TEXT,
  category TEXT,
  combined_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH
    -- Full-text search score
    fts AS (
      SELECT
        id,
        ts_rank(to_tsvector('portuguese', title || ' ' || content), plainto_tsquery('portuguese', p_query)) as fts_score
      FROM rag_documents
      WHERE
        to_tsvector('portuguese', title || ' ' || content) @@ plainto_tsquery('portuguese', p_query)
        AND (p_company_cnpj IS NULL OR company_cnpj = p_company_cnpj OR company_cnpj IS NULL)
    ),
    -- Vector similarity score
    vec AS (
      SELECT
        id,
        ROUND(1 - (embedding <=> p_query_embedding), 4) as vec_score
      FROM rag_documents
      WHERE
        (p_company_cnpj IS NULL OR company_cnpj = p_company_cnpj OR company_cnpj IS NULL)
    )
  SELECT
    d.id,
    d.title,
    d.content,
    d.summary,
    d.category,
    ROUND(COALESCE(fts.fts_score, 0) * 0.3 + COALESCE(vec.vec_score, 0) * 0.7, 4) as combined_score
  FROM rag_documents d
  LEFT JOIN fts ON fts.id = d.id
  LEFT JOIN vec ON vec.id = d.id
  WHERE
    (fts.fts_score IS NOT NULL OR vec.vec_score IS NOT NULL)
    AND (p_company_cnpj IS NULL OR d.company_cnpj = p_company_cnpj OR d.company_cnpj IS NULL)
  ORDER BY combined_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar contadores de acesso
CREATE OR REPLACE FUNCTION update_document_access(p_document_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE rag_documents
  SET
    view_count = view_count + 1,
    last_accessed = NOW()
  WHERE id = p_document_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. POLICIES RLS
-- =====================================================

ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_queries ENABLE ROW LEVEL SECURITY;

-- Admin pode ver tudo
DROP POLICY IF EXISTS rag_docs_admin_all ON rag_documents;
CREATE POLICY rag_docs_admin_all ON rag_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS rag_queries_admin_all ON rag_queries;
CREATE POLICY rag_queries_admin_all ON rag_queries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 6. SEEDS INICIAIS - FAQs e Conceitos Financeiros
-- =====================================================

-- Nota: Embeddings serão gerados via Edge Function
-- Por enquanto, inserir documentos sem embeddings (NULL)

INSERT INTO rag_documents (document_type, title, content, summary, category, tags, company_cnpj) VALUES
  (
    'financial_concept',
    'O que é Runway?',
    'Runway (ou "pista de pouso") é uma métrica financeira que indica quantos meses sua empresa consegue operar com o caixa disponível atual, considerando a taxa de queima mensal (burn rate). Fórmula: Runway = Caixa Disponível / Burn Rate Mensal. Por exemplo, se você tem R$ 300.000 em caixa e gasta R$ 100.000/mês, seu runway é de 3 meses. É uma métrica crítica para startups e empresas em crescimento.',
    'Meses de operação com caixa atual',
    'financeiro',
    '{runway, metricas, cashflow, startup}',
    NULL
  ),
  (
    'financial_concept',
    'O que é Burn Rate?',
    'Burn Rate (taxa de queima) é a velocidade com que uma empresa gasta seu caixa. Normalmente medido mensalmente. Fórmula: Burn Rate = Despesas Mensais - Receitas Mensais. Se sua empresa gasta R$ 150.000/mês e fatura R$ 100.000/mês, seu burn rate é R$ 50.000/mês. Um burn rate negativo significa que você está gerando caixa (lucrativo).',
    'Taxa de queima de caixa mensal',
    'financeiro',
    '{burnrate, metricas, despesas, cashflow}',
    NULL
  ),
  (
    'financial_concept',
    'O que é EBITDA?',
    'EBITDA (Earnings Before Interest, Taxes, Depreciation and Amortization) ou LAJIDA em português, é um indicador que mostra o lucro da empresa antes de juros, impostos, depreciação e amortização. É usado para avaliar a performance operacional pura do negócio. Fórmula simplificada: EBITDA = Lucro Operacional + Depreciação + Amortização.',
    'Lucro antes de juros, impostos, depreciação e amortização',
    'contabilidade',
    '{ebitda, lajida, metricas, lucro}',
    NULL
  ),
  (
    'faq',
    'Como sincronizar dados do F360?',
    'Para sincronizar dados do F360: 1) Acesse o painel admin. 2) Vá em Integrações > F360. 3) Configure suas credenciais (Client ID e Client Secret). 4) Clique em "Sincronizar Agora". A sincronização acontece automaticamente a cada 2 horas. Você pode forçar uma sincronização manual via comando /sync-f360-now no WhatsApp se for admin.',
    'Passo a passo sincronização F360',
    'produto',
    '{f360, sincronizacao, integracao, tutorial}',
    NULL
  ),
  (
    'faq',
    'Posso exportar relatórios?',
    'Sim! Você pode exportar relatórios em Excel via WhatsApp. Basta digitar: "Manda o DRE de [mês]" ou "Gera relatório de [tipo]". Os formatos disponíveis são: DRE, Cashflow, Contas a Pagar, Contas a Receber. O arquivo será enviado diretamente no chat em até 10 segundos.',
    'Exportação de relatórios em Excel',
    'produto',
    '{relatorios, excel, export, dre}',
    NULL
  ),
  (
    'tutorial',
    'Como interpretar o dashboard?',
    'O dashboard principal mostra: 1) Saldo Total: soma de todas as contas. 2) Disponível: saldo após contas a pagar. 3) Runway: meses de operação restantes. 4) Burn Rate: taxa de queima mensal. 5) Margem Líquida: % de lucro sobre receitas. Cores: Verde = saudável, Amarelo = atenção, Vermelho = crítico. Clique em qualquer card para ver detalhes.',
    'Guia de uso do dashboard',
    'produto',
    '{dashboard, tutorial, metricas, interface}',
    NULL
  ),
  (
    'financial_concept',
    'O que é Margem Líquida?',
    'Margem Líquida é o percentual de lucro sobre as receitas totais. Fórmula: Margem Líquida = (Lucro Líquido / Receita Total) × 100. Exemplo: se você faturou R$ 100.000 e teve R$ 25.000 de lucro, sua margem líquida é 25%. Margens saudáveis variam por setor: varejo 2-5%, SaaS 20-30%, consultoria 15-25%.',
    'Percentual de lucro sobre receitas',
    'financeiro',
    '{margem, lucratividade, metricas, rentabilidade}',
    NULL
  ),
  (
    'faq',
    'Quais tipos de alerta posso receber?',
    'O Finance Oráculo envia alertas automáticos para: 1) Runway crítico (< 3 meses). 2) Contas vencendo em 3 dias. 3) Metas atingidas. 4) Burn rate acima do planejado. 5) Anomalias em despesas. Os alertas chegam via WhatsApp diariamente às 9h. Você pode configurar horários e tipos via painel admin.',
    'Tipos de alertas automáticos',
    'produto',
    '{alertas, notificacoes, whatsapp, automacao}',
    NULL
  ),
  (
    'tutorial',
    'Como adicionar uma nova empresa?',
    'Para adicionar empresa (admin/franqueado): 1) Acesse Admin > Empresas. 2) Clique "Nova Empresa". 3) Preencha CNPJ, Razão Social, Status. 4) Configure integrações (F360, OMIE). 5) Associe usuários/contatos. 6) Teste conexão. 7) Salve. A empresa aparecerá no dropdown em até 5 minutos.',
    'Cadastro de novas empresas',
    'produto',
    '{empresas, cadastro, onboarding, admin}',
    NULL
  ),
  (
    'financial_concept',
    'Diferença entre Caixa e Disponível?',
    'Caixa é o total em todas as contas bancárias. Disponível é o caixa menos os compromissos imediatos (contas a pagar). Exemplo: Caixa R$ 100.000, Contas a Pagar R$ 30.000 → Disponível R$ 70.000. Use "Disponível" para decisões de investimento, pois é o dinheiro realmente livre.',
    'Caixa vs Disponível',
    'financeiro',
    '{caixa, disponivel, liquidez, metricas}',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
-- VALIDAÇÃO
-- =====================================================

SELECT
  'rag_documents' as tabela,
  COUNT(*) as documentos,
  COUNT(*) FILTER (WHERE document_type = 'faq') as faqs,
  COUNT(*) FILTER (WHERE document_type = 'financial_concept') as conceitos,
  COUNT(*) FILTER (WHERE document_type = 'tutorial') as tutoriais
FROM rag_documents;

SELECT '✅ Migration 011 executada com sucesso!' as message;

-- =====================================================
-- FIM DA MIGRATION 011
-- =====================================================
