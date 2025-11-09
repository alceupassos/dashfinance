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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verifica autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrai ID da URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const conversationId = pathParts[pathParts.length - 1];

    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'ID da conversa é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar conversa completa
    const { data: conversation, error: convError } = await supabase
      .from('rag_conversations')
      .select(`
        *,
        whatsapp_sentiment_analysis (
          sentiment_category,
          sentiment_score,
          mood_index,
          topics_identified,
          urgency_level,
          response_suggestion,
          analyzed_at
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (convError) {
      throw convError;
    }

    if (!conversation || conversation.length === 0) {
      return new Response(JSON.stringify({ error: 'Conversa não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar contexto adicional (empresa, etc)
    const companyCnpj = conversation[0]?.company_cnpj;
    let companyData = null;

    if (companyCnpj) {
      const { data: company } = await supabase
        .from('grupos')
        .select('id, nome, cnpj')
        .eq('cnpj', companyCnpj)
        .single();

      companyData = company;
    }

    // Buscar resumo de contexto
    const { data: contextSummary } = await supabase
      .from('rag_context_summary')
      .select('*')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    // Análise agregada da conversa
    const sentiments = conversation
      .map((m: any) => m.whatsapp_sentiment_analysis?.[0]?.sentiment_category)
      .filter(Boolean);

    const sentimentDistribution = {
      positive: sentiments.filter((s: string) => s === 'positive').length,
      neutral: sentiments.filter((s: string) => s === 'neutral').length,
      negative: sentiments.filter((s: string) => s === 'negative').length,
    };

    const avgMoodIndex = conversation
      .filter((m: any) => m.whatsapp_sentiment_analysis?.[0]?.mood_index)
      .reduce((acc: number, m: any) => 
        acc + (m.whatsapp_sentiment_analysis[0].mood_index || 0), 0
      ) / conversation.length;

    // Tópicos identificados (unique)
    const allTopics = conversation
      .flatMap((m: any) => m.topics || [])
      .filter(Boolean);
    
    const uniqueTopics = [...new Set(allTopics)];

    // Urgência máxima
    const urgencyLevels = conversation
      .map((m: any) => m.urgency)
      .filter(Boolean);
    
    const maxUrgency = urgencyLevels.includes('critical') ? 'critical' :
                       urgencyLevels.includes('high') ? 'high' :
                       urgencyLevels.includes('medium') ? 'medium' : 'low';

    return new Response(
      JSON.stringify({
        conversation_id: conversationId,
        company: companyData,
        messages: conversation,
        context_summary: contextSummary,
        analysis: {
          total_messages: conversation.length,
          sentiment_distribution: sentimentDistribution,
          avg_mood_index: avgMoodIndex.toFixed(2),
          topics: uniqueTopics,
          max_urgency: maxUrgency,
          duration_minutes: conversation.length > 1 ? (
            (new Date(conversation[conversation.length - 1].created_at).getTime() -
             new Date(conversation[0].created_at).getTime()) / 1000 / 60
          ).toFixed(1) : '0',
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('RAG conversation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

