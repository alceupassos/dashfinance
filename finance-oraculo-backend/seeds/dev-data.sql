-- =====================================================
-- SEEDS: Dados Sintéticos para Desenvolvimento
-- Finance Oráculo Backend
-- =====================================================

BEGIN;

-- Limpar dados existentes (CUIDADO! Apenas em dev)
-- TRUNCATE admin_api_metrics, admin_db_metrics, admin_security_events,
--   admin_sessions, admin_backups, admin_vulnerabilities,
--   llm_usage, whatsapp_conversations, whatsapp_scheduled,
--   dre_uploads, dashboard_cards CASCADE;

-- =====================================================
-- 1. ADMIN_API_METRICS (métricas de API)
-- =====================================================

INSERT INTO admin_api_metrics (interval_start, interval_end, function_name, request_count, avg_latency_ms, p50_latency_ms, p95_latency_ms, p99_latency_ms, error_count, success_count, request_bytes, response_bytes)
SELECT
  NOW() - (i || ' hours')::INTERVAL as interval_start,
  NOW() - ((i - 1) || ' hours')::INTERVAL as interval_end,
  CASE (i % 5)
    WHEN 0 THEN 'auth-login'
    WHEN 1 THEN 'kpi-monthly'
    WHEN 2 THEN 'dashboard-metrics'
    WHEN 3 THEN 'sync-f360'
    ELSE 'sync-omie'
  END as function_name,
  (RANDOM() * 100 + 50)::INTEGER as request_count,
  (RANDOM() * 200 + 100)::NUMERIC(10,2) as avg_latency_ms,
  (RANDOM() * 150 + 80)::NUMERIC(10,2) as p50_latency_ms,
  (RANDOM() * 400 + 200)::NUMERIC(10,2) as p95_latency_ms,
  (RANDOM() * 800 + 400)::NUMERIC(10,2) as p99_latency_ms,
  (RANDOM() * 5)::INTEGER as error_count,
  (RANDOM() * 100 + 45)::INTEGER as success_count,
  (RANDOM() * 50000 + 10000)::BIGINT as request_bytes,
  (RANDOM() * 100000 + 20000)::BIGINT as response_bytes
FROM generate_series(1, 72) as i; -- Últimas 72 horas

-- =====================================================
-- 2. ADMIN_DB_METRICS (métricas do banco)
-- =====================================================

INSERT INTO admin_db_metrics (interval_start, active_connections, max_connections, db_size_mb, avg_query_time_ms, slow_query_count, cpu_percent, memory_percent, disk_percent, iops_read, iops_write)
SELECT
  NOW() - (i || ' hours')::INTERVAL as interval_start,
  (RANDOM() * 20 + 5)::INTEGER as active_connections,
  100 as max_connections,
  (2000 + RANDOM() * 500)::NUMERIC(10,2) as db_size_mb,
  (RANDOM() * 30 + 10)::NUMERIC(10,2) as avg_query_time_ms,
  (RANDOM() * 3)::INTEGER as slow_query_count,
  (RANDOM() * 60 + 20)::NUMERIC(5,2) as cpu_percent,
  (RANDOM() * 30 + 50)::NUMERIC(5,2) as memory_percent,
  (RANDOM() * 15 + 60)::NUMERIC(5,2) as disk_percent,
  (RANDOM() * 1000 + 500)::INTEGER as iops_read,
  (RANDOM() * 500 + 100)::INTEGER as iops_write
FROM generate_series(1, 168) as i; -- Última semana

-- =====================================================
-- 3. ADMIN_SECURITY_EVENTS (eventos de segurança)
-- =====================================================

