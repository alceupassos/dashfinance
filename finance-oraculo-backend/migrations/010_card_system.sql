-- =====================================================
-- Migration 010: Sistema de Processamento de Cards
-- Created: 2025-11-06
-- Purpose: Sistema granular de processamento paralelo de cards/widgets
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CARD_DEPENDENCIES (Definição de cards e suas dependências)
-- =====================================================

CREATE TABLE IF NOT EXISTS card_dependencies (
  card_type TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  depends_on TEXT[] DEFAULT '{}', -- Cards que precisam estar prontos antes
  data_sources TEXT[] DEFAULT '{}', -- 'f360', 'omie', 'dre_upload', 'manual'
  computation_complexity TEXT DEFAULT 'simple', -- simple, medium, complex, heavy
  estimated_duration_ms INTEGER DEFAULT 100,
  cache_ttl_minutes INTEGER DEFAULT 60,
  can_parallelize BOOLEAN DEFAULT true,
  tier INTEGER DEFAULT 1, -- Calculado automaticamente baseado em depends_on
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_deps_tier ON card_dependencies(tier);
CREATE INDEX IF NOT EXISTS idx_card_deps_complexity ON card_dependencies(computation_complexity);

-- =====================================================
-- 2. CARD_PROCESSING_QUEUE (Fila de processamento de cards)
-- =====================================================

CREATE TABLE IF NOT EXISTS card_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  company_cnpj TEXT NOT NULL,
  card_type TEXT NOT NULL REFERENCES card_dependencies(card_type) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'monthly', -- daily, weekly, monthly, yearly
  reference_date DATE NOT NULL,

  -- Estado
  status TEXT DEFAULT 'pending', -- pending, ready_to_process, processing, done, error
  priority INTEGER DEFAULT 5, -- 1-10, quanto menor mais prioritário
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Dados
  input_data JSONB DEFAULT '{}', -- Dados de entrada necessários
  computed_data JSONB, -- Resultado do cálculo
  cache_key TEXT, -- Chave para cache

  -- Tracking
  worker_id TEXT, -- Identificador do worker processando
  estimated_duration_ms INTEGER,
  actual_duration_ms INTEGER,
  last_error TEXT,
  error_details JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- TTL do cache
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(company_cnpj, card_type, period, reference_date)
);

CREATE INDEX IF NOT EXISTS idx_card_queue_status_priority ON card_processing_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_card_queue_company ON card_processing_queue(company_cnpj, status);
CREATE INDEX IF NOT EXISTS idx_card_queue_expires ON card_processing_queue(expires_at) WHERE status = 'done';
CREATE INDEX IF NOT EXISTS idx_card_queue_ref_date ON card_processing_queue(reference_date);
CREATE INDEX IF NOT EXISTS idx_card_queue_worker ON card_processing_queue(worker_id) WHERE status = 'processing';

-- =====================================================
-- 3. CARD_PROCESSING_LOG (Histórico de processamento)
-- =====================================================

CREATE TABLE IF NOT EXISTS card_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES card_processing_queue(id) ON DELETE CASCADE,
  company_cnpj TEXT NOT NULL,
  card_type TEXT NOT NULL,
  event_type TEXT NOT NULL, -- created, started, completed, failed, retried
  status TEXT NOT NULL,
  worker_id TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_log_queue ON card_processing_log(queue_id);
