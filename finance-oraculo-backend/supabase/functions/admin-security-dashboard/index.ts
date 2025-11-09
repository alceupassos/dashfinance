import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

async function isAdmin(userId: string) {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role === 'admin';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const admin = await isAdmin(user.id);
    if (!admin) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores.' }),
        { status: 403, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // ============================================
    // OVERVIEW - Dashboard principal
    // ============================================
    if (path === 'overview') {
      // Usuários ativos 24h
      const { data: activeUsers } = await supabase
        .from('v_active_users_24h')
        .select('*')
        .limit(10);

      // Vulnerabilidades abertas
      const { data: vulnerabilities } = await supabase
        .from('v_open_vulnerabilities')
        .select('*');

      // Tentativas de login falhadas
      const { data: failedLogins } = await supabase
        .from('v_failed_logins_24h')
        .select('*')
        .limit(10);

      // IPs suspeitos
      const { data: suspiciousIps } = await supabase
        .from('v_suspicious_ips')
        .select('*')
        .limit(10);

      // Saúde do banco
      const { data: dbHealth } = await supabase
        .from('v_database_health_summary')
        .select('*');

      // Sessões ativas
      const { data: activeSessions, count: sessionCount } = await supabase
        .from('active_sessions')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      // Total de vulnerabilidades por severidade
      const { data: vulnBySeverity } = await supabase
        .from('security_vulnerabilities')
        .select('severity')
        .eq('status', 'open');

      const vulnCount = {
        critical: vulnBySeverity?.filter(v => v.severity === 'critical').length || 0,
        high: vulnBySeverity?.filter(v => v.severity === 'high').length || 0,
        medium: vulnBySeverity?.filter(v => v.severity === 'medium').length || 0,
        low: vulnBySeverity?.filter(v => v.severity === 'low').length || 0,
      };

      return new Response(
        JSON.stringify({
          active_users: activeUsers || [],
          vulnerabilities: vulnerabilities || [],
          failed_logins: failedLogins || [],
          suspicious_ips: suspiciousIps || [],
          database_health: dbHealth || [],
          active_sessions_count: sessionCount || 0,
          vulnerability_count: vulnCount,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // TRAFFIC - Tráfego de API
    // ============================================
    if (path === 'traffic') {
      const hours = parseInt(url.searchParams.get('hours') || '24');

      // Tráfego por hora
      const { data: hourlyTraffic } = await supabase
        .from('v_api_traffic_hourly')
        .select('*')
        .gte('hour', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('hour', { ascending: true });

      // Top endpoints
      const { data: topEndpoints } = await supabase
        .from('api_request_logs')
        .select('function_name, status_code')
        .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

      // Agrupar por endpoint
      const endpointStats: Record<string, any> = {};
      topEndpoints?.forEach((log) => {
        if (!endpointStats[log.function_name]) {
          endpointStats[log.function_name] = {
            name: log.function_name,
            total: 0,
            success: 0,
            errors: 0,
          };
        }
        endpointStats[log.function_name].total++;
        if (log.status_code < 400) {
          endpointStats[log.function_name].success++;
        } else {
          endpointStats[log.function_name].errors++;
        }
      });

      // Latência média por função
      const { data: latencyData } = await supabase
        .rpc('exec_sql', {
          query: `
            SELECT
              function_name,
              AVG(response_time_ms) as avg_latency,
              MIN(response_time_ms) as min_latency,
              MAX(response_time_ms) as max_latency,
              PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_latency
            FROM api_request_logs
            WHERE created_at >= NOW() - INTERVAL '${hours} hours'
            GROUP BY function_name
          `
        });

      return new Response(
        JSON.stringify({
          hourly_traffic: hourlyTraffic || [],
          top_endpoints: Object.values(endpointStats).sort((a: any, b: any) => b.total - a.total).slice(0, 10),
          latency: latencyData || [],
        }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // SECURITY - Eventos de segurança
    // ============================================
    if (path === 'security') {
      const days = parseInt(url.searchParams.get('days') || '7');

      // Vulnerabilidades ao longo do tempo
      const { data: vulnTimeline } = await supabase
        .from('security_vulnerabilities')
        .select('*')
        .gte('detected_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('detected_at', { ascending: true });

      // Tentativas de login ao longo do tempo
      const { data: loginAttempts } = await supabase
        .from('login_attempts')
        .select('attempted_at, success')
        .gte('attempted_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('attempted_at', { ascending: true });

      // Top IPs com mais falhas
      const { data: topFailedIps } = await supabase
        .rpc('exec_sql', {
          query: `
            SELECT
              ip_address::text,
              COUNT(*) as failure_count,
              MIN(attempted_at) as first_attempt,
              MAX(attempted_at) as last_attempt
            FROM login_attempts
            WHERE success = false
              AND attempted_at >= NOW() - INTERVAL '${days} days'
            GROUP BY ip_address
            ORDER BY failure_count DESC
            LIMIT 10
          `
        });

      return new Response(
        JSON.stringify({
          vulnerability_timeline: vulnTimeline || [],
          login_attempts: loginAttempts || [],
          top_failed_ips: topFailedIps || [],
        }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // SESSIONS - Sessões ativas
    // ============================================
    if (path === 'sessions') {
      const { data: sessions } = await supabase
        .from('active_sessions')
        .select(`
          *,
          user:users!active_sessions_user_id_fkey(id, email, full_name, role)
        `)
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false });

      // Distribuição de dispositivos
      const { data: deviceDist } = await supabase
        .rpc('exec_sql', {
          query: `
            SELECT
              device_type,
              COUNT(*) as count
            FROM active_sessions
            WHERE is_active = true
            GROUP BY device_type
          `
        });

      // Distribuição geográfica
      const { data: geoDist } = await supabase
        .rpc('exec_sql', {
          query: `
            SELECT
              location_country,
              COUNT(*) as count
            FROM active_sessions
            WHERE is_active = true AND location_country IS NOT NULL
            GROUP BY location_country
            ORDER BY count DESC
          `
        });

      return new Response(
        JSON.stringify({
          active_sessions: sessions || [],
          device_distribution: deviceDist || [],
          geo_distribution: geoDist || [],
        }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // DATABASE - Métricas do banco
    // ============================================
    if (path === 'database') {
      const hours = parseInt(url.searchParams.get('hours') || '24');

      // Métricas ao longo do tempo
      const { data: metricsTimeline } = await supabase
        .from('database_health_metrics')
        .select('*')
        .gte('recorded_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: true });

      // Tamanho das tabelas
      const { data: tableSizes } = await supabase
        .rpc('exec_sql', {
          query: `
            SELECT
              schemaname,
              tablename,
              pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
              pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 20
          `
        });

      // Índices não utilizados
      const { data: unusedIndexes } = await supabase
        .rpc('exec_sql', {
          query: `
            SELECT
              schemaname,
              tablename,
              indexname,
              pg_size_pretty(pg_relation_size(indexrelid)) as size
            FROM pg_stat_user_indexes
            WHERE idx_scan = 0 AND schemaname = 'public'
            ORDER BY pg_relation_size(indexrelid) DESC
          `
        });

      // Queries lentas (mock - requer pg_stat_statements)
      const { data: slowQueries } = await supabase
        .rpc('exec_sql', {
          query: `
            SELECT
              'mock_query' as query,
              500 as avg_time_ms,
              100 as calls
            LIMIT 0
          `
        });

      return new Response(
        JSON.stringify({
          metrics_timeline: metricsTimeline || [],
          table_sizes: tableSizes || [],
          unused_indexes: unusedIndexes || [],
          slow_queries: slowQueries || [],
        }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // BACKUPS - Status de backups
    // ============================================
    if (path === 'backups') {
      const { data: backups } = await supabase
        .from('backup_status')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      // Estatísticas de backup
      const { data: backupStats } = await supabase
        .rpc('exec_sql', {
          query: `
            SELECT
              backup_type,
              COUNT(*) as total_backups,
              COUNT(*) FILTER (WHERE status = 'completed') as successful,
              COUNT(*) FILTER (WHERE status = 'failed') as failed,
              AVG(duration_seconds) as avg_duration_seconds,
              AVG(size_mb) as avg_size_mb
            FROM backup_status
            GROUP BY backup_type
          `
        });

      return new Response(
        JSON.stringify({
          backups: backups || [],
          stats: backupStats || [],
        }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Rota não encontrada. Use: /overview, /traffic, /security, /sessions, /database, /backups' }),
      { status: 404, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin security dashboard error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
