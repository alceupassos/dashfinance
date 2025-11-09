import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateEmbedding, getOpenAIKey } from '../_shared/embeddings.ts'

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

    // Buscar mensagens WhatsApp não indexadas
    const { data: conversations, error: fetchError } = await supabaseClient
      .from('whatsapp_conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No conversations to index', indexed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let indexedCount = 0
    let embeddingErrors = 0

    // Buscar API key do OpenAI (opcional, pode usar fallback)
    let openaiKey: string | null = null
    try {
      openaiKey = await getOpenAIKey(supabaseClient)
    } catch (error) {
      console.warn('[index-whatsapp-to-rag] Could not fetch OpenAI key, will use fallback embeddings')
    }

    // Processar cada conversa
    for (const conversation of conversations) {
      // Verificar se já está indexada
      const { data: existing } = await supabaseClient
        .from('rag_conversations')
        .select('id')
        .eq('conversation_id', conversation.id)
        .single()

      if (existing) {
        continue // Já indexada
      }

      // Buscar análise de sentimento se existir
      const { data: sentiment } = await supabaseClient
        .from('whatsapp_sentiment_analysis')
        .select('*')
        .eq('conversation_id', conversation.id)
        .single()

      // Gerar embedding para o texto da mensagem
      let embedding: number[] | null = null
      try {
        const embeddingResult = await generateEmbedding(
          conversation.message_text,
          'text-embedding-3-small',
          openaiKey || undefined
        )
        embedding = embeddingResult.embedding
        console.log(`[index-whatsapp-to-rag] Generated embedding (${embeddingResult.provider}) for conversation ${conversation.id}`)
      } catch (error) {
        console.error(`[index-whatsapp-to-rag] Error generating embedding: ${error.message}`)
        embeddingErrors++
        // Continuar mesmo sem embedding
      }

      // Extrair tópicos e entidades
      const topics: string[] = []
      const entities: any = {}

      // Análise de palavras-chave financeiras
      const messageLower = conversation.message_text.toLowerCase()
      const financialKeywords = [
        'saldo', 'pagamento', 'recebimento', 'fatura', 'conta', 'dinheiro', 'valor',
        'receita', 'despesa', 'custo', 'lucro', 'prejuízo', 'caixa', 'fluxo',
        'cliente', 'fornecedor', 'vencimento', 'atraso', 'boleto', 'pix'
      ]
      financialKeywords.forEach(keyword => {
        if (messageLower.includes(keyword)) {
          topics.push(keyword)
        }
      })

      // Extrair valores monetários mencionados (padrão: R$ 1.234,56)
      const currencyPattern = /r?\$\s*[\d.,]+/gi
      const currencyMatches = conversation.message_text.match(currencyPattern)
      if (currencyMatches) {
        entities.amounts = currencyMatches
      }

      // Indexar no RAG com embedding
      const { error: indexError } = await supabaseClient.rpc('index_conversation_for_rag', {
        p_company_cnpj: conversation.company_cnpj,
        p_phone_number: conversation.phone_number,
        p_conversation_id: conversation.id,
        p_message_text: conversation.message_text,
        p_message_direction: conversation.message_direction,
        p_message_timestamp: conversation.created_at,
        p_sentiment_score: sentiment?.sentiment_score || null,
        p_sentiment_label: sentiment?.sentiment_label || null,
        p_topics: topics.length > 0 ? topics : null,
        p_entities: Object.keys(entities).length > 0 ? entities : null,
        p_embedding: embedding // Embedding real ou null (fallback)
      })

      if (!indexError) {
        indexedCount++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        indexed: indexedCount,
        total: conversations.length,
        embedding_errors: embeddingErrors,
        embedding_provider: openaiKey ? 'openai' : 'fallback'
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

