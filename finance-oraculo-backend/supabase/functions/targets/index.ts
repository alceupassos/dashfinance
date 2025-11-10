import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    // Buscar aliases e CNPJs disponíveis
    const { data: aliasesData, error: aliasesError } = await supabase
      .from('group_aliases')
      .select('id, label, description');

    // Buscar empresas únicas de user_companies
    const { data: companiesData, error: companiesError } = await supabase
      .from('user_companies')
      .select('company_cnpj')
      .order('company_cnpj');

    // Criar lista única de CNPJs
    const uniqueCnpjs = [...new Set((companiesData || []).map((c: any) => c.company_cnpj))];
    
    const cnpjs = uniqueCnpjs.map((cnpj: string) => ({
      value: cnpj,
      label: cnpj // TODO: buscar razão social quando houver tabela de empresas
    }));

    const aliases = (aliasesData || []).map((row: any) => ({
      id: row.id,
      value: row.id,
      label: row.label,
      members: cnpjs.map((c: any) => c.value) // Por enquanto, todos os CNPJs em todos os grupos
    }));

    return new Response(
      JSON.stringify({
        aliases,
        cnpjs
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in targets:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
