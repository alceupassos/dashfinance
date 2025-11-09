-- =====================================================
-- Migration 009: Admin Tables (Security & Observability)
-- Created: 2025-11-06
-- Purpose: Tabelas para painel admin de segurança e observabilidade
-- =====================================================

BEGIN;

-- =====================================================
-- 1. PROFILES (expandir tabela existente)
-- =====================================================

-- A tabela profiles já existe, então adicionamos apenas as colunas que faltam
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'viewer'; -- admin, executivo_conta, franqueado, cliente, viewer
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_company_cnpj TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Criar índices apenas se não existirem
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- =====================================================
-- 2. USER_COMPANIES (relação user <-> empresas)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_cnpj TEXT NOT NULL,
  access_level TEXT DEFAULT 'read', -- read, write, admin
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, company_cnpj)
);

CREATE INDEX IF NOT EXISTS idx_user_companies_user ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_cnpj ON user_companies(company_cnpj);

-- =====================================================
-- 3. USER_API_KEYS (chaves de API de usuários - renomeado para evitar conflito)
-- =====================================================
-- Nota: api_keys já existe e é usado para chaves de provedores LLM

CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- Primeiros 8 chars do hash
  key_hash TEXT NOT NULL UNIQUE, -- Hash SHA256 da chave
  scopes TEXT[] DEFAULT ARRAY['read'], -- read, write, admin
  status TEXT DEFAULT 'active', -- active, inactive, revoked
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_status ON user_api_keys(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_api_keys_hash ON user_api_keys(key_hash);

-- =====================================================
-- 4. ADMIN_API_METRICS (métricas de Edge Functions)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_api_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interval_start TIMESTAMPTZ NOT NULL,
  interval_end TIMESTAMPTZ NOT NULL,
  function_name TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  avg_latency_ms NUMERIC(10,2) DEFAULT 0,
  p50_latency_ms NUMERIC(10,2) DEFAULT 0,
  p95_latency_ms NUMERIC(10,2) DEFAULT 0,
  p99_latency_ms NUMERIC(10,2) DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  request_bytes BIGINT DEFAULT 0,
  response_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(interval_start, function_name)
);

CREATE INDEX IF NOT EXISTS idx_admin_api_metrics_interval ON admin_api_metrics(interval_start DESC);
CREATE INDEX IF NOT EXISTS idx_admin_api_metrics_function ON admin_api_metrics(function_name);
CREATE INDEX IF NOT EXISTS idx_admin_api_metrics_errors ON admin_api_metrics(error_count) WHERE error_count > 0;

-- =====================================================
-- 5. ADMIN_DB_METRICS (métricas do banco de dados)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_db_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interval_start TIMESTAMPTZ NOT NULL UNIQUE,
  active_connections INTEGER DEFAULT 0,
  max_connections INTEGER DEFAULT 100,
  db_size_mb NUMERIC(10,2) DEFAULT 0,
  avg_query_time_ms NUMERIC(10,2) DEFAULT 0,
  slow_query_count INTEGER DEFAULT 0,
  cpu_percent NUMERIC(5,2) DEFAULT 0,
  memory_percent NUMERIC(5,2) DEFAULT 0,
  disk_percent NUMERIC(5,2) DEFAULT 0,
  iops_read INTEGER DEFAULT 0,
  iops_write INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_db_metrics_interval ON admin_db_metrics(interval_start DESC);

