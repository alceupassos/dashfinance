/**
 * WhatsApp Incoming Webhook Handler
 * Processa mensagens recebidas e dispara automação
 * (análise de sentimento, indexação RAG, etc)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  from: string // phone number
  body: string // message text
  timestamp: number
  id?: string // message ID
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse webhook payload
    const payload: WebhookPayload = await req.json()

    if (!payload.from || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: from, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[whatsapp-webhook] Received message from ${payload.from}: ${payload.body}`)

    // Buscar conversa ativa ou criar nova
    const { data: existingConversation } = await supabaseClient
      .from('whatsapp_conversations')
      .select('*')
      .eq('phone_number', payload.from)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let company_cnpj = existingConversation?.company_cnpj
    let conversation_id = existingConversation?.id

    // Se não há conversa recente, buscar por telefone em clientes
    if (!company_cnpj) {
      const { data: client } = await supabaseClient
        .from('whatsapp_contacts')
        .select('company_cnpj')
        .eq('phone_number', payload.from)
        .single()

      company_cnpj = client?.company_cnpj

      if (!company_cnpj) {
        console.warn(`[whatsapp-webhook] No company found for phone ${payload.from}`)
        return new Response(
          JSON.stringify({ error: 'Unknown phone number' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Salvar mensagem como nova conversa
    const { data: savedConversation, error: saveError } = await supabaseClient
      .from('whatsapp_conversations')
      .insert({
        company_cnpj,
        phone_number: payload.from,
        message_text: payload.body,
        message_direction: 'inbound',
        message_id: payload.id || `ws-${payload.timestamp}`,
        metadata: {
          webhook_timestamp: payload.timestamp,
          webhook_id: payload.id,
        },
      })
      .select()
      .single()

    if (saveError) {
      console.error(`[whatsapp-webhook] Error saving conversation: ${saveError.message}`)
      return new Response(
        JSON.stringify({ error: `Failed to save message: ${saveError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[whatsapp-webhook] Message saved with ID: ${savedConversation.id}`)

    // ============================================
    // AUTOMAÇÃO 1: Análise de Sentimento
    // ============================================
    // Disparar análise de sentimento de forma assíncrona
    // usando pg_net (já será feito pelo trigger, mas fazer redundância para garantir)

    const sentimentAnalysisPayload = {
      message_text: payload.body,
      company_cnpj: company_cnpj,
      phone_number: payload.from,
      conversation_id: savedConversation.id,
      message_id: savedConversation.message_id,
    }

    // Disparar análise (não esperar resposta)
    fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-whatsapp-sentiment`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sentimentAnalysisPayload),
      }
    ).catch(err => {
      console.error('[whatsapp-webhook] Error calling sentiment analysis:', err.message)
    })

    // ============================================
    // AUTOMAÇÃO 2: Registrar em log de processamento
    // ============================================
    // Para rastreamento e retry automático
    const { error: logError } = await supabaseClient
      .from('whatsapp_processing_log')
      .insert({
        conversation_id: savedConversation.id,
        message_id: savedConversation.message_id,
        processing_type: 'sentiment_analysis',
        status: 'pending',
      })

    if (logError) {
      console.warn(`[whatsapp-webhook] Warning registering processing log: ${logError.message}`)
    }

    // ============================================
    // RESPOSTA RÁPIDA AO WEBHOOK
    // ============================================
    // Retornar sucesso imediatamente (not wait for async operations)

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: savedConversation.id,
        message_id: savedConversation.message_id,
        status: 'received',
        message: 'Message received and queued for processing'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[whatsapp-webhook] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

