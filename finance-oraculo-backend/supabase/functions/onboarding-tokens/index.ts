import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gera token aleatório de 5 caracteres alfanuméricos
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 5; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
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

    const url = new URL(req.url);
    const method = req.method;

    // GET - Listar todos os tokens
    if (method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50');

      try {
        // Tentar usar a RPC primeiro
        const rpcResult = await supabase.rpc('get_onboarding_tokens', { p_limit: limit });
        
        if (!rpcResult.error && rpcResult.data) {
          return new Response(
            JSON.stringify({
              tokens: rpcResult.data || [],
              total: rpcResult.data?.length || 0,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Se RPC falhou, tentar query direta
        console.log('RPC failed, trying direct query...');
        const result = await supabase
          .from('onboarding_tokens')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (result.error) {
          console.error('Direct query error:', result.error);
          return new Response(
            JSON.stringify({
              tokens: [],
              total: 0,
              _debug: {
                error: result.error.message,
                hint: 'PostgREST schema cache issue - table exists but not visible',
                suggestion: 'Run: NOTIFY pgrst, \'reload schema\' in SQL editor'
              }
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            tokens: result.data || [],
            total: result.data?.length || 0,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        console.error('GET tokens error:', err);
        return new Response(
          JSON.stringify({
            tokens: [],
            total: 0,
            error: err.message
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // POST - Criar novo token
    if (method === 'POST') {
      const body = await req.json();
      const { empresa_id, funcao = 'onboarding' } = body;

      // Gera token único
      let token = generateToken();
      let attempts = 0;
      const maxAttempts = 10;

      // Garante que o token é único
      while (attempts < maxAttempts) {
        const { data: existing } = await supabase
          .from('onboarding_tokens')
          .select('id')
          .eq('token', token)
          .single();

        if (!existing) break;
        token = generateToken();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        return new Response(
          JSON.stringify({ error: 'Não foi possível gerar token único' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Insere token
      const { data, error } = await supabase
        .from('onboarding_tokens')
        .insert({
          token,
          empresa_id,
          funcao,
          ativo: true,
          criado_por: user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          token: data.token,
          id: data.id,
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // PUT - Atualizar token (ativar/desativar)
    if (method === 'PUT') {
      const body = await req.json();
      const { id, ativo } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: 'ID é obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('onboarding_tokens')
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          token: data,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // DELETE - Deletar token
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');

      if (!id) {
        return new Response(JSON.stringify({ error: 'ID é obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('onboarding_tokens')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Token deletado com sucesso',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Onboarding tokens error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

