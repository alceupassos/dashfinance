-- =====================================================
-- Migration 007: Dashboard Cards Pre-Processor
-- =====================================================
-- Data: 2025-11-06
-- Objetivo: Pré-calcular cards do dashboard a cada 5 minutos
-- Economia: $15/mês (vs Edge Functions on-demand)
-- =====================================================

-- Tabela para armazenar cards pré-calculados
CREATE TABLE IF NOT EXISTS dashboard_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  card_type TEXT NOT NULL, -- 'total_caixa', 'disponivel', 'receitas_mes', etc
  card_data JSONB NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',

  CONSTRAINT dashboard_cards_cnpj_type UNIQUE (company_cnpj, card_type)
);

-- Índice para lookup rápido
CREATE INDEX IF NOT EXISTS idx_dashboard_cards_lookup
  ON dashboard_cards(company_cnpj, expires_at);

-- Índice para cleanup de cards expirados (sem predicate para evitar erro IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_dashboard_cards_expired
  ON dashboard_cards(expires_at);

-- RLS (Row Level Security)
ALTER TABLE dashboard_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só veem cards da própria empresa
CREATE POLICY dashboard_cards_select_own_company
  ON dashboard_cards
  FOR SELECT
  USING (
    company_cnpj IN (
      SELECT company_cnpj
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Policy: Admin vê tudo
CREATE POLICY dashboard_cards_select_admin
  ON dashboard_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- Função para limpar cards expirados (executar 1x/dia)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_dashboard_cards()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM dashboard_cards
  WHERE expires_at < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- View para facilitar consulta de cards válidos
-- =====================================================
CREATE OR REPLACE VIEW v_dashboard_cards_valid AS
SELECT
  company_cnpj,
  card_type,
  card_data,
  calculated_at,
  expires_at,
  (expires_at - NOW()) as time_to_expire
FROM dashboard_cards
WHERE expires_at > NOW()
ORDER BY company_cnpj, card_type;

-- =====================================================
-- Comentários
-- =====================================================
COMMENT ON TABLE dashboard_cards IS 'Cards pré-calculados do dashboard (atualizados a cada 5 minutos via N8N)';
COMMENT ON COLUMN dashboard_cards.card_type IS 'Tipo do card: total_caixa, disponivel, receitas_mes, despesas_mes, faturas_vencidas, runway, burn_rate, dso, dpo, margem, grafico_tendencia, top_despesas';
COMMENT ON COLUMN dashboard_cards.card_data IS 'Dados do card em formato JSON';
COMMENT ON COLUMN dashboard_cards.expires_at IS 'Data de expiração (5 minutos após calculated_at)';

-- =====================================================
-- Exemplo de uso no frontend
-- =====================================================
-- SELECT * FROM v_dashboard_cards_valid WHERE company_cnpj = '00052912647000';
--
-- Retorna todos os cards válidos da empresa:
-- {
--   "card_type": "total_caixa",
--   "card_data": {
--     "value": 45230.50,
--     "label": "Total Caixa",
--     "formatted": "R$ 45.230,50",
--     "change_pct": 5.2,
--     "change_direction": "up"
--   },
--   "calculated_at": "2025-11-06T10:00:00Z",
--   "expires_at": "2025-11-06T10:05:00Z"
-- }
