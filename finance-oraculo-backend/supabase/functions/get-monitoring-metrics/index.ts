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

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // 1. API Metrics
    const { data: apiMetrics } = await supabaseClient
      .from('access_logs')
      .select('*')
      .gte('created_at', last24h.toISOString())
      .order('created_at', { ascending: false })

    const totalRequests = apiMetrics?.length || 0
    const successRequests = apiMetrics?.filter(r => r.status >= 200 && r.status < 300).length || 0
    const errorRequests = apiMetrics?.filter(r => r.status >= 400).length || 0
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests * 100).toFixed(2) : 0

    // 2. Database Metrics
    const { data: conversations } = await supabaseClient
      .from('whatsapp_conversations')
      .select('count', { count: 'exact' })
      .gte('created_at', last24h.toISOString())

    const { data: sentiments } = await supabaseClient
      .from('whatsapp_sentiment_analysis')
      .select('sentiment_score')
      .gte('created_at', last24h.toISOString())

    const avgSentiment = sentiments && sentiments.length > 0
      ? (sentiments.reduce((sum, s) => sum + s.sentiment_score, 0) / sentiments.length).toFixed(2)
      : 0

    // 3. LLM Metrics
    const { data: tokenUsage } = await supabaseClient
      .from('llm_token_usage')
      .select('total_tokens, cost_usd, provider')
      .gte('created_at', last24h.toISOString())

    const totalTokens = tokenUsage?.reduce((sum, t) => sum + t.total_tokens, 0) || 0
    const totalCost = tokenUsage?.reduce((sum, t) => sum + t.cost_usd, 0) || 0
    const providerBreakdown = {}
    tokenUsage?.forEach(t => {
      providerBreakdown[t.provider] = (providerBreakdown[t.provider] || 0) + t.cost_usd
    })

    // 4. Billing Metrics
    const { data: invoices } = await supabaseClient
      .from('yampi_invoices')
      .select('status, total_amount_usd')
      .gte('created_at', last7d.toISOString())

    const pendingInvoices = invoices?.filter(i => i.status === 'pending').length || 0
    const paidInvoices = invoices?.filter(i => i.status === 'paid').length || 0
    const totalRevenue = invoices?.reduce((sum, i) => sum + i.total_amount_usd, 0) || 0

    // 5. System Health
    const { data: health } = await supabaseClient
      .from('system_health')
      .select('status, details')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return new Response(
      JSON.stringify({
        timestamp: now.toISOString(),
        metrics: {
          api: {
            total_requests_24h: totalRequests,
            successful_requests: successRequests,
            error_requests: errorRequests,
            error_rate: `${errorRate}%`,
            status: errorRate < 5 ? '🟢' : errorRate < 10 ? '🟡' : '🔴'
          },
          whatsapp: {
            conversations_24h: conversations?.[0]?.count || 0,
            avg_sentiment_24h: parseFloat(avgSentiment),
            total_messages: sentiments?.length || 0
          },
          llm: {
            total_tokens_24h: totalTokens,
            total_cost_24h_usd: parseFloat(totalCost.toFixed(2)),
            provider_breakdown: providerBreakdown
          },
          billing: {
            pending_invoices: pendingInvoices,
            paid_invoices: paidInvoices,
            total_revenue_7d_usd: parseFloat(totalRevenue.toFixed(2))
          },
          system_health: {
            status: health?.status || 'unknown',
            api: health?.details?.api,
            database: health?.details?.database,
            functions: health?.details?.functions
          }
        }
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

