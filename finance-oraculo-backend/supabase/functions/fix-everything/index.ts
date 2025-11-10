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

    const log: any[] = [];

    // 1. Buscar Grupo Volpe
    const { data: volpeGroup } = await supabase
      .from('group_aliases')
      .select('id')
      .eq('id', 'volpe')
      .single();

    if (!volpeGroup) {
      throw new Error('Grupo Volpe não encontrado');
    }

    log.push({ step: 'found_volpe', id: volpeGroup.id });

    // 2. Limpar membros antigos
    await supabase.from('group_alias_members').delete().eq('alias_id', volpeGroup.id);
    log.push({ step: 'cleared_old_members' });

    // 3. Buscar 5 empresas (usando ID como UUID)
    const { data: empresas } = await supabase
      .from('clientes')
      .select('id, razao_social')
      .limit(5);

    if (!empresas || empresas.length === 0) {
      throw new Error('Nenhuma empresa encontrada');
    }

    log.push({ step: 'found_companies', count: empresas.length });

    // 4. Adicionar empresas ao Grupo Volpe
    const members = empresas.map((emp, index) => ({
      alias_id: volpeGroup.id,
      company_id: emp.id,  // UUID correto
      position: index
    }));

    const { error: insertError } = await supabase
      .from('group_alias_members')
      .insert(members);

    if (insertError) {
      log.push({ step: 'add_members', status: 'error', error: insertError.message });
    } else {
      log.push({ 
        step: 'add_members', 
        status: 'success', 
        count: members.length,
        companies: empresas.map(e => e.razao_social)
      });
    }

    // 5. Verificar resultado final
    const { data: finalMembers } = await supabase
      .from('group_alias_members')
      .select('company_id')
      .eq('alias_id', volpeGroup.id);

    return new Response(JSON.stringify({
      success: true,
      log,
      volpe_members_count: finalMembers?.length || 0
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
