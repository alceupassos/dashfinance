-- =====================================================
-- TABELA DE CACHE PARA DADOS DOS ERPS
-- =====================================================
-- Armazena dados consultados dos ERPs (F360/Omie)
-- para evitar consultas desnecessárias

CREATE TABLE IF NOT EXISTS erp_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificação
  f360_token TEXT,
  omie_app_key TEXT,
  query_type TEXT NOT NULL, -- 'balance', 'dre', 'cashflow', 'receivables', 'payables', 'overview'
  
  -- Dados cacheados
  data JSONB NOT NULL,
  
  -- Controle de validade
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: precisa ter pelo menos um token
  CONSTRAINT erp_cache_token_check CHECK (
    f360_token IS NOT NULL OR omie_app_key IS NOT NULL
  )
);

-- Índices para performance
CREATE INDEX idx_erp_cache_f360_token ON erp_cache(f360_token);
CREATE INDEX idx_erp_cache_omie_key ON erp_cache(omie_app_key);
CREATE INDEX idx_erp_cache_query_type ON erp_cache(query_type);
CREATE INDEX idx_erp_cache_expires ON erp_cache(expires_at);

-- Índice composto para consultas rápidas
CREATE INDEX idx_erp_cache_lookup ON erp_cache(f360_token, query_type, expires_at);

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM erp_cache
  WHERE expires_at < NOW();
  
  RAISE NOTICE 'Cache expirado limpo';
END;
$$;

-- Agendar limpeza do cache a cada hora
SELECT cron.schedule(
  'cleanup-expired-cache',
  '0 * * * *', -- A cada hora
  $$SELECT cleanup_expired_cache()$$
);

COMMENT ON TABLE erp_cache IS 'Cache de dados consultados dos ERPs (F360/Omie)';
COMMENT ON COLUMN erp_cache.query_type IS 'Tipo de consulta: balance, dre, cashflow, receivables, payables, overview';
COMMENT ON COLUMN erp_cache.expires_at IS 'Data/hora de expiração do cache (5 minutos padrão)';

