-- Migration 008: Tabelas para ERP Sync (OMIE e F360)
-- Data: 2025-11-06
-- Descrição: Cria tabelas necessárias para sincronização de ERPs via N8N

-- =====================================================
-- 1. TABELA: sync_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'invoices', 'accounts', 'transactions'
  provider TEXT NOT NULL, -- 'OMIE', 'F360'
  company_cnpj TEXT NOT NULL,
  records_synced INTEGER DEFAULT 0,
  status TEXT NOT NULL, -- 'success', 'error', 'no_changes'
  message TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_company ON sync_logs(company_cnpj);
CREATE INDEX idx_sync_logs_provider ON sync_logs(provider);
CREATE INDEX idx_sync_logs_synced_at ON sync_logs(synced_at DESC);

COMMENT ON TABLE sync_logs IS 'Logs de sincronização de ERPs (OMIE, F360)';

-- =====================================================
-- 2. TABELA: omie_config
-- =====================================================
CREATE TABLE IF NOT EXISTS omie_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  app_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_omie_config_active ON omie_config(is_active) WHERE is_active = true;

COMMENT ON TABLE omie_config IS 'Configurações de API do OMIE por empresa';

-- =====================================================
-- 3. TABELA: omie_invoices
-- =====================================================
CREATE TABLE IF NOT EXISTS omie_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  invoice_id TEXT NOT NULL UNIQUE, -- OMIE_{codigo_lancamento}
  invoice_number TEXT,
  provider TEXT NOT NULL DEFAULT 'OMIE',
  description TEXT,
  issue_date DATE,
  due_date DATE NOT NULL,
  payment_date DATE,
  total_value DECIMAL(15,2) NOT NULL,
  paid_value DECIMAL(15,2) DEFAULT 0,
  category TEXT,
  status TEXT NOT NULL, -- 'pending', 'paid', 'overdue'
  metadata JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_omie_invoices_company ON omie_invoices(company_cnpj);
CREATE INDEX idx_omie_invoices_status ON omie_invoices(status);
CREATE INDEX idx_omie_invoices_due_date ON omie_invoices(due_date);
CREATE INDEX idx_omie_invoices_synced_at ON omie_invoices(synced_at DESC);

COMMENT ON TABLE omie_invoices IS 'Faturas sincronizadas do OMIE';

-- =====================================================
-- 4. TABELA: f360_config
-- =====================================================
CREATE TABLE IF NOT EXISTS f360_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_f360_config_active ON f360_config(is_active) WHERE is_active = true;

COMMENT ON TABLE f360_config IS 'Configurações de API do F360 por empresa';

-- =====================================================
-- 5. TABELA: f360_accounts
-- =====================================================
CREATE TABLE IF NOT EXISTS f360_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  account_id TEXT NOT NULL UNIQUE, -- F360_{id}
  account_name TEXT NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  account_type TEXT, -- 'checking', 'savings', 'investment'
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_f360_accounts_company ON f360_accounts(company_cnpj);
CREATE INDEX idx_f360_accounts_active ON f360_accounts(is_active) WHERE is_active = true;
CREATE INDEX idx_f360_accounts_synced_at ON f360_accounts(synced_at DESC);

COMMENT ON TABLE f360_accounts IS 'Contas bancárias sincronizadas do F360';

-- =====================================================
-- 6. TABELA: transactions (básica para dashboard)
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  type TEXT NOT NULL, -- 'income', 'expense'
  category TEXT,
  account_id TEXT,
  provider TEXT, -- 'OMIE', 'F360', 'MANUAL'
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_cnpj, transaction_id, provider)
);

CREATE INDEX idx_transactions_company ON transactions(company_cnpj);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);

COMMENT ON TABLE transactions IS 'Transações financeiras consolidadas de todos os ERPs';

-- =====================================================
-- 7. TABELA: conversations (WhatsApp Bot)
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  company_cnpj TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'ended'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(phone_number, company_cnpj)
);

CREATE INDEX idx_conversations_phone ON conversations(phone_number);
CREATE INDEX idx_conversations_company ON conversations(company_cnpj);
CREATE INDEX idx_conversations_status ON conversations(status);

COMMENT ON TABLE conversations IS 'Conversas do WhatsApp Bot por empresa';

-- =====================================================
-- 8. VIEW: v_kpi_monthly_enriched (para Dashboard Cards)
-- =====================================================
CREATE OR REPLACE VIEW v_kpi_monthly_enriched AS
SELECT
  company_cnpj,
  DATE_TRUNC('month', transaction_date) AS month,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS revenue,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS profit
FROM transactions
GROUP BY company_cnpj, DATE_TRUNC('month', transaction_date);

COMMENT ON VIEW v_kpi_monthly_enriched IS 'KPIs mensais para dashboard cards';

-- =====================================================
-- Grants (se necessário)
-- =====================================================
-- GRANT ALL ON sync_logs TO authenticated;
-- GRANT ALL ON omie_config TO authenticated;
-- GRANT ALL ON omie_invoices TO authenticated;
-- GRANT ALL ON f360_config TO authenticated;
-- GRANT ALL ON f360_accounts TO authenticated;
-- GRANT ALL ON transactions TO authenticated;
-- GRANT ALL ON conversations TO authenticated;
