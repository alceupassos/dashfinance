import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthStatus {
  api: boolean
  database: boolean
  functions: { [key: string]: boolean }
  timestamp: string
  overall: boolean
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

    const status: HealthStatus = {
      api: false,
      database: false,
      functions: {},
      timestamp: new Date().toISOString(),
      overall: false
    }

    // 1. Check API
    try {
      const apiResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/rest/v1/`,
        {
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
            'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? ''
          }
        }
      )
      status.api = apiResponse.ok || apiResponse.status === 400
    } catch (error) {
      console.error('API check failed:', error.message)
      status.api = false
    }

    // 2. Check Database
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .select('count')
        .limit(1)
      status.database = !error
    } catch (error) {
      console.error('Database check failed:', error.message)
      status.database = false
    }

    // 3. Check Edge Functions
    const functions = [
      'decrypt-api-key',
      'analyze-whatsapp-sentiment',
      'yampi-create-invoice',
      'index-whatsapp-to-rag',
      'whatsapp-incoming-webhook'
    ]

    for (const fn of functions) {
      try {
        const fnResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/${fn}`,
          {
            method: 'OPTIONS',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`
            }
          }
        )
        status.functions[fn] = fnResponse.ok || fnResponse.status === 405
      } catch (error) {
        console.error(`Function ${fn} check failed:`, error.message)
        status.functions[fn] = false
      }
    }

    // 4. Overall status
    status.overall = status.api && status.database && Object.values(status.functions).every(v => v)

    // 5. Save to database
    try {
      await supabaseClient
        .from('system_health')
        .insert({
          status: status.overall ? 'healthy' : 'degraded',
          details: status
        })
    } catch (error) {
      console.error('Failed to save health status:', error.message)
    }

    // 6. Alert if degraded
    if (!status.overall) {
      console.error('⚠️  System health check failed:', JSON.stringify(status))
      
      // Could send alert here (email, Slack, etc)
      try {
        const alertMessage = `🚨 Finance Oráculo Health Alert\n\nAPI: ${status.api}\nDatabase: ${status.database}\nFunctions: ${Object.values(status.functions).filter(v => !v).length} failed\n\nTime: ${status.timestamp}`
        
        // Example: Send to Slack
        // await fetch(Deno.env.get('SLACK_WEBHOOK_URL'), {
        //   method: 'POST',
        //   body: JSON.stringify({ text: alertMessage })
        // })
      } catch (error) {
        console.error('Failed to send alert:', error.message)
      }
    }

    return new Response(
      JSON.stringify(status),
      {
        status: status.overall ? 200 : 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

