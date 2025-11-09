-- ========================================
-- FINANCE ORÁCULO - SETUP RÁPIDO
-- ========================================
-- Execute este arquivo ANTES da migração 001_bootstrap.sql
-- Copie e cole no SQL Editor do Supabase

-- Configurar a chave KMS para criptografia
select set_config('app.kms', 'B5b0dcf500@#', false);

-- Configurar Service Key
select set_config('app.service_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cm16bWNvc2xvbXR6a3pnc2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MjYyMywiZXhwIjoyMDc3MzI4NjIzfQ.716RfI9V2Vv3nGcx5rK4epnLddUUdFT3-doegfrXcmk', false);

-- Configurar URLs das Edge Functions
select set_config('app.sync_f360_url', 'https://xzrmzmcoslomtzkzgskn.functions.supabase.co/sync-f360', false);
select set_config('app.sync_omie_url', 'https://xzrmzmcoslomtzkzgskn.functions.supabase.co/sync-omie', false);

-- Verificar configurações
select
  current_setting('app.kms', true) as kms_configured,
  current_setting('app.service_key', true) != '' as service_key_configured,
  current_setting('app.sync_f360_url', true) as f360_url,
  current_setting('app.sync_omie_url', true) as omie_url;

-- Mensagem de sucesso
select 'Configuração inicial completa! Agora execute o arquivo migrations/001_bootstrap.sql' as message;
