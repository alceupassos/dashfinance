-- ============================================================
-- CONFIGURAÇÃO DO AMBIENTE - EXECUTAR UMA VEZ
-- ============================================================
-- Este script configura todas as variáveis de ambiente necessárias
-- para o funcionamento do sistema de sincronização ERP

-- ============================================================
-- 1. CONFIGURAR CHAVE DE CRIPTOGRAFIA
-- ============================================================
-- IMPORTANTE: Em produção, use uma chave forte e armazene em lugar seguro!
select set_config('app.kms', 'B5b0dcf500@#', false);

-- ============================================================
-- 2. CONFIGURAR URL DO PROJETO
-- ============================================================
select set_config('app.project_url', 'https://newczbjzzfkwwnpfmygm.supabase.co', false);

-- ============================================================
-- 3. CONFIGURAR SERVICE ROLE KEY
-- ============================================================
-- SUBSTITUA "YOUR_SERVICE_ROLE_KEY_HERE" pela sua Service Role Key
-- Você pode encontrá-la em: Supabase Dashboard > Settings > API > service_role
select set_config('app.service_key', 'YOUR_SERVICE_ROLE_KEY_HERE', false);

-- ============================================================
-- 4. VERIFICAR CONFIGURAÇÃO
-- ============================================================
select 
  current_setting('app.kms', true) as kms_configured,
  current_setting('app.project_url', true) as project_url,
  case 
    when current_setting('app.service_key', true) = 'YOUR_SERVICE_ROLE_KEY_HERE' 
    then '⚠️  AINDA NÃO CONFIGURADO'
    else '✅ CONFIGURADO'
  end as service_key_status;

-- ============================================================
-- 5. VERIFICAR TABELAS CRIADAS
-- ============================================================
select 
  table_name,
  case 
    when table_name is not null then '✅'
    else '❌'
  end as status
from (
  values 
    ('integration_f360'),
    ('integration_omie'),
    ('dre_entries'),
    ('cashflow_entries'),
    ('sync_state')
) t(table_name)
left join information_schema.tables ist 
  on ist.table_schema = 'public' 
  and ist.table_name = t.table_name;

-- ============================================================
-- 6. VERIFICAR EDGE FUNCTIONS
-- ============================================================
-- Execute este comando no terminal para verificar Edge Functions:
-- supabase functions list

-- ============================================================
-- 7. VERIFICAR CRON JOBS
-- ============================================================
select 
  jobname,
  schedule,
  command,
  active,
  case 
    when active then '✅ ATIVO'
    else '❌ INATIVO'
  end as status
from cron.job 
where jobname in ('erp_sync_morning', 'erp_sync_afternoon')
order by jobname;

-- ============================================================
-- 8. PRÓXIMOS PASSOS
-- ============================================================
-- Após configurar tudo:
-- 1. Execute o script scripts/add-integrations.sql para adicionar as integrações
-- 2. Teste a sincronização: select public.trigger_erp_sync();
-- 3. Aguarde os horários agendados (03:00 e 12:50 BRT)
-- 4. Monitore os logs e resultados

