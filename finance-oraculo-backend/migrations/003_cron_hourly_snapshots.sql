-- ================================================
-- MIGRATION 003: Hourly Snapshot Update Cron Job
-- ================================================

-- Job para atualizar snapshots a cada hora
SELECT cron.schedule(
  'update_snapshots_hourly',
  '0 * * * *', -- Todo início de hora
  $$
    SELECT fn_calculate_daily_snapshot(company_cnpj, CURRENT_DATE)
    FROM client_notifications_config
    WHERE enabled = true;
  $$
);

-- Job para processar mensagens agendadas a cada 10 minutos
SELECT cron.schedule(
  'process_scheduled_messages_10min',
  '*/10 * * * *', -- A cada 10 minutos
  $$
    -- Chamar Edge Function via pg_net (extensão HTTP do Supabase)
    SELECT
      net.http_post(
        url := 'https://xzrmzmcoslomtzkzgskn.functions.supabase.co/send-scheduled-messages',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
      );
  $$
);

-- Verificar jobs criados
SELECT jobname, schedule, active, nodename
FROM cron.job
WHERE jobname IN ('update_snapshots_hourly', 'process_scheduled_messages_10min');
