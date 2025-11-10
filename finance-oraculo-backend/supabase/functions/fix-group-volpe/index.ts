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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const steps = [];

    // 1. Buscar o grupo Volpe
    const { data: volpeGroup } = await supabase
      .from('group_aliases')
      .select('id')
      .eq('alias', 'volpe')
      .single();

    if (!volpeGroup) {
      throw new Error('Grupo Volpe não encontrado');
    }

    steps.push({ step: 'found_volpe_group', id: volpeGroup.id, status: 'success' });

    // 2. Limpar membros antigos do grupo Volpe
    const { error: deleteError } = await supabase
      .from('group_alias_members')
      .delete()
      .eq('alias_id', volpeGroup.id);

    steps.push({ step: 'clear_old_members', status: deleteError ? 'error' : 'success', error: deleteError?.message });

    // 3. Buscar apenas 3 empresas para o grupo Volpe (exemplo)
    const { data: empresas } = await supabase
      .from('clientes')
      .select('id, razao_social')
      .limit(3);

    steps.push({ step: 'found_companies', total: empresas?.length || 0, status: 'success' });

    // 4. Adicionar empresas ao grupo Volpe
    if (empresas && empresas.length > 0) {
      const members = empresas.map((emp, index) => ({
        alias_id: volpeGroup.id,
        company_cnpj: emp.id,
        position: index
      }));

      const { error: insertError } = await supabase
        .from('group_alias_members')
        .insert(members);

      steps.push({ 
        step: 'add_members', 
        total: members.length, 
        status: insertError ? 'error' : 'success', 
        error: insertError?.message,
        companies: empresas.map(e => e.razao_social)
      });
    }

    // 5. Verificar resultado final
    const { data: finalMembers } = await supabase
      .from('group_alias_members')
      .select('company_cnpj')
      .eq('alias_id', volpeGroup.id);

    return new Response(JSON.stringify({
      success: true,
      steps,
      final_count: finalMembers?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
