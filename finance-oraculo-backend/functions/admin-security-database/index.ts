// ===================================================
// Edge Function: admin/security/database
// GET /admin/security/database?range=past_24h|past_7d
// ===================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const range = url.searchParams.get('range') || 'past_24h';

    // Calcular datas
    const now = new Date();
    let startDate = new Date();

    if (range === 'past_24h') {
      startDate.setHours(now.getHours() - 24);
    } else if (range === 'past_7d') {
      startDate.setDate(now.getDate() - 7);
    }

    // Buscar métricas do banco
    const { data: metrics, error: metricsError } = await supabase
      .from('admin_db_metrics')
      .select('*')
      .gte('interval_start', startDate.toISOString())
      .order('interval_start', { ascending: true });

    if (metricsError) {
      console.error('DB Metrics error:', metricsError);
    }

    const time_series = (metrics || []).map(m => ({
      timestamp: m.interval_start,
      active_connections: m.active_connections || 0,
      db_size_mb: Number(m.db_size_mb) || 0,
      avg_query_time_ms: Number(m.avg_query_time_ms) || 0,
      cpu_percent: Number(m.cpu_percent) || 0,
      memory_percent: Number(m.memory_percent) || 0,
      disk_percent: Number(m.disk_percent) || 0,
    }));

    // Últimos valores para gauges
    const latest = time_series[time_series.length - 1] || {
      cpu_percent: 0,
      memory_percent: 0,
      disk_percent: 0,
    };

    const gauges = {
      cpu: {
        value: latest.cpu_percent,
        status: latest.cpu_percent > 80 ? 'critical' : latest.cpu_percent > 60 ? 'warning' : 'ok',
      },
      memory: {
        value: latest.memory_percent,
        status: latest.memory_percent > 80 ? 'critical' : latest.memory_percent > 60 ? 'warning' : 'ok',
      },
      disk: {
        value: latest.disk_percent,
        status: latest.disk_percent > 80 ? 'critical' : latest.disk_percent > 70 ? 'warning' : 'ok',
      },
    };

    const response = { time_series, gauges };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Database metrics error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
