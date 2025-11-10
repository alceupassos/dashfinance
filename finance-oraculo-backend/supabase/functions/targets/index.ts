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

    // Buscar aliases
    const { data: aliasesData, error: aliasesError } = await supabase
      .from('group_aliases')
      .select('id, label, description');

    // Buscar membros de cada grupo
    const { data: membersData, error: membersError } = await supabase
      .from('group_alias_members')
      .select('alias_id, company_cnpj');

    // Buscar empresas da tabela clientes
    const { data: clientesData, error: clientesError } = await supabase
      .from('clientes')
      .select('id, razao_social, cnpj')
      .order('razao_social');

    // Criar lista de empresas (usar ID como value já que CNPJ pode ser null)
    const cnpjs = (clientesData || []).map((c: any) => ({
      value: c.id, // Usar ID ao invés de CNPJ
      label: c.razao_social || c.id,
      cnpj: c.cnpj
    }));

    // Mapear membros por alias
    const membersByAlias = new Map<string, string[]>();
    (membersData || []).forEach((m: any) => {
      if (!membersByAlias.has(m.alias_id)) {
        membersByAlias.set(m.alias_id, []);
      }
      membersByAlias.get(m.alias_id)!.push(m.company_cnpj);
    });

    const aliases = (aliasesData || []).map((row: any) => ({
      id: row.id,
      value: row.id,
      label: row.label,
      members: membersByAlias.get(row.id) || []
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
