import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const VERSION = 'empresas-list@2.1.0';
const BUILD_TIME = new Date().toISOString();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[${VERSION}] Request started at ${BUILD_TIME}`);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${VERSION}] No auth header`);
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log(`[${VERSION}] Using SERVICE_ROLE_KEY (bypasses RLS)`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verifica autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      console.error(`[${VERSION}] Auth error:`, authError);
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[${VERSION}] User authenticated:`, {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Parse query params
    const url = new URL(req.url);
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    console.log(`[${VERSION}] Query params:`, { search, status, limit });

    // Buscar empresas de F360 e OMIE
    console.log(`[${VERSION}] Fetching from integration_f360...`);
    const { data: f360Empresas, error: f360Error } = await supabase
      .from('integration_f360')
      .select('*')
      .order('cliente_nome', { ascending: true });

    if (f360Error) {
      console.error(`[${VERSION}] F360 error:`, JSON.stringify(f360Error));
    } else {
      console.log(`[${VERSION}] F360 results:`, f360Empresas?.length || 0);
      if (f360Empresas && f360Empresas.length > 0) {
        console.log(`[${VERSION}] F360 sample:`, JSON.stringify(f360Empresas[0]));
      }
    }

    console.log(`[${VERSION}] Fetching from integration_omie...`);
    const { data: omieEmpresas, error: omieError } = await supabase
      .from('integration_omie')
      .select('*')
      .order('cliente_nome', { ascending: true });

    if (omieError) {
      console.error(`[${VERSION}] OMIE error:`, omieError);
    } else {
      console.log(`[${VERSION}] OMIE results:`, omieEmpresas?.length || 0);
    }

    // Combinar empresas
    const todasEmpresas = [
      ...(f360Empresas || []).map((e: any) => ({
        id: e.id,
        nome: e.cliente_nome,
        cnpj: e.cnpj || '',
        razao_social: e.cliente_nome,
        logo_url: null,
        criado_em: e.created_at,
        tipo_integracao: 'F360',
        grupo_empresarial: e.grupo_empresarial || null
      })),
      ...(omieEmpresas || []).map((e: any) => ({
        id: e.id,
        nome: e.cliente_nome,
        cnpj: e.cnpj || '',
        razao_social: e.cliente_nome,
        logo_url: null,
        criado_em: e.created_at,
        tipo_integracao: 'OMIE',
        grupo_empresarial: e.grupo_empresarial || null
      }))
    ];

    // Filtrar por busca
    let empresas = todasEmpresas;

    if (search) {
      const searchLower = search.toLowerCase();
      empresas = empresas.filter(e => 
        e.nome?.toLowerCase().includes(searchLower) ||
        e.cnpj?.toLowerCase().includes(searchLower) ||
        e.razao_social?.toLowerCase().includes(searchLower)
      );
    }

    // Limitar resultados
    empresas = empresas.slice(0, limit);

    // Para cada empresa, buscar métricas disponíveis
    const empresasEnriquecidas = await Promise.all(
      (empresas || []).map(async (empresa) => {
        // Buscar receita do mês
        const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
        const { data: dreEntries } = await supabase
          .from('dre_entries')
          .select('amount')
          .eq('company_cnpj', empresa.cnpj)
          .gte('date', `${mesAtual}-01`)
          .eq('nature', 'receita');

        const receitaMes = dreEntries?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;

        // Verificar WhatsApp ativo (se tem token de onboarding)
        const { data: whatsappToken } = await supabase
          .from('onboarding_tokens')
          .select('id, status')
          .eq('company_cnpj', empresa.cnpj)
          .eq('status', 'activated')
          .maybeSingle();

        return {
          id: empresa.id,
          cnpj: empresa.cnpj || '',
          nome_fantasia: empresa.nome,
          razao_social: empresa.razao_social || empresa.nome,
          logo_url: empresa.logo_url,
          grupo_empresarial: empresa.grupo_empresarial,
          status: 'ativo',
          integracao_f360: empresa.tipo_integracao === 'F360',
          integracao_omie: empresa.tipo_integracao === 'OMIE',
          whatsapp_ativo: !!whatsappToken,
          receita_mes: receitaMes,
          criado_em: empresa.criado_em,
        };
      })
    );

    console.log(`[${VERSION}] Final result:`, {
      total: empresasEnriquecidas.length,
      sample: empresasEnriquecidas[0]?.nome_fantasia,
    });

    return new Response(
      JSON.stringify({
        version: VERSION,
        build_time: BUILD_TIME,
        empresas: empresasEnriquecidas,
        total: empresasEnriquecidas.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Empresas list error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

