import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  company_cnpj: string;
  conversation_id?: string;
  user_id?: string;
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
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
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

    // Parse request body
    const { message, company_cnpj, conversation_id, user_id }: ChatRequest = await req.json();

    if (!message || !company_cnpj) {
      return new Response(JSON.stringify({ 
        error: 'Mensagem e CNPJ da empresa são obrigatórios' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar dados da empresa para contexto
    const { data: company } = await supabase
      .from('grupos')
      .select('id, nome, cnpj')
      .eq('cnpj', company_cnpj)
      .maybeSingle();

    // Buscar histórico da conversa se conversation_id for fornecido
    let conversationHistory: any[] = [];
    if (conversation_id) {
      const { data: history } = await supabase
        .from('llm_chat_history')
        .select('role, content, created_at')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true })
        .limit(10);
      
      conversationHistory = history || [];
    }

    // Preparar contexto para o LLM
    const systemPrompt = `Você é o Oráculo iFinance, um assistente financeiro especializado. 
Você está conversando com ${user?.email || 'um usuário'} sobre a empresa ${company?.nome || company_cnpj}.
Responda de forma clara, profissional e objetiva sobre questões financeiras, fluxo de caixa, análises e relatórios.
Se precisar de dados específicos que não possui, sugira onde o usuário pode encontrá-los no sistema.`;

    // Montar mensagens para o LLM
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((h: any) => ({ 
        role: h.role, 
        content: h.content 
      })),
      { role: 'user', content: message }
    ];

    // Se não tiver OPENAI_API_KEY, retornar resposta simulada
    let assistantMessage = '';
    let model = 'mock';
    let tokens_used = 0;
    let cost_usd = 0;

    if (openaiKey) {
      // Chamar API da OpenAI
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const openaiData = await openaiResponse.json();
      assistantMessage = openaiData.choices[0].message.content;
      model = openaiData.model;
      tokens_used = openaiData.usage.total_tokens;
      
      // Calcular custo aproximado (gpt-4o-mini: $0.15/1M input, $0.60/1M output)
      const inputTokens = openaiData.usage.prompt_tokens;
      const outputTokens = openaiData.usage.completion_tokens;
      cost_usd = (inputTokens * 0.15 / 1000000) + (outputTokens * 0.60 / 1000000);
    } else {
      // Resposta simulada
      assistantMessage = `Olá! Sou o Oráculo iFinance. Recebi sua mensagem: "${message.substring(0, 100)}..."\n\n` +
        `Esta é uma resposta simulada pois a API da OpenAI não está configurada. ` +
        `Configure OPENAI_API_KEY nas Edge Function secrets para habilitar o LLM real.\n\n` +
        `Empresa consultada: ${company?.nome || company_cnpj}`;
      
      tokens_used = message.length + assistantMessage.length;
      cost_usd = 0;
    }

    // Gerar ou usar conversation_id
    const finalConversationId = conversation_id || crypto.randomUUID();

    // Salvar mensagens no histórico
    const chatHistoryInserts = [
      {
        conversation_id: finalConversationId,
        company_cnpj,
        user_id: user_id || user.id,
        role: 'user',
        content: message,
      },
      {
        conversation_id: finalConversationId,
        company_cnpj,
        user_id: user_id || user.id,
        role: 'assistant',
        content: assistantMessage,
      }
    ];

    await supabase
      .from('llm_chat_history')
      .insert(chatHistoryInserts);

    // Registrar custo na tabela de métricas LLM
    await supabase
      .from('llm_costs')
      .insert({
        user_id: user.id,
        company_cnpj,
        model,
        tokens_used,
        cost_usd,
        endpoint: 'llm-chat',
        request_type: 'chat',
      });

    return new Response(
      JSON.stringify({
        conversation_id: finalConversationId,
        message: assistantMessage,
        model,
        tokens_used,
        cost_usd,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('LLM chat error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao processar chat com LLM' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

