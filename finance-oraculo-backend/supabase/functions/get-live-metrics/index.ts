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

    const url = new URL(req.url)
    const timeframe = url.searchParams.get('timeframe') || '1h' // 1h, 6h, 24h, 7d
    const hours = timeframe === '1h' ? 1 : timeframe === '6h' ? 6 : timeframe === '24h' ? 24 : 168

    // Buscar métricas em tempo real
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const [metrics, edgeFunctions, llmUsage, accessLogs] = await Promise.all([
      // Métricas agregadas por tipo
      supabaseClient
        .from('system_metrics')
        .select('metric_type, metric_name, metric_value, unit, recorded_at')
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true }),

      // Chamadas de Edge Functions (últimas 100)
      supabaseClient
        .from('access_logs')
        .select('endpoint, status_code, response_time_ms, created_at')
        .like('endpoint', '/functions/v1/%')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100),

      // Uso de LLM por hora
      supabaseClient.rpc('get_llm_usage_by_hour', { hours_ago: hours }),

      // Taxa de requisições por minuto
      supabaseClient.rpc('get_request_rate_by_minute', { minutes_ago: hours * 60 })
    ])

    // Agregar métricas por tipo
    const metricsByType: Record<string, any[]> = {}
    metrics.data?.forEach(m => {
      if (!metricsByType[m.metric_type]) {
        metricsByType[m.metric_type] = []
      }
      metricsByType[m.metric_type].push(m)
    })

    // Calcular estatísticas de Edge Functions
    const functionStats: Record<string, any> = {}
    edgeFunctions.data?.forEach(f => {
      const funcName = f.endpoint.split('/').pop() || 'unknown'
      if (!functionStats[funcName]) {
        functionStats[funcName] = {
          name: funcName,
          calls: 0,
          errors: 0,
          avgResponseTime: 0,
          totalResponseTime: 0
        }
      }
      functionStats[funcName].calls++
      if (f.status_code && f.status_code >= 400) {
        functionStats[funcName].errors++
      }
      if (f.response_time_ms) {
        functionStats[funcName].totalResponseTime += f.response_time_ms
      }
    })

    Object.keys(functionStats).forEach(key => {
      const stat = functionStats[key]
      stat.avgResponseTime = stat.totalResponseTime / stat.calls
      stat.errorRate = (stat.errors / stat.calls) * 100
    })

    return new Response(
      JSON.stringify({
        timeframe,
        metricsByType,
        edgeFunctions: Object.values(functionStats),
        llmUsage: llmUsage.data || [],
        accessLogs: accessLogs.data || [],
        timestamp: new Date().toISOString()
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

