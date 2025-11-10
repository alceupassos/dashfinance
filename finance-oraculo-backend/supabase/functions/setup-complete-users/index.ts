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

    // 1. Desabilitar RLS
    steps.push({ step: 'disable_rls', status: 'running' });
    
    // 2. Buscar os 2 primeiros profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(2);

    if (!profiles || profiles.length < 2) {
      throw new Error('Não há profiles suficientes');
    }

    const [profile1, profile2] = profiles;
    steps.push({ step: 'found_profiles', ids: [profile1.id, profile2.id], status: 'success' });

    // 3. Atualizar profile 1 (teste)
    const { error: update1 } = await supabase
      .from('profiles')
      .update({
        email: 'teste@ifin.app.br',
        name: 'Teste',
        role: 'admin',
        default_company_cnpj: '2780f5fe-4fd2-4f9e-915d-7dbc9a84c862'
      })
      .eq('id', profile1.id);

    steps.push({ step: 'update_profile_1', status: update1 ? 'error' : 'success', error: update1?.message });

    // 4. Atualizar profile 2 (alceu)
    const { error: update2 } = await supabase
      .from('profiles')
      .update({
        email: 'alceu@angrax.com.br',
        name: 'Alceu',
        role: 'admin',
        default_company_cnpj: '2780f5fe-4fd2-4f9e-915d-7dbc9a84c862'
      })
      .eq('id', profile2.id);

    steps.push({ step: 'update_profile_2', status: update2 ? 'error' : 'success', error: update2?.message });

    // 5. Buscar 5 empresas
    const { data: empresas } = await supabase
      .from('clientes')
      .select('id')
      .limit(5);

    steps.push({ step: 'found_companies', total: empresas?.length || 0, status: 'success' });

    // 6. Atribuir empresas ao profile 1
    if (empresas && empresas.length > 0) {
      const assignments1 = empresas.map(emp => ({
        user_id: profile1.id,
        company_cnpj: emp.id,
        access_level: 'admin'
      }));

      const { error: assign1 } = await supabase
        .from('user_companies')
        .insert(assignments1);

      steps.push({ step: 'assign_companies_1', total: assignments1.length, status: assign1 ? 'error' : 'success', error: assign1?.message });

      // 7. Atribuir empresas ao profile 2
      const assignments2 = empresas.map(emp => ({
        user_id: profile2.id,
        company_cnpj: emp.id,
        access_level: 'admin'
      }));

      const { error: assign2 } = await supabase
        .from('user_companies')
        .insert(assignments2);

      steps.push({ step: 'assign_companies_2', total: assignments2.length, status: assign2 ? 'error' : 'success', error: assign2?.message });
    }

    // 8. Verificar resultado final
    const { data: finalProfiles } = await supabase
      .from('profiles')
      .select('id, email, role, default_company_cnpj')
      .in('id', [profile1.id, profile2.id]);

    const { data: finalCompanies } = await supabase
      .from('user_companies')
      .select('user_id, company_cnpj')
      .in('user_id', [profile1.id, profile2.id]);

    return new Response(JSON.stringify({
      success: true,
      steps,
      final_state: {
        profiles: finalProfiles,
        companies_count: finalCompanies?.length || 0
      }
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
