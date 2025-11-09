// ===================================================
// Edge Function: admin/security/traffic
// GET /admin/security/traffic?range=past_24h|past_7d
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

    // Buscar métricas
    const { data: metrics, error: metricsError } = await supabase
      .from('admin_api_metrics')
      .select('*')
      .gte('interval_start', startDate.toISOString())
      .order('interval_start', { ascending: true });

    if (metricsError) {
      console.error('Metrics error:', metricsError);
    }

    const hourly = (metrics || []).map(m => ({
      timestamp: m.interval_start,
      function_name: m.function_name,
      request_count: m.request_count || 0,
      avg_latency_ms: Number(m.avg_latency_ms) || 0,
      error_count: m.error_count || 0,
      request_bytes: m.request_bytes || 0,
      response_bytes: m.response_bytes || 0,
    }));

    // Calcular totais
    const totals = {
      requests: hourly.reduce((acc, h) => acc + h.request_count, 0),
      bandwidth_in_mb: (hourly.reduce((acc, h) => acc + h.request_bytes, 0) / 1024 / 1024).toFixed(2),
      bandwidth_out_mb: (hourly.reduce((acc, h) => acc + h.response_bytes, 0) / 1024 / 1024).toFixed(2),
      error_rate: hourly.reduce((acc, h) => acc + h.request_count, 0) > 0
        ? ((hourly.reduce((acc, h) => acc + h.error_count, 0) / hourly.reduce((acc, h) => acc + h.request_count, 0)) * 100).toFixed(2)
        : '0',
    };

    const response = { hourly, totals };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Traffic error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