-- =====================================================
-- 6. ADMIN_SECURITY_EVENTS (eventos de segurança)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL, -- critical, high, medium, low, info
  event_type TEXT NOT NULL, -- login_failed, unauthorized_access, suspicious_activity, etc
  source TEXT, -- IP address ou origem
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  description TEXT NOT NULL,
  metadata JSONB,
  status TEXT DEFAULT 'open', -- open, investigating, resolved, false_positive
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_security_events_timestamp ON admin_security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_security_events_severity ON admin_security_events(severity);
CREATE INDEX IF NOT EXISTS idx_admin_security_events_status ON admin_security_events(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_admin_security_events_user ON admin_security_events(user_id);

-- =====================================================
-- 7. ADMIN_SESSIONS (sessões ativas de usuários)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT, -- desktop, mobile, tablet, api
  device_name TEXT,
  browser TEXT,
  os TEXT,
  location_country TEXT,
  location_city TEXT,
  location_lat NUMERIC(10,6),
  location_lon NUMERIC(10,6),
  status TEXT DEFAULT 'active', -- active, terminated, expired
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terminated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_status ON admin_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_admin_sessions_last_activity ON admin_sessions(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_ip ON admin_sessions(ip_address);

-- =====================================================
-- 8. ADMIN_BACKUPS (histórico de backups)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_date DATE NOT NULL,
  backup_time TIME NOT NULL DEFAULT CURRENT_TIME,
  backup_type TEXT NOT NULL, -- full, incremental, differential
  status TEXT NOT NULL, -- success, failed, in_progress
  size_mb NUMERIC(10,2),
  duration_seconds INTEGER,
  backup_location TEXT, -- S3 path, etc
  retention_days INTEGER DEFAULT 30,
  notes TEXT,
  error_message TEXT,
  triggered_by TEXT DEFAULT 'automated', -- automated, manual
  triggered_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_backups_date ON admin_backups(backup_date DESC);
CREATE INDEX IF NOT EXISTS idx_admin_backups_status ON admin_backups(status);
CREATE INDEX IF NOT EXISTS idx_admin_backups_type ON admin_backups(backup_type);

-- =====================================================
-- 9. LLM_PROVIDERS (configuração de provedores LLM)
-- =====================================================

CREATE TABLE IF NOT EXISTS llm_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL UNIQUE, -- openai, anthropic, google, etc
  display_name TEXT NOT NULL,
  api_endpoint TEXT,
  api_key_encrypted TEXT, -- Criptografado
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Para fallback
  config JSONB, -- Configurações específicas do provider
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_providers_active ON llm_providers(is_active) WHERE is_active = true;

-- =====================================================
-- 10. LLM_MODELS (modelos LLM disponíveis)
-- =====================================================

CREATE TABLE IF NOT EXISTS llm_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES llm_providers(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL, -- gpt-4-turbo, claude-3-opus, etc
  display_name TEXT NOT NULL,
  description TEXT,
  context_window INTEGER, -- tokens
  max_output_tokens INTEGER,
  cost_per_1k_input NUMERIC(10,6), -- USD
  cost_per_1k_output NUMERIC(10,6), -- USD
  capabilities TEXT[], -- chat, embeddings, function_calling, vision
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, model_name)
);

CREATE INDEX IF NOT EXISTS idx_llm_models_provider ON llm_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_llm_models_active ON llm_models(is_active) WHERE is_active = true;
-- idx_llm_models_default removido - coluna is_default não existe na tabela existente

-- =====================================================
-- 11. LLM_USAGE (uso de LLM por equipe/contexto)
-- =====================================================

CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team TEXT, -- Consultoria, Suporte, etc
  context TEXT NOT NULL, -- whatsapp_bot, analyze, reports, etc
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_timestamp ON llm_usage(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_user ON llm_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_team ON llm_usage(team);
CREATE INDEX IF NOT EXISTS idx_llm_usage_context ON llm_usage(context);
CREATE INDEX IF NOT EXISTS idx_llm_usage_model ON llm_usage(provider, model);

-- Índice para agregações mensais (removido - DATE_TRUNC requer função IMMUTABLE)
-- Alternativa: Criar coluna computada ou usar índices separados
CREATE INDEX IF NOT EXISTS idx_llm_usage_timestamp_team ON llm_usage(timestamp, team);
CREATE INDEX IF NOT EXISTS idx_llm_usage_timestamp_context ON llm_usage(timestamp, context);

-- =====================================================
-- 12. ADMIN_VULNERABILITIES (vulnerabilidades detectadas)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL, -- critical, high, medium, low
  category TEXT, -- sql_injection, xss, authentication, etc
  affected_component TEXT,
  status TEXT DEFAULT 'open', -- open, investigating, mitigated, resolved, false_positive
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_by TEXT, -- automated, manual, external_report
  cvss_score NUMERIC(3,1),
  cve_id TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  remediation_steps TEXT,
  resolved_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_vulnerabilities_severity ON admin_vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_admin_vulnerabilities_status ON admin_vulnerabilities(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_admin_vulnerabilities_detected ON admin_vulnerabilities(detected_at DESC);

-- =====================================================
-- 13. WHATSAPP_CHAT_SESSIONS (sessões de conversa WhatsApp - renomeado para evitar conflito)
-- =====================================================
-- Nota: whatsapp_conversations já existe e armazena mensagens individuais

CREATE TABLE IF NOT EXISTS whatsapp_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  company_cnpj TEXT,
  status TEXT DEFAULT 'active', -- active, ended, archived
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  tags TEXT[],
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_chat_sessions_phone ON whatsapp_chat_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chat_sessions_status ON whatsapp_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chat_sessions_last_message ON whatsapp_chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chat_sessions_company ON whatsapp_chat_sessions(company_cnpj);

-- =====================================================
-- 14. WHATSAPP_SCHEDULED (mensagens agendadas)
-- =====================================================

CREATE TABLE IF NOT EXISTS whatsapp_scheduled (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  phone_number TEXT NOT NULL,
  company_cnpj TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, failed, cancelled
  message_content JSONB NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_scheduled_scheduled_for ON whatsapp_scheduled(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_whatsapp_scheduled_status ON whatsapp_scheduled(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_scheduled_company ON whatsapp_scheduled(company_cnpj);

-- =====================================================
-- 15. WHATSAPP_TEMPLATES (templates de mensagens)
-- =====================================================

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- marketing, utility, authentication
  language TEXT DEFAULT 'pt_BR',
  status TEXT DEFAULT 'active', -- active, inactive, pending_approval
  content JSONB NOT NULL, -- { header, body, footer, buttons }
  variables TEXT[], -- Lista de variáveis usadas
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category ON whatsapp_templates(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);

-- =====================================================
-- 16. DRE_UPLOADS (uploads de arquivos DRE)
-- =====================================================

CREATE TABLE IF NOT EXISTS dre_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_path TEXT NOT NULL, -- Storage path
  mime_type TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processing_job_id UUID,
  parsed_data JSONB,
  error_message TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dre_uploads_company ON dre_uploads(company_cnpj);
CREATE INDEX IF NOT EXISTS idx_dre_uploads_status ON dre_uploads(status);
CREATE INDEX IF NOT EXISTS idx_dre_uploads_uploaded_at ON dre_uploads(uploaded_at DESC);

-- =====================================================
-- 17. GROUP_ALIASES (grupos/holdings de empresas)
-- =====================================================

CREATE TABLE IF NOT EXISTS group_aliases (
  id TEXT PRIMARY KEY, -- holding-1, grupo-xyz
  label TEXT NOT NULL,
  description TEXT,
  color TEXT, -- Para UI
  icon TEXT, -- Para UI
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 18. GROUP_ALIAS_MEMBERS (CNPJs de cada grupo)
-- =====================================================
-- Nota: Tabela já existe com colunas group_id e company_id, adicionando colunas novas

CREATE TABLE IF NOT EXISTS group_alias_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_id TEXT REFERENCES group_aliases(id) ON DELETE CASCADE,
  company_cnpj TEXT,
  position INTEGER DEFAULT 0, -- Ordem de exibição
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adicionar colunas que faltam na tabela existente
ALTER TABLE group_alias_members ADD COLUMN IF NOT EXISTS alias_id TEXT;
ALTER TABLE group_alias_members ADD COLUMN IF NOT EXISTS company_cnpj TEXT;
ALTER TABLE group_alias_members ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_group_alias_members_alias ON group_alias_members(alias_id);
CREATE INDEX IF NOT EXISTS idx_group_alias_members_cnpj ON group_alias_members(company_cnpj);

-- =====================================================
-- VIEWS E FUNÇÕES AUXILIARES
-- =====================================================

-- View: usuários com seus acessos
CREATE OR REPLACE VIEW v_users_with_access AS
SELECT
  u.id,
  p.name,
  p.email,
  p.role,
  p.two_factor_enabled,
  p.avatar_url,
  u.created_at,
  u.last_sign_in_at,
  COALESCE(
    json_agg(
      json_build_object(
        'cnpj', uc.company_cnpj,
        'access_level', uc.access_level
      )
    ) FILTER (WHERE uc.company_cnpj IS NOT NULL),
    '[]'::json
  ) as companies
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_companies uc ON uc.user_id = u.id
GROUP BY u.id, p.name, p.email, p.role, p.two_factor_enabled, p.avatar_url, u.created_at, u.last_sign_in_at;

-- View: estatísticas de API por função
CREATE OR REPLACE VIEW v_api_metrics_summary AS
SELECT
  function_name,
  DATE_TRUNC('day', interval_start) as day,
  SUM(request_count) as total_requests,
  AVG(avg_latency_ms) as avg_latency,
  MAX(p95_latency_ms) as max_p95_latency,
  SUM(error_count) as total_errors,
  SUM(success_count) as total_successes,
  CASE
    WHEN SUM(request_count) > 0
    THEN ROUND((SUM(error_count)::numeric / SUM(request_count)::numeric * 100), 2)
    ELSE 0
  END as error_rate_percent
FROM admin_api_metrics
GROUP BY function_name, DATE_TRUNC('day', interval_start);

-- View: custos LLM por mês
CREATE OR REPLACE VIEW v_llm_usage_monthly AS
SELECT
  DATE_TRUNC('month', timestamp) as month,
  team,
  context,
  provider,
  model,
  SUM(tokens_input) as total_tokens_input,
  SUM(tokens_output) as total_tokens_output,
  SUM(cost_usd) as total_cost_usd,
  COUNT(*) as request_count,
  AVG(latency_ms) as avg_latency_ms
FROM llm_usage
GROUP BY DATE_TRUNC('month', timestamp), team, context, provider, model;

-- Função: obter empresas de um usuário
CREATE OR REPLACE FUNCTION get_user_companies(p_user_id UUID)
RETURNS TABLE (
  cnpj TEXT,
  name TEXT,
  access_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.company_cnpj,
    c.name,
    uc.access_level
  FROM user_companies uc
  LEFT JOIN clients c ON c.cnpj = uc.company_cnpj
  WHERE uc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: verificar acesso de usuário a empresa
CREATE OR REPLACE FUNCTION check_user_access(p_user_id UUID, p_cnpj TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_has_access BOOLEAN;
BEGIN
  -- Admin tem acesso a tudo
  SELECT role INTO v_role FROM profiles WHERE id = p_user_id;
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Verificar acesso específico
  SELECT EXISTS(
    SELECT 1 FROM user_companies
    WHERE user_id = p_user_id AND company_cnpj = p_cnpj
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES (Row Level Security)
-- =====================================================

-- Habilitar RLS nas tabelas sensíveis
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dre_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem ver/editar seu próprio perfil
DROP POLICY IF EXISTS profiles_users_own ON profiles;
CREATE POLICY profiles_users_own ON profiles
  FOR ALL USING (auth.uid() = id);

-- Policy: admins podem ver todos os perfis
DROP POLICY IF EXISTS profiles_admins_all ON profiles;
CREATE POLICY profiles_admins_all ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: usuários veem suas próprias companies
DROP POLICY IF EXISTS user_companies_own ON user_companies;
CREATE POLICY user_companies_own ON user_companies
  FOR SELECT USING (user_id = auth.uid());

-- Policy: usuários veem suas próprias API keys
DROP POLICY IF EXISTS user_api_keys_own ON user_api_keys;
CREATE POLICY user_api_keys_own ON user_api_keys
  FOR ALL USING (user_id = auth.uid());

-- Policy: usuários veem suas próprias sessões
DROP POLICY IF EXISTS admin_sessions_own ON admin_sessions;
CREATE POLICY admin_sessions_own ON admin_sessions
  FOR SELECT USING (user_id = auth.uid());

-- Policy: uploads - usuário vê seus próprios
DROP POLICY IF EXISTS dre_uploads_own ON dre_uploads;
CREATE POLICY dre_uploads_own ON dre_uploads
  FOR SELECT USING (uploaded_by = auth.uid());

-- =====================================================
-- SEED INICIAL (dados básicos)
-- =====================================================

-- Inserir providers LLM padrão (usando base_url que é a coluna existente)
INSERT INTO llm_providers (provider_name, display_name, base_url, is_active)
VALUES
  ('openai', 'OpenAI', 'https://api.openai.com/v1', true),
  ('anthropic', 'Anthropic', 'https://api.anthropic.com/v1', true)
ON CONFLICT (provider_name) DO NOTHING;

-- Inserir modelos LLM padrão (usando schema existente: fast, reasoning, complex)
WITH openai_provider AS (
  SELECT id FROM llm_providers WHERE provider_name = 'openai'
),
anthropic_provider AS (
  SELECT id FROM llm_providers WHERE provider_name = 'anthropic'
)
INSERT INTO llm_models (provider_id, model_name, display_name, model_type, context_window, cost_per_1k_input, cost_per_1k_output, supports_streaming, is_active)
SELECT id, 'gpt-4-turbo', 'GPT-4 Turbo', 'reasoning', 128000, 0.01, 0.03, true, true FROM openai_provider
UNION ALL
SELECT id, 'gpt-4o-mini', 'GPT-4o Mini', 'fast', 128000, 0.000150, 0.000600, true, true FROM openai_provider
UNION ALL
SELECT id, 'claude-3-5-sonnet', 'Claude 3.5 Sonnet', 'complex', 200000, 0.003, 0.015, true, true FROM anthropic_provider
UNION ALL
SELECT id, 'claude-3-5-haiku', 'Claude 3.5 Haiku', 'fast', 200000, 0.001, 0.005, true, true FROM anthropic_provider
ON CONFLICT (provider_id, model_name) DO NOTHING;

-- Inserir grupo de exemplo
INSERT INTO group_aliases (id, label, description, color)
VALUES ('holding-exemplo', 'Holding Exemplo', 'Grupo de empresas de exemplo', '#3B82F6')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
-- FIM DA MIGRATION 009
-- =====================================================

-- Verificação
SELECT 'Migration 009 executada com sucesso!' as status;
SELECT COUNT(*) as total_tabelas FROM information_schema.tables WHERE table_schema = 'public';
