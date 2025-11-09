import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decryptValue, getEncryptionKey } from '../_shared/decrypt.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YampiProduct {
  id: string
  name: string
  price: number
}

interface YampiOrder {
  id: string
  status: string
  total: number
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

    if (req.method === 'POST') {
      const { company_cnpj, period_start, period_end, total_amount_usd, usage_details } = await req.json()

      if (!company_cnpj || !total_amount_usd) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Buscar configuração Yampi
      const { data: yampiConfig } = await supabaseClient
        .from('integration_configs')
        .select('api_key_encrypted, config_data')
        .eq('integration_name', 'Yampi')
        .eq('is_active', true)
        .single()

      if (!yampiConfig || !yampiConfig.api_key_encrypted) {
        return new Response(
          JSON.stringify({ error: 'Yampi not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Descriptografar API key
      const encryptionKey = getEncryptionKey()
      let yampiApiKey: string
      try {
        yampiApiKey = await decryptValue(yampiConfig.api_key_encrypted, encryptionKey)
      } catch (error) {
        return new Response(
          JSON.stringify({ error: `Failed to decrypt Yampi key: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Extrair dados da configuração (store_id, environment)
      const configData = yampiConfig.config_data || {}
      const environment = configData.environment || 'production'
      const productId = configData.product_id_llm_tokens || 'default-product-id'

      // Buscar informações da empresa
      const { data: company } = await supabaseClient
        .from('companies')
        .select('*')
        .eq('cnpj', company_cnpj)
        .single()

      if (!company) {
        return new Response(
          JSON.stringify({ error: 'Company not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Criar pedido no Yampi
      const yampiBaseUrl = environment === 'sandbox' 
        ? 'https://api-sandbox.yampi.com.br'
        : 'https://api.yampi.com.br'

      // Criar produto/pedido no Yampi
      const orderData = {
        customer: {
          name: company.name || company_cnpj,
          email: company.email || `contato@${company_cnpj}.com`,
          document: company_cnpj,
        },
        items: [
          {
            product_id: productId,
            quantity: 1,
            price: total_amount_usd,
            name: `Uso LLM - ${new Date(period_start).toLocaleDateString('pt-BR')} a ${new Date(period_end).toLocaleDateString('pt-BR')}`,
          }
        ],
        total: total_amount_usd,
        currency: 'BRL',
        metadata: {
          company_cnpj,
          period_start,
          period_end,
          usage_details,
        }
      }

      // Chamar API do Yampi
      const yampiResponse = await fetch(`${yampiBaseUrl}/api/v2/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${yampiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      if (!yampiResponse.ok) {
        const errorText = await yampiResponse.text()
        return new Response(
          JSON.stringify({ error: `Yampi API error: ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const yampiOrder: YampiOrder = await yampiResponse.json()

      // Salvar fatura no banco
      const { data: invoice, error: invoiceError } = await supabaseClient
        .from('yampi_invoices')
        .insert({
          yampi_order_id: yampiOrder.id,
          company_cnpj,
          total_amount_usd,
          period_start,
          period_end,
          llm_tokens_used: usage_details?.llm_tokens_used || 0,
          llm_cost_usd: usage_details?.llm_cost_usd || 0,
          whatsapp_messages_used: usage_details?.whatsapp_messages_used || 0,
          yampi_status: yampiOrder.status,
          yampi_data: yampiOrder,
          status: yampiOrder.status === 'paid' ? 'paid' : 'pending'
        })
        .select()
        .single()

      if (invoiceError) {
        return new Response(
          JSON.stringify({ error: invoiceError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          invoice,
          yampi_order: yampiOrder
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

