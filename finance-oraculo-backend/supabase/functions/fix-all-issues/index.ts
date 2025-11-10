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

    const results: any = { steps: [], issues_found: [], fixes_applied: [] };

    // 1. Verificar e remover duplicatas em group_aliases
    const { data: aliases } = await supabase.from('group_aliases').select('label, id, created_at').order('label');
    
    if (aliases) {
      const seen = new Map();
      const toDelete = [];
      
      for (const alias of aliases) {
        if (seen.has(alias.label)) {
          toDelete.push(alias.id);
        } else {
          seen.set(alias.label, alias.id);
        }
      }
      
      if (toDelete.length > 0) {
        await supabase.from('group_aliases').delete().in('id', toDelete);
        results.fixes_applied.push({ fix: 'removed_duplicate_aliases', count: toDelete.length });
      }
    }

    // 2. Buscar ou criar Grupo Volpe
    let { data: volpeGroup } = await supabase
      .from('group_aliases')
      .select('id, label')
      .ilike('label', '%volpe%')
      .maybeSingle();

    if (!volpeGroup) {
      const { data: newGroup } = await supabase
        .from('group_aliases')
        .insert({ label: 'Grupo Volpe', description: 'Grupo Volpe', icon: 'building', color: '#3b82f6' })
        .select()
        .single();
      volpeGroup = newGroup;
      results.fixes_applied.push({ fix: 'created_volpe_group' });
    }

    // 3. Limpar e popular Grupo Volpe com 5 empresas
    if (volpeGroup) {
      await supabase.from('group_alias_members').delete().eq('alias_id', volpeGroup.id);
      
      const { data: empresas } = await supabase.from('clientes').select('id, razao_social').limit(5);
      
      if (empresas) {
        const members = empresas.map((emp: any, i: number) => ({
          alias_id: volpeGroup.id,
          company_cnpj: emp.id,
          position: i
        }));
        
        await supabase.from('group_alias_members').insert(members);
        results.fixes_applied.push({ fix: 'set_volpe_members', count: 5 });
      }
    }

    // 4. Verificar oracle_chat_history
    const { error: oracleError } = await supabase.from('oracle_chat_history').select('id').limit(1);
    results.steps.push({ step: 'oracle_table', status: oracleError ? 'missing' : 'ok' });

    // 5. Verificar consistência de dados
    const { data: userCompanies } = await supabase.from('user_companies').select('user_id').limit(100);
    const { data: profiles } = await supabase.from('profiles').select('email').not('email', 'is', null);
    
    results.steps.push({ 
      step: 'data_consistency',
      user_companies: userCompanies?.length || 0,
      profiles_with_email: profiles?.length || 0
    });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