CREATE INDEX IF NOT EXISTS idx_card_log_company ON card_processing_log(company_cnpj, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_log_type ON card_processing_log(event_type, created_at DESC);

-- =====================================================
-- 4. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para calcular tier de um card baseado em suas dependências
CREATE OR REPLACE FUNCTION calculate_card_tier(p_card_type TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_depends_on TEXT[];
  v_max_dep_tier INTEGER;
BEGIN
  -- Buscar dependências
  SELECT depends_on INTO v_depends_on
  FROM card_dependencies
  WHERE card_type = p_card_type;

  -- Se não tem dependências, tier = 1
  IF v_depends_on IS NULL OR array_length(v_depends_on, 1) IS NULL THEN
    RETURN 1;
  END IF;

  -- Buscar o maior tier das dependências
  SELECT COALESCE(MAX(tier), 0) INTO v_max_dep_tier
  FROM card_dependencies
  WHERE card_type = ANY(v_depends_on);

  -- Tier deste card = max tier das deps + 1
  RETURN v_max_dep_tier + 1;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar tier automaticamente
CREATE OR REPLACE FUNCTION update_card_tier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tier := calculate_card_tier(NEW.card_type);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_card_tier ON card_dependencies;
CREATE TRIGGER trg_update_card_tier
  BEFORE INSERT OR UPDATE ON card_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION update_card_tier();

-- Função para verificar se um card está pronto para processar
CREATE OR REPLACE FUNCTION is_card_ready_to_process(p_queue_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_company_cnpj TEXT;
  v_card_type TEXT;
  v_reference_date DATE;
  v_depends_on TEXT[];
  v_all_deps_done BOOLEAN;
BEGIN
  -- Buscar info do job
  SELECT company_cnpj, card_type, reference_date
  INTO v_company_cnpj, v_card_type, v_reference_date
  FROM card_processing_queue
  WHERE id = p_queue_id;

  -- Buscar dependências
  SELECT depends_on INTO v_depends_on
  FROM card_dependencies
  WHERE card_type = v_card_type;

  -- Se não tem dependências, está pronto
  IF v_depends_on IS NULL OR array_length(v_depends_on, 1) IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Verificar se todas as dependências estão 'done'
  SELECT COALESCE(bool_and(status = 'done'), FALSE) INTO v_all_deps_done
  FROM card_processing_queue
  WHERE company_cnpj = v_company_cnpj
    AND card_type = ANY(v_depends_on)
    AND reference_date = v_reference_date;

  RETURN v_all_deps_done;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar cards como ready_to_process quando deps completam
CREATE OR REPLACE FUNCTION check_ready_cards()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o card foi marcado como done, verificar dependentes
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    UPDATE card_processing_queue
    SET
      status = 'ready_to_process',
      updated_at = NOW()
    WHERE status = 'pending'
      AND company_cnpj = NEW.company_cnpj
      AND reference_date = NEW.reference_date
      AND is_card_ready_to_process(id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_ready_cards ON card_processing_queue;
CREATE TRIGGER trg_check_ready_cards
  AFTER UPDATE ON card_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION check_ready_cards();

-- Função para obter estatísticas de processamento
CREATE OR REPLACE FUNCTION get_card_processing_stats(p_cnpj TEXT DEFAULT NULL)
RETURNS TABLE (
  total BIGINT,
  pending BIGINT,
  ready_to_process BIGINT,
  processing BIGINT,
  done BIGINT,
  error BIGINT,
  avg_duration_ms NUMERIC,
  cache_hit_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'ready_to_process')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'processing')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'done')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'error')::BIGINT,
    ROUND(AVG(actual_duration_ms), 2),
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE status = 'done' AND actual_duration_ms = 0) /
      NULLIF(COUNT(*) FILTER (WHERE status = 'done'), 0),
      2
    )
  FROM card_processing_queue
  WHERE p_cnpj IS NULL OR company_cnpj = p_cnpj;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. POLICIES RLS
-- =====================================================

ALTER TABLE card_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_processing_log ENABLE ROW LEVEL SECURITY;

-- Admin pode ver tudo
DROP POLICY IF EXISTS card_deps_admin_all ON card_dependencies;
CREATE POLICY card_deps_admin_all ON card_dependencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS card_queue_admin_all ON card_processing_queue;
CREATE POLICY card_queue_admin_all ON card_processing_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS card_log_admin_all ON card_processing_log;
CREATE POLICY card_log_admin_all ON card_processing_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 6. SEEDS INICIAIS - Definição de Cards
-- =====================================================

