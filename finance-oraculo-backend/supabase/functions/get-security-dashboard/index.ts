import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar dados do dashboard
    const [
      vulnerabilities,
      accessLogs,
      systemHealth,
      securityAlerts,
      systemMetrics,
      llmUsage
    ] = await Promise.all([
      // Vulnerabilidades críticas
      supabaseClient
        .from('security_vulnerabilities')
        .select('*')
        .in('status', ['open'])
        .order('severity', { ascending: false })
        .limit(20),

      // Últimos acessos
      supabaseClient
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),

      // Status dos serviços
      supabaseClient
        .from('system_health')
        .select('*')
        .order('service_name'),

      // Alertas de segurança
      supabaseClient
        .from('security_alerts')
        .select('*')
        .eq('resolved', false)
        .order('severity', { ascending: false })
        .limit(20),

      // Métricas das últimas 24h
      supabaseClient
        .from('system_metrics')
        .select('*')
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false }),

      // Uso de tokens LLM (últimas 24h)
      supabaseClient
        .from('llm_token_usage')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
    ])

    // Calcular estatísticas
    const stats = {
      vulnerabilities: {
        critical: vulnerabilities.data?.filter(v => v.severity === 'critical').length || 0,
        high: vulnerabilities.data?.filter(v => v.severity === 'high').length || 0,
        moderate: vulnerabilities.data?.filter(v => v.severity === 'moderate').length || 0,
        total: vulnerabilities.data?.length || 0
      },
      access: {
        total_24h: accessLogs.data?.length || 0,
        errors_24h: accessLogs.data?.filter(a => a.status_code && a.status_code >= 400).length || 0,
        avg_response_time: accessLogs.data?.reduce((acc, a) => acc + (a.response_time_ms || 0), 0) / (accessLogs.data?.length || 1) || 0
      },
      health: {
        healthy: systemHealth.data?.filter(h => h.status === 'healthy').length || 0,
        degraded: systemHealth.data?.filter(h => h.status === 'degraded').length || 0,
        down: systemHealth.data?.filter(h => h.status === 'down').length || 0,
        total: systemHealth.data?.length || 0
      },
      alerts: {
        critical: securityAlerts.data?.filter(a => a.severity === 'critical').length || 0,
        high: securityAlerts.data?.filter(a => a.severity === 'high').length || 0,
        total: securityAlerts.data?.length || 0
      },
      llm: {
        total_tokens_24h: llmUsage.data?.reduce((acc, u) => acc + u.total_tokens, 0) || 0,
        total_cost_24h: llmUsage.data?.reduce((acc, u) => acc + (u.cost_usd || 0), 0) || 0,
        requests_24h: llmUsage.data?.length || 0
      }
    }

    return new Response(
      JSON.stringify({
        stats,
        vulnerabilities: vulnerabilities.data || [],
        accessLogs: accessLogs.data || [],
        systemHealth: systemHealth.data || [],
        securityAlerts: securityAlerts.data || [],
        systemMetrics: systemMetrics.data || [],
        llmUsage: llmUsage.data || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

