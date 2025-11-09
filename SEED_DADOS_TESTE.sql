-- =====================================================
-- SEED DATA: Dados de Teste para Tabelas Vazias
-- =====================================================
-- Problema: Tabelas críticas sem dados
-- Solução: Popular com dados fictícios para testes
-- =====================================================

-- TRANSACTION 1: Popular transações de teste
BEGIN;

-- Limpar dados existentes (cuidado em produção!)
-- TRUNCATE transactions;

INSERT INTO transactions (
  company_cnpj,
  transaction_id,
  transaction_date,
  description,
  amount,
  type,
  category,
  account_id,
  provider,
  metadata
)
SELECT
  '12.345.678/0001-90' AS company_cnpj,
  CONCAT('seed-', LPAD((row_number() OVER (ORDER BY gs))::text, 4, '0')) AS transaction_id,
  CURRENT_DATE - (((row_number() OVER (ORDER BY gs)) % 30)::int) AS transaction_date,
  CASE
    WHEN random() < 0.25 THEN 'Recebimento POS'
    WHEN random() < 0.50 THEN 'Pagamento de fornecedor'
    WHEN random() < 0.75 THEN 'Taxa bancária'
    ELSE 'Transferência interna'
  END AS description,
  ROUND((random() * 50000 + 100)::numeric, 2) AS amount,
  CASE WHEN random() < 0.5 THEN 'debit' ELSE 'credit' END AS type,
  CASE
    WHEN random() < 0.33 THEN 'operacional'
    WHEN random() < 0.66 THEN 'financeiro'
    ELSE 'impostos'
  END AS category,
  CONCAT('ACC-SEED-', ((row_number() OVER (ORDER BY gs)) % 3) + 1) AS account_id,
  'seed-script' AS provider,
  jsonb_build_object(
    'source', 'seed',
    'idx', row_number() OVER (ORDER BY gs),
    'generated_at', CURRENT_TIMESTAMP
  ) AS metadata
FROM generate_series(1, 50) AS gs;

COMMIT;

-- TRANSACTION 2: Popular omie_config
BEGIN;

-- Limpar dados existentes
-- TRUNCATE omie_config;

INSERT INTO omie_config (
  company_cnpj,
  api_key,
  app_key,
  is_active,
  updated_at
)
VALUES (
  '12.345.678/0001-90',
  'omie-api-seed-123',
  'omie-app-seed-123',
  true,
  CURRENT_TIMESTAMP - INTERVAL '24 hours'
)
ON CONFLICT (company_cnpj) DO UPDATE SET
  api_key = EXCLUDED.api_key,
  app_key = EXCLUDED.app_key,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

COMMIT;

-- TRANSACTION 3: Popular f360_config
BEGIN;

-- Limpar dados existentes
-- TRUNCATE f360_config;

INSERT INTO f360_config (
  company_cnpj,
  api_key,
  is_active,
  updated_at
)
VALUES (
  '12.345.678/0001-90',
  'f360-api-seed-456',
  true,
  CURRENT_TIMESTAMP - INTERVAL '12 hours'
)
ON CONFLICT (company_cnpj) DO UPDATE SET
  api_key = EXCLUDED.api_key,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

COMMIT;

-- TRANSACTION 4: Popular daily_snapshots
BEGIN;

-- Limpar dados existentes (não truncar, apenas últimos 90 dias)
-- DELETE FROM daily_snapshots WHERE snapshot_date > CURRENT_DATE - INTERVAL '90 days';

-- Inserir snapshots de saldo dos últimos 30 dias
INSERT INTO daily_snapshots (
  company_cnpj,
  snapshot_date,
  cash_balance,
  available_for_payments,
  runway_days,
  monthly_burn,
  revenue_mtd,
  ebitda_mtd,
  ebitda_margin,
  overdue_payables_count,
  overdue_payables_amount,
  overdue_receivables_count,
  overdue_receivables_amount
)
SELECT 
  '12.345.678/0001-90' as company_cnpj,
  CURRENT_DATE - (row_number() OVER (ORDER BY generate_series))::int as snapshot_date,
  ROUND((random() * 500000 + 100000)::numeric, 2) as cash_balance,
  ROUND((random() * 400000 + 50000)::numeric, 2) as available_for_payments,
  (10 + (random() * 80))::int as runway_days,
  ROUND((random() * 250000 + 50000)::numeric, 2) as monthly_burn,
  ROUND((random() * 600000 + 120000)::numeric, 2) as revenue_mtd,
  ROUND((random() * 200000 + 40000)::numeric, 2) as ebitda_mtd,
  ROUND((random() * 0.25 + 0.05)::numeric, 4) as ebitda_margin,
  (random() * 10)::int as overdue_payables_count,
  ROUND((random() * 80000)::numeric, 2) as overdue_payables_amount,
  (random() * 8)::int as overdue_receivables_count,
  ROUND((random() * 60000)::numeric, 2) as overdue_receivables_amount
FROM generate_series(1, 30)
ON CONFLICT (company_cnpj, snapshot_date) DO UPDATE SET
  cash_balance = EXCLUDED.cash_balance,
  available_for_payments = EXCLUDED.available_for_payments,
  runway_days = EXCLUDED.runway_days,
  monthly_burn = EXCLUDED.monthly_burn,
  revenue_mtd = EXCLUDED.revenue_mtd,
  ebitda_mtd = EXCLUDED.ebitda_mtd,
  ebitda_margin = EXCLUDED.ebitda_margin,
  overdue_payables_count = EXCLUDED.overdue_payables_count,
  overdue_payables_amount = EXCLUDED.overdue_payables_amount,
  overdue_receivables_count = EXCLUDED.overdue_receivables_count,
  overdue_receivables_amount = EXCLUDED.overdue_receivables_amount;

COMMIT;

-- VERIFICAÇÃO FINAL
SELECT 
  (SELECT COUNT(*) FROM transactions) as total_transactions,
  (SELECT COUNT(*) FROM omie_config WHERE is_active = true) as active_omie,
  (SELECT COUNT(*) FROM f360_config WHERE is_active = true) as active_f360,
  (SELECT COUNT(*) FROM daily_snapshots) as total_snapshots;