INSERT INTO card_dependencies (card_type, display_name, description, depends_on, data_sources, computation_complexity, estimated_duration_ms, cache_ttl_minutes, can_parallelize) VALUES
  -- Tier 1: Dados brutos (sem dependências)
  ('saldo_f360', 'Saldo F360', 'Saldo atual em contas F360', '{}', '{"f360"}', 'simple', 100, 15, true),
  ('saldo_omie', 'Saldo OMIE', 'Saldo atual em contas OMIE', '{}', '{"omie"}', 'simple', 100, 15, true),
  ('lancamentos_mes', 'Lançamentos do Mês', 'Todos os lançamentos financeiros do mês', '{}', '{"f360","omie"}', 'simple', 200, 30, true),
  ('contas_pagar', 'Contas a Pagar', 'Contas a pagar pendentes', '{}', '{"f360","omie"}', 'simple', 150, 30, true),
  ('contas_receber', 'Contas a Receber', 'Contas a receber pendentes', '{}', '{"f360","omie"}', 'simple', 150, 30, true),

  -- Tier 2: Agregações simples
  ('receitas_mes', 'Receitas do Mês', 'Total de receitas do mês', '{"lancamentos_mes"}', '{"f360","omie"}', 'simple', 150, 60, true),
  ('despesas_mes', 'Despesas do Mês', 'Total de despesas do mês', '{"lancamentos_mes"}', '{"f360","omie"}', 'simple', 150, 60, true),
  ('total_caixa', 'Total em Caixa', 'Somatório de todas as contas', '{"saldo_f360","saldo_omie"}', '{"f360","omie"}', 'simple', 50, 15, true),
  ('despesas_por_categoria', 'Despesas por Categoria', 'Breakdown de despesas', '{"lancamentos_mes"}', '{"f360","omie"}', 'medium', 300, 60, true),
  ('receitas_por_fonte', 'Receitas por Fonte', 'Breakdown de receitas', '{"lancamentos_mes"}', '{"f360","omie"}', 'medium', 300, 60, true),

  -- Tier 3: Cálculos compostos
  ('disponivel', 'Disponível', 'Saldo disponível considerando compromissos', '{"total_caixa","contas_pagar"}', '{"f360","omie"}', 'medium', 200, 60, true),
  ('margem_liquida', 'Margem Líquida', 'Margem líquida do período', '{"receitas_mes","despesas_mes"}', '{"f360","omie"}', 'simple', 100, 60, true),
  ('resultado_mes', 'Resultado do Mês', 'Lucro/Prejuízo do mês', '{"receitas_mes","despesas_mes"}', '{"f360","omie"}', 'simple', 100, 60, true),

  -- Tier 4: Análises complexas
  ('runway', 'Runway', 'Meses de operação com caixa atual', '{"disponivel","despesas_mes"}', '{"f360","omie"}', 'medium', 300, 120, false),
  ('burn_rate', 'Burn Rate', 'Taxa de queima de caixa mensal', '{"despesas_mes","receitas_mes"}', '{"f360","omie"}', 'medium', 250, 120, false),
  ('cashflow_projection', 'Projeção de Cashflow', 'Projeção de fluxo de caixa 6 meses', '{"receitas_mes","despesas_mes","disponivel","contas_pagar","contas_receber"}', '{"f360","omie"}', 'heavy', 2000, 360, false),

  -- Tier 5: Dashboards completos
  ('dashboard_overview', 'Overview Completo', 'Dashboard principal com todos os cards', '{"total_caixa","disponivel","receitas_mes","despesas_mes","runway","burn_rate","margem_liquida"}', '{"f360","omie"}', 'complex', 500, 30, false),
  ('dashboard_financeiro', 'Dashboard Financeiro', 'Visão financeira detalhada', '{"lancamentos_mes","receitas_por_fonte","despesas_por_categoria","cashflow_projection"}', '{"f360","omie"}', 'complex', 800, 60, false)
ON CONFLICT (card_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  depends_on = EXCLUDED.depends_on,
  data_sources = EXCLUDED.data_sources,
  computation_complexity = EXCLUDED.computation_complexity,
  estimated_duration_ms = EXCLUDED.estimated_duration_ms,
  cache_ttl_minutes = EXCLUDED.cache_ttl_minutes,
  can_parallelize = EXCLUDED.can_parallelize,
  updated_at = NOW();

COMMIT;

-- =====================================================
-- VALIDAÇÃO
-- =====================================================

SELECT
  'card_dependencies' as tabela,
  COUNT(*) as registros,
  COUNT(*) FILTER (WHERE tier = 1) as tier_1,
  COUNT(*) FILTER (WHERE tier = 2) as tier_2,
  COUNT(*) FILTER (WHERE tier = 3) as tier_3,
  COUNT(*) FILTER (WHERE tier >= 4) as tier_4_plus
FROM card_dependencies;

SELECT status, '✅ Migration 010 executada com sucesso!' as message;

-- =====================================================
-- FIM DA MIGRATION 010
-- =====================================================
