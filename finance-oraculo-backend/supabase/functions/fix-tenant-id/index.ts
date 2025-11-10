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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar o group_id do grupo Volpe
    const { data: groupData, error: groupError } = await supabase
      .from('group_alias')
      .select('id')
      .eq('name', 'volpe')
      .single();

    if (groupError || !groupData) {
      throw new Error('Grupo Volpe não encontrado');
    }

    // Buscar todos os clientes
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('id')
      .limit(100);

    if (clientesError) {
      throw clientesError;
    }

    // Inserir em lote (usar alias_id e company_cnpj conforme migration 009)
    const members = (clientes || []).map((c: any) => ({
      group_id: groupData.id,
      alias_id: 'volpe',
      company_cnpj: c.id,
      tenant_id: '00000000-0000-0000-0000-000000000000'
    }));

    const { data, error } = await supabase
      .from('group_alias_members')
      .insert(members);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: members.length,
        message: `Inserted ${members.length} companies into Grupo Volpe`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
