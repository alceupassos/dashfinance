import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

async function isAdmin(userId: string) {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role === 'admin';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const admin = await isAdmin(user.id);
    if (!admin) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores.' }),
        { status: 403, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // ============================================
    // ROTAS PARA API KEYS
    // ============================================
    if (path?.includes('api-keys')) {
      // GET - Listar API Keys
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('api_keys')
          .select('id, key_name, provider, key_type, description, is_active, created_at, updated_at, last_used_at')
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      // POST - Criar API Key
      if (req.method === 'POST') {
        const body = await req.json();
        const { key_name, key_value, provider, key_type, description } = body;

        if (!key_name || !key_value || !provider || !key_type) {
          return new Response(
            JSON.stringify({ error: 'Campos obrigatórios: key_name, key_value, provider, key_type' }),
            { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
          );
        }

        // Criptografar a chave
        const { data: encrypted, error: encryptError } = await supabase
          .rpc('encrypt_api_key', { p_key_value: key_value });

        if (encryptError) throw encryptError;

        const { data, error } = await supabase
          .from('api_keys')
          .insert({
            key_name,
            key_value_encrypted: encrypted,
            provider,
            key_type,
            description,
            created_by: user.id,
          })
          .select('id, key_name, provider, key_type, description, is_active, created_at')
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { status: 201, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      // DELETE - Deletar API Key
      if (req.method === 'DELETE') {
        const keyId = url.searchParams.get('id');
        if (!keyId) {
          return new Response(
            JSON.stringify({ error: 'id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('api_keys')
          .delete()
          .eq('id', keyId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: 'API Key deletada' }),
          { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============================================
    // ROTAS PARA LLM PROVIDERS
    // ============================================
    if (path?.includes('llm-providers')) {
      // GET - Listar providers
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('llm_providers')
          .select(`
            *,
            api_key:api_keys!llm_providers_api_key_id_fkey(id, key_name)
          `)
          .order('display_name');

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      // PUT - Atualizar provider (ativar/desativar, trocar API key)
      if (req.method === 'PUT') {
        const providerId = url.searchParams.get('id');
        if (!providerId) {
          return new Response(
            JSON.stringify({ error: 'id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();

        const { data, error } = await supabase
          .from('llm_providers')
          .update({
            ...body,
            updated_at: new Date().toISOString(),
          })
          .eq('id', providerId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============================================
    // ROTAS PARA LLM MODELS
    // ============================================
    if (path?.includes('llm-models')) {
      // GET - Listar modelos
      if (req.method === 'GET') {
        const providerId = url.searchParams.get('provider_id');

        let query = supabase
          .from('llm_models')
          .select(`
            *,
            provider:llm_providers!llm_models_provider_id_fkey(id, provider_name, display_name)
          `)
          .order('display_name');

        if (providerId) query = query.eq('provider_id', providerId);

        const { data, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      // PUT - Atualizar modelo (custos, ativar/desativar)
      if (req.method === 'PUT') {
        const modelId = url.searchParams.get('id');
        if (!modelId) {
          return new Response(
            JSON.stringify({ error: 'id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();

        const { data, error } = await supabase
          .from('llm_models')
          .update(body)
          .eq('id', modelId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============================================
    // ROTAS PARA LLM USAGE CONFIG
    // ============================================
    if (path?.includes('llm-config')) {
      // GET - Obter configurações atuais
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('llm_usage_config')
          .select(`
            *,
            model:llm_models!llm_usage_config_llm_model_id_fkey(id, model_name, display_name, provider:llm_providers(display_name)),
            fallback:llm_models!llm_usage_config_fallback_model_id_fkey(id, model_name, display_name)
          `)
          .order('config_key');

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      // PUT - Atualizar configuração
      if (req.method === 'PUT') {
        const configKey = url.searchParams.get('key');
        if (!configKey) {
          return new Response(
            JSON.stringify({ error: 'key é obrigatório' }),
            { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
          );
        }

        const body = await req.json();

        const { data, error } = await supabase
          .from('llm_usage_config')
          .update({
            ...body,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('config_key', configKey)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============================================
    // ROTAS PARA LLM USAGE STATS
    // ============================================
    if (path?.includes('llm-usage')) {
      // GET - Estatísticas de uso
      const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7) + '-01';

      // Uso mensal por modelo
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('v_llm_monthly_usage')
        .select('*')
        .gte('month', month);

      if (monthlyError) throw monthlyError;

      // Uso mensal por usuário
      const { data: userData, error: userError } = await supabase
        .from('v_llm_user_monthly_usage')
        .select('*')
        .gte('month', month);

      if (userError) throw userError;

      return new Response(
        JSON.stringify({
          monthly_by_model: monthlyData,
          monthly_by_user: userData,
        }),
        { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Rota não encontrada' }),
      { status: 404, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin LLM config error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
});
