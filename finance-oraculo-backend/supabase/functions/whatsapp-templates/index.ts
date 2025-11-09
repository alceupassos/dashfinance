import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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
    const status = url.searchParams.get('status');
    const provider = url.searchParams.get('provider');
    const companyCnpj = url.searchParams.get('company_cnpj') || url.searchParams.get('cnpj');
    const limit = Number(url.searchParams.get('limit') ?? '50');

    let query = supabase
      .from('whatsapp_templates')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(Number.isFinite(limit) && limit > 0 ? limit : 50);

    if (status) {
      query = query.eq('status', status);
    }

    if (provider) {
      query = query.eq('provider', provider);
    }

    if (companyCnpj) {
      query = query.contains('content', { metadata: { empresaCnpj: companyCnpj } });
    }

    const { data: templates, error } = await query;

    if (error) {
      throw error;
    }

    const mapped = (templates ?? []).map((template) => {
      const content = template.content || {};
      const metadata = content?.metadata || {};

      const variaveisObrigatorias = content?.variaveisObrigatorias ?? metadata?.variaveisObrigatorias ?? [];
      const variaveisOpcionais = content?.variaveisOpcionais ?? metadata?.variaveisOpcionais ?? [];

      return {
        id: template.id,
        nome: template.name,
        categoria: template.category,
        status: template.status,
        corpo: content?.body ?? '',
        descricao: content?.header ?? null,
        variaveisObrigatorias,
        variaveisOpcionais,
        horaEnvioRecomendada: content?.footer ?? metadata?.recommended_hour ?? null,
        empresaCnpj: metadata?.empresaCnpj ?? null,
        criadoEm: template.created_at,
        ultimaAtualizacao: template.updated_at,
        provider: template.provider,
        raw: template,
      };
    });

    return new Response(JSON.stringify({ data: mapped, total: mapped.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[whatsapp-templates] error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