INSERT INTO admin_security_events (timestamp, severity, event_type, source, description, status)
VALUES
  (NOW() - INTERVAL '2 hours', 'critical', 'unauthorized_access', '192.168.1.100', 'Tentativa de acesso não autorizado ao endpoint /admin/users', 'open'),
  (NOW() - INTERVAL '5 hours', 'high', 'suspicious_activity', '10.0.0.50', 'Múltiplas tentativas de login falhadas em curto período', 'investigating'),
  (NOW() - INTERVAL '1 day', 'medium', 'login_failed', '203.45.67.89', 'Login falhou para usuário admin@test.com', 'resolved'),
  (NOW() - INTERVAL '2 days', 'info', 'login_success', '192.168.1.50', 'Login bem-sucedido para alceu@ifin.app.br', 'resolved'),
  (NOW() - INTERVAL '3 days', 'low', 'api_key_created', '192.168.1.50', 'Nova API key criada: sk_test...', 'resolved');

-- =====================================================
-- 4. ADMIN_SESSIONS (sessões ativas)
-- =====================================================
-- COMENTADO: Requer user_id válido de auth.users
-- Para popular: criar usuários primeiro e depois inserir sessões com IDs reais

-- INSERT INTO admin_sessions (user_id, user_email, ip_address, user_agent, device_type, browser, os, location_country, location_city, status, last_activity)
-- SELECT
--   gen_random_uuid(),
--   'user' || i || '@ifin.app.br',
--   '192.168.1.' || (100 + i)::TEXT,
--   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
--   CASE (i % 3) WHEN 0 THEN 'desktop' WHEN 1 THEN 'mobile' ELSE 'tablet' END,
--   CASE (i % 4) WHEN 0 THEN 'Chrome' WHEN 1 THEN 'Firefox' WHEN 2 THEN 'Safari' ELSE 'Edge' END,
--   CASE (i % 3) WHEN 0 THEN 'Windows' WHEN 1 THEN 'macOS' ELSE 'Linux' END,
--   'BR',
--   CASE (i % 5) WHEN 0 THEN 'São Paulo' WHEN 1 THEN 'Rio de Janeiro' WHEN 2 THEN 'Brasília' WHEN 3 THEN 'Curitiba' ELSE 'Belo Horizonte' END,
--   CASE WHEN i < 8 THEN 'active' ELSE 'terminated' END,
--   NOW() - ((i * 30) || ' minutes')::INTERVAL
-- FROM generate_series(1, 10) as i;

-- =====================================================
-- 5. ADMIN_BACKUPS (histórico de backups)
-- =====================================================

INSERT INTO admin_backups (backup_date, backup_time, backup_type, status, size_mb, duration_seconds, backup_location, notes, triggered_by)
SELECT
  CURRENT_DATE - i as backup_date,
  '03:00:00'::TIME as backup_time,
  CASE (i % 7) WHEN 0 THEN 'full' ELSE 'incremental' END as backup_type,
  CASE WHEN i % 15 = 0 THEN 'failed' ELSE 'success' END as status,
  (RANDOM() * 1000 + 200)::NUMERIC(10,2) as size_mb,
  (RANDOM() * 300 + 60)::INTEGER as duration_seconds,
  's3://finance-backups/backup-' || (CURRENT_DATE - i)::TEXT || '.tar.gz',
  'Automated nightly backup',
  'automated'
FROM generate_series(1, 30) as i;

-- =====================================================
-- 6. ADMIN_VULNERABILITIES (vulnerabilidades)
-- =====================================================

INSERT INTO admin_vulnerabilities (title, description, severity, category, affected_component, status, detected_at, detected_by, cvss_score)
VALUES
  ('SQL Injection em filtro de relatórios', 'Possível SQL injection no endpoint /reports quando filtro não sanitizado', 'critical', 'sql_injection', 'reports endpoint', 'open', NOW() - INTERVAL '1 day', 'automated', 9.1),
  ('XSS em campo de comentários', 'Script tag não escapado em comentários de dashboard', 'high', 'xss', 'dashboard comments', 'investigating', NOW() - INTERVAL '3 days', 'manual', 7.5),
  ('Senha fraca aceita', 'Sistema aceita senhas com menos de 8 caracteres', 'medium', 'authentication', 'auth system', 'mitigated', NOW() - INTERVAL '1 week', 'external_report', 5.2);

