import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

// Gera embedding usando OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error('Erro ao gerar embedding');
  }

  const data = await response.json();
  return data.data[0].embedding;
}

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

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { query, filters = {}, limit = 10 } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query é obrigatória' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gera embedding da query
    const queryEmbedding = await generateEmbedding(query);

    // Busca semântica usando pgvector (assumindo que a extensão está instalada)
    // Se não tiver pgvector, faz busca por texto simples
    let searchQuery = supabase
      .from('rag_conversations')
      .select(`
        id,
        conversation_id,
        message_text,
        sentiment,
        topics,
        urgency,
        company_cnpj,
        created_at,
        whatsapp_sentiment_analysis (
          sentiment_category,
          sentiment_score,
          mood_index
        )
      `)
      .limit(limit);

    // Filtros
    if (filters.cnpj) {
      searchQuery = searchQuery.eq('company_cnpj', filters.cnpj);
    }
    if (filters.sentiment) {
      searchQuery = searchQuery.eq('sentiment', filters.sentiment);
    }
    if (filters.date_from) {
      searchQuery = searchQuery.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      searchQuery = searchQuery.lte('created_at', filters.date_to);
    }

    // Por ora, busca por texto (se não tiver pgvector configurado)
    searchQuery = searchQuery.textSearch('message_text', query.split(' ').join(' & '));

    const { data: results, error: searchError } = await searchQuery;

    if (searchError) {
      // Fallback: busca simples por ilike
      const { data: fallbackResults } = await supabase
        .from('rag_conversations')
        .select(`
          id,
          conversation_id,
          message_text,
          sentiment,
          topics,
          urgency,
          company_cnpj,
          created_at
        `)
        .ilike('message_text', `%${query}%`)
        .limit(limit);

      return new Response(
        JSON.stringify({
          results: fallbackResults || [],
          total: fallbackResults?.length || 0,
          search_method: 'text_match',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calcula relevância (score simples baseado em ocorrências)
    const enrichedResults = (results || []).map((r: any) => {
      const queryWords = query.toLowerCase().split(' ');
      const messageWords = r.message_text.toLowerCase().split(' ');
      const matchCount = queryWords.filter((w: string) => 
        messageWords.some((mw: string) => mw.includes(w))
      ).length;
      
      const relevanceScore = (matchCount / queryWords.length) * 100;

      return {
        ...r,
        relevance_score: relevanceScore.toFixed(1),
      };
    });

    // Ordena por relevância
    enrichedResults.sort((a: any, b: any) => 
      parseFloat(b.relevance_score) - parseFloat(a.relevance_score)
    );

    return new Response(
      JSON.stringify({
        results: enrichedResults,
        total: enrichedResults.length,
        search_method: 'semantic_search',
        query,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('RAG search error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

