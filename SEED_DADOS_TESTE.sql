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

-- Inserir 50 transações de teste dos últimos 30 dias
INSERT INTO transactions (
  company_cnpj,
  bank_account_id,
  transaction_date,
  description,
  amount,
  transaction_type,
  balance_after,
  bank_code,
  created_at
)
SELECT 
  '12.345.678/0001-90' as company_cnpj,
  'acc-123' as bank_account_id,
  CURRENT_DATE - (row_number() OVER (ORDER BY generate_series) % 30) as transaction_date,
  CASE 
    WHEN random() < 0.5 THEN 'Transferência Enviada'
    WHEN random() < 0.7 THEN 'Depósito Recebido'
    WHEN random() < 0.9 THEN 'Pagamento de Boleto'
    ELSE 'Taxa Bancária'
  END as description,
  (RANDOM() * 50000)::int as amount,
  CASE 
    WHEN random() < 0.5 THEN 'debit'
    ELSE 'credit'
  END as transaction_type,
  (RANDOM() * 500000)::int as balance_after,
  '001' as bank_code,
  CURRENT_TIMESTAMP
FROM generate_series(1, 50);

COMMIT;

-- TRANSACTION 2: Popular omie_config
BEGIN;

-- Limpar dados existentes
-- TRUNCATE omie_config;

-- Inserir configuração de teste do OMIE
INSERT INTO omie_config (
  client_id,
  client_name,
  app_id,
  app_key,
  is_active,
  last_sync_at,
  created_at
)
VALUES (
  'omie-client-123',
  'OMIE - Teste',
  'omie_app_12345',
  'omie_key_encrypted',
  true,
  CURRENT_TIMESTAMP - INTERVAL '24 hours',
  CURRENT_TIMESTAMP
)
ON CONFLICT (client_id) DO UPDATE SET
  last_sync_at = CURRENT_TIMESTAMP - INTERVAL '24 hours';

COMMIT;

-- TRANSACTION 3: Popular f360_config
BEGIN;

-- Limpar dados existentes
-- TRUNCATE f360_config;

-- Inserir configuração de teste do F360
INSERT INTO f360_config (
  client_id,
  client_name,
  api_token,
  is_active,
  last_sync_at,
  created_at
)
VALUES (
  'f360-client-456',
  'F360 - Teste',
  'f360_token_encrypted',
  true,
  CURRENT_TIMESTAMP - INTERVAL '24 hours',
  CURRENT_TIMESTAMP
)
ON CONFLICT (client_id) DO UPDATE SET
  last_sync_at = CURRENT_TIMESTAMP - INTERVAL '24 hours';

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
  run way_days,
  revenue_today,
  expenses_today,
  created_at
)
SELECT 
  '12.345.678/0001-90' as company_cnpj,
  CURRENT_DATE - (row_number() OVER (ORDER BY generate_series))::int as snapshot_date,
  (RANDOM() * 500000 + 100000)::int as cash_balance,
  (RANDOM() * 400000 + 50000)::int as available_for_payments,
  (RANDOM() * 90 + 10)::int as runway_days,
  (RANDOM() * 50000)::int as revenue_today,
  (RANDOM() * 20000)::int as expenses_today,
  CURRENT_TIMESTAMP
FROM generate_series(1, 30)
ON CONFLICT (company_cnpj, snapshot_date) DO UPDATE SET
  cash_balance = EXCLUDED.cash_balance,
  available_for_payments = EXCLUDED.available_for_payments,
  runway_days = EXCLUDED.runway_days,
  revenue_today = EXCLUDED.revenue_today,
  expenses_today = EXCLUDED.expenses_today;

COMMIT;

-- VERIFICAÇÃO FINAL
SELECT 
  (SELECT COUNT(*) FROM transactions) as total_transactions,
  (SELECT COUNT(*) FROM omie_config WHERE is_active = true) as active_omie,
  (SELECT COUNT(*) FROM f360_config WHERE is_active = true) as active_f360,
  (SELECT COUNT(*) FROM daily_snapshots) as total_snapshots;