-- =====================================================
-- 7. LLM_USAGE (uso de LLM)
-- =====================================================

INSERT INTO llm_usage (timestamp, team, context, provider, model, tokens_input, tokens_output, cost_usd, latency_ms, success)
SELECT
  NOW() - ((i * 2) || ' hours')::INTERVAL as timestamp,
  CASE (i % 4) WHEN 0 THEN 'Consultoria' WHEN 1 THEN 'Suporte' WHEN 2 THEN 'Desenvolvimento' ELSE 'Vendas' END as team,
  CASE (i % 5) WHEN 0 THEN 'whatsapp_bot' WHEN 1 THEN 'analyze' WHEN 2 THEN 'reports' WHEN 3 THEN 'support' ELSE 'chatbot' END as context,
  CASE (i % 2) WHEN 0 THEN 'openai' ELSE 'anthropic' END as provider,
  CASE (i % 3) WHEN 0 THEN 'gpt-4o-mini' WHEN 1 THEN 'claude-3-5-haiku' ELSE 'gpt-4-turbo' END as model,
  (RANDOM() * 5000 + 1000)::INTEGER as tokens_input,
  (RANDOM() * 3000 + 500)::INTEGER as tokens_output,
  (RANDOM() * 0.05 + 0.001)::NUMERIC(10,6) as cost_usd,
  (RANDOM() * 2000 + 500)::INTEGER as latency_ms,
  RANDOM() > 0.05 as success
FROM generate_series(1, 200) as i;

-- =====================================================
-- 8. WHATSAPP_CHAT_SESSIONS (sessões de conversa WhatsApp)
-- =====================================================
-- Nota: Mudado de whatsapp_conversations para whatsapp_chat_sessions

INSERT INTO whatsapp_chat_sessions (phone_number, contact_name, company_cnpj, status, last_message_text, last_message_at, unread_count)
VALUES
  ('5511999887766', 'João Silva', '12.345.678/0001-90', 'active', 'Qual meu saldo atual?', NOW() - INTERVAL '30 minutes', 2),
  ('5511988776655', 'Maria Santos', '98.765.432/0001-10', 'active', 'Preciso do relatório de ontem', NOW() - INTERVAL '1 hour', 1),
  ('5511977665544', 'Pedro Oliveira', '12.345.678/0001-90', 'ended', 'Obrigado!', NOW() - INTERVAL '2 days', 0),
  ('5511966554433', 'Ana Costa', '45.678.901/0001-23', 'active', 'Quais são as despesas do mês?', NOW() - INTERVAL '15 minutes', 3);

-- =====================================================
-- 9. WHATSAPP_SCHEDULED (mensagens agendadas)
-- =====================================================

INSERT INTO whatsapp_scheduled (phone_number, company_cnpj, scheduled_for, status, message_content)
VALUES
  ('5511999887766', '12.345.678/0001-90', NOW() + INTERVAL '2 hours', 'pending', '{"text": "Lembrete: reunião financeira às 15h"}'),
  ('5511988776655', '98.765.432/0001-10', NOW() + INTERVAL '1 day', 'pending', '{"text": "Seu relatório mensal está disponível"}'),
  ('5511977665544', '12.345.678/0001-90', NOW() - INTERVAL '1 hour', 'sent', '{"text": "Mensagem de teste enviada"}');

-- =====================================================
-- 10. WHATSAPP_TEMPLATES (templates)
-- =====================================================

