import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decryptValue, getEncryptionKey } from '../_shared/decrypt.ts'
import { generateEmbedding, getOpenAIKey } from '../_shared/embeddings.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SentimentAnalysis {
  sentiment_score: number // -1 a 1
  sentiment_label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
  tone: string
  emotion: string
  engagement_level: 'low' | 'medium' | 'high' | 'very_high'
  response_urgency: 'low' | 'medium' | 'high' | 'critical'
  analysis_data: any
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

    const { message_text, company_cnpj, phone_number, conversation_id, message_id } = await req.json()

    if (!message_text || !company_cnpj || !phone_number) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar configuração do Anthropic
    const { data: anthropicConfig } = await supabaseClient
      .from('integration_configs')
      .select('api_key_encrypted, config_data')
      .eq('integration_name', 'anthropic')
      .eq('is_active', true)
      .single()

    if (!anthropicConfig || !anthropicConfig.api_key_encrypted) {
      return new Response(
        JSON.stringify({ error: 'Anthropic not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Descriptografar API key
    const encryptionKey = getEncryptionKey()
    let apiKey: string
    try {
      apiKey = await decryptValue(anthropicConfig.api_key_encrypted, encryptionKey)
    } catch (error) {
      return new Response(
        JSON.stringify({ error: `Failed to decrypt Anthropic key: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prompt para análise de sentimento
    const prompt = `Analise o sentimento e tom da seguinte mensagem de WhatsApp de um cliente:

"${message_text}"

Retorne um JSON com:
- sentiment_score: número de -1 (muito negativo) a 1 (muito positivo)
- sentiment_label: "very_negative", "negative", "neutral", "positive", ou "very_positive"
- tone: "formal", "informal", "friendly", "angry", "sad", "excited", ou "neutral"
- emotion: "joy", "sadness", "anger", "fear", "surprise", "disgust", ou "neutral"
- engagement_level: "low", "medium", "high", ou "very_high"
- response_urgency: "low", "medium", "high", ou "critical"
- reasoning: breve explicação da análise

Apenas retorne o JSON, sem markdown ou texto adicional.`

    // Chamar Claude para análise
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const claudeResponse = await response.json()
    const analysisText = claudeResponse.content[0].text

    // Extrair JSON da resposta
    let analysis: SentimentAnalysis
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (e) {
      // Fallback: análise básica
      analysis = {
        sentiment_score: 0,
        sentiment_label: 'neutral',
        tone: 'neutral',
        emotion: 'neutral',
        engagement_level: 'medium',
        response_urgency: 'low',
        analysis_data: { error: 'Failed to parse analysis', raw: analysisText }
      }
    }

    // Salvar análise no banco
    const { data: sentimentData, error: dbError } = await supabaseClient
      .from('whatsapp_sentiment_analysis')
      .insert({
        conversation_id,
        company_cnpj,
        phone_number,
        message_id,
        sentiment_score: analysis.sentiment_score,
        sentiment_label: analysis.sentiment_label,
        tone: analysis.tone,
        emotion: analysis.emotion,
        engagement_level: analysis.engagement_level,
        response_urgency: analysis.response_urgency,
        analysis_data: {
          ...analysis.analysis_data,
          reasoning: analysis.analysis_data?.reasoning || analysisText
        }
      })
      .select()
      .single()

    if (dbError) {
      return new Response(
        JSON.stringify({ error: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Atualizar índice de humor diário
    await supabaseClient.rpc('update_mood_index_daily', {
      p_company_cnpj: company_cnpj,
      p_phone_number: phone_number,
      p_period_date: new Date().toISOString().split('T')[0]
    })

    // Gerar embedding para indexação no RAG
    let embedding: number[] | null = null
    try {
      const openaiKey = await getOpenAIKey(supabaseClient)
      const embeddingResult = await generateEmbedding(message_text, 'text-embedding-3-small', openaiKey || undefined)
      embedding = embeddingResult.embedding
    } catch (error) {
      console.warn(`[analyze-whatsapp-sentiment] Error generating embedding: ${error.message}`)
      // Continuar mesmo sem embedding
    }

    // Indexar no RAG com embedding
    await supabaseClient.rpc('index_conversation_for_rag', {
      p_company_cnpj: company_cnpj,
      p_phone_number: phone_number,
      p_conversation_id: conversation_id,
      p_message_text: message_text,
      p_message_direction: 'inbound',
      p_message_timestamp: new Date().toISOString(),
      p_sentiment_score: analysis.sentiment_score,
      p_sentiment_label: analysis.sentiment_label,
      p_topics: analysis.analysis_data?.topics || [],
      p_entities: analysis.analysis_data?.entities || {},
      p_embedding: embedding // Embedding real ou null
    })

    return new Response(
      JSON.stringify({
        success: true,
        analysis: sentimentData
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

