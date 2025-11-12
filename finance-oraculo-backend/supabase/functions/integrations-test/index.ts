import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function testAnthropicAPI(apiKey: string): Promise<{ success: boolean; message: string; duration: number }> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    const duration = Date.now() - start;
    
    if (response.ok) {
      return { success: true, message: 'Anthropic API funcionando', duration };
    } else {
      const error = await response.text();
      return { success: false, message: `Erro: ${error}`, duration };
    }
  } catch (error) {
    return { success: false, message: error.message, duration: Date.now() - start };
  }
}

async function testOpenAIAPI(apiKey: string): Promise<{ success: boolean; message: string; duration: number }> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    const duration = Date.now() - start;
    
    if (response.ok) {
      return { success: true, message: 'OpenAI API funcionando', duration };
    } else {
      const error = await response.text();
      return { success: false, message: `Erro: ${error}`, duration };
    }
  } catch (error) {
    return { success: false, message: error.message, duration: Date.now() - start };
  }
}

async function testWASenderAPI(apiKey: string): Promise<{ success: boolean; message: string; duration: number }> {
  const start = Date.now();
  try {
    const response = await fetch('https://wasenderapi.com/api/status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const duration = Date.now() - start;
    
    if (response.ok) {
      return { success: true, message: 'WASender API funcionando', duration };
    } else {
      const error = await response.text();
      return { success: false, message: `Erro: ${error}`, duration };
    }
  } catch (error) {
    return { success: false, message: error.message, duration: Date.now() - start };
  }
}

async function testYampiAPI(token: string): Promise<{ success: boolean; message: string; duration: number }> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.yampi.com.br/v1/catalog/products?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    const duration = Date.now() - start;
    
    if (response.ok) {
      return { success: true, message: 'Yampi API funcionando', duration };
    } else {
      const error = await response.text();
      return { success: false, message: `Erro: ${error}`, duration };
    }
  } catch (error) {
    return { success: false, message: error.message, duration: Date.now() - start };
  }
}

async function testF360API(token: string): Promise<{ success: boolean; message: string; duration: number }> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.f360.com.br/v1/status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const duration = Date.now() - start;
    
    if (response.ok) {
      return { success: true, message: 'F360 API funcionando', duration };
    } else {
      return { success: false, message: 'F360 API não respondeu', duration };
    }
  } catch (error) {
    return { success: false, message: error.message, duration: Date.now() - start };
  }
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

    // Verifica se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair integration_id da URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const integrationId = pathParts[pathParts.length - 2]; // /integrations/{id}/test

    // Pegar API keys do ambiente
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') || '';
    const openaiKey = Deno.env.get('OPENAI_API_KEY') || '';
    const wasenderKey = Deno.env.get('WASENDER_API_KEY') || '';
    const yampiToken = Deno.env.get('YAMPI_TOKEN') || '';
    const f360Token = Deno.env.get('F360_TOKEN') || '';

    let testResult;

    switch (integrationId) {
      case 'anthropic':
        testResult = await testAnthropicAPI(anthropicKey);
        break;
      case 'openai':
        testResult = await testOpenAIAPI(openaiKey);
        break;
      case 'wasender':
        testResult = await testWASenderAPI(wasenderKey);
        break;
      case 'yampi':
        testResult = await testYampiAPI(yampiToken);
        break;
      case 'f360':
        testResult = await testF360API(f360Token);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Integração não suportada' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    // Salvar histórico do teste
    await supabase.from('integration_test_history').insert({
      integration_id: integrationId,
      tested_at: new Date().toISOString(),
      status: testResult.success ? 'success' : 'failed',
      duration_ms: testResult.duration,
      message: testResult.message,
      tested_by: user.id,
    });

    return new Response(
      JSON.stringify({
        integration_id: integrationId,
        ...testResult,
        tested_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Integration test error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