INSERT INTO whatsapp_templates (name, category, status, content)
VALUES
  ('relatorio_mensal', 'utility', 'active', '{"header": "Relatório Mensal", "body": "Seu relatório financeiro de {{month}} está disponível. Receitas: R$ {{revenue}}, Despesas: R$ {{expenses}}", "footer": "Finance Oráculo"}'),
  ('alerta_despesa', 'utility', 'active', '{"header": "Alerta de Despesa", "body": "Despesa acima do limite: {{category}} - R$ {{amount}}", "footer": "Finance Oráculo"}'),
  ('boas_vindas', 'marketing', 'active', '{"header": "Bem-vindo!", "body": "Olá {{name}}! Seja bem-vindo ao Finance Oráculo. Como posso ajudar?", "footer": "Finance Oráculo"}');

-- =====================================================
-- 11. DRE_UPLOADS (uploads de DRE)
-- =====================================================

INSERT INTO dre_uploads (company_cnpj, file_name, file_size_bytes, file_path, mime_type, status, uploaded_at)
VALUES
  ('12.345.678/0001-90', 'dre_janeiro_2025.xlsx', 102400, 'dre_uploads/12345678000190/dre_janeiro_2025.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'completed', NOW() - INTERVAL '2 days'),
  ('98.765.432/0001-10', 'dre_dezembro_2024.xlsx', 98304, 'dre_uploads/98765432000110/dre_dezembro_2024.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'completed', NOW() - INTERVAL '1 week'),
  ('12.345.678/0001-90', 'dre_fevereiro_2025.xlsx', 105600, 'dre_uploads/12345678000190/dre_fevereiro_2025.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'processing', NOW() - INTERVAL '1 hour');

-- =====================================================
-- 12. DASHBOARD_CARDS (cards pré-calculados)
-- =====================================================

INSERT INTO dashboard_cards (company_cnpj, card_type, card_data, calculated_at, expires_at)
SELECT
  '12.345.678/0001-90',
  card_type,
  jsonb_build_object(
    'value', (RANDOM() * 100000 + 10000)::INTEGER,
    'label', card_type,
    'formatted', 'R$ ' || (RANDOM() * 100000 + 10000)::INTEGER::TEXT,
    'delta', (RANDOM() * 20 - 10)::NUMERIC(5,2),
    'status', 'ok'
  ),
  NOW(),
  NOW() + INTERVAL '5 minutes'
FROM (
  VALUES
    ('total_caixa'),
    ('disponivel'),
    ('receitas_mes'),
    ('despesas_mes'),
    ('runway'),
    ('burn_rate')
) AS t(card_type);

-- =====================================================
-- 13. GROUP_ALIASES & MEMBERS (grupos de empresas)
-- =====================================================

INSERT INTO group_aliases (id, label, description, color)
VALUES
  ('holding-tech', 'Holding Tech', 'Empresas de tecnologia', '#3B82F6'),
  ('holding-varejo', 'Holding Varejo', 'Empresas de varejo', '#10B981'),
  ('holding-servicos', 'Holding Serviços', 'Empresas de serviços', '#F59E0B')
ON CONFLICT (id) DO NOTHING;

-- Note: Inserir members requer CNPJs reais da tabela clients
-- Isso deve ser feito após popular clientes

COMMIT;

-- =====================================================
-- VALIDAÇÃO
-- =====================================================

SELECT
  'admin_api_metrics' as tabela,
  COUNT(*) as registros
FROM admin_api_metrics

UNION ALL

SELECT
  'admin_db_metrics',
  COUNT(*)
FROM admin_db_metrics

UNION ALL

SELECT
  'admin_security_events',
  COUNT(*)
FROM admin_security_events

UNION ALL

SELECT
  'admin_sessions',
  COUNT(*)
FROM admin_sessions

UNION ALL

SELECT
  'admin_backups',
  COUNT(*)
FROM admin_backups

UNION ALL

SELECT
  'llm_usage',
  COUNT(*)
FROM llm_usage

UNION ALL

SELECT
  'whatsapp_chat_sessions',
  COUNT(*)
FROM whatsapp_chat_sessions

ORDER BY tabela;

-- =====================================================
-- FIM DOS SEEDS
-- =====================================================
